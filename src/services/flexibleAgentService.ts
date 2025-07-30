// enhancedAgentService.ts - Flexible Heritage Graph Query Agent Service
// Simplified and more flexible approach - let LLM think and reason

import { estimateTokens, logTokenUsage, printTokenLogStyled } from './tokenCostService';

export type Node = {
  id: string;
  name?: string;
  label?: string;
  type: string;
  meaning?: string;
  heritageValue?: string;
  asset?: boolean;
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

// Simple query context
interface EnhancedQueryContext {
  queryType: 'flexible';
  targetAssets: string[];
  confidenceLevel: number;
}

// Simplified, flexible context creation
function createFlexibleContext(graph: GraphData, selectedAssets: string[], maxTokens: number = 3000): string {
  const contextParts: string[] = [];
  let usedTokens = 0;

  // 1. Basic asset information
  if (selectedAssets.length > 0) {
    const assetsInfo = selectedAssets.map(assetId => {
      const asset = graph.nodes.find(n => n.id === assetId);
      return asset ? `${asset.name || asset.id} (${asset.type}): ${asset.meaning || 'אין תיאור'}` : assetId;
    }).join('\n');
    contextParts.push(`נכסים נבחרים:\n${assetsInfo}`);
    usedTokens += estimateTokens(assetsInfo);
  }

  // 2. All connections (let LLM decide what's important)
  const allConnections: string[] = [];
  selectedAssets.forEach(assetId => {
    graph.edges.forEach(edge => {
      if (edge.from === assetId || edge.to === assetId) {
        const otherId = edge.from === assetId ? edge.to : edge.from;
        const otherNode = graph.nodes.find(n => n.id === otherId);
        const direction = edge.from === assetId ? '→' : '←';
        allConnections.push(`${assetId} ${direction} [${edge.label || 'קשר'}] ${otherNode?.name || otherId} (${otherNode?.type || 'לא ידוע'})`);
      }
    });
  });
  
  if (allConnections.length && usedTokens < maxTokens * 0.7) {
    const connectionsText = allConnections.slice(0, 20).join('\n'); // Limit to prevent overflow
    contextParts.push(`קשרים:\n${connectionsText}`);
    usedTokens += estimateTokens(connectionsText);
  }

  // 3. All available nodes by type (for frequency analysis)
  const nodesByType: Record<string, string[]> = {};
  graph.nodes.forEach(node => {
    if (!nodesByType[node.type]) nodesByType[node.type] = [];
    nodesByType[node.type].push(node.name || node.id);
  });

  if (usedTokens < maxTokens * 0.9) {
    const typesText = Object.entries(nodesByType)
      .map(([type, names]) => `${type}: ${names.slice(0, 10).join(', ')}`)
      .join('\n');
    contextParts.push(`סוגי צמתים במאגר:\n${typesText}`);
  }

  return contextParts.join('\n\n');
}

// Enhanced chat function with improved flexibility
export async function chatGraphEnhanced(
  question: string,
  graph: GraphData,
  fetchChatCompletion: (messages: LLMMessage[], tools?: any[]) => Promise<any>
): Promise<{ answer: string; queryContext: EnhancedQueryContext }> {
  console.log('[QUERY MODE] מנגנון: גמיש ופתוח (Flexible Agent)');
  
  // Simple context analysis
  const assets = graph.nodes.filter(n => n.asset === true);
  const selectedAssets = assets.map(a => a.id); // For now, use all assets
  
  const queryContext: EnhancedQueryContext = {
    queryType: 'flexible',
    targetAssets: selectedAssets,
    confidenceLevel: 1.0
  };

  // Create flexible context
  const contextContent = createFlexibleContext(graph, selectedAssets, 3000);
  console.log(`[Flexible Agent] Context tokens: ${estimateTokens(contextContent)}`);

  // Build comprehensive system prompt
  let systemPrompt = `אתה עוזר AI חכם ומומחה לניתוח נתוני מורשת תרבותית בגרף ידע. 

## יכולות הניתוח שלך:
- זיהוי דפוסים וקשרים בין נכסי מורשת
- ניתוח תדירות של ערכים, סוגים, ומשמעויות
- השוואה והשלמה בין נכסים שונים
- זיהוי תובנות מעמיקות מהנתונים

## הנחיות עיצוב תשובה (HIL):
1. **פתיחה:** 👉 שורת סיכום תמציתית שעונה ישירות על השאלה
2. **גוף התשובה:** חלק לבלוקים לוגיים עם אייקונים:
   - ✅ מידע מלא וודאי
   - ⚠️ מידע חלקי או דורש זהירות  
   - ℹ️ מידע רקע או הסבר
3. **סגנון:** עברית ברורה וקצרה, ללא רשימות מיותרות
4. **חשיבה:** הראה תהליך חשיבה קצר, אך דגש על התוצאה

## הבנת סוגי שאלות:
**"ערכים חוזרים"** = צמתים מסוג "ערך" שמופיעים הכי הרבה
**"סוגים חוזרים"** = סוגי הצמתים הנפוצים ביותר  
**"משמעויות חוזרות"** = ביטויים או מושגים שחוזרים בשדה meaning
**"קשרים ישירים"** = חיבורים ישירים בין נכסים (edge)
**"קשרים עקיפים"** = צמתים משותפים שמחברים נכסים

## דוגמאות לסוגי תשובות:
- **שאלת תדירות:** ספור וסדר לפי כמות הופעות
- **שאלת השוואה:** מצא דמיון והבדלים מובהקים
- **שאלת תובנות:** חלץ משמעויות מעמיקות ודפוסים

הנתונים:
${contextContent}

השאלה: "${question}"

תחשוב כ-AI חכם וענה בצורה גמישה ומעמיקה על השאלה.`;

  const userMessage: LLMMessage = { 
    role: 'user', 
    content: question 
  };

  const systemMessage: LLMMessage = {
    role: 'system',
    content: systemPrompt
  };

  logTokenUsage('Flexible Agent Input', [systemMessage, userMessage], true);

  const response = await fetchChatCompletion([systemMessage, userMessage]);

  const answer = response.candidates?.[0]?.content?.parts?.[0]?.text || 
                response.message?.content || 
                response.choices?.[0]?.message?.content || 
                'לא ניתן היה לענות על השאלה על בסיס המידע הזמין';

  logTokenUsage('Flexible Agent Response', answer, false);

  // Log token usage
  printTokenLogStyled({
    question,
    inputTokens: estimateTokens(JSON.stringify([systemMessage, userMessage])),
    outputTokens: estimateTokens(answer),
    model: 'gemini-2.5-flash-lite',
    cost: undefined,
    timeMs: undefined
  });

  return {
    answer: answer.trim(),
    queryContext
  };
}
