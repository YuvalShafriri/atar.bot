import React from "react";
import ForceGraph2D from "react-force-graph-2d";

export interface Node {
  id: string;
  label?: string;
  asset?: boolean;
  valueType?: string;
}

export interface Edge {
  source: string;
  target: string;
  label?: string;
}

export interface NetworkVisualizationProps {
  nodes: Node[];
  edges: Edge[];
  selectedNodeIds?: string[];
}

const NetworkVisualization: React.FC<NetworkVisualizationProps> = ({ nodes, edges, selectedNodeIds }) => {
  // Highlight selected nodes
  const getNodeColor = (node: Node) => {
    if (selectedNodeIds && selectedNodeIds.includes(node.id)) return "#ff9800";
    if (node.asset) return "#2196f3";
    if (node.valueType) return "#4caf50";
    return "#bdbdbd";
  };

  return (
    <div style={{ width: "100%", height: "500px" }}>
      <ForceGraph2D
        graphData={{ nodes, links: edges }}
        nodeLabel={(node: any) => node.label || node.id}
        linkLabel={(link: any) => link.label}
        nodeAutoColorBy={(node: any) => node.asset ? "asset" : node.valueType ? "valueType" : "other"}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const label = node.label || node.id;
          const fontSize = 12/globalScale;
          ctx.font = `${fontSize}px Sans-Serif`;
          ctx.fillStyle = getNodeColor(node);
          ctx.beginPath();
          ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI, false);
          ctx.fill();
          ctx.fillStyle = "#222";
          ctx.fillText(label, node.x + 10, node.y + 4);
        }}
        linkDirectionalArrowLength={6}
        linkDirectionalArrowRelPos={1}
      />
    </div>
  );
};

export default NetworkVisualization;
