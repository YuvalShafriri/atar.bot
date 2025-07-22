// =====================================================================
// קובץ 2: GraphDashboard.tsx
// =====================================================================

import React, { useState, useEffect, useRef } from 'react';
import { chatGraph_Hybrid } from '../../services/graphQueryService';
import type { GraphData, LLMMessage } from '../../services/graphQueryService';

declare const vis: any;

// פונקציית API גנרית
async function fetchChatCompletion(messages: LLMMessage[], modelName: 'gemini-1.5-flash' | 'gemini-1.5-pro') {
  const proxyUrl = import.meta.env.VITE_GEMINI_PROXY_URL;
  const body = { model: modelName, contents: messages };
  try {
    const res = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`API request failed with status ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`[API Call Error - ${modelName}]`, err);
    throw err;
  }
}

// קומפוננטת ממשק הצ'אט
const AiSpot: React.FC<{ onQuery: (q: string) => void; isLoading: boolean; output: string; placeholder: string; }> = 
({ onQuery, isLoading, output, placeholder }) => {
  const [input, setInput] = useState('');
  const handleAsk = () => { if (input.trim()) onQuery(input); };
  return (
    <div className="ai-spot mt-1">
      <div className="flex gap-2">
        <input className="flex-grow p-2 border rounded" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAsk()} disabled={isLoading} placeholder={placeholder} />
        <button className="px-3 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400" disabled={isLoading || !input.trim()} onClick={handleAsk}>{isLoading ? 'חושב…' : 'שאל'}</button>
      </div>
      {output && <div className="mt-2 p-3 border rounded bg-gray-50 whitespace-pre-line">{output}</div>}
    </div>
  );
};


interface Props {
  allGraphData: Record<string, GraphData>;
  allGrapheCleanData: GraphData;
  thematicGraphData: GraphData;
  nodeColors: Record<string, { b: string; f: string }>;
  selectedGraph?: string;
}

const GraphDashboard: React.FC<Props> = ({ 
  allGraphData, 
  allGrapheCleanData, 
  thematicGraphData, 
  nodeColors, 
  selectedGraph 
}) => {
  const [assetId, setAssetId] = useState<string>(selectedGraph || 'all_assets');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<any>(null);

  // --- הפונקציה המרכזית עם הפיצול הלוגי ---
  const handleQuery = async (question: string) => {
    if (!question.trim() || isLoading) return;
    setIsLoading(true);
    setOutput('');

    try {
      let answer = '';

      if (assetId === 'all_assets') {
        // --- בלוק 1: המנגנון ההיברידי החדש (רק עבור "כלל הנכסים") ---
        const fetchChatCompletion_Pro = (messages: LLMMessage[]) => fetchChatCompletion(messages, 'gemini-1.5-pro');
        const fetchChatCompletion_Flash = (messages: LLMMessage[]) => fetchChatCompletion(messages, 'gemini-1.5-flash');

        answer = await chatGraph_Hybrid(
          question,
          allGrapheCleanData,
          fetchChatCompletion_Pro,
          fetchChatCompletion_Flash
        );

      } else {
        // --- בלוק 2: המנגנון המקורי שלך (לכל שאר הגרפים) ---
        const graphData = assetId === 'thematic_graph' ? thematicGraphData : allGraphData[assetId];
        if (!graphData) throw new Error("Graph data for this asset not found.");

        let contextData = '--- צמתים בגרף ---\n';
        graphData.nodes?.forEach((node: any) => { contextData += `- ${node.label} (${node.type})\n`; });
        contextData += '\n--- קשרים בגרף ---\n';
        graphData.edges?.forEach(edge => {
            const fromNode = graphData.nodes.find(n => n.id === edge.from);
            const toNode = graphData.nodes.find(n => n.id === edge.to);
            if (fromNode && toNode) {
                contextData += `- "${fromNode.label}" -> ${edge.label || ''} -> "${toNode.label}"\n`;
            }
        });

        const systemPrompt = `אתה עוזר מומחה... (הפרומפט המקורי והטוב שלך)`;
        const response = await fetchChatCompletion([{ role: 'system', content: `${systemPrompt}\n\n${contextData}` }, { role: 'user', content: question }], 'gemini-1.5-flash');
        answer = response.candidates?.[0]?.content?.parts?.[0]?.text || "לא התקבלה תשובה מהבוט.";
      }
      
      setOutput(answer.trim());
    } catch (err) {
      console.error("Error in handleQuery:", err);
      setOutput('אופס, משהו השתבש בקבלת התשובה.');
    } finally {
      setIsLoading(false);
    }
  };

  // --- לוגיקת תצוגת הגרפים (שוחזרה למקור) ---
  useEffect(() => {
    if (!graphContainerRef.current) return;
    if (networkRef.current) networkRef.current.destroy();

    let dataToRender: GraphData | null = null;
    if (assetId === 'all_assets') {
      dataToRender = allGrapheCleanData;
    } else if (assetId === 'thematic_graph') {
      dataToRender = thematicGraphData;
    } else if (allGraphData[assetId]) {
      dataToRender = allGraphData[assetId];
    }

    if (!dataToRender) {
      graphContainerRef.current.innerHTML = '<p style="text-align:center;padding-top:20px;">לא נבחרו נתונים להצגה.</p>';
      return;
    }
    
    const nodes = new vis.DataSet(dataToRender.nodes.map((n: any) => ({...n, label: n.label || n.id})));
    const edges = new vis.DataSet(dataToRender.edges);
    const options = { /* ... האפשרויות המקוריות והטובות שלך לתצוגת vis.js ... */ };
    networkRef.current = new vis.Network(graphContainerRef.current, { nodes, edges }, options);

  }, [assetId, allGraphData, allGrapheCleanData, thematicGraphData]);


  return (
    <div className="bg-white p-3 rounded-lg shadow">
      <select 
        value={assetId} 
        onChange={(e) => setAssetId(e.target.value)}
        className="p-2 border rounded mb-4"
      >
        <option value="all_assets">כלל הנכסים</option>
        <option value="thematic_graph">גרף נושאים</option>
        {Object.keys(allGraphData).map(key => (
          <option key={key} value={key}>
            {allGraphData[key].nodes.find(n => n.asset)?.label || key}
          </option>
        ))}
      </select>

      <AiSpot
        onQuery={handleQuery}
        isLoading={isLoading}
        output={output}
        placeholder="שאל שאלה..."
      />
      
      <div ref={graphContainerRef} className="min-h-[600px] border rounded mt-2 bg-gray-50" />
    </div>
  );
};

export default GraphDashboard;