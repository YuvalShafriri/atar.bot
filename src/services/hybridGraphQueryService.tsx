// hybridGraphQueryService.tsx - Advanced Hybrid Heritage Graph Query Service
// Enhanced RAG with semantic inference rules and heritage-specific logic

import { estimateTokens, logTokenUsage, Node, Edge, AssetNode, GraphData, LLMMessage } from './graphQueryService';

// Heritage inference rules configuration
export interface HeritageInferenceRule {
  id: string;
  name: string;
  description: string;
  weight: number;
  enabled: boolean;
  apply: (asset1: AssetNode, asset2: AssetNode, graph: GraphData) => HybridInferenceResult | null;
}

export interface HybridInferenceResult {
  connection: string;
  confidence: number;
  evidence: string[];
  type: 'direct' | 'indirect' | 'inferred';
}

// Enhanced RAG chunk with metadata and confidence scoring
export interface HybridRAGChunk {
  id: string;
  content: string;
  type: 'heritage_asset' | 'value_connection' | 'relationship' | 'inference' | 'pattern';
  relevanceScore?: number;
  confidence?: number;
  inferenceRules?: string[];
  metadata?: {
    assetIds?: string[];
    connectionType?: string;
    evidenceLevel?: 'high' | 'medium' | 'low';
  };
}

// Heritage inference rules - loaded from external JSON
let HERITAGE_INFERENCE_RULES: HeritageInferenceRule[] = [];

// Load inference rules from JSON
export function loadInferenceRules(rules: any[]): void {
  HERITAGE_INFERENCE_RULES = rules.map(rule => ({
    ...rule,
    apply: createRuleFunction(rule.id)
  }));
}

// Create rule application functions
function createRuleFunction(ruleId: string) {
  return (asset1: AssetNode, asset2: AssetNode, graph: GraphData): HybridInferenceResult | null => {
    switch (ruleId) {
      case 'shared_architect':
        return applySharedArchitectRule(asset1, asset2, graph);
      case 'same_period':
        return applySamePeriodRule(asset1, asset2, graph);
      case 'heritage_value':
        return applyHeritageValueRule(asset1, asset2, graph);
      case 'geographic_proximity':
        return applyGeographicProximityRule(asset1, asset2, graph);
      case 'architectural_style':
        return applyArchitecturalStyleRule(asset1, asset2, graph);
      default:
        return null;
    }
  };
}

// Rule 1: Shared Architect - נכסים של אותו אדריכל
function applySharedArchitectRule(asset1: AssetNode, asset2: AssetNode, graph: GraphData): HybridInferenceResult | null {
  const architects1 = findConnectedNodes(asset1.id, graph, ['אדריכל', 'מתכנן']);
  const architects2 = findConnectedNodes(asset2.id, graph, ['אדריכל', 'מתכנן']);
  
  const sharedArchitects = architects1.filter(arch1 => 
    architects2.some(arch2 => arch1.id === arch2.id)
  );
  
  if (sharedArchitects.length > 0) {
    return {
      connection: `אותו אדריכל: ${sharedArchitects.map(a => a.name || a.label).join(', ')}`,
      confidence: 0.9,
      evidence: [`שני הנכסים תוכננו על ידי ${sharedArchitects[0].name || sharedArchitects[0].label}`],
      type: 'inferred'
    };
  }
  
  return null;
}

// Rule 2: Same Period - נכסים מאותה תקופה
function applySamePeriodRule(asset1: AssetNode, asset2: AssetNode, graph: GraphData): HybridInferenceResult | null {
  const periods1 = findConnectedNodes(asset1.id, graph, ['תקופה', 'שנה', 'עשור']);
  const periods2 = findConnectedNodes(asset2.id, graph, ['תקופה', 'שנה', 'עשור']);
  
  const sharedPeriods = periods1.filter(period1 => 
    periods2.some(period2 => period1.id === period2.id)
  );
  
  if (sharedPeriods.length > 0) {
    return {
      connection: `אותה תקופה: ${sharedPeriods.map(p => p.name || p.label).join(', ')}`,
      confidence: 0.8,
      evidence: [`שני הנכסים נבנו באותה תקופה - ${sharedPeriods[0].name || sharedPeriods[0].label}`],
      type: 'inferred'
    };
  }
  
  return null;
}

// Rule 3: Heritage Value - ערך מורשת משותף
function applyHeritageValueRule(asset1: AssetNode, asset2: AssetNode, graph: GraphData): HybridInferenceResult | null {
  const values1 = findConnectedNodes(asset1.id, graph, ['ערך', 'חשיבות']);
  const values2 = findConnectedNodes(asset2.id, graph, ['ערך', 'חשיבות']);
  
  const sharedValues = values1.filter(value1 => 
    values2.some(value2 => value1.id === value2.id)
  );
  
  if (sharedValues.length > 0) {
    return {
      connection: `ערך מורשת משותף: ${sharedValues.map(v => v.name || v.label).join(', ')}`,
      confidence: 0.7,
      evidence: [`שני הנכסים חולקים ערך מורשת - ${sharedValues[0].name || sharedValues[0].label}`],
      type: 'inferred'
    };
  }
  
  return null;
}

// Rule 4: Geographic Proximity - קרבה גיאוגרפית
function applyGeographicProximityRule(asset1: AssetNode, asset2: AssetNode, graph: GraphData): HybridInferenceResult | null {
  const locations1 = findConnectedNodes(asset1.id, graph, ['מיקום', 'עיר', 'שכונה', 'אזור']);
  const locations2 = findConnectedNodes(asset2.id, graph, ['מיקום', 'עיר', 'שכונה', 'אזור']);
  
  const sharedLocations = locations1.filter(loc1 => 
    locations2.some(loc2 => loc1.id === loc2.id)
  );
  
  if (sharedLocations.length > 0) {
    return {
      connection: `קרבה גיאוגרפית: ${sharedLocations.map(l => l.name || l.label).join(', ')}`,
      confidence: 0.6,
      evidence: [`שני הנכסים ממוקמים באותו אזור - ${sharedLocations[0].name || sharedLocations[0].label}`],
      type: 'inferred'
    };
  }
  
  return null;
}

// Rule 5: Architectural Style - סגנון אדריכלי
function applyArchitecturalStyleRule(asset1: AssetNode, asset2: AssetNode, graph: GraphData): HybridInferenceResult | null {
  const styles1 = findConnectedNodes(asset1.id, graph, ['סגנון', 'אופי', 'זרם']);
  const styles2 = findConnectedNodes(asset2.id, graph, ['סגנון', 'אופי', 'זרם']);
  
  const sharedStyles = styles1.filter(style1 => 
    styles2.some(style2 => style1.id === style2.id)
  );
  
  if (sharedStyles.length > 0) {
    return {
      connection: `סגנון אדריכלי משותף: ${sharedStyles.map(s => s.name || s.label).join(', ')}`,
      confidence: 0.75,
      evidence: [`שני הנכסים בנויים באותו סגנון - ${sharedStyles[0].name || sharedStyles[0].label}`],
      type: 'inferred'
    };
  }
  
  return null;
}

// Helper function to find connected nodes by type
function findConnectedNodes(assetId: string, graph: GraphData, nodeTypes: string[]): Node[] {
  const directConnections = graph.edges
    .filter(e => e.from === assetId)
    .map(e => graph.nodes.find(n => n.id === e.to))
    .filter(n => n && nodeTypes.some(type => 
      n.type?.includes(type) || n.name?.includes(type) || n.label?.includes(type)
    )) as Node[];
  
  return directConnections;
}

// Analyze semantic patterns in the graph
function analyzeSemanticPatterns(graph: GraphData): HybridRAGChunk[] {
  const patterns: HybridRAGChunk[] = [];
  
  // Pattern 1: Architect-Asset clusters
  const architects = graph.nodes.filter(n => 
    n.name?.includes('אדריכל') || n.type?.includes('אדריכל')
  );
  
  architects.forEach(architect => {
    const designedAssets = graph.edges
      .filter(e => e.to === architect.id)
      .map(e => graph.nodes.find(n => n.id === e.from))
      .filter(n => n && (n.asset === true || n.Asset === true));
    
    if (designedAssets.length > 1) {
      const assetNames = designedAssets.map(a => a?.name || a?.label || a?.id);
      patterns.push({
        id: `architect_cluster_${architect.id}`,
        content: `אשכול אדריכלי: ${architect.name || architect.label}
נכסים מתוכננים: ${assetNames.join(', ')}
קשר משותף: כולם עוצבו על ידי אותו אדריכל
סוג דפוס: אשכול מקצועי`,
        type: 'pattern',
        confidence: 0.9,
        metadata: {
          assetIds: designedAssets.map(a => a!.id),
          connectionType: 'architect_cluster',
          evidenceLevel: 'high'
        }
      });
    }
  });
  
  // Pattern 2: Period-based groupings
  const periods = graph.nodes.filter(n => 
    n.name?.includes('תקופה') || n.name?.includes('שנה') || n.type?.includes('תקופה')
  );
  
  periods.forEach(period => {
    const periodAssets = graph.edges
      .filter(e => e.to === period.id)
      .map(e => graph.nodes.find(n => n.id === e.from))
      .filter(n => n && (n.asset === true || n.Asset === true));
    
    if (periodAssets.length > 1) {
      const assetNames = periodAssets.map(a => a?.name || a?.label || a?.id);
      patterns.push({
        id: `period_cluster_${period.id}`,
        content: `אשכול תקופתי: ${period.name || period.label}
נכסים מהתקופה: ${assetNames.join(', ')}
קשר משותף: כולם נבנו באותה תקופה
סוג דפוס: אשכול זמני`,
        type: 'pattern',
        confidence: 0.8,
        metadata: {
          assetIds: periodAssets.map(a => a!.id),
          connectionType: 'period_cluster',
          evidenceLevel: 'high'
        }
      });
    }
  });
  
  return patterns;
}

// Enhanced hybrid chunk creation
function createHybridRAGChunks(graph: GraphData): HybridRAGChunk[] {
  const chunks: HybridRAGChunk[] = [];
    // 1. Basic heritage asset chunks (from original service) - ENHANCED
  const heritageAssets = graph.nodes.filter(n => n.asset === true || n.Asset === true);
  
  heritageAssets.forEach(asset => {
    const directConnections = graph.edges
      .filter(e => e.from === asset.id)
      .map(e => {
        const target = graph.nodes.find(n => n.id === e.to);
        const targetName = target ? target.name || target.label || target.id : e.to;
        return e.label ? `${targetName} (${e.label})` : targetName;
      });
    
    // ⭐ ENHANCED: הוספת מידע מפורט יותר על קשרים ישירים
    const directConnectionsDetailed = graph.edges
      .filter(e => e.from === asset.id)
      .map(e => {
        const target = graph.nodes.find(n => n.id === e.to);
        const targetName = target ? target.name || target.label || target.id : e.to;
        return { target: targetName, label: e.label, targetType: target?.type };
      });
    
    let contentDetails = `נכס מורשת: ${asset.name || asset.label || asset.id}
סוג: ${asset.type}
${asset.meaning ? `משמעות: ${asset.meaning}` : ''}
קשרים ישירים: ${directConnections.join(', ')}`;

    // הוספת פרטים על קשרים חשובים
    const importantConnections = directConnectionsDetailed.filter(conn => 
      conn.label && (
        conn.label.includes('חלק מ') ||
        conn.label.includes('כולל') ||
        conn.label.includes('שייך ל') ||
        conn.label.includes('מרכיב ב')
      )
    );
    
    if (importantConnections.length > 0) {
      contentDetails += `\nקשרים מבניים חשובים: `;
      contentDetails += importantConnections.map(conn => 
        `${asset.name || asset.label} ${conn.label} ${conn.target}`
      ).join(', ');
    }

    const chunk: HybridRAGChunk = {
      id: `asset_${asset.id}`,
      content: contentDetails,
      type: 'heritage_asset',
      confidence: 1.0,
      metadata: {
        assetIds: [asset.id],
        evidenceLevel: 'high'
      }
    };
    
    chunks.push(chunk);
  });
  
  // 2. Inference-based chunks using heritage rules
  if (HERITAGE_INFERENCE_RULES.length > 0) {
    heritageAssets.forEach(asset1 => {
      heritageAssets.forEach(asset2 => {
        if (asset1.id !== asset2.id) {
          HERITAGE_INFERENCE_RULES
            .filter(rule => rule.enabled)
            .forEach(rule => {
              const inference = rule.apply(asset1, asset2, graph);
              if (inference) {
                chunks.push({
                  id: `inference_${rule.id}_${asset1.id}_${asset2.id}`,
                  content: `קשר היסק: ${asset1.name || asset1.label} ↔ ${asset2.name || asset2.label}
סוג קשר: ${inference.connection}
רמת ודאות: ${(inference.confidence * 100).toFixed(0)}%
עדויות: ${inference.evidence.join(', ')}`,
                  type: 'inference',
                  confidence: inference.confidence,
                  inferenceRules: [rule.id],
                  metadata: {
                    assetIds: [asset1.id, asset2.id],
                    connectionType: rule.id,
                    evidenceLevel: inference.confidence > 0.8 ? 'high' : 
                                 inference.confidence > 0.6 ? 'medium' : 'low'
                  }
                });
              }
            });
        }
      });
    });
  }
  
  // 3. Semantic pattern chunks
  const patternChunks = analyzeSemanticPatterns(graph);
  chunks.push(...patternChunks);
  
  return chunks;
}

// Enhanced search with inference rule prioritization
function searchHybridRelevantChunks(question: string, chunks: HybridRAGChunk[], maxChunks: number = 25): HybridRAGChunk[] {
  const questionLower = question.toLowerCase();
  const keywords = questionLower.split(/\s+/).filter(word => word.length > 2);
  
  const scoredChunks = chunks.map(chunk => {
    const contentLower = chunk.content.toLowerCase();
    let score = 0;
    
    // Base scoring (from original service)
    if (contentLower.includes(questionLower.trim())) {
      score += 200;
    }
    
    keywords.forEach(keyword => {
      const matches = (contentLower.match(new RegExp(keyword, 'g')) || []).length;
      score += matches * 15;
    });
    
    // ⭐ FIXED: עדיפות גבוהה מאוד לקשרים ישירים
    if (chunk.type === 'heritage_asset' && chunk.confidence === 1.0) {
      score += 300; // עדיפות עליונה לנכסי מורשת עם קשרים ישירים
    }
    
    // Hybrid-specific scoring
    
    // Prioritize inference chunks for connection queries, but AFTER direct connections
    if (questionLower.includes('קשר') || questionLower.includes('חיבור')) {
      if (chunk.type === 'inference') {
        score += 120; // נמוך יותר מקשרים ישירים
        score += (chunk.confidence || 0) * 80; // פחות בונוס על ודאות
      }
      if (chunk.type === 'pattern') {
        score += 100; // נמוך יותר מקשרים ישירים
      }
    }
    
    // Confidence-based scoring (נמוך יותר)
    if (chunk.confidence) {
      score += chunk.confidence * 30;
    }
    
    // Evidence level bonus
    if (chunk.metadata?.evidenceLevel === 'high') {
      score += 40;
    } else if (chunk.metadata?.evidenceLevel === 'medium') {
      score += 20;
    }
    
    // Inference rule bonuses for specific question types (נמוך יותר)
    if (chunk.inferenceRules) {
      if (questionLower.includes('אדריכל') && chunk.inferenceRules.includes('shared_architect')) {
        score += 60; // פחות מקודם
      }
      if (questionLower.includes('תקופה') && chunk.inferenceRules.includes('same_period')) {
        score += 60; // פחות מקודם
      }
      if (questionLower.includes('ערך') && chunk.inferenceRules.includes('heritage_value')) {
        score += 60; // פחות מקודם
      }
    }
    
    return { ...chunk, relevanceScore: score };
  });
  
  return scoredChunks
    .filter(chunk => chunk.relevanceScore! > 0)
    .sort((a, b) => b.relevanceScore! - a.relevanceScore!)
    .slice(0, maxChunks);
}

// Main hybrid chat function
export async function hybridChatGraph(
  question: string,
  graph: GraphData,
  fetchChatCompletion: (messages: LLMMessage[], tools?: any[]) => Promise<any>,
  inferenceRules?: any[]
): Promise<string> {
  console.log('[QUERY MODE] מנגנון: היברידי (Hybrid)');
  // Load inference rules if provided
  if (inferenceRules && inferenceRules.length > 0) {
    loadInferenceRules(inferenceRules);
  }
  
  console.log('🚀 [HYBRID] Starting advanced hybrid query:', question);
  logTokenUsage('Full Graph Input', graph, true);
  
  // Create hybrid chunks with inference capabilities
  const chunks = createHybridRAGChunks(graph);
  console.log(`🧠 [HYBRID] Created ${chunks.length} hybrid knowledge chunks`);
  
  // Enhanced search with inference prioritization
  const relevantChunks = searchHybridRelevantChunks(question, chunks, 25);
  console.log(`🔍 [HYBRID] Found ${relevantChunks.length} relevant chunks with inference`);
  
  // Build enhanced context
  const TARGET_CONTEXT_TOKENS = 2500; // Higher limit for hybrid approach
  let contextContent = '';
  let usedChunks = 0;
  
  for (const chunk of relevantChunks) {
    const testContent = contextContent + (contextContent ? '\n\n---\n\n' : '') + chunk.content;
    const testTokens = estimateTokens(testContent);
    
    if (testTokens <= TARGET_CONTEXT_TOKENS) {
      contextContent = testContent;
      usedChunks++;
    } else {
      break;
    }
  }
  
  console.log(`💡 [HYBRID] Using ${usedChunks} enhanced chunks within token limit`);
  logTokenUsage('Hybrid RAG Context', contextContent, true);
    // Enhanced system prompt for hybrid approach
  const systemMessage: LLMMessage = {
    role: 'system',
    content: `אתה עוזר מומחה לנכסי מורשת תרבותית עם יכולות היסק מתקדמות. 

**סדר עדיפויות לזיהוי קשרים**:
1. **קשרים ישירים** - חיפוש תחילה אחר קשרים מפורשים בגרף (חלק מ-, כולל, שייך ל-)
2. **קשרים עקיפים** - דרך צמתים משותפים  
3. **קשרים מוסקים** - על בסיס כללי מורשת מתקדמים

**יכולות מתקדמות**:
1. זיהוי קשרים ישירים מהגרף (עדיפות עליונה)
2. היסק קשרים עקיפים על בסיס כללי מורשת
3. ניתוח דפוסים סמנטיים באשכולות נכסים
4. הערכת רמת ודאות לכל קשר

**כללי תשובה**:
- **תמיד חפש קשרים ישירים תחילה** - אם יש קשר ישיר, הדגש אותו
- תשובות תמציתיות ומועילות למשתמש
- ציין את סוג הקשר: ישיר/עקיף/היסק רק אם רלוונטי
- **אל תסביר מגבלות או חסרונות טכניים**
- **אל תוסיף הסברים על יכולות המערכת**
- התמקד במה שיש ולא במה שחסר
- כשמוצא קשר ישיר, הזכר גם קשרים נוספים כהקשר אם רלוונטי

**מידע מהגרף (עדיפות לקשרים ישירים)**:
${contextContent}`
  };
  
  const userMessage: LLMMessage = { 
    role: 'user', 
    content: question 
  };
  
  logTokenUsage('Hybrid LLM Input', [systemMessage, userMessage], true);
  
  const response = await fetchChatCompletion([systemMessage, userMessage]);
  
  const answer = response.candidates?.[0]?.content?.parts?.[0]?.text || 
                response.message?.content || 
                response.choices?.[0]?.message?.content || 
                'לא ניתן היה לענות על השאלה על בסיס המידע הזמין';
  
  logTokenUsage('Hybrid LLM Response', answer, false);
  
  // Enhanced token summary
  const originalTokens = estimateTokens(JSON.stringify(graph));
  const contextTokens = estimateTokens(contextContent);
  const tokenSavings = originalTokens - contextTokens;
  const savingsPercent = ((tokenSavings / originalTokens) * 100).toFixed(1);
  
  console.log('');
  console.log('🎯 ===== HYBRID TOKEN SUMMARY =====');
  console.log(`📊 Question: "${question}"`);
  console.log(`📊 Input Graph: ${originalTokens.toLocaleString()} tokens`);
  console.log(`📊 Hybrid Context: ${contextTokens.toLocaleString()} tokens`);
  console.log(`📊 Inference Rules: ${HERITAGE_INFERENCE_RULES.length} active`);
  console.log(`📊 LLM Input: ${estimateTokens(JSON.stringify([systemMessage, userMessage])).toLocaleString()} tokens`);
  console.log(`📊 LLM Output: ${estimateTokens(answer).toLocaleString()} tokens`);
  console.log(`💰 Token Savings: ${tokenSavings.toLocaleString()} tokens (${savingsPercent}%)`);
  console.log(`💲 Estimated Cost: $${((contextTokens * 0.03 + estimateTokens(answer) * 0.06) / 1000).toFixed(4)}`);
  console.log('🎯 =====================================');
  console.log('');
  
  return answer.trim();
}
