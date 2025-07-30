import React, { useEffect, useRef, useState } from "react";
import { Network } from "vis-network";
import { DataSet } from "vis-data";

export interface VisNode {
  id: string;
  label?: string;
  type?: string;
  asset?: boolean;
  meaning?: string;
  creator?: string;
  shape?: string;
  icon?: any;
  size?: number;
  font?: any;
  [key: string]: any;
}
export interface VisEdge {
  from: string;
  to: string;
  label?: string;
  [key: string]: any;
}
export interface VisNetworkGraphProps {
  nodes: VisNode[];
  edges: VisEdge[];
  height?: string;
  options?: any;
}

const NODE_COLORS = {
  "HeritageAssetAssessment": { "b": "#FCE7F3", "f": "#DB2777" },
  "ערך": { "b": "#FFFBEB", "f": "#FBBF24" },
  "תהליך": { "b": "#FEF2F2", "f": "#EF4444" },
  "אירוע": { "b": "#FEE2E2", "f": "#DC2626" },
  "אידיאולוגיה": { "b": "#EFF6FF", "f": "#3B82F6" },
  "תקופה": { "b": "#E5E7EB", "f": "#6B7280" },
  "מבנה": { "b": "#E0F2FE", "f": "#0EA5E9" },
  "מבנה היסטורי": { "b": "#DBEAFE", "f": "#3B82F6" },
  "מבנה תעשייתי": { "b": "#D1D5DB", "f": "#4B5563" },
  "מבנה מודרני": { "b": "#E0F2FE", "f": "#0284C7" },
  "מערכת הגנה": { "b": "#FDE68A", "f": "#D97706" },
  "אתר": { "b": "#F3F4F6", "f": "#4B5563" },
  "אתר מורשת": { "b": "#E5E5E5", "f": "#525252" },
  "אתר ארכיאולוגי": { "b": "#D6D3D1", "f": "#78716C" },
  "סגנון": { "b": "#F5F3FF", "f": "#7C3AED" },
  "טכניקה": { "b": "#ECFDF5", "f": "#10B981" },
  "טכנולוגיה": { "b": "#D1FAE5", "f": "#059669" },
  "חברה": { "b": "#FFF7ED", "f": "#F97316" },
  "אישיות": { "b": "#F3F4F6", "f": "#6B7280" },
  "אדריכל": { "b": "#E5E7EB", "f": "#4B5563" },
  "גוף מדיני": { "b": "#E2E8F0", "f": "#64748B" },
  "גוף מייסד": { "b": "#FEF3C7", "f": "#D97706" },
  "תשתית": { "b": "#F0F9FF", "f": "#0EA5E9" },
  "נוף": { "b": "#F0FDF4", "f": "#22C55E" },
  "נוף חקלאי": { "b": "#DCFCE7", "f": "#16A34A" },
  "פעילות": { "b": "#ECFDF5", "f": "#10B981" },
  "אמנות": { "b": "#FAF5FF", "f": "#9333EA" },
  "מוסד תרבות": { "b": "#FEFCE8", "f": "#EAB308" },
  "יישוב": { "b": "#E7E5E4", "f": "#57534E" },
  "מרחב תרבותי": { "b": "#FCE7F3", "f": "#DB2777" },
  "שכונה": { "b": "#E0F2FE", "f": "#0EA5E9" },
  "עיר": { "b": "#D1FAE5", "f": "#059669" },
  "תפקוד הנדסי": { "b": "#D5DBDB", "f": "#839192" },
  "קהילת תפעול": { "b": "#FFF7ED", "f": "#F97316" },
  "תפקוד": { "b": "#ECFDF5", "f": "#10B981" },
  "תפיסה חינוכית": { "b": "#EBF5FB", "f": "#3498DB" },
  "אורח חיים": { "b": "#FEF9E7", "f": "#F1C40F" },
  "סביבה": { "b": "#E8F8F5", "f": "#1ABC9C" },
  "תכנון": { "b": "#FDFEFE", "f": "#D0D3D4" },
  "מבנה מנדטורי": { "b": "#EAF2F8", "f": "#5DADE2" }
};

const DEFAULT_OPTIONS = {
  autoResize: true,
  height: "100%",
  width: "100%",
  locale: "he",
  nodes: {
    borderWidth: 2,
    shape: "dot",
    size: 12,
    mass: 1,
    shadow: { enabled: true, color: "rgba(0,0,0,0.3)", size: 5, x: 3, y: 3 },
    font: { size: 14, face: "Arial", align: "bottom" },
  },
  edges: {
    width: 1.5,
    arrows: { to: { enabled: true, scaleFactor: 0.7 } },
    color: { color: "#848484", highlight: "#3B82F6", hover: "#60A5FA" },
    font: { align: "middle", size: 12, color: "#555555" },
  },
  physics: {
    solver: "forceAtlas2Based",
    forceAtlas2Based: {
      gravitationalConstant: -60,
      centralGravity: 0.01,
      springLength: 60,
      springConstant: 0.1,
      avoidOverlap: 0.5,
    },
    stabilization: { iterations: 180 },
  },
  interaction: {
    hover: true,
    tooltipDelay: 150,
    navigationButtons: true,
    keyboard: true,
  },
  groups: Object.fromEntries(Object.entries(NODE_COLORS).map(([type, colors]) => [type, { color: { background: colors.b, border: colors.f }, font: { color: colors.f } }]))
};

const VisNetworkGraph: React.FC<VisNetworkGraphProps> = ({ nodes, edges, height = "400px", options }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<any>(null);
  const [info, setInfo] = useState<{ node: VisNode | null; x: number; y: number } | null>(null);
  const [tooltip, setTooltip] = useState<{ content: string; x: number; y: number } | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    // Node processing (icon, color, etc)
    const processedNodes = nodes.map(node => {
      let finalNode = { ...node, group: node.type };
      finalNode.label = node.label || node.id;
      if (node.asset) {
        finalNode.shape = "icon";
        finalNode.icon = { face: "Arial", code: "🏛️", size: 20, color: "#555" };
        finalNode.font = { align: "bottom" };
        finalNode.size = 20;
      }
      if (node.type === "HeritageAssetAssessment") {
        finalNode.label = "";
        finalNode.shape = "icon";
        finalNode.icon = { face: "Arial", code: "📝", size: 15, color: "#333" };
      }
      return finalNode;
    });
    // Only show selected nodes and their connections, plus expanded nodes
    const visibleNodeIds = new Set<string>(nodes.filter(n => n.asset).map(n => n.id));
    expandedNodes.forEach(id => visibleNodeIds.add(id));
    edges.forEach(edge => {
      if (visibleNodeIds.has(edge.from) || visibleNodeIds.has(edge.to)) {
        visibleNodeIds.add(edge.from);
        visibleNodeIds.add(edge.to);
      }
    });
    const filteredNodes = processedNodes.filter(n => visibleNodeIds.has(n.id));
    const filteredEdges = edges.filter(e => visibleNodeIds.has(e.from) && visibleNodeIds.has(e.to));
    const data = {
      nodes: new DataSet(filteredNodes),
      edges: filteredEdges,
    };
    const netOptions = { ...DEFAULT_OPTIONS, ...(options || {}) };
    networkRef.current = new Network(containerRef.current, data, netOptions);
    // Event handlers
    networkRef.current.on("click", (params: any) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const nodeData = processedNodes.find(n => n.id === nodeId);
        setSelectedNodeId(nodeId);
        setInfo({ node: nodeData || null, x: params.pointer.DOM.x, y: params.pointer.DOM.y });
        setTooltip(null);
      } else {
        setInfo(null);
        setSelectedNodeId(null);
      }
    });
    networkRef.current.on("doubleClick", (params: any) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        setExpandedNodes(prev => {
          const newSet = new Set(prev);
          if (newSet.has(nodeId)) newSet.delete(nodeId);
          else newSet.add(nodeId);
          return newSet;
        });
        setInfo(null);
        setSelectedNodeId(null);
      }
    });
    networkRef.current.on("hoverNode", (params: any) => {
      const nodeId = params.node;
      const nodeData = processedNodes.find(n => n.id === nodeId);
      let tooltipContent = `<strong>${nodeData?.label || nodeData?.id}</strong>\nסוג: ${nodeData?.type}`;
      let instructions: string[] = [];
      if (nodeId !== selectedNodeId) instructions.push("קליק לפרטים נוספים");
      if (!expandedNodes.has(nodeId)) instructions.push("דאבל קליק לפתיחת הקשרים");
      if (instructions.length > 0) tooltipContent += `\n<em>${instructions.join('\n')}</em>`;
      setTooltip({ content: tooltipContent, x: params.pointer.DOM.x + 15, y: params.pointer.DOM.y + 15 });
    });
    networkRef.current.on("blurNode", () => {
      setTooltip(null);
    });
    networkRef.current.fit();
    return () => {
      networkRef.current?.destroy();
    };
  }, [nodes, edges, options, expandedNodes]);

  return (
    <div style={{ position: "relative", width: "100%", height }}>
      <div ref={containerRef} style={{ width: "100%", height }} />
      {info && info.node && (
        <div style={{
          position: "absolute",
          top: info.y,
          left: info.x,
          zIndex: 100,
          background: "white",
          border: "1px solid #ccc",
          borderRadius: 8,
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          padding: 15,
          minWidth: 220,
          maxWidth: 320,
          fontSize: 14,
          lineHeight: 1.6,
          direction: "rtl"
        }}>
          <button style={{ position: "absolute", top: 10, left: 10, fontSize: 20, color: "#888", background: "none", border: "none", cursor: "pointer" }} onClick={() => setInfo(null)}>✖</button>
          <h3 style={{ marginTop: 0, color: "#333", fontSize: 18 }}>{info.node.label || info.node.id}</h3>
          <p><strong>סוג:</strong> {info.node.type}</p>
          {info.node.creator && <p><strong>יוצר:</strong> {info.node.creator}</p>}
          <p><strong>תיאור ומשמעות:</strong> {info.node.meaning || "אין תיאור"}</p>
        </div>
      )}
      {tooltip && (
        <div style={{
          position: "absolute",
          left: tooltip.x,
          top: tooltip.y,
          backgroundColor: "#333",
          color: "white",
          padding: "8px 12px",
          borderRadius: 4,
          fontSize: 13,
          zIndex: 101,
          pointerEvents: "none",
          whiteSpace: "pre-wrap",
          textAlign: "right",
          lineHeight: 1.5
        }} dangerouslySetInnerHTML={{ __html: tooltip.content }} />
      )}
    </div>
  );
};

export default VisNetworkGraph;
