// modernGraphQueryService.tsx - LLM-First Heritage Graph Query Service
// Modern approach leveraging LLM capabilities instead of traditional algorithms

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

export type AssetNode = Node & { isHeritageAsset?: boolean };

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

// Modern LLM-based graph query interfaces
interface GraphSummary {
  totalNodes: number;
  totalEdges: number;
  nodeTypes: string[];
  keyLocations: string[];
  keyValues: string[];
  connectionPatterns: string[];
}

interface QueryRelevantData {
  nodes: any[];
  edges: any[];
  context: string;
  tokenCount: number;
}

// Smart graph summarization for LLM understanding
function createGraphSummary(graph: GraphData): GraphSummary {
  const nodeTypes = [...new Set(graph.nodes.map(n => n.type).filter(Boolean))];
  
  // Extract key locations and heritage assets
  const heritageAssets = graph.nodes.filter(n => 
    n.type?.includes('heritage') || 
    n.type?.includes('building') || 
    n.type?.includes('monument') ||
    n.type?.includes('אתר') ||
    n.type?.includes('מבנה') ||
    n.name?.includes('בית') ||
    n.name?.includes('רחוב') ||
    n.name?.includes('שוק') ||
    n.name?.includes('שפר')
  );
  
  // Extract value-related nodes
  const valueNodes = graph.nodes.filter(n => 
    n.name?.includes('ערך') || 
    n.type?.includes('ערך') ||
    n.name?.includes('אדריכל') ||
    n.name?.includes('היסטורי') ||
    n.name?.includes('תרבותי')
  );
  
  // Analyze connection patterns
  const connectionPatterns = [];
  const nodeConnections = new Map();
  
  graph.edges.forEach(edge => {
    const fromNode = graph.nodes.find(n => n.id === edge.from);
    const toNode = graph.nodes.find(n => n.id === edge.to);
    
    if (fromNode && toNode) {
      const pattern = `${fromNode.type} → ${toNode.type}`;
      nodeConnections.set(pattern, (nodeConnections.get(pattern) || 0) + 1);
    }
  });
  
  // Get most common connection patterns
  const sortedPatterns = Array.from(nodeConnections.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([pattern, count]) => `${pattern} (${count} קשרים)`);
  
  return {
    totalNodes: graph.nodes.length,
    totalEdges: graph.edges.length,
    nodeTypes,
    keyLocations: heritageAssets.map(n => n.name || n.label || n.id).slice(0, 10),
    keyValues: valueNodes.map(n => n.name || n.label || n.id).slice(0, 5),
    connectionPatterns: sortedPatterns
  };
}

// LLM-powered query analysis and data selection
async function selectRelevantGraphData(
  question: string, 
  graph: GraphData,
  summary: GraphSummary,
  fetchChatCompletion: (messages: LLMMessage[], tools?: any[]) => Promise<any>
): Promise<QueryRelevantData> {
  
  const analysisPrompt = `אתה אנליסט מומחה לגרפים של מורשת תרבותית. עליך לנתח שאלה ולקבוע איזה חלק מהגרף רלוונטי לענות עליה.

סיכום הגרף:
- ${summary.totalNodes} צמתים, ${summary.totalEdges} קשרים
- סוגי צמתים: ${summary.nodeTypes.join(', ')}
- מיקומים מרכזיים: ${summary.keyLocations.join(', ')}
- ערכים: ${summary.keyValues.join(', ')}
- דפוסי קשרים נפוצים: ${summary.connectionPatterns.join(', ')}

השאלה: "${question}"

אנא חזור עם רשימה של:
1. מילות מפתח לחיפוש צמתים רלוונטיים
2. סוגי צמתים שכנראה רלוונטיים  
3. סוגי קשרים שכנראה רלוונטיים
4. האם השאלה מצריכה חיפוש קשרים עקיפים (multiple hops)
5. האם השאלה מצריכה ספירה או חישוב

השב בפורמט JSON כזה:
{
  "keywords": ["מילה1", "מילה2"],
  "relevantNodeTypes": ["סוג1", "סוג2"],
  "relevantEdgeTypes": ["קשר1", "קשר2"],
  "needsIndirectConnections": true/false,
  "needsCounting": true/false,
  "searchStrategy": "תיאור קצר של אסטרטגיית החיפוש"
}`;

  console.log('[LLM Analysis] Analyzing query for data selection...');
  logTokenUsage('Query Analysis Prompt', analysisPrompt, true);
  
  try {
    const response = await fetchChatCompletion([
      { role: 'user', content: analysisPrompt }
    ]);
    
    // Extract JSON from response (handle markdown wrapping)
    let responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || 
                      response.message?.content || 
                      response.choices?.[0]?.message?.content || 
                      response.content || 
                      response;

    // Clean up markdown code blocks if present
    responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    const analysisResult = JSON.parse(responseText);
    console.log('[LLM Analysis] Query analysis result:', analysisResult);
    
    // Use LLM analysis to filter relevant data
    const relevantNodes = graph.nodes.filter(node => {
      const nodeName = (node.name || node.label || '').toLowerCase();
      const nodeType = (node.type || '').toLowerCase();
      
      // Check if node matches keywords or types from LLM analysis
      const matchesKeywords = analysisResult.keywords.some((keyword: string) => 
        nodeName.includes(keyword.toLowerCase())
      );
      const matchesTypes = analysisResult.relevantNodeTypes.some((type: string) => 
        nodeType.includes(type.toLowerCase())
      );
      
      return matchesKeywords || matchesTypes;
    });
    
    // Include connected nodes if indirect connections are needed
    let finalNodes = [...relevantNodes];
    if (analysisResult.needsIndirectConnections) {
      const relevantNodeIds = new Set(relevantNodes.map(n => n.id));
      
      // Add first-degree connections
      graph.edges.forEach(edge => {
        if (relevantNodeIds.has(edge.from)) {
          const connectedNode = graph.nodes.find(n => n.id === edge.to);
          if (connectedNode && !relevantNodeIds.has(edge.to)) {
            finalNodes.push(connectedNode);
            relevantNodeIds.add(edge.to);
          }
        }
        if (relevantNodeIds.has(edge.to)) {
          const connectedNode = graph.nodes.find(n => n.id === edge.from);
          if (connectedNode && !relevantNodeIds.has(edge.from)) {
            finalNodes.push(connectedNode);
            relevantNodeIds.add(edge.from);
          }
        }
      });
    }
    
    // Filter relevant edges
    const relevantNodeIds = new Set(finalNodes.map(n => n.id));
    const relevantEdges = graph.edges.filter(edge => 
      relevantNodeIds.has(edge.from) && relevantNodeIds.has(edge.to)
    );
    
    // Create context description
    const context = `
אסטרטגיית חיפוש: ${analysisResult.searchStrategy}
נמצאו ${finalNodes.length} צמתים רלוונטיים ו-${relevantEdges.length} קשרים
${analysisResult.needsIndirectConnections ? 'כולל קשרים עקיפים' : 'קשרים ישירים בלבד'}
${analysisResult.needsCounting ? 'שאלה מצריכה ספירה/חישוב' : ''}`;
    
    const selectedData = {
      nodes: finalNodes,
      edges: relevantEdges,
      context,
      tokenCount: estimateTokens(JSON.stringify({ nodes: finalNodes, edges: relevantEdges }))
    };
    
    console.log(`[LLM Selection] Selected ${finalNodes.length} nodes, ${relevantEdges.length} edges`);
    logTokenUsage('Selected Graph Data', selectedData, true);
    
    return selectedData;
    
  } catch (error) {
    console.error('[LLM Analysis] Failed, falling back to keyword-based selection:', error);
    
    // Fallback to simple keyword matching if LLM analysis fails
    const questionLower = question.toLowerCase();
    const keywords = questionLower.split(/\s+/).filter(w => w.length > 2);
    
    const relevantNodes = graph.nodes.filter(node => {
      const nodeName = (node.name || node.label || '').toLowerCase();
      const nodeType = (node.type || '').toLowerCase();
      
      return keywords.some(keyword => 
        nodeName.includes(keyword) || nodeType.includes(keyword)
      );
    });
    
    const relevantNodeIds = new Set(relevantNodes.map(n => n.id));
    const relevantEdges = graph.edges.filter(edge => 
      relevantNodeIds.has(edge.from) || relevantNodeIds.has(edge.to)
    );
    
    return {
      nodes: relevantNodes,
      edges: relevantEdges,
      context: 'שימוש בחיפוש מילות מפתח פשוט (נכשל ניתוח LLM)',
      tokenCount: estimateTokens(JSON.stringify({ nodes: relevantNodes, edges: relevantEdges }))
    };
  }
}

// Advanced LLM-based path finding for indirect connections
async function findIndirectConnections(
  sourceNodes: string[],
  targetQuery: string,
  graph: GraphData,
  fetchChatCompletion: (messages: LLMMessage[], tools?: any[]) => Promise<any>,
  maxHops: number = 3
): Promise<{ paths: any[], explanation: string }> {
  
  const pathFindingPrompt = `אתה מומחה לניתוח גרפים של מורשת תרבותית. עליך למצוא נתיבים (paths) בין צמתים בגרף.

נתונים:
- צמתי מקור: ${sourceNodes.join(', ')}
- יעד החיפוש: ${targetQuery}
- מקסימום ${maxHops} צעדים

גרף (JSON):
${JSON.stringify({ nodes: graph.nodes, edges: graph.edges }, null, 2)}

משימה: מצא את כל הנתיבים (עד ${maxHops} צעדים) מהצמתים המקור לצמתים שקשורים ל"${targetQuery}".

השב בפורמט JSON:
{
  "paths": [
    {
      "from": "צומת מקור",
      "to": "צומת יעד", 
      "steps": ["צעד1", "צעד2", "צעד3"],
      "connectionType": "ישיר/עקיף",
      "relevanceScore": 0-100
    }
  ],
  "explanation": "הסבר על הקשרים שנמצאו"
}`;

  console.log('[Path Finding] Searching for indirect connections...');
  logTokenUsage('Path Finding Prompt', pathFindingPrompt, true);
  
  try {
    const response = await fetchChatCompletion([
      { role: 'user', content: pathFindingPrompt }
    ]);
    
    let responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || 
                      response.message?.content || 
                      response.choices?.[0]?.message?.content || 
                      response.content || 
                      response;

    responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    const pathResult = JSON.parse(responseText);
    console.log('[Path Finding] Found paths:', pathResult);
    
    return pathResult;
    
  } catch (error) {
    console.error('[Path Finding] Failed:', error);
    return {
      paths: [],
      explanation: 'לא ניתן היה למצוא נתיבים עקיפים'
    };
  }
}

// Main modern LLM-based chat function
export async function chatGraphModern(
  question: string,
  graph: GraphData,
  fetchChatCompletion: (messages: LLMMessage[], tools?: any[]) => Promise<any>
): Promise<string> {
  console.log('[Modern Graph Query] Starting LLM-first approach:', question);
  logTokenUsage('Full Graph Input', graph, true);
  
  // Step 1: Create graph summary for LLM understanding
  const summary = createGraphSummary(graph);
  console.log('[Graph Summary]', summary);
  
  // Step 2: LLM-powered data selection
  const relevantData = await selectRelevantGraphData(question, graph, summary, fetchChatCompletion);
  console.log(`[Data Selection] Using ${relevantData.nodes.length} nodes, ${relevantData.edges.length} edges`);
  
  // Step 3: Check if we need to find indirect connections
  const questionLower = question.toLowerCase();
  let indirectConnections = null;
  
  if (questionLower.includes('עקיף') || questionLower.includes('קשור')) {
    const sourceKeywords = questionLower.match(/(?:ל|עם|של)\s+([^\s]+)/g);
    if (sourceKeywords) {
      const sourceNodes = relevantData.nodes
        .filter(n => sourceKeywords.some(kw => 
          (n.name || n.label || '').toLowerCase().includes(kw.replace(/^(ל|עם|של)\s+/, ''))
        ))
        .map(n => n.name || n.label || n.id);
      
      if (sourceNodes.length > 0) {
        indirectConnections = await findIndirectConnections(
          sourceNodes, 
          question, 
          { nodes: relevantData.nodes, edges: relevantData.edges }, 
          fetchChatCompletion
        );
      }
    }
  }
  
  // Step 4: Build rich context for final answer
  const contextParts = [
    `מידע על הגרף:`,
    `${summary.totalNodes} צמתים בסך הכל, ${summary.totalEdges} קשרים`,
    ``,
    `נתונים רלוונטיים לשאלה:`,
    relevantData.context,
    ``,
    `צמתים רלוונטיים:`,
    relevantData.nodes.map(n => 
      `- ${n.name || n.label || n.id} (סוג: ${n.type}${n.meaning ? `, משמעות: ${n.meaning}` : ''})`
    ).join('\n'),
    ``,
    `קשרים רלוונטיים:`,
    relevantData.edges.map(e => {
      const fromNode = relevantData.nodes.find(n => n.id === e.from);
      const toNode = relevantData.nodes.find(n => n.id === e.to);
      return `- ${fromNode?.name || e.from} → ${toNode?.name || e.to}`;
    }).join('\n')
  ];
  
  if (indirectConnections && indirectConnections.paths.length > 0) {
    contextParts.push(
      ``,
      `קשרים עקיפים שנמצאו:`,
      indirectConnections.explanation,
      indirectConnections.paths.map(p => 
        `- ${p.from} → ${p.to} (${p.steps.join(' → ')}) - ${p.connectionType}`
      ).join('\n')
    );
  }
  
  const contextContent = contextParts.join('\n');
  
  // Step 5: Final LLM query with comprehensive context
  const systemMessage: LLMMessage = {
    role: 'system',
    content: `אתה עוזר מומחה לנכסי מורשת תרבותית עם יכולות ניתוח מתקדמות. 
אתה מבין גרפים מורכבים, קשרים ישירים ועקיפים, ויכול לספור ולחשב.

עליך לענות על השאלות בהתבסס על המידע שסופק ובאופן מדויק ומפורט.
אם אתה מחשב מספרים, הראה את תהליך החישוב.
אם אתה מזהה קשרים עקיפים, הסבר אותם בבירור.

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
  
  // Calculate token savings compared to sending full graph
  const originalTokens = estimateTokens(JSON.stringify(graph));
  const optimizedTokens = estimateTokens(contextContent);
  const savings = ((originalTokens - optimizedTokens) / originalTokens * 100).toFixed(1);
  
  console.log(`[Token Efficiency] Original: ${originalTokens.toLocaleString()}, Optimized: ${optimizedTokens.toLocaleString()}, Saved: ${savings}%`);
  console.log('[Modern Graph Query] Final answer:', answer.substring(0, 200) + '...');
  
  return answer.trim();
}
