// Node.js script to generate a lightweight meta-graph from allGrapheClean.json
// Usage: node generate-meta-graph.js

const fs = require('fs');
const path = require('path');

const INPUT_PATH = path.join(__dirname, 'public', 'data', 'allGrapheClean.json');
const OUTPUT_PATH = path.join(__dirname, 'public', 'data', 'meta-graph-from-allGrapheClean.json');

function pickNodeFields(node) {
  // Only keep id, label, type, and color (if present)
  const { id, label, type, color } = node;
  return { id, label, type, color };
}

function pickEdgeFields(edge) {
  // Only keep from, to, label, and color (if present)
  const { from, to, label, color } = edge;
  return { from, to, label, color };
}

function main() {
  if (!fs.existsSync(INPUT_PATH)) {
    console.error('Input file not found:', INPUT_PATH);
    process.exit(1);
  }
  const allGrapheClean = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));
  // The input is expected to be an object with assetId keys, each with nodes/edges/title/description
  const metaGraph = {
    title: 'מטא-גרף כלל הנכסים',
    description: 'גרף מופשט של כל הנכסים והקשרים המרכזיים ביניהם',
    nodes: [],
    edges: []
  };
  const nodeSet = new Map();
  const edgeSet = new Set();  for (const assetId in allGrapheClean) {
    const asset = allGrapheClean[assetId];
    if (!asset.nodes || !asset.edges) continue;
    for (const node of asset.nodes) {
      if (!nodeSet.has(node.id)) {
        nodeSet.set(node.id, pickNodeFields(node));
      }
    }
    for (const edge of asset.edges) {
      // Use a string key to deduplicate edges
      const key = `${edge.from}->${edge.label || ''}->${edge.to}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        metaGraph.edges.push(pickEdgeFields(edge));
      }
    }
  }
  metaGraph.nodes = Array.from(nodeSet.values());
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(metaGraph, null, 2), 'utf8');
  console.log('Meta-graph generated at', OUTPUT_PATH);
}

main();
