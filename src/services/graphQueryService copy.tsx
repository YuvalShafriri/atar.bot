// graphQueryService.tsx - Hybrid RAG Architecture

// --- TYPES AND UTILS (ללא שינוי) ---
export const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

export type Node = {
  id: string;
  name?: string;
  label?: string;
  type: string;
  meaning?: string;
  asset?: boolean;
};
export type Edge = { from: string; to: string; label?: string };
export interface GraphData { nodes: Node[]; edges: Edge[]; }
export interface LLMMessage { role: 'system' | 'user' | 'assistant'; content?: string; }
interface RAGChunk { id: string; content: string; type: 'heritage_asset' | 'relationship' | 'statistics'; }

// --- ממשק לתשובת ה"מוח" ---
interface QueryAnalysis {
  query_type: 'counting' | 'listing' | 'description' | 'comparison' | 'relationship' | 'unknown';
  target_entities: string[];
  is_simple_question: boolean;
}

// --- פונקציות משופרות ---

/**
 * [V2] יוצר צ'אנקים אטומיים וברורים מהגרף
 */
function createRAGChunks_V2(graph: GraphData): RAGChunk[] {
  const chunks: RAGChunk[] = [];
  const heritageAssets = graph.nodes.filter(n => n.asset === true);

  // 1. Asset Chunks (Atomic)
  heritageAssets.forEach(asset => {
    chunks.push({
      id: `asset_${asset.id}`,
      type: 'heritage_asset',
      content: `נכס מורשת: "${asset.label || asset.id}". סוג: ${asset.type}. ${asset.meaning ? `משמעות: ${asset.meaning}` : ''}`
    });
  });

  // 2. Relationship Chunks (Explicit)
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
  
  // 3. General Statistics Chunk
  chunks.push({
    id: 'general_stats',
    type: 'statistics',
    content: `מידע כללי: סך הכל ${heritageAssets.length} נכסי מורשת. סך הכל ${graph.edges.length} קשרים.`
  });
  
  return chunks;
}

/**
 * [V2] חיפוש צ'אנקים ממוקד על בסיס ניתוח ה"מוח"
 */
function searchRelevantChunks_V2(question: string, chunks: RAGChunk[], targetEntities: string[], maxChunks: number = 15): RAGChunk[] {
  const questionLower = question.toLowerCase();
  
  const scoredChunks = chunks.map(chunk => {
    let score = 0;
    const contentLower = chunk.content.toLowerCase();
    
    // Boost גבוה מאוד לצ'אנקים שמכילים את הישויות שה"מוח" זיהה
    targetEntities.forEach(entity => {
      if (contentLower.includes(entity.toLowerCase())) {
        score += 100;
      }
    });
    
    // Boost כללי למילות מפתח מהשאלה
    question.split(/\s+/).forEach(word => {
        if (word.length > 2 && contentLower.includes(word.toLowerCase())) {
            score += 10;
        }
    });

    // Boost לצ'אנק הסטטיסטי בשאלות כמותיות
    if (question.includes('כמה') || question.includes('מספר')) {
        if (chunk.type === 'statistics') {
            score += 200; // Boost very high to ensure it's included
        }
    }

    return { ...chunk, relevanceScore: score };
  });

  return scoredChunks
    .filter(chunk => chunk.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, maxChunks);
}


// --- החלקים המרכזיים של הארכיטקטורה ההיברידית ---

/**
 * **ה"מוח" (The Brain)**: קורא למודל חזק כדי לנתח את שאלת המשתמש.
 * @param question - שאלת המשתמש.
 * @param fetchGeminiPro - פונקציה לקריאה למודל Gemini 1.5 Pro.
 * @returns {Promise<QueryAnalysis>} - אובייקט JSON עם ניתוח השאילתה.
 */
async function analyzeQueryWithStrongModel(
  question: string,
  fetchGeminiPro: (messages: LLMMessage[]) => Promise<any>
): Promise<QueryAnalysis> {
    const analysisPrompt = `
        You are a query analysis expert for a cultural heritage knowledge graph.
        Your task is to analyze the user's question in Hebrew and return ONLY a valid JSON object. Do not add any other text.
        The JSON object should have the following structure:
        {
          "query_type": "one of ['counting', 'listing', 'description', 'comparison', 'relationship', 'unknown']",
          "target_entities": ["an array of key entities (names, places, concepts) mentioned in the question"],
          "is_simple_question": "boolean, true if the question can likely be answered with a simple programmatic check (like total counting)"
        }

        User Question: "${question}"

        Example 1:
        User Question: "כמה נכסים יש בסך הכל?"
        Your response must be this exact JSON:
        {
          "query_type": "counting",
          "target_entities": [],
          "is_simple_question": true
        }

        Example 2:
        User Question: "מה הערך האדריכלי של מצודות טיגארט?"
        Your response must be this exact JSON:
        {
          "query_type": "description",
          "target_entities": ["מצודות טיגארט", "ערך אדריכלי"],
          "is_simple_question": false
        }
    `;

    try {
        const response = await fetchGeminiPro([{ role: 'user', content: analysisPrompt }]);
        const responseText = response.candidates[0].content.parts[0].text;
        // Clean potential markdown code block fences
        const cleanedJson = responseText.replace(/```json\n|```/g, '').trim();
        return JSON.parse(cleanedJson);
    } catch (error) {
        console.error("[Brain] Failed to parse analysis from strong model:", error);
        // Fallback in case of error
        return {
            query_type: 'unknown',
            target_entities: [question], // Use the whole question as a search term
            is_simple_question: false
        };
    }
}

/**
 * **הפונקציה הראשית (ה"עובד" + ה"קול")**
 * מיישמת את הלוגיקה ההיברידית.
 */
export async function chatGraph_Hybrid(
  question: string,
  graph: GraphData,
  fetchGeminiPro: (messages: LLMMessage[]) => Promise<any>,
  fetchGeminiFlash: (messages: LLMMessage[]) => Promise<any>
): Promise<string> {
  console.log("--- Starting Hybrid RAG Process ---");

  // שלב 1: קריאת ה"מוח" לניתוח השאילתה (Gemini 1.5 Pro)
  const analysis = await analyzeQueryWithStrongModel(question, fetchGeminiPro);
  console.log("[Brain Analysis Result]", analysis);

  // שלב 2: לוגיקת ה"עובד" - החלטה על סמך הניתוח
  if (analysis.is_simple_question) {
    const heritageAssets = graph.nodes.filter(n => n.asset === true);
    if (analysis.query_type === 'counting' && analysis.target_entities.length === 0) {
      console.log('[Worker] Answering simple counting query programmatically.');
      return `במערכת קיימים ${heritageAssets.length} נכסי מורשת.`;
    }
    // ניתן להוסיף כאן עוד לוגיקה פרוגרמטית לשאלות פשוטות אחרות
  }
  
  console.log('[Worker] Complex query detected. Proceeding with RAG.');
  
  // 1. צור צ'אנקים
  const chunks = createRAGChunks_V2(graph);
  
  // 2. אחזר צ'אנקים רלוונטיים באמצעות הניתוח של המוח
  const relevantChunks = searchRelevantChunks_V2(question, chunks, analysis.target_entities);
  console.log(`[Worker] Retrieved ${relevantChunks.length} relevant chunks.`);
  
  // 3. בנה הקשר (context)
  const contextContent = relevantChunks.map(c => c.content).join('\n\n---\n\n');
  const contextTokens = estimateTokens(contextContent);
  console.log(`[Worker] Built context with ${contextTokens} tokens.`);

  // שלב 3: קריאת ה"קול" (Gemini 1.5 Flash)
  const finalSystemPrompt: LLMMessage = {
    role: 'system',
    content: `אתה עוזר AI מומחה לניתוח נכסי מורשת, תפקידך לענות על שאלות על בסיס מידע מובנה שסופק.
פעל לפי התהליך הבא:
1.  **זהה את סוג השאלה**: האם היא שאלה על כמות, תיאור, קשר, או השוואה?
2.  **אחזר עובדות רלוונטיות**: סרוק את המידע שסופק ומצא את ה"עובדות" (צ'אנקים) שעונים ישירות על השאלה.
3.  **תן עדיפות לסיכומים**: אם השאלה היא על כמות (כמו "כמה?") וקיים צ'אנק "מידע כללי" עם תשובה מספרית, **השתמש במספר הזה** וציין אותו כמקור. אל תנסה לספור בעצמך מתוך הצ'אנקים האחרים.
4.  **בנה תשובה**: חבר תשובה נרטיבית וקוהרנטית בעברית מהעובדות שאיתרת. אם המידע לא מספיק, ציין זאת.

--- מידע רלוונטי ---
${contextContent}`
  };

  const userMessage: LLMMessage = { role: 'user', content: question };

  console.log('[Voice] Sending final prompt to Gemini 1.5 Flash.');
  const response = await fetchGeminiFlash([finalSystemPrompt, userMessage]);
  const answer = response.candidates?.[0]?.content?.parts?.[0]?.text || 'לא ניתן היה לענות על השאלה.';
  
  console.log("--- Hybrid RAG Process Finished ---");
  return answer.trim();
}