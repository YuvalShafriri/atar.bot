// Node.js script to generate a lightweight meta-graph from allGrapheClean.json
// Usage: node generate-meta-graph.cjs

const fs = require('fs');
const path = require('path');

const INPUT_PATH = path.join(__dirname, 'public', 'data', 'allGrapheClean.json');
const OUTPUT_PATH = path.join(__dirname, 'public', 'data', 'meta-graph-from-allGrapheClean.json');

function pickNodeFields(node) {
  // Only keep id, label/name, type, and color (if present)
  const { id, label, name, type, color } = node;
  return { id, label: label || name, type, color };
}

function pickEdgeFields(edge) {
  // Only keep from/source, to/target, label, and color (if present)
  const { from, to, source, target, label, color } = edge;
  return {
    from: from || source,
    to: to || target,
    label,
    color
  };
}

function main() {
  if (!fs.existsSync(INPUT_PATH)) {
    console.error('Input file not found:', INPUT_PATH);
    process.exit(1);
  }
  const allGrapheClean = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8'));  // צור מיפוי id -> label
  const idToLabel = new Map();
  for (const node of allGrapheClean.nodes) {
    idToLabel.set(node.id, node.label || node.name);
  }

  // סנן צמתים מסוג "הערכה"
  const filteredNodes = Array.isArray(allGrapheClean.nodes)
    ? allGrapheClean.nodes.filter(n => n.type !== 'HeritageAssetAssessment')
    : [];

  // צור nodes חדשים עם id=label, meaning מלא
  const metaNodes = filteredNodes.map(node => ({
    id: node.label || node.name,
    label: node.label || node.name,
    type: node.type,
    color: node.color,
    meaning: node.meaning // meaning מלא, ללא קיצור
  }));

  // ids של צמתים שהוסרו
  const assessmentNodeIds = new Set(
    allGrapheClean.nodes.filter(n => n.type === 'HeritageAssetAssessment').map(n => n.id)
  );

  // edges: רק כאלה שלא מחוברים ל-assessment, ועם from/to לפי label
  const filteredEdges = Array.isArray(allGrapheClean.edges)
    ? allGrapheClean.edges.filter(e => !assessmentNodeIds.has(e.from || e.source) && !assessmentNodeIds.has(e.to || e.target))
    : [];
  const metaEdges = filteredEdges.map(edge => ({
    from: idToLabel.get(edge.from || edge.source),
    to: idToLabel.get(edge.to || edge.target),
    label: edge.label,
    color: edge.color
  })).filter(e => e.from && e.to); // ודא שאין undefined
  const metaGraph = {
    title: 'מטא-גרף כלל הנכסים',
    description: 'גרף מטא מופשט: ids הם שמות הצמתים, ללא צמתי הערכה, ועם משמעות מלאה. תמצות meaning יתבצע ע"י מודל שפה.',
    nodes: metaNodes,
    edges: metaEdges
  };
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(metaGraph, null, 2), 'utf8');
  console.log('Meta-graph generated at', OUTPUT_PATH);
}

main();
