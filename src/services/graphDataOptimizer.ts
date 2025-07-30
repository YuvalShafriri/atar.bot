// graphDataOptimizer.ts - JSON Optimization Utilities
// Tools for reducing token usage while maintaining data integrity

interface OptimizationConfig {
  removeAssetFalse: boolean;
  shortenMeanings: boolean;
  maxMeaningLength: number;
  compactEdgeLabels: boolean;
  removeRedundantFields: boolean;
}

export interface OptimizedGraphData {
  nodes: any[];
  edges: any[];
  metadata: {
    originalTokens: number;
    optimizedTokens: number;
    savings: number;
    optimizations: string[];
  };
}

const DEFAULT_CONFIG: OptimizationConfig = {
  removeAssetFalse: true,
  shortenMeanings: true,
  maxMeaningLength: 80,
  compactEdgeLabels: true,
  removeRedundantFields: true
};

// Common edge label mappings for Hebrew
const EDGE_LABEL_MAPPINGS: Record<string, string> = {
  'מהווה דוגמה ל-': 'דוגמה:',
  'חלק בלתי נפרד מ-': 'חלק מ:',
  'מיועד לשימור במסגרת': 'שימור:',
  'מייצגת את ה-': 'מייצג:',
  'בעל': 'עם:',
  'בעלת': 'עם:',
  'קשורה ל-': 'קשור:',
  'סמוך ל-': 'ליד:',
  'ממוקמת לאורך': 'לאורך:',
  'התפתח מ-': 'מ:',
  'העסיק את': 'העסיק:',
  'מחזק את ה-': 'מחזק:'
};

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 2.5);
}

export function optimizeGraphData(
  graphData: any,
  config: OptimizationConfig = DEFAULT_CONFIG
): OptimizedGraphData {
  const originalJson = JSON.stringify(graphData);
  const originalTokens = estimateTokens(originalJson);
  
  let optimizedData = JSON.parse(originalJson);
  const optimizations: string[] = [];

  // 1. Remove asset: false fields
  if (config.removeAssetFalse) {
    optimizedData.nodes = optimizedData.nodes.map((node: any) => {
      if (node.asset === false) {
        const { asset, ...nodeWithoutAsset } = node;
        return nodeWithoutAsset;
      }
      return node;
    });
    optimizations.push('הסרת asset: false');
  }

  // 2. Shorten meaning fields
  if (config.shortenMeanings) {
    optimizedData.nodes = optimizedData.nodes.map((node: any) => {
      if (node.meaning && node.meaning.length > config.maxMeaningLength) {
        const shortened = node.meaning.substring(0, config.maxMeaningLength) + '...';
        return { ...node, meaning: shortened };
      }
      return node;
    });
    optimizations.push(`קיצור תיאורים ל-${config.maxMeaningLength} תווים`);
  }

  // 3. Compact edge labels
  if (config.compactEdgeLabels) {
    optimizedData.edges = optimizedData.edges.map((edge: any) => {
      if (edge.label && EDGE_LABEL_MAPPINGS[edge.label]) {
        return { ...edge, label: EDGE_LABEL_MAPPINGS[edge.label] };
      }
      return edge;
    });
    optimizations.push('קיצור תוויות קשרים');
  }

  // 4. Remove redundant fields
  if (config.removeRedundantFields) {
    optimizedData.nodes = optimizedData.nodes.map((node: any) => {
      // Remove label if it's identical to id
      if (node.label === node.id) {
        const { label, ...nodeWithoutLabel } = node;
        return nodeWithoutLabel;
      }
      // Remove name if it's identical to id
      if (node.name === node.id) {
        const { name, ...nodeWithoutName } = node;
        return nodeWithoutName;
      }
      return node;
    });
    optimizations.push('הסרת שדות כפולים');
  }

  const optimizedJson = JSON.stringify(optimizedData);
  const optimizedTokens = estimateTokens(optimizedJson);
  const savings = originalTokens - optimizedTokens;

  return {
    nodes: optimizedData.nodes,
    edges: optimizedData.edges,
    metadata: {
      originalTokens,
      optimizedTokens,
      savings,
      optimizations
    }
  };
}

// Create optimized version of graphMaster.json
export function createOptimizedGraphMaster(graphData: any): OptimizedGraphData {
  const config: OptimizationConfig = {
    removeAssetFalse: true,
    shortenMeanings: true,
    maxMeaningLength: 60, // Shorter for this specific use
    compactEdgeLabels: true,
    removeRedundantFields: true
  };

  return optimizeGraphData(graphData, config);
}

// Validate that no asset nodes are lost in optimization
export function validateOptimization(original: any, optimized: OptimizedGraphData): boolean {
  const originalAssets = original.nodes.filter((n: any) => n.asset === true);
  const optimizedAssets = optimized.nodes.filter((n: any) => n.asset === true);
  
  if (originalAssets.length !== optimizedAssets.length) {
    console.error('אזהרה: נכסים אבדו באופטימיזציה!');
    return false;
  }

  // Check that all asset IDs are preserved
  const originalAssetIds = new Set(originalAssets.map((a: any) => a.id));
  const optimizedAssetIds = new Set(optimizedAssets.map((a: any) => a.id));
  
  for (const id of originalAssetIds) {
    if (!optimizedAssetIds.has(id)) {
      console.error(`אזהרה: נכס ${id} נעלם באופטימיזציה!`);
      return false;
    }
  }

  return true;
}
