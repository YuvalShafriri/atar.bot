import { estimateTokens, logTokenUsage, printTokenLogStyled } from './tokenCostService';

// modernGraphQueryService.tsx - LLM-First Heritage Graph Query Service
// Modern approach leveraging LLM capabilities instead of traditional algorithms

export type Node = {
  id: string;
  name?: string;
  label?: string;
  type: string;
  meaning?: string;
  heritageValue?: string;
  asset?: boolean; // Ensure this property is part of the type
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
  assetTypes: string[];
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
  
  const assetNodes = graph.nodes.filter(n => (n as any).asset === true);
  const assetTypes = [...new Set(assetNodes.map(n => n.type).filter(Boolean))];

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
  
  const valueNodes = graph.nodes.filter(n => 
    n.name?.includes('ערך') || 
    n.type?.includes('ערך') ||
    n.name?.includes('אדריכל') ||
    n.name?.includes('היסטורי') ||
    n.name?.includes('תרבותי')
  );
  
  const nodeConnections = new Map();
  graph.edges.forEach(edge => {
    const fromNode = graph.nodes.find(n => n.id === edge.from);
    const toNode = graph.nodes.find(n => n.id === edge.to);
    
    if (fromNode && toNode) {
      const pattern = `${fromNode.type} → ${toNode.type}`;
      nodeConnections.set(pattern, (nodeConnections.get(pattern) || 0) + 1);
    }
  });
  
  const sortedPatterns = Array.from(nodeConnections.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([pattern, count]) => `${pattern} (${count} קשרים)`);
  
  return {
    totalNodes: graph.nodes.length,
    totalEdges: graph.edges.length,
    nodeTypes: nodeTypes,
    assetTypes: assetTypes,
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
  
  // --- התיקון המרכזי נמצא כאן, בפרומפט ---
  const analysisPrompt = `אתה אנליסט מומחה לגרפים של מורשת תרבותית. עליך לנתח שאלה ולקבוע איזה חלק מהגרף רלוונטי לענות עליה.

**כלל יסוד (חשוב מאוד!):**
* **"נכס" או "נכס מורשת"** הוא אך ורק צומת (node) שהמאפיין \`asset\` שלו הוא \`true\`.
* כל שאר הצמתים הם צמתי משנה (ערכים, תקופות, אדריכלים וכו').
* כאשר השאלה מתייחסת ל"נכסים" (למשל, "אילו סוגי נכסים יש?", "סווג את הנכסים"), עליך להתייחס **אך ורק** לקבוצת הצמתים שעונים להגדרה זו.

סיכום הגרף:
- ${summary.totalNodes} צמתים, ${summary.totalEdges} קשרים
- סוגי נכסים (asset=true): ${summary.assetTypes.join(', ')}
- כלל סוגי הצמתים: ${summary.nodeTypes.join(', ')}
- מיקומים מרכזיים: ${summary.keyLocations.join(', ')}
- ערכים: ${summary.keyValues.join(', ')}
- דפוסי קשרים נפוצים: ${summary.connectionPatterns.join(', ')}

השאלה: "${question}"

אנא חזור עם רשימה של:
1. מילות מפתח לחיפוש צמתים רלוונטיים.
2. סוגי צמתים שכנראה רלוונטיים (בהתאם לכלל היסוד).
3. סוגי קשרים שכנראה רלוונטיים.
4. האם השאלה מצריכה חיפוש קשרים עקיפים.
5. האם השאלה מצריכה ספירה או חישוב.

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
    
    let responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || 
                      response.message?.content || 
                      response.choices?.[0]?.message?.content || 
                      response.content || 
                      response;

    responseText = responseText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
    
    const analysisResult = JSON.parse(responseText);
    console.log('[LLM Analysis] Query analysis result:', analysisResult);
    
    const relevantNodes = graph.nodes.filter(node => {
      const nodeName = (node.name || node.label || '').toLowerCase();
      const nodeType = (node.type || '').toLowerCase();
      
      const matchesKeywords = analysisResult.keywords.some((keyword: string) => 
        nodeName.includes(keyword.toLowerCase())
      );
      const matchesTypes = analysisResult.relevantNodeTypes.some((type: string) => 
        nodeType.includes(type.toLowerCase())
      );
      
      return matchesKeywords || matchesTypes;
    });
    
    let finalNodes = [...relevantNodes];
    if (analysisResult.needsIndirectConnections) {
      const relevantNodeIds = new Set(relevantNodes.map(n => n.id));
      
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
    
    const relevantNodeIds = new Set(finalNodes.map(n => n.id));
    const relevantEdges = graph.edges.filter(edge => 
      relevantNodeIds.has(edge.from) && relevantNodeIds.has(edge.to)
    );
    
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

export async function chatGraphModern(
  question: string,
  graph: GraphData,
  fetchChatCompletion: (messages: LLMMessage[], tools?: any[]) => Promise<any>
): Promise<string> {
  console.log('[QUERY MODE] מנגנון: מודרני/סוכן (Modern/Agent)');
  console.log('[Modern Graph Query] Starting LLM-first approach:', question);
  logTokenUsage('Full Graph Input', graph, true);
  
  const summary = createGraphSummary(graph);
  console.log('[Graph Summary]', summary);
  
  const relevantData = await selectRelevantGraphData(question, graph, summary, fetchChatCompletion);
  console.log(`[Data Selection] Using ${relevantData.nodes.length} nodes, ${relevantData.edges.length} edges`);
  
  const questionLower = question.toLowerCase();
  let indirectConnections: { paths: any[], explanation: string } | null = null;
  
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
  
  const systemMessage: LLMMessage = {
    role: 'system',
    content: `אתה עוזר מומחה לנכסי מורשת תרבותית עם יכולות ניתוח מתקדמות. 
אתה מבין גרפים מורכבים, קשרים ישירים ועקיפים, ויכול לספור ולחשב.

עליך לענות על השאלות בהתבסס על המידע שסופק ובאופן מדויק ומפורט.
אם אתה מחשב מספרים, הראה את תהליך החישוב.
אם אתה מזהה קשרים עקיפים, הסבר אותם בבירור.
**כלל יסוד (חשוב מאוד!):**
* **"נכס" או "נכס מורשת"** הוא אך ורק צומת (node) שהמאפיין \`asset\` שלו הוא \`true\`.
* כל שאר הצמתים הם צמתי משנה (ערכים, תקופות, אדריכלים וכו').
* כאשר השאלה מתייחסת ל"נכסים" (למשל, "אילו סוגי נכסים יש?", "סווג את הנכסים", "אילו נכסים בעלי ערך X?"), עליך להתייחס **אך ורק** לקבוצת הצמתים שעונים להגדרה זו.

אם השאלה מתייחסת למידע אחר, השתמש בצמתים ובקשרים הרלוונטיים בלבד.
אם יש לך ספקות, הסבר את ההנחות שלך.
--- 
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
  
  const originalTokens = estimateTokens(JSON.stringify(graph));
  const optimizedTokens = estimateTokens(contextContent);
  const savings = ((originalTokens - optimizedTokens) / originalTokens * 100).toFixed(1);
  
  console.log(`[Token Efficiency] Original: ${originalTokens.toLocaleString()}, Optimized: ${optimizedTokens.toLocaleString()}, Saved: ${savings}%`);
  console.log('[Modern Graph Query] ', answer.substring(0, 200) + '...');
  
  printTokenLogStyled({
    question,
    inputTokens: estimateTokens(JSON.stringify([systemMessage, userMessage])),
    outputTokens: estimateTokens(answer),
    graphTokens: originalTokens,
    ragTokens: optimizedTokens,
    model: 'gemini-2.5-flash-lite',
    cost: undefined,
    timeMs: undefined
  });
  
  return answer.trim();
}