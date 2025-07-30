// enhancedAgentService.ts - Enhanced Heritage Graph Query Agent Service
// Improved flexibility, accuracy, and reduced token usage

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

// Enhanced query context with smart semantic understanding
interface EnhancedQueryContext {
  queryType: 'asset_specific' | 'general' | 'comparative' | 'analytical';
  targetAssets: string[];
  semanticCategories: string[];
  confidenceLevel: number;
  suggestedQuestions?: string[];
}

// Smart query categorization
function analyzeQueryIntent(question: string, graph: GraphData): EnhancedQueryContext {
  const questionLower = question.toLowerCase();
  const assets = graph.nodes.filter(n => n.asset === true);
  
  // Check if question mentions specific assets
  const mentionedAssets = assets.filter(asset => 
    questionLower.includes(asset.name?.toLowerCase() || '') ||
    questionLower.includes(asset.id.toLowerCase()) ||
    questionLower.includes(asset.label?.toLowerCase() || '')
  );

  const semanticCategories = [];
  
  // Detect semantic categories
  if (questionLower.includes('ערך') || questionLower.includes('חשיבות')) {
    semanticCategories.push('values');
  }
  if (questionLower.includes('סגנון') || questionLower.includes('אדריכל')) {
    semanticCategories.push('architecture');
  }
  if (questionLower.includes('תקופה') || questionLower.includes('היסטור')) {
    semanticCategories.push('historical');
  }
  if (questionLower.includes('קשר') || questionLower.includes('חיבור')) {
    semanticCategories.push('connections');
  }

  // Determine query type
  let queryType: EnhancedQueryContext['queryType'] = 'general';
  let confidenceLevel = 0.5;

  if (mentionedAssets.length === 1) {
    queryType = 'asset_specific';
    confidenceLevel = 0.9;
  } else if (mentionedAssets.length > 1) {
    queryType = 'comparative';
    confidenceLevel = 0.8;
  } else if (semanticCategories.length > 0) {
    queryType = 'analytical';
    confidenceLevel = 0.7;
  }

  return {
    queryType,
    targetAssets: mentionedAssets.map(a => a.id),
    semanticCategories,
    confidenceLevel,
    suggestedQuestions: generateContextualQuestions(queryType, mentionedAssets)
  };
}

// Generate contextual questions based on query context
function generateContextualQuestions(
  queryType: EnhancedQueryContext['queryType'],
  assets: AssetNode[],
  // Removed unused variable 'categories'
): string[] {
  const questions: string[] = [];

  if (queryType === 'asset_specific' && assets.length > 0) {
    const asset = assets[0];
    questions.push(
      `מה הערכים המרכזיים של ${asset.name || asset.id}?`,
      `איך ${asset.name || asset.id} קשור לנכסים אחרים?`,
      `מה הייחודיות של ${asset.name || asset.id}?`,
      `מה ההקשר ההיסטורי של ${asset.name || asset.id}?`
    );
  } else if (queryType === 'comparative' && assets.length > 1) {
    questions.push(
      `מה משותף בין הנכסים שנבחרו?`,
      `מה מבדיל בין הנכסים השונים?`,
      `איך הנכסים השונים משלימים זה את זה?`
    );
  } else {
    questions.push(
      "אילו סוגי נכסים יש במאגר?",
      "מה הקשרים בין נכסים שונים?",
      "אילו ערכים מרכזיים עולים מהמאגר?"
    );
  }

  return questions;
}

// --- Improved Direct Connection Formatting ---
function formatDirectConnections(graph: GraphData, assetId: string, directConns: Array<{ label: string; target: string; direction: 'from' | 'to'; targetId: string }>, otherSelectedAssets: string[]) {
  // If connection is 'חלק מ' and direction is 'to', format as 'A הוא חלק מ-B'
  return directConns.map(conn => {
    if (conn.label === 'חלק מ' && conn.direction === 'to') {
      return `${graph.nodes.find(n => n.id === assetId)?.name || assetId} הוא חלק מ${conn.target}`;
    }
    // If both assets are connected to a third entity, format as 'A ו-B הם חלק מ-C'
    if (conn.label === 'חלק מ' && otherSelectedAssets.includes(conn.targetId)) {
      return `${graph.nodes.find(n => n.id === assetId)?.name || assetId} ו-${conn.target} הם חלק מ${conn.target}`;
    }
    // General direct connection
    return `${graph.nodes.find(n => n.id === assetId)?.name || assetId} (${conn.label}) ←→ ${conn.target}`;
  }).join('\n');
}

// --- Direct and Indirect Connections Extraction ---
function extractConnections(graph: GraphData, assetIds: string[]) {
  const directConnections: Record<string, Array<{ label: string; target: string; direction: 'from' | 'to'; targetId: string }>> = {};
  const indirectConnections: Record<string, Array<{ sharedNode: string; assets: string[] }>> = {};

  assetIds.forEach(assetId => {
    // Direct connections: any edge where asset is from or to
    directConnections[assetId] = graph.edges
      .filter(e => e.from === assetId || e.to === assetId)
      .map(e => {
        const direction = e.from === assetId ? 'from' : 'to';
        const targetId = direction === 'from' ? e.to : e.from;
        const targetNode = graph.nodes.find(n => n.id === targetId);
        return {
          label: e.label || 'קשר',
          target: targetNode?.name || targetNode?.id || targetId,
          direction,
          targetId
        };
      });
  });

  // Indirect connections: shared nodes (not assets) connected to multiple selected assets
  const nonAssetNodes = graph.nodes.filter(n => !n.asset);
  nonAssetNodes.forEach(node => {
    const connectedAssets = graph.edges
      .filter(e => e.from === node.id || e.to === node.id)
      .map(e => {
        const otherId = e.from === node.id ? e.to : e.from;
        return assetIds.includes(otherId) ? otherId : null;
      })
      .filter(Boolean) as string[];
    if (connectedAssets.length > 1) {
      connectedAssets.forEach(assetId => {
        if (!indirectConnections[assetId]) indirectConnections[assetId] = [];
        indirectConnections[assetId].push({
          sharedNode: node.name || node.id,
          assets: connectedAssets.filter(a => a !== assetId)
        });
      });
    }
  });

  return { directConnections, indirectConnections };
}

// --- Improved Value Distribution for 'ערכים חוזרים' ---
function getValueDistribution(graph: GraphData, assetIds: string[]) {
  // Find all 'ערך' nodes connected to selected assets
  const valueCounts: Record<string, { name: string; count: number }> = {};
  assetIds.forEach(assetId => {
    graph.edges.forEach(edge => {
      const otherId = edge.from === assetId ? edge.to : edge.to === assetId ? edge.from : null;
      if (otherId) {
        const node = graph.nodes.find(n => n.id === otherId && n.type === 'ערך');
        if (node) {
          if (!valueCounts[node.id]) {
            valueCounts[node.id] = { name: node.name || node.id, count: 0 };
          }
          valueCounts[node.id].count++;
        }
      }
    });
  });
  // Sort by frequency
  return Object.values(valueCounts).sort((a, b) => b.count - a.count);
}

// --- General Frequent Type/Name/Meaning Analysis ---
function getFrequentAttributes(graph: GraphData, assetIds: string[], attribute: 'type' | 'name' | 'meaning') {
  const attrCounts: Record<string, { value: string; count: number }> = {};
  // Collect from selected assets and their directly connected nodes
  assetIds.forEach(assetId => {
    const asset = graph.nodes.find(n => n.id === assetId);
    if (asset && asset[attribute]) {
      const val = asset[attribute] as string;
      if (!attrCounts[val]) attrCounts[val] = { value: val, count: 0 };
      attrCounts[val].count++;
    }
    graph.edges.forEach(edge => {
      if (edge.from === assetId || edge.to === assetId) {
        const otherId = edge.from === assetId ? edge.to : edge.from;
        const node = graph.nodes.find(n => n.id === otherId);
        if (node && node[attribute]) {
          const val = node[attribute] as string;
          if (!attrCounts[val]) attrCounts[val] = { value: val, count: 0 };
          attrCounts[val].count++;
        }
      }
    });
  });
  // Sort by frequency
  return Object.values(attrCounts).sort((a, b) => b.count - a.count);
}

// --- Update createOptimizedContext for general frequent queries ---
function createOptimizedContext(
  graph: GraphData,
  queryContext: EnhancedQueryContext,
  maxTokens: number = 2000
): string {
  const contextParts: string[] = [];
  let usedTokens = 0;

  const { directConnections, indirectConnections } = extractConnections(graph, queryContext.targetAssets);

  // 1. Direct connection summary block (always first)
  if ((queryContext.queryType === 'asset_specific' || queryContext.queryType === 'comparative') && queryContext.targetAssets.length > 0) {
    queryContext.targetAssets.forEach(assetId => {
      const asset = graph.nodes.find(n => n.id === assetId);
      if (asset) {
        const directConns = directConnections[assetId] || [];
        const directSummary = directConns.length
          ? `✅ קשר ישיר: ${formatDirectConnections(graph, assetId, directConns, queryContext.targetAssets.filter(id => id !== assetId)).split('\n')[0]}`
          : '⚠️ אין קשר ישיר בין הנכסים.';
        if (usedTokens + estimateTokens(directSummary) < maxTokens) {
          contextParts.push(directSummary);
          usedTokens += estimateTokens(directSummary);
        }
      }
    });
  }

  // 2. Indirect connections and reasoning block
  if ((queryContext.queryType === 'asset_specific' || queryContext.queryType === 'comparative') && queryContext.targetAssets.length > 0) {
    queryContext.targetAssets.forEach(assetId => {
      const asset = graph.nodes.find(n => n.id === assetId);
      if (asset) {
        const indirectConns = indirectConnections[assetId] || [];
        const indirectBlock = indirectConns.length
          ? `ℹ️ קשרים עקיפים/משותפים (${indirectConns.length}):\n${indirectConns.map(ic => `• ${ic.sharedNode} (משותף עם: ${ic.assets.map(aid => graph.nodes.find(n => n.id === aid)?.name || aid).join(', ')})`).join('\n')}`
          : '';
        if (indirectBlock && usedTokens + estimateTokens(indirectBlock) < maxTokens) {
          contextParts.push(indirectBlock);
          usedTokens += estimateTokens(indirectBlock);
        }
      }
    });
  }

  // 3. Reasoning and asset info block
  if ((queryContext.queryType === 'asset_specific' || queryContext.queryType === 'comparative') && queryContext.targetAssets.length > 0) {
    queryContext.targetAssets.forEach(assetId => {
      const asset = graph.nodes.find(n => n.id === assetId);
      if (asset) {
        const assetInfo = `נכס: ${asset.name || asset.id} (${asset.type}) - ${asset.meaning || 'אין תיאור'}`;
        if (usedTokens + estimateTokens(assetInfo) < maxTokens) {
          contextParts.push(assetInfo);
          usedTokens += estimateTokens(assetInfo);
        }
      }
    });
  }

  // 4. Semantic categories: fix value extraction to only nodes of type 'ערך'
  if (usedTokens < maxTokens * 0.7) {
    queryContext.semanticCategories.forEach(category => {
      let relevantNodes: Node[] = [];
      switch (category) {
        case 'values':
          relevantNodes = graph.nodes.filter(node => node.type === 'ערך');
          break;
        case 'architecture':
          relevantNodes = graph.nodes.filter(node => node.type?.includes('סגנון') || node.type?.includes('אדריכל'));
          break;
        case 'historical':
          relevantNodes = graph.nodes.filter(node => node.type?.includes('תקופה') || node.type?.includes('אירוע'));
          break;
        default:
          relevantNodes = [];
      }
      const categoryInfo = relevantNodes
        .slice(0, 3)
        .map(n => `${n.name || n.id}: ${n.meaning || n.type}`)
        .join('; ');
      if (categoryInfo && usedTokens + estimateTokens(categoryInfo) < maxTokens) {
        contextParts.push(`${category}: ${categoryInfo}`);
        usedTokens += estimateTokens(categoryInfo);
      }
    });
  }

  // If question is about recurring values (semanticCategories includes 'values')
  if (queryContext.semanticCategories.includes('values') && queryContext.targetAssets.length > 0) {
    const valueDist = getValueDistribution(graph, queryContext.targetAssets);
    if (valueDist.length) {
      const valueSummary = `✅ ערכים חוזרים בנכסים שנבחרו:\n${valueDist.map(v => `• ${v.name} (${v.count} נכסים)` ).join('\n')}`;
      if (usedTokens + estimateTokens(valueSummary) < maxTokens) {
        contextParts.push(valueSummary);
        usedTokens += estimateTokens(valueSummary);
      }
    } else {
      const noValues = '⚠️ לא נמצאו ערכים חוזרים בין הנכסים שנבחרו.';
      contextParts.push(noValues);
      usedTokens += estimateTokens(noValues);
    }
  }

  // General frequent type/name/meaning queries
  if (queryContext.targetAssets.length > 0) {
    let frequentType = false, frequentName = false, frequentMeaning = false;
    const q = (queryContext.suggestedQuestions || []).join(' ') + (queryContext.semanticCategories || []).join(' ');
    if (/סוג/i.test(q) || /type/i.test(q)) frequentType = true;
    if (/שם/i.test(q) || /name/i.test(q)) frequentName = true;
    if (/משמעות/i.test(q) || /meaning/i.test(q)) frequentMeaning = true;
    // If user asks about frequent types
    if (frequentType) {
      const typeDist = getFrequentAttributes(graph, queryContext.targetAssets, 'type');
      if (typeDist.length) {
        const typeSummary = `✅ סוגים חוזרים בנכסים שנבחרו:\n${typeDist.map(t => `• ${t.value} (${t.count} הופעות)` ).join('\n')}`;
        contextParts.push(typeSummary);
        usedTokens += estimateTokens(typeSummary);
      }
    }
    // If user asks about frequent names
    if (frequentName) {
      const nameDist = getFrequentAttributes(graph, queryContext.targetAssets, 'name');
      if (nameDist.length) {
        const nameSummary = `✅ שמות חוזרים בנכסים שנבחרו:\n${nameDist.map(n => `• ${n.value} (${n.count} הופעות)` ).join('\n')}`;
        contextParts.push(nameSummary);
        usedTokens += estimateTokens(nameSummary);
      }
    }
    // If user asks about frequent meanings
    if (frequentMeaning) {
      const meaningDist = getFrequentAttributes(graph, queryContext.targetAssets, 'meaning');
      if (meaningDist.length) {
        const meaningSummary = `✅ משמעויות חוזרות בנכסים שנבחרו:\n${meaningDist.map(m => `• ${m.value} (${m.count} הופעות)` ).join('\n')}`;
        contextParts.push(meaningSummary);
        usedTokens += estimateTokens(meaningSummary);
      }
    }
    // Reasoning/insight block
    if (frequentType || frequentName || frequentMeaning) {
      contextParts.push('ℹ️ תובנות: סוגים/משמעויות/שמות חוזרים עשויים להצביע על דפוסים, מגמות, או ערכים מרכזיים במאגר. ניתוח זה מסייע בזיהוי מאפיינים בולטים והבנת ההקשר התרבותי או ההיסטורי של הנכסים.');
    }
  }

  // 5. General assets summary (unchanged)
  if (usedTokens < maxTokens * 0.8 && queryContext.queryType === 'general') {
    const assets = graph.nodes.filter(n => n.asset === true);
    const assetsSummary = `נכסים זמינים (${assets.length}): ${assets.map(a => a.name || a.id).join(', ')}`;
    if (usedTokens + estimateTokens(assetsSummary) < maxTokens) {
      contextParts.push(assetsSummary);
    }
  }

  return contextParts.join('\n\n');
}

// Enhanced chat function with improved flexibility
export async function chatGraphEnhanced(
  question: string,
  graph: GraphData,
  fetchChatCompletion: (messages: LLMMessage[], tools?: any[]) => Promise<any>
): Promise<{ answer: string; queryContext: EnhancedQueryContext }> {
  console.log('[QUERY MODE] מנגנון: מעורב מחודש (Enhanced Agent)');
  
  // Analyze query intent and context
  const queryContext = analyzeQueryIntent(question, graph);
  console.log('[Enhanced Agent] Query analysis:', queryContext);

  // Create optimized context
  const contextContent = createOptimizedContext(graph, queryContext, 2000);
  console.log(`[Enhanced Agent] Context tokens: ${estimateTokens(contextContent)}`);

  // Build enhanced system prompt based on query type
  let systemPrompt = `אתה עוזר מומחה לנכסי מורשת תרבותית עם הבנה מעמיקה של קשרים והקשרים.

הנחיות תצוגה (Human-in-the-Loop):
1. פתח כל תשובה בשורת סיכום תמציתית עם אייקון 👉.
2. הצג את התוצאה המרכזית (המשמעותית ביותר) תחילה, לדוג' התקופה/ערך/קשר משותף.
3. חלק תשובות ארוכות לבלוקים לוגיים, כל בלוק עם אייקון סטטוס (✅ מלא · ⚠️ חלקי · ℹ️ מידע).
4. הצג diff (בלוק קוד) רק עבור ההבדלים המשמעותיים בין הנכסים.
5. כתוב בעברית ברורה, קצרה, ללא רשימות מיותרות.
6. אם יש קשר משותף מרכזי (למשל תקופה עות'מאנית), פתח בו.
7. הצג את תהליך החשיבה בקצרה, אך הדגש את התוצאה.
8. אם חסר מידע, פתח באזהרה ⚠️.

**הגדרה בסיסית:** נכס מורשת = צומת עם asset: true בלבד.

**סוג השאלה:** ${queryContext.queryType}
**רמת ביטחון:** ${(queryContext.confidenceLevel * 100).toFixed(0)}%

`;

  // Add specific instructions based on query type
  switch (queryContext.queryType) {
    case 'asset_specific':
      systemPrompt += `השאלה מתמקדת בנכס/נכסים ספציפיים. התמקד בניתוח מעמיק של הנכס הנדון, הקשרים שלו, וייחודיותו.`;
      break;
    case 'comparative':
      systemPrompt += `השאלה משווה בין מספר נכסים. הדגש דמיון והבדלים, קשרים משותפים, ודפוסים.`;
      break;
    case 'analytical':
      systemPrompt += `השאלה דורשת ניתוח אנליטי. התמקד בדפוסים, מגמות, וקשרים רעיוניים.`;
      break;
    default:
      systemPrompt += `השאלה כללית על המאגר. ספק סקירה מקיפה ומבנה את התשובה בצורה ברורה.`;
  }

  systemPrompt += `

מידע רלוונטי:
${contextContent}

תענה בצורה ישירה, מדויקת ותמציתית. אם אין מידע מספיק - ציין זאת בבירור.

הערות:
- קשרים ישירים (חלק מ) הם קשרים מובהקים וברורים בין נכסים.
- קשרים משותפים הם קשרים פחות ישירים שעשויים להיות רלוונטיים להבנת ההקשר הכללי.
- יש לנתח את שני סוגי הקשרים ולהדגיש את החשיבות והמשמעות של כל אחד מהם.`;

  const userMessage: LLMMessage = { 
    role: 'user', 
    content: question 
  };

  const systemMessage: LLMMessage = {
    role: 'system',
    content: systemPrompt
  };

  logTokenUsage('Enhanced Agent Input', [systemMessage, userMessage], true);

  const response = await fetchChatCompletion([systemMessage, userMessage]);

  const answer = response.candidates?.[0]?.content?.parts?.[0]?.text || 
                response.message?.content || 
                response.choices?.[0]?.message?.content || 
                'לא ניתן היה לענות על השאלה על בסיס המידע הזמין';

  logTokenUsage('Enhanced Agent Response', answer, false);

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
