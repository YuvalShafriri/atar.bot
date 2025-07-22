/* 2. js/knowledge-graph.js */
// מפת צבעים לפי סוג ישות
const COLOR_BY_TYPE = {
'תופעה טבעית':        { background: 'rgba(30,144,255,0.7)', border: '#1E90FF' },
'מבנה':               { background: 'rgba(178,34,34,0.7)', border: '#B22222' },
'אלמנט אדריכלי':      { background: 'rgba(129,199,132,0.7)', border: '#81C784' },
'דמות':               { background: 'rgba(255,105,180,0.7)', border: '#FF69B4' },
'אירוע':              { background: 'rgba(255,160,122,0.7)', border: '#FFA07A' },
'סיפור / נרטיב':      { background: 'rgba(255,228,181,0.7)', border: '#FFE4B5' },
'קבוצה חברתית':       { background: 'rgba(255,215,0,0.7)', border: '#FFD700' },
'ערך תרבותי':         { background: 'rgba(255,193,7,0.7)', border: '#FFC107' },
'מקום':               { background: 'rgba(100,149,237,0.7)', border: '#6495ED' },
'יצירת אמנות / ממצא': { background: 'rgba(128,0,128,0.7)', border: '#800080' },
'מסורת / מנהג':       { background: 'rgba(139,69,19,0.7)', border: '#8B4513' },
'תקופה היסטורית':     { background: 'rgba(0,180,180,0.7)', border: '#00B4B4' },
'דת / אמונה':         { background: 'rgba(218,112,214,0.7)', border: '#DA70D6' },
'זיכרון קולקטיבי':    { background: 'rgba(75,0,130,0.7)', border: '#4B0082' }
};

// הנחת DATA כמערך שיש לגשת אליו
DATA.nodes.forEach(n => {
if (!n.label) n.label = n.name;
const col = COLOR_BY_TYPE[n.type] || { background: 'rgba(200,200,200,0.7)', border: '#666666' };
n.color = n.color || { background: col.background, border: col.border };
});

const nodes = new vis.DataSet(DATA.nodes);
const edges = new vis.DataSet(DATA.edges);
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
repulsion: { nodeDistance: 230, centralGravity: 0.05, springLength: 20, springConstant: 0.005, damping: 0.09 },
stabilization: { iterations: 2500, fit: true }
},
interaction: { hover: true, tooltipDelay: 300000 }
};

const network = new vis.Network(container, data, options);

// ניהול חלון מידע
network.on('click', params => {
const info = document.getElementById('infowindow');
if (params.nodes.length) {
const node = nodes.get(params.nodes[0]);
document.getElementById('info_name').innerText = node.name;
document.getElementById('info_type').innerText = node.type;
document.getElementById('info_heritageValue').innerText = node.heritageValue || '—';
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