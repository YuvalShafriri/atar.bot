import React, { useState, useEffect, useRef } from 'react';
import { chatGraph } from '../../../services/graphQueryService';
import { chatGraphModern } from '../../../services/modernGraphQueryService';
import type { GraphData, LLMMessage } from '../../../services/graphQueryService';
import AiSpot from '../../common/AiSpot';
// import AllAssetsGraph from './AllAssetsGraph';
// If the file exists elsewhere, update the path, e.g.:
// import AllAssetsGraph from '../AllAssetsGraph';
// Otherwise, create AllAssetsGraph.tsx in the same folder or comment/remove this line if unused.
declare const vis: any;

// Props
interface GraphDashboardProps {
    allGraphData: Record<string, GraphData>;
    allGrapheCleanData: GraphData;
    thematicGraphData: GraphData;
    nodeColors: Record<string, any>;
    selectedGraph?: string;
}

const GraphDashboard: React.FC<GraphDashboardProps> = ({
    allGraphData,
    allGrapheCleanData,
    thematicGraphData,
    nodeColors,
    selectedGraph
}) => {
    const [assetId, setAssetId] = useState<string>(selectedGraph || 'all_assets');
    const [infoBoxContent, setInfoBoxContent] = useState<string>('');
    const [selectedQueries, setSelectedQueries] = useState<string[]>([]);

    // ====== Token counting utility ======
    const estimateTokens = (text: string): number => {
        // Rough estimate: 1 token ≈ 4 characters for Hebrew/English mixed text
        // More accurate would require actual tokenizer, but this gives good approximation
        return Math.ceil(text.length / 4);
    };

    const estimateGraphTokens = (graphData: GraphData): number => {
        if (!graphData?.nodes || !graphData?.edges) return 0;
        
        const nodesJson = JSON.stringify(graphData.nodes);
        const edgesJson = JSON.stringify(graphData.edges);
        const totalChars = nodesJson.length + edgesJson.length;
        
        return Math.ceil(totalChars / 4);
    };

    // ====== Gemini proxy wrapper ======
    const fetchChatCompletion = async (messages: LLMMessage[], tools?: any[]) => {
        const proxyUrl = import.meta.env.VITE_GEMINI_PROXY_URL;
        const body = { model: 'gemini-1.5-flash', messages, tools };
        
        // Calculate input tokens
        const bodyJson = JSON.stringify(body);
        const inputTokens = estimateTokens(bodyJson);
        
        console.log(`[LLM Tokens] Input tokens: ${inputTokens.toLocaleString()}`);
        console.log(`[LLM Tokens] Input size: ${(bodyJson.length / 1024).toFixed(2)} KB`);
        
        const startTime = Date.now();
        const resp = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        
        const result = await resp.json();
        const endTime = Date.now();
        
        // Calculate output tokens
        const outputText = JSON.stringify(result);
        const outputTokens = estimateTokens(outputText);
        const totalTokens = inputTokens + outputTokens;
        
        // Cost estimation (approximate for GPT-4/Gemini)
        const inputCost = (inputTokens / 1000) * 0.03; // $0.03 per 1K input tokens
        const outputCost = (outputTokens / 1000) * 0.06; // $0.06 per 1K output tokens
        const totalCost = inputCost + outputCost;
        
        console.log(`[LLM Tokens] Output tokens: ${outputTokens.toLocaleString()}`);
        console.log(`[LLM Tokens] Total tokens: ${totalTokens.toLocaleString()}`);
        console.log(`[LLM Tokens] Estimated cost: $${totalCost.toFixed(4)}`);
        console.log(`[LLM Tokens] Response time: ${endTime - startTime}ms`);
        
        return result;
    };

    // ----- Modern LLM-based query handler -----
    const handleQuery = async (question: string) => {
        let graphData: GraphData;
        
        console.log(`[Graph Selection] assetId: "${assetId}"`);
        
        if (assetId === 'all_assets' || !assetId || assetId === '') {
            // For all assets, load the meta-graph
            try {
                console.log('[Graph Loading] Attempting to load meta-graph...');
                const metaGraph = await fetch('data/meta-graph-from-allGrapheClean.json').then(r => r.json());
                graphData = metaGraph;
                
                const graphTokens = estimateGraphTokens(graphData);
                console.log(`[Graph Tokens] Using meta-graph for all_assets`);
                console.log(`[Graph Tokens] Nodes: ${graphData.nodes?.length || 0}`);
                console.log(`[Graph Tokens] Edges: ${graphData.edges?.length || 0}`);
                console.log(`[Graph Tokens] Estimated graph tokens: ${graphTokens.toLocaleString()}`);
                console.log(`[Graph Tokens] Graph size: ${(JSON.stringify(graphData).length / 1024).toFixed(2)} KB`);
            } catch (error) {
                console.error('[Graph] Failed to load meta-graph, falling back to allGrapheCleanData:', error);
                graphData = allGrapheCleanData;
            }
        } else if (assetId === 'thematic_graph') {
            graphData = thematicGraphData;
        } else {
            graphData = allGraphData[assetId];
        }
        
        const questionTokens = estimateTokens(question);
        console.log(`[Query] Question: "${question}"`);
        console.log(`[Query] Question tokens: ${questionTokens}`);
        console.log(`[GraphDashboard] Modern LLM Query - question: ${question}`);
        console.log(`[GraphDashboard] Modern LLM Query - graphData nodes: ${graphData.nodes?.length || 0}`);
        
        // Use modern LLM-first approach with fallback to traditional RAG
        console.log('[Query Strategy] Using modern LLM-first approach with fallback');
        try {
            return await chatGraphModern(question, graphData, fetchChatCompletion);
        } catch (error) {
            console.warn('[Query Strategy] Modern approach failed, falling back to traditional RAG:', error);
            return await chatGraph(question, graphData, fetchChatCompletion);
        }
    };

    // ====== Rest of component logic unchanged (render graph etc.) ======
    // For brevity, only key parts shown here. Add your existing graph rendering
    // and AiSpot usage exactly as לפני.

    return (
        <div className="bg-white p-3 rounded-lg shadow">
            <AiSpot
                spotId="dashboard"
                onQuery={handleQuery}
                key={assetId}
                exampleQueries={selectedQueries}
            />
            {/* Render graphs as before */}
        </div>
    );
};

export default GraphDashboard;
