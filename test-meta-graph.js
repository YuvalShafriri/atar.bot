// Test file to check meta-graph token estimation
const fs = require('fs');

// Mock the meta-graph config (simplified)
const mockConfig = {
  meta_graph: {
    title: "גרף מטא-נתונים - כלל הנכסים",
    description: "גרף מסכם המציג את הקטגוריות והקשרים העיקריים בין נכסי המורשת",
    nodes: [
      {id: "archaeological_theme", label: "נכסים ארכיאולוגיים", type: "נושא", title: "3 נכסים"},
      {id: "industrial_theme", label: "נכסי תעשייה", type: "נושא", title: "4 נכסים"},
      {id: "residential_theme", label: "נכסי מגורים", type: "נושא", title: "4 נכסים"},
      {id: "agricultural_theme", label: "נכסי חקלאות", type: "נושא", title: "5 נכסים"},
      {id: "mandate_theme", label: "נכסי המנדט", type: "נושא", title: "6 נכסים"},
      {id: "northern_region", label: "אזור הצפון", type: "אזור", title: "8 נכסים"},
      {id: "central_region", label: "אזור המרכז", type: "אזור", title: "10 נכסים"},
      {id: "southern_region", label: "אזור הדרום", type: "אזור", title: "6 נכסים"},
      {id: "historical_value", label: "ערך היסטורי", type: "ערך", title: "18 נכסים"},
      {id: "social_value", label: "ערך חברתי", type: "ערך", title: "12 נכסים"}
    ],
    edges: [
      {from: "archaeological_theme", to: "historical_value", label: "מאופיינים ב"},
      {from: "industrial_theme", to: "central_region", label: "מרוכז ב"},
      {from: "mandate_theme", to: "historical_value", label: "בעל"}
    ]
  }
};

function generateMockMetaGraphContext() {
    const metaGraph = mockConfig.meta_graph;
    
    let context = `מטא-גרף של כל נכסי המורשת:\n\n`;
    context += `${metaGraph.title}\n`;
    context += `${metaGraph.description}\n\n`;
    
    // Group nodes by type
    const nodesByType = {};
    metaGraph.nodes.forEach(node => {
        if (!nodesByType[node.type]) {
            nodesByType[node.type] = [];
        }
        nodesByType[node.type].push(node);
    });
    
    // Add nodes by category
    Object.entries(nodesByType).forEach(([type, nodes]) => {
        context += `${type}:\n`;
        nodes.forEach(node => {
            context += `- ${node.label}${node.title ? ` (${node.title})` : ''}\n`;
        });
        context += '\n';
    });
    
    // Add key relationships
    context += `קשרים עיקריים:\n`;
    metaGraph.edges.forEach(edge => {
        const fromNode = metaGraph.nodes.find(n => n.id === edge.from);
        const toNode = metaGraph.nodes.find(n => n.id === edge.to);
        if (fromNode && toNode) {
            context += `- ${fromNode.label} ${edge.label || '→'} ${toNode.label}\n`;
        }
    });
    
    return context;
}

console.log('=== Meta-Graph Context Test ===');
const context = generateMockMetaGraphContext();
console.log(context);

console.log('\n=== Token Estimation ===');
const tokenCount = Math.ceil(context.length / 3.5);
console.log(`Estimated tokens: ${tokenCount}`);
console.log(`Context length: ${context.length} characters`);
console.log(`Characters per token: 3.5 (estimated for Hebrew/English)`);

// Comparison with old method
const oldTokenCount = 5500;
const reduction = ((oldTokenCount - tokenCount) / oldTokenCount * 100).toFixed(1);
console.log(`\nToken reduction: ${reduction}% (from ~${oldTokenCount} to ~${tokenCount})`);
console.log(`Speedup factor: ${(oldTokenCount / tokenCount).toFixed(1)}x faster API calls`);
