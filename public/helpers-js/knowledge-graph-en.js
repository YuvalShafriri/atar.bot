/* knowledge-graph.js - Atar.Bot Knowledge Graph Engine */

/**
 * פונקציה לטיפול בנתוני גרף ידע עם הגנה מפני תווים מיוחדים
 * @param {Object} rawData - אובייקט הנתונים הגולמי מהבוט
 * @returns {Object} - נתונים מעובדים ומוכנים לגרף
 */
function processKnowledgeGraphData(rawData) {
  // פונקציה עזר לניקוי תווים מיוחדים מטקסטים
  function sanitizeText(text) {
    if (typeof text !== 'string') return text;
    return text
      .replace(/[""]/g, '"')  // החלפת תווי ציטוט מיוחדים
      .replace(/['']/g, "'")  // החלפת אפוסטרופים מיוחדים
      .trim();
  }
  
  // פונקציה עזר לניקוי אובייקט באופן רקורסיבי
  function sanitizeObject(obj) {
    if (typeof obj === 'string') {
      return sanitizeText(obj);
    } else if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    } else if (obj && typeof obj === 'object') {
      const cleaned = {};
      for (const [key, value] of Object.entries(obj)) {
        cleaned[sanitizeText(key)] = sanitizeObject(value);
      }
      return cleaned;
    }
    return obj;
  }
  
  // אם הנתונים הם כבר מחרוזת JSON, נפענח אותם
  let data;
  if (typeof rawData === 'string') {
    try {
      // ניקוי ראשוני של המחרוזת
      const cleanedString = sanitizeText(rawData);
      data = JSON.parse(cleanedString);
    } catch (e) {
      console.error('שגיאה בפענוח JSON:', e);
      // ניסיון נוסף עם רגקס לתיקון בעיות נפוצות
      try {
        const fixedString = rawData
          .replace(/([{,]\s*)([a-zA-Zא-ת_][a-zA-Zא-ת0-9_]*)\s*:/g, '$1"$2":')  // הוספת ציטוטים למפתחות
          .replace(/:\s*([a-zA-Zא-ת][^",}\]]*?)(\s*[,}\]])/g, ': "$1"$2');        // הוספת ציטוטים לערכים
        data = JSON.parse(fixedString);
      } catch (e2) {
        console.error('גם הניסיון השני נכשל:', e2);
        return { nodes: [], edges: [] };
      }
    }
  } else {
    data = rawData;
  }
  
  // ולידציה בסיסית
  if (!data.nodes || !data.edges) {
    console.error('מבנה נתונים לא תקין - חסרים nodes או edges');
    return { nodes: [], edges: [] };
  }
  
  // ניקוי הנתונים מתווים מיוחדים
  const cleanedData = sanitizeObject(data);
  
  // וולידציה שכל הצמתים יש להם ID ושם
  cleanedData.nodes.forEach((node, index) => {
    if (!node.id) node.id = index + 1;
    if (!node.name) node.name = `Entity ${node.id}`; // switched to English
    if (!node.type) node.type = 'general'; // default English type
  });
  
  return cleanedData;
}

// Color map by English lowercase type name
const COLOR_BY_TYPE = {
/**
 * COLOR_BY_TYPE: Node color palette for Knowledge Graph
 * ----------------------------------------------------
 * Key = node.type (lowercase English)
 * Value = { background: <rgba>, border: <hex> }
 * 
 * Edit this map to change node colors for each entity type.
 * Unmatched types use the 'general' fallback color.
 *
 * Example:
 *   'event': { background: 'rgba(255,160,122,0.7)', border: '#FFA07A' },
 *
 * Types:
 *   - natural phenomenon
 *   - structure
 *   - architectural element
 *   - person
 *   - event
 *   - story / narrative
 *   - social group
 *   - cultural value
 *   - place
 *   - artefact / artwork
 *   - tradition / custom
 *   - historical period
 *   - religion / belief
 *   - collective memory
 *   - general (fallback)
 */
  'natural phenomenon': { background: 'rgba(30,144,255,0.7)', border: '#1E90FF' },
  'structure':          { background: 'rgba(178,34,34,0.7)', border: '#B22222' },
  'architectural element': { background: 'rgba(129,199,132,0.7)', border: '#81C784' },
  'person':             { background: 'rgba(255,105,180,0.7)', border: '#FF69B4' },
  'event':              { background: 'rgba(255,160,122,0.7)', border: '#FFA07A' },
  'story / narrative':  { background: 'rgba(255,228,181,0.7)', border: '#FFE4B5' },
  'social group':       { background: 'rgba(255,215,0,0.7)', border: '#FFD700' },
  'cultural value':     { background: 'rgba(255,193,7,0.7)', border: '#FFC107' },
  'place':              { background: 'rgba(100,149,237,0.7)', border: '#6495ED' },
  'artefact / artwork': { background: 'rgba(128,0,128,0.7)', border: '#800080' },
  'tradition / custom': { background: 'rgba(139,69,19,0.7)', border: '#8B4513' },
  'historical period':  { background: 'rgba(0,180,180,0.7)', border: '#00B4B4' },
  'religion / belief':  { background: 'rgba(218,112,214,0.7)', border: '#DA70D6' },
  'collective memory':  { background: 'rgba(75,0,130,0.7)', border: '#4B0082' },
  'general':            { background: 'rgba(200,200,200,0.6)', border: '#666666' }
};

// עיבוד הנתונים והכנת הגרף
const processedData = processKnowledgeGraphData(DATA);
processedData.nodes.forEach(n => {
  if (!n.label) n.label = n.name;
  const key = (n.type || 'general').toString().trim().toLowerCase();
  const col = COLOR_BY_TYPE[key] || COLOR_BY_TYPE['general'];
  n.color = n.color || { background: col.background, border: col.border };
});

const nodes = new vis.DataSet(processedData.nodes);
const edges = new vis.DataSet(processedData.edges);
const container = document.getElementById('mynetwork');
const data = { nodes, edges };

const options = {
nodes: {
shape: 'box',
font: { align: 'center', size: 14, color: '#333333' },
borderWidth: 1,
margin: { top: 8, right: 10, bottom: 8, left: 10 },
widthConstraint: { maximum: 160 }
},
edges: {
arrows: { to: { enabled: true, scaleFactor: 0.4 } },
font: { align: 'middle', size: 11, color: '#555555', strokeWidth: 0, background: 'white' },
smooth: { type: 'cubicBezier', forceDirection: 'horizontal', roundness: 0.5 },
color: { color: '#848484', highlight: '#333333', hover: '#555555', inherit: false }
},
layout: { improvedLayout: true },
physics: {
enabled: true,
solver: 'repulsion',
repulsion: {
  nodeDistance: 260,      // Minimum distance (in px) between nodes (higher = more spread out)
  centralGravity: 0.03,   // Pulls nodes toward the center (higher = tighter cluster)
  springLength: 22,       // Ideal length of the edge springs (in px)
  springConstant: 0.003,  // Strength of the spring force (higher = stiffer springs)
  damping: 0.1           // Friction/resistance (higher = slower movement, less oscillation)
},
stabilization: {
  iterations: 2500,       // Number of simulation steps to stabilize the layout
  fit: true               // Fit the graph to the viewport after stabilization
},
interaction: { hover: true, tooltipDelay: 300000 }
},

const network = new vis.Network(container, data, options);

// ניהול חלון מידע
network.on('click', params => {
const info = document.getElementById('infowindow');
if (params.nodes.length) {
const node = nodes.get(params.nodes[0]);
document.getElementById('info_name').innerText = node.name;
document.getElementById('info_type').innerText = node.type;
//document.getElementById('info_heritageValue').innerText = node.heritageValue || '—';
document.getElementById('info_meaning').innerText = node.meaning || '—';
info.style.left = params.pointer.DOM.x + 'px';
info.style.top = params.pointer.DOM.y + 'px';
info.style.display = 'block';
} else {
info.style.display = 'none';
}
});

document.getElementById('closeinfo').addEventListener('click', () => {
document.getElementById('infowindow').style.display = 'none';
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') document.getElementById('infowindow').style.display = 'none'; });