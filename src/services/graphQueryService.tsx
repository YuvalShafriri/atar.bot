// graphQueryService.tsx - RAG-based Heritage Graph Query Service
// Simple and efficient semantic search approach for heritage graph queries

// Token counting utility for tracking LLM usage
export const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / 4);
};

export const logTokenUsage = (context: string, data: any, isInput: boolean = true) => {
  const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
  const tokens = estimateTokens(dataStr);
  const size = (dataStr.length / 1024).toFixed(2);
  const direction = isInput ? 'Input' : 'Output';
  
  console.log(`[${context} Tokens] ${direction} tokens: ${tokens.toLocaleString()}`);
  console.log(`[${context} Tokens] ${direction} size: ${size} KB`);
  
  return tokens;
};

export type Node = {
  id: string;
  name?: string;
  label?: string;
  type: string;
  meaning?: string;
  heritageValue?: string;
};

export type Edge = { from: string; to: string; label?: string };

export type AssetNode = Node & { 
  Asset?: boolean; // Legacy format
  asset?: boolean; // New format in meta-graph-asset-flag.json
};

export interface GraphData {
  nodes: AssetNode[];
  edges: Edge[];
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string;
  name?: string;
  tool_calls?: any[];
}

// RAG Chunk - a small piece of knowledge
interface RAGChunk {
  id: string;
  content: string;
  type: 'heritage_asset' | 'value_connection' | 'relationship';
  relevanceScore?: number;
}

// Create semantic chunks from graph data
function createRAGChunks(graph: GraphData): RAGChunk[] {
  const chunks: RAGChunk[] = [];
  
  // Heritage asset types in the meta-graph
  const heritageTypes = [
    'אתר מורשת', 'מבנה היסטורי', 'אתר ארכיאולוגי', 'אתר היסטורי', 
    'מבנה תעשייתי', 'מבנה מודרני', 'מבנה', 'שכונה', 'אתר', 'מערכת הגנה'
  ];
  
  // 1. Heritage Asset Chunks - identify only by asset=true or Asset=true flag
  graph.nodes
    .filter(n => n.asset === true || n.Asset === true)
    .forEach(asset => {
      const directConnections = graph.edges
        .filter(e => e.from === asset.id)
        .map(e => {
          const target = graph.nodes.find(n => n.id === e.to);
          return target ? target.name || target.label || target.id : e.to;
        });
      
      // Find indirect connections (2-hop paths)
      const indirectConnections = graph.edges
        .filter(e => e.from === asset.id)
        .map(e => e.to)
        .flatMap(intermediateId => 
          graph.edges
            .filter(e => e.from === intermediateId)
            .map(e => {
              const target = graph.nodes.find(n => n.id === e.to);
              return target ? target.name || target.label || target.id : e.to;
            })
        );
      
      const allConnections = [...directConnections, ...indirectConnections];
      
      const chunk = `נכס מורשת: ${asset.name || asset.label || asset.id}
סוג: ${asset.type}
${asset.meaning ? `משמעות: ${asset.meaning}` : ''}
קשרים ישירים: ${directConnections.join(', ')}
${indirectConnections.length > 0 ? `קשרים עקיפים: ${indirectConnections.join(', ')}` : ''}
סה"כ קשרים: ${allConnections.length}`;

      chunks.push({
        id: `asset_${asset.id}`,
        content: chunk,
        type: 'heritage_asset'
      });
    });
  
  // 2. Value Connection Chunks  
  const valueNodes = graph.nodes.filter(n => 
    n.name?.includes('ערך') || 
    n.type?.includes('ערך') ||
    n.name?.includes('אדריכל') ||
    n.name?.includes('היסטורי') ||
    n.name?.includes('תרבותי')
  );
  
  valueNodes.forEach(valueNode => {
    const connectedAssets = graph.edges
      .filter(e => e.to === valueNode.id)
      .map(e => graph.nodes.find(n => n.id === e.from))
      .filter(n => n && (n.asset === true || n.Asset === true))
      .map(n => n?.name || n?.label || n?.id);
    
    if (connectedAssets.length > 0) {
      const chunk = `ערך: ${valueNode.name || valueNode.label}
נכסים בעלי ערך זה: ${connectedAssets.join(', ')}
סה"כ נכסים: ${connectedAssets.length}`;

      chunks.push({
        id: `value_${valueNode.id}`,
        content: chunk,
        type: 'value_connection'
      });
    }
  });
  
  // 3. General Statistics Chunk
  const heritageAssets = graph.nodes.filter(n => n.asset === true || n.Asset === true);
  const totalConnections = graph.edges.length;
  
  const statisticsChunk = `סטטיסטיקה כללית:
סה"כ נכסי מורשת: ${heritageAssets.length}
סה"כ קשרים בגרף: ${totalConnections}
סוגי נכסים: ${heritageTypes.join(', ')}
רשימת נכסים: ${heritageAssets.map(a => a.name || a.label || a.id).join(', ')}`;

  chunks.push({
    id: 'general_stats',
    content: statisticsChunk,
    type: 'heritage_asset'
  });
  
  return chunks;
}

// Simple semantic search based on keyword matching
function searchRelevantChunks(question: string, chunks: RAGChunk[], maxChunks: number = 12): RAGChunk[] {
  const questionLower = question.toLowerCase();
  const keywords = questionLower.split(/\s+/);
  
  // Score chunks based on keyword matches
  const scoredChunks = chunks.map(chunk => {
    const contentLower = chunk.content.toLowerCase();
    let score = 0;
    
    // Exact phrase matches (high score)
    if (contentLower.includes(questionLower)) {
      score += 100;
    }
    
    // Individual keyword matches
    keywords.forEach(keyword => {
      if (keyword.length > 2 && contentLower.includes(keyword)) {
        score += 10;
      }
    });
    
    // Special handling for specific locations/names
    if (questionLower.includes('שפר') || questionLower.includes('שפירא')) {
      if (contentLower.includes('שפר') || contentLower.includes('שפירא')) {
        score += 80;
      }
    }
    
    // Boost for specific question types
    if (questionLower.includes('כמה') || questionLower.includes('מספר')) {
      if (chunk.type === 'value_connection' && chunk.content.includes('סה"כ')) {
        score += 50;
      }
      if (chunk.type === 'heritage_asset') {
        score += 30; // Heritage assets are relevant for counting questions
      }
    }
    
    if (questionLower.includes('ערך אדריכלי')) {
      if (chunk.content.includes('ערך') && chunk.content.includes('אדריכל')) {
        score += 50;
      }
    }
    
    // Boost for indirect connections (עקיף)
    if (questionLower.includes('עקיף') || questionLower.includes('קשור')) {
      if (chunk.type === 'value_connection' || chunk.content.includes('קשר')) {
        score += 40;
      }
    }
    
    return { ...chunk, relevanceScore: score };
  });
  
  // Return top scoring chunks
  return scoredChunks
    .filter(chunk => chunk.relevanceScore! > 0)
    .sort((a, b) => b.relevanceScore! - a.relevanceScore!)
    .slice(0, maxChunks);
}

// Main RAG-based chat function
export async function chatGraph(
  question: string,
  graph: GraphData,
  fetchChatCompletion: (messages: LLMMessage[], tools?: any[]) => Promise<any>
): Promise<string> {
  console.log('[chatGraph] Starting RAG-based query:', question);
  logTokenUsage('Full Graph Input', graph, true);
  
  // Step 1: Create RAG chunks from graph
  const chunks = createRAGChunks(graph);
  console.log(`[RAG] Created ${chunks.length} knowledge chunks`);
  
  // Step 2: Search for relevant chunks (increased limit for better context)
  const relevantChunks = searchRelevantChunks(question, chunks, 12);
  console.log(`[RAG] Found ${relevantChunks.length} relevant chunks`);
  
  // Step 3: Build context from relevant chunks with token limit
  const TARGET_CONTEXT_TOKENS = 800; // Leave room for system prompt + question
  let contextContent = '';
  let usedChunks = 0;
  
  for (const chunk of relevantChunks) {
    const testContent = contextContent + (contextContent ? '\n\n---\n\n' : '') + chunk.content;
    const testTokens = estimateTokens(testContent);
    
    if (testTokens <= TARGET_CONTEXT_TOKENS) {
      contextContent = testContent;
      usedChunks++;
    } else {
      break; // Stop adding chunks when we reach token limit
    }
  }
  
  console.log(`[RAG] Using ${usedChunks} chunks within token limit`);
  logTokenUsage('RAG Context', contextContent, true);
  
  // Calculate token savings
  const originalTokens = estimateTokens(JSON.stringify(graph));
  const contextTokens = estimateTokens(contextContent);
  const tokenSavings = originalTokens - contextTokens;
  const savingsPercent = ((tokenSavings / originalTokens) * 100).toFixed(1);
  
  console.log(`[Token Savings] Original: ${originalTokens.toLocaleString()} tokens`);
  console.log(`[Token Savings] Context: ${contextTokens.toLocaleString()} tokens`);
  console.log(`[Token Savings] Saved: ${tokenSavings.toLocaleString()} tokens (${savingsPercent}%)`);
  
  // Step 4: Query LLM with focused context
  const systemMessage: LLMMessage = {
    role: 'system',
    content: `אתה עוזר מומחה לנכסי מורשת תרבותית. ענה על השאלות בהתבסס אך ורק על המידע שסופק לך.

**חשוב מאוד**: כאשר נשאלות שאלות על "נכסים" או "נכסי מורשת", התייחס אך ורק לצמתים המסומנים כ"נכס מורשת" במידע שלמטה. התעלם מצמתים אחרים כמו ערכים, תקופות או נושאים כאשר מונים נכסים.

אם המידע לא מספק, אמר זאת בבירור. היה מדויק ותמציתי.

מידע רלוונטי:
${contextContent}`
  };
  
  const userMessage: LLMMessage = { 
    role: 'user', 
    content: question 
  };
  
  logTokenUsage('Final LLM Input', [systemMessage, userMessage], true);
  
  const response = await fetchChatCompletion([systemMessage, userMessage]);
  
  const answer = response.candidates?.[0]?.content?.parts?.[0]?.text || 
                response.message?.content || 
                response.choices?.[0]?.message?.content || 
                'לא ניתן היה לענות על השאלה על בסיס המידע הזמין';
  
  logTokenUsage('LLM Response', answer, false);
  console.log('[chatGraph] RAG answer:', answer);
  
  // ⭐ FINAL TOKEN SUMMARY ⭐
  console.log('');
  console.log('🎯 ===== FINAL TOKEN SUMMARY =====');
  console.log(`📊 Question: "${question}"`);
  console.log(`📊 Original Graph: ${originalTokens.toLocaleString()} tokens`);
  console.log(`📊 RAG Context: ${contextTokens.toLocaleString()} tokens`);
  console.log(`📊 LLM Input: ${estimateTokens(JSON.stringify([systemMessage, userMessage])).toLocaleString()} tokens`);
  console.log(`📊 LLM Output: ${estimateTokens(answer).toLocaleString()} tokens`);
  console.log(`💰 Token Savings: ${tokenSavings.toLocaleString()} tokens (${savingsPercent}%)`);
  console.log(`💲 Estimated Cost: $${((contextTokens * 0.03 + estimateTokens(answer) * 0.06) / 1000).toFixed(4)}`);
  console.log('🎯 ===============================');
  console.log('');
  
  return answer.trim();
}
