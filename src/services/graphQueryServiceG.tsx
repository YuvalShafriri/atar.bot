// =====================================================================
// קובץ 1: graphQueryService.tsx
// =====================================================================

// --- הגדרות טיפוסים ופונקציות עזר ---
export interface LLMMessage { role: 'system' | 'user' | 'assistant'; content?: string; }
export interface Node { id: string; name?: string; label?: string; type: string; meaning?: string; asset?: boolean; }
export interface Edge { from: string; to: string; label?: string; }
export interface GraphData { nodes: Node[]; edges: Edge[]; }
interface RAGChunk { id: string; content: string; type: 'heritage_asset' | 'relationship' | 'statistics'; }
interface QueryAnalysis {
  query_type: 'counting' | 'listing' | 'description' | 'comparison' | 'relationship' | 'unknown';
  target_entities: string[];
}

export const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

function createRAGChunks_V2(graph: GraphData): RAGChunk[] {
  const chunks: RAGChunk[] = [];
  const heritageAssets = graph.nodes.filter(n => n.asset === true);

  heritageAssets.forEach(asset => {
    chunks.push({
      id: `asset_${asset.id}`,
      type: 'heritage_asset',
      content: `נכס מורשת: "${asset.label || asset.id}". סוג: ${asset.type}. ${asset.meaning ? `משמעות: ${asset.meaning}` : ''}`
    });
  });

  graph.edges.forEach((edge, index) => {
    const fromNode = graph.nodes.find(n => n.id === edge.from);
    const toNode = graph.nodes.find(n => n.id === edge.to);
    if (fromNode && toNode) {
      chunks.push({
        id: `rel_${index}`,
        type: 'relationship',
        content: `קשר: "${fromNode.label || fromNode.id}" -> (${edge.label || 'קשור ל'}) -> "${toNode.label || toNode.id}"`
      });
    }
  });
  
  chunks.push({
    id: 'general_stats',
    type: 'statistics',
    content: `מידע כללי: סך הכל ${heritageAssets.length} נכסי מורשת. סך הכל ${graph.edges.length} קשרים.`
  });
  
  return chunks;
}

function searchRelevantChunks_V2(question: string, chunks: RAGChunk[], targetEntities: string[], maxChunks: number = 15): RAGChunk[] {
  const scoredChunks = chunks.map(chunk => {
    let score = 0;
    const contentLower = chunk.content.toLowerCase();
    
    targetEntities.forEach(entity => {
      if (contentLower.includes(entity.toLowerCase())) score += 100;
    });
    
    question.split(/\s+/).forEach(word => {
        if (word.length > 2 && contentLower.includes(word.toLowerCase())) score += 10;
    });

    if (question.includes('כמה') || question.includes('מספר')) {
        if (chunk.type === 'statistics') score += 200;
    }

    return { ...chunk, relevanceScore: score };
  });

  return scoredChunks.filter(c => c.relevanceScore > 0).sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, maxChunks);
}

async function analyzeQueryWithStrongModel(question: string, fetchGeminiPro: (messages: LLMMessage[]) => Promise<any>): Promise<QueryAnalysis> {
    const analysisPrompt = `You are a query analysis expert for a cultural heritage knowledge graph. Analyze the user's question in Hebrew and return ONLY a valid JSON object with the structure: {"query_type": "...", "target_entities": ["..."]}. Question: "${question}"`;

    try {
        const response = await fetchGeminiPro([{ role: 'user', content: analysisPrompt }]);
        const responseText = response.candidates[0].content.parts[0].text;
        const cleanedJson = responseText.replace(/```json\n|```/g, '').trim();
        return JSON.parse(cleanedJson);
    } catch (error) {
        console.error("[Brain] Failed to parse analysis:", error);
        return { query_type: 'unknown', target_entities: [question] };
    }
}


/**
 * הפונקציה הראשית של ה-RAG ההיברידי
 */
export async function chatGraph_Hybrid(
  question: string,
  graph: GraphData,
  fetchGeminiPro: (messages: LLMMessage[]) => Promise<any>,
  fetchGeminiFlash: (messages: LLMMessage[]) => Promise<any>
): Promise<string> {
  const analysis = await analyzeQueryWithStrongModel(question, fetchGeminiPro);
  const allChunks = createRAGChunks_V2(graph);
  let relevantChunks: RAGChunk[] = [];

  if (analysis.query_type === 'listing') {
    relevantChunks = allChunks.filter(c => c.type === 'heritage_asset');
  } else if (analysis.query_type === 'counting') {
    const statsChunk = allChunks.find(c => c.type === 'statistics');
    if (statsChunk) relevantChunks.push(statsChunk);
  } else {
    relevantChunks = searchRelevantChunks_V2(question, allChunks, analysis.target_entities);
  }

  if (relevantChunks.length === 0) {
      return "מצטער, לא הצלחתי למצוא מידע רלוונטי כדי לענות על השאלה. נסה לנסח את השאלה אחרת.";
  }

  const contextContent = relevantChunks.map(c => c.content).join('\n\n---\n\n');
  
  const finalSystemPrompt: LLMMessage = {
    role: 'system',
    content: `אתה עוזר AI מומחה לניתוח נכסי מורשת. ענה על השאלה בעברית, באופן נרטיבי וברור, בהתבסס אך ורק על המידע שסופק לך. אם המידע הוא רשימה, הצג אותה בצורה נוחה לקריאה. אם יש נתון סטטיסטי מדויק, ציין אותו.
--- מידע רלוונטי ---
${contextContent}`
  };
  const userMessage: LLMMessage = { role: 'user', content: question };

  const response = await fetchGeminiFlash([finalSystemPrompt, userMessage]);
  return response.candidates?.[0]?.content?.parts?.[0]?.text || 'לא ניתן היה לענות על השאלה.';
}