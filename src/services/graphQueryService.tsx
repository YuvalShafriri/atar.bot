import { printTokenLogStyled } from './tokenCostService';

// graphQueryService.tsx - RAG-based Heritage Graph Query Service
// Simple and efficient semantic search approach for heritage graph queries

// Token counting utility for tracking LLM usage
export const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / 2.5);
};

export const logTokenUsage = (context: string, data: any, isInput: boolean = true) => {
  const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
  const tokens = estimateTokens(dataStr);
  const size = (dataStr.length / 1024).toFixed(2);
  const direction = isInput ? 'Input' : 'Output';
  
  // Only log essential token info
  // console.log(`[${context} Tokens] ${direction} tokens: ${tokens.toLocaleString()}`);
  // console.log(`[${context} Tokens] ${direction} size: ${size} KB`);
  
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
          const targetName = target ? target.name || target.label || target.id : e.to;
          return e.label ? `${targetName} (${e.label})` : targetName;
        });
      
      // Find indirect connections (2-hop paths) with relationship details
      const indirectConnections = graph.edges
        .filter(e => e.from === asset.id)
        .map(e => ({ to: e.to, label: e.label }))
        .flatMap(firstHop => 
          graph.edges
            .filter(e => e.from === firstHop.to)
            .map(e => {
              const target = graph.nodes.find(n => n.id === e.to);
              const intermediate = graph.nodes.find(n => n.id === firstHop.to);
              const targetName = target ? target.name || target.label || target.id : e.to;
              const intermediateName = intermediate ? intermediate.name || intermediate.label || intermediate.id : firstHop.to;
              return `${targetName} (דרך ${intermediateName})`;
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
  
  // 2. Asset-to-Asset Connection Chunks (for identifying shared connections)
  const assetNodes = graph.nodes.filter(n => n.asset === true || n.Asset === true);
  
  // Find shared connection patterns between assets
  assetNodes.forEach(asset1 => {
    assetNodes.forEach(asset2 => {
      if (asset1.id !== asset2.id) {
        // Find shared intermediate nodes (indirect connections)
        const asset1Connections = graph.edges
          .filter(e => e.from === asset1.id)
          .map(e => e.to);
        
        const asset2Connections = graph.edges
          .filter(e => e.from === asset2.id)
          .map(e => e.to);
        
        const sharedConnections = asset1Connections.filter(conn => 
          asset2Connections.includes(conn)
        );
        
        if (sharedConnections.length > 0) {
          const sharedNodes = sharedConnections.map(connId => {
            const node = graph.nodes.find(n => n.id === connId);
            return node ? node.name || node.label || node.id : connId;
          });
          
          const chunk = `קשר עקיף בין נכסים:
נכס 1: ${asset1.name || asset1.label || asset1.id}
נכס 2: ${asset2.name || asset2.label || asset2.id}
קשר דרך: ${sharedNodes.join(', ')}
סוג קשר: עקיף`;

          chunks.push({
            id: `indirect_${asset1.id}_${asset2.id}`,
            content: chunk,
            type: 'relationship'
          });
        }
      }
    });
  });
  
  // 3. Value Connection Chunks  
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
  
  // 4. Relationship Pattern Chunks - analyze common connection types
  const relationshipTypes = new Map<string, number>();
  graph.edges.forEach(edge => {
    if (edge.label) {
      relationshipTypes.set(edge.label, (relationshipTypes.get(edge.label) || 0) + 1);
    }
  });
  
  if (relationshipTypes.size > 0) {
    const topRelationships = Array.from(relationshipTypes.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    
    const relationshipChunk = `סוגי קשרים נפוצים בגרף:
${topRelationships.map(([type, count]) => `- ${type}: ${count} פעמים`).join('\n')}`;

    chunks.push({
      id: 'relationship_patterns',
      content: relationshipChunk,
      type: 'relationship'
    });
  }
  
  return chunks;
}

// Enhanced semantic search with better scoring
function searchRelevantChunks(question: string, chunks: RAGChunk[], maxChunks: number = 20): RAGChunk[] {
  const questionLower = question.toLowerCase();
  const keywords = questionLower.split(/\s+/).filter(word => word.length > 2);
  
  // Score chunks based on multiple relevance factors
  const scoredChunks = chunks.map(chunk => {
    const contentLower = chunk.content.toLowerCase();
    let score = 0;
    
    // Exact phrase matches (highest priority)
    if (contentLower.includes(questionLower.trim())) {
      score += 200;
    }
    
    // Individual keyword matches with frequency weighting
    keywords.forEach(keyword => {
      const matches = (contentLower.match(new RegExp(keyword, 'g')) || []).length;
      score += matches * 15; // Higher score for repeated mentions
    });
    
    // Question type boosts - focus on connection queries
    if (questionLower.includes('קשר') || questionLower.includes('חיבור') || questionLower.includes('קשור')) {
      if (chunk.type === 'relationship') {
        score += 150; // High priority for relationship chunks
      }
      if (chunk.content.includes('קשר עקיף')) {
        score += 100; // Boost for indirect connections
      }
    }
    
    // Boost for specific asset name mentions
    const assetMentions = questionLower.match(/(?:בין|של|עם|ל)\s+([א-ת\s]+?)(?:\s+ל|\s+ו|\s+עם|$)/g);
    if (assetMentions && assetMentions.length >= 2) {
      // This looks like a connection query between specific assets
      if (chunk.type === 'relationship') {
        score += 120;
      }
    }
    
    if (questionLower.includes('אילו') || questionLower.includes('מהם')) {
      if (chunk.type === 'heritage_asset') {
        score += 50;
      }
    }
    
    if (questionLower.includes('קשר') || questionLower.includes('קשור')) {
      if (chunk.type === 'relationship' || chunk.type === 'value_connection') {
        score += 80;
      }
    }
    
    // Content type priorities
    if (chunk.type === 'heritage_asset' && questionLower.includes('נכס')) {
      score += 30;
    }
    
    if (chunk.type === 'relationship' && (questionLower.includes('בין') || questionLower.includes('עם'))) {
      score += 40;
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
  console.log('[QUERY MODE] מנגנון: RAG/חישוב גרף (graphQueryService)');
  // console.log('[chatGraph] Starting RAG-based query:', question);
  logTokenUsage('Full Graph Input', graph, true);
  
  // Step 1: Create RAG chunks from graph
  const chunks = createRAGChunks(graph);
  // console.log(`[RAG] Created ${chunks.length} knowledge chunks`);
  
  // Step 2: Search for relevant chunks (increased limit for better context)
  const relevantChunks = searchRelevantChunks(question, chunks, 20);
  // console.log(`[RAG] Found ${relevantChunks.length} relevant chunks`);
  
  // Step 3: Build context from relevant chunks with enhanced token limit
  const TARGET_CONTEXT_TOKENS = 2000; // Increased for richer context
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
  
  // console.log(`[RAG] Using ${usedChunks} chunks within token limit`);
  logTokenUsage('RAG Context', contextContent, true);
  
  // Calculate token savings
  const originalTokens = estimateTokens(JSON.stringify(graph));
  const contextTokens = estimateTokens(contextContent);
  const tokenSavings = originalTokens - contextTokens;
  const savingsPercent = ((tokenSavings / originalTokens) * 100).toFixed(1);
  
  // console.log(`[Token Savings] Original: ${originalTokens.toLocaleString()} tokens`);
  // console.log(`[Token Savings] Context: ${contextTokens.toLocaleString()} tokens`);
  // console.log(`[Token Savings] Saved: ${tokenSavings.toLocaleString()} tokens (${savingsPercent}%)`);
  
  // Step 4: Query LLM with focused and precise instructions
  const systemMessage: LLMMessage = {
    role: 'system',
    content: `אתה עוזר מומחה לנכסי מורשת תרבותית. המטרה שלך היא לספק תשובות תמציתיות ומדויקות בהתבסס על הגרף בלבד.

**כללי תשובה**:
1. תשובות קצרות ומדויקות - רק העובדות מהגרף, ללא הרחבות או פרשנויות
2. אם נשאל על "קשר" בין שני נכסים - חפש קשר ישיר או עקיף דרך צמת משותף
3. קשר עקיף = שני נכסים מחוברים לאותו צומת (ערך, תקופה, וכו')
4. ציין בבירור אם הקשר הוא ישיר או עקיף ודרך איזה צומת
5. **אל תוסיף הסברים על מגבלות המערכת או יכולות ניתוח**
6. **אל תזכיר שאתה צריך "כללים נוספים" או "מידע נוסף"**
7. **התמקד במה שיש בגרף, לא במה שחסר**

**כללים קריטיים**:
- נכסי מורשת = רק צמתים עם asset=true
- היה תמציתי ומדויק - לא צריך להיות מפורט
- אם אין קשר בגרף - אמר שאין קשר

מידע מהגרף:
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
  // console.log('[chatGraph] RAG answer:', answer);
  
  // ⭐ FINAL TOKEN SUMMARY ⭐
  printTokenLogStyled({
    question,
    inputTokens: estimateTokens(JSON.stringify([systemMessage, userMessage])),
    outputTokens: estimateTokens(answer),
    graphTokens: originalTokens,
    ragTokens: contextTokens,
    model: 'gemini-2.5-flash', // or use model variable if available
    cost: ((contextTokens * 0.03 + estimateTokens(answer) * 0.06) / 1000),
    timeMs: undefined // If available, pass timing
  });
  
  return answer.trim();
}
