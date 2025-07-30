import React, { useState } from 'react';
import { GraphData, LLMMessage } from '../../services/graphQueryService';
import { chatGraphEnhanced, AssetNode, Edge } from '../../services/flexibleAgentService';
import VisNetworkGraph from './VisNetworkGraph';
import { calculateTokenCost, estimateTokens, printTokenLogStyled } from '../../services/tokenCostService';

declare const vis: any;

const LLM_MODEL = 'gemini-2.5-flash-lite';

const fetchChatCompletion = async (
    messages: LLMMessage[],
    tools?: any[]
) => {
    const proxyUrl = import.meta.env.VITE_GEMINI_PROXY_URL;
    const contents = messages.map(m => ({ text: m.content }));
    const body = { model: LLM_MODEL, contents, tools };

    const bodyJson = JSON.stringify(body);
    const inputTokens = estimateTokens(bodyJson);

    try {
        const startTime = Date.now();
        const res = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const result = await res.json();
        const endTime = Date.now();

        const outputText = JSON.stringify(result);
        const outputTokens = estimateTokens(outputText);
        const inputCost = calculateTokenCost(inputTokens, LLM_MODEL);
        const outputCost = calculateTokenCost(outputTokens, LLM_MODEL);
        const totalCost = inputCost + outputCost;

        printTokenLogStyled({
            question: '',
            inputTokens,
            outputTokens,
            model: LLM_MODEL,
            cost: totalCost,
            timeMs: endTime - startTime
        });

        return result;
    } catch (err) {
        console.error('[Gemini] fetchChatCompletion - ERROR:', err);
        throw err;
    }
};

// Main Enhanced Dashboard Component
interface EnhancedGraphDashboardProps {
    allGraphData: Record<string, any>;
    allGrapheCleanData: any;
}

const EnhancedGraphDashboard: React.FC<EnhancedGraphDashboardProps> = ({
    allGraphData,
    allGrapheCleanData
}) => {
    const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
    const [showVisualization, setShowVisualization] = useState(false);
    const [vizType, setVizType] = useState<'vis' | 'iframe'>('vis');
    const [currentQuery, setCurrentQuery] = useState<string>('');
    const [suggestedResponse, setSuggestedResponse] = useState<string>('');

    // Use optimized graph data (could be loaded from optimized version)
    const graphData = allGrapheCleanData || allGraphData;

    // Asset selector
    const assets: AssetNode[] = graphData?.nodes?.filter((node: AssetNode) => node.asset === true) || [];
    const renderAssetSelector = () => (
        <div className="asset-selector bg-white rounded-xl shadow-lg border border-gray-200 p-4 mb-4">
            <h3 className="text-lg font-bold mb-4 text-gray-800">בחר נכסי מורשת לניתוח:</h3>
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => setSelectedAssets(assets.map((a: any) => a.id))}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm"
                >
                    בחר הכל
                </button>
                <button
                    onClick={() => setSelectedAssets([])}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
                >
                    נקה הכל
                </button>
                <span className="flex-1"></span>
                <span className="text-sm text-gray-600 py-2">
                    נבחרו: {selectedAssets.length}/{assets.length}
                </span>
            </div>
            <input
                type="text"
                placeholder="חפש נכס..."
                className="w-full p-2 border border-gray-300 rounded mb-4 text-right"
                onChange={e => {
                    // Optionally filter assets here
                }}
            />
            <div className="max-h-64 overflow-y-auto grid grid-cols-2 gap-2">
                {assets.map((asset: AssetNode) => (
                    <label key={asset.id} className="flex items-center p-3 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer transition-colors">
                        <input
                            type="checkbox"
                            checked={selectedAssets.includes(asset.id)}
                            onChange={() => {
                                if (selectedAssets.includes(asset.id)) {
                                    setSelectedAssets(selectedAssets.filter((id: string) => id !== asset.id));
                                } else {
                                    setSelectedAssets([...selectedAssets, asset.id]);
                                }
                            }}
                            className="ml-3"
                        />
                        <div className="flex-1 text-right">
                            <div className="font-medium text-gray-800">{asset.name || asset.id}</div>
                            <div className="text-sm text-gray-600">{asset.type}</div>
                        </div>
                    </label>
                ))}
            </div>
            {selectedAssets.length > 0 && (
                <div className="selected-info mt-4 flex items-center gap-4">
                    <p className="text-blue-700 font-semibold">נבחרו {selectedAssets.length} נכסים</p>
                    <button onClick={() => setShowVisualization(!showVisualization)} className="toggle-viz-btn px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700 transition-colors">
                        {showVisualization ? 'הסתר' : 'הצג'} ויזואליזציה
                    </button>
                </div>
            )}
        </div>
    );

    // Internal VIZ for selected assets
    const renderSelectedAssetsVisualization = () => {
        if (!selectedAssets.length || !graphData) return null;
        const filteredNodes: AssetNode[] = graphData.nodes.filter((node: AssetNode) =>
            selectedAssets.includes(node.id) ||
            graphData.edges.some((edge: Edge) =>
                (selectedAssets.includes(edge.from) && edge.to === node.id) ||
                (selectedAssets.includes(edge.to) && edge.from === node.id)
            )
        );
        const filteredEdges: Edge[] = graphData.edges.filter((edge: Edge) =>
            filteredNodes.some((node: AssetNode) => node.id === edge.from) &&
            filteredNodes.some((node: AssetNode) => node.id === edge.to)
        );
        const edges = filteredEdges.map((edge: Edge) => ({
            from: edge.from,
            to: edge.to,
            label: edge.label || ''
        }));
        const nodes = filteredNodes.map((node: AssetNode) => ({
            id: node.id,
            label: node.name || node.id,
            type: node.type,
            asset: node.asset,
            meaning: node.meaning
        }));
        return (
            <div className="selected-assets-viz bg-white rounded-xl shadow-lg border border-gray-200 p-4 mb-4">
                <h4 className="font-bold text-gray-800 mb-2">נכסים נבחרים ({selectedAssets.length})</h4>
                <div className="flex gap-4 mb-2">
                    <button onClick={() => setVizType('vis')} className={`px-3 py-2 rounded ${vizType === 'vis' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Vis-Network</button>
                    <button onClick={() => setVizType('iframe')} className={`px-3 py-2 rounded ${vizType === 'iframe' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}>Iframe (Original)</button>
                </div>
                <div style={{ height: '400px', border: '1px solid #ccc', borderRadius: '8px', background: '#fafafa' }}>
                    {vizType === 'vis' && (
                        <VisNetworkGraph
                            nodes={nodes}
                            edges={edges}
                            height="100%"
                        />
                    )}
                    {vizType === 'iframe' && (
                        <iframe
                            src="/data/graphMaster.html"
                            title="GraphMaster"
                            style={{ width: '100%', height: '100%', border: 'none', borderRadius: '8px' }}
                        />
                    )}
                </div>
            </div>
        );
    };    // Suggested questions
    const generateSuggestedQuestions = () => {
        if (selectedAssets.length === 0) {
            return [
                "מה הערכים החוזרים ביותר במאגר?",
                "אילו סוגי נכסים קיימים ומה התפלגותם?",
                "מה המשמעויות החוזרות בנכסים?",
                "אילו תובנות עולות מהקשרים בגרף?",
                "איך מתפלגים הנכסים לפי תקופות?"
            ];
        }
        if (selectedAssets.length === 1) {
            const assetName = graphData.nodes.find((n: AssetNode) => n.id === selectedAssets[0])?.name || selectedAssets[0];
            return [
                `מה הייחודי ב${assetName}?`,
                `אילו ערכים מאפיינים את ${assetName}?`,
                `איך ${assetName} קשור לנכסים אחרים?`,
                `מה המשמעות ההיסטורית של ${assetName}?`,
                `אילו תובנות עולות מ${assetName}?`
            ];
        }
        return [
            `מה משותף בין הנכסים הנבחרים?`,
            `אילו ערכים חוזרים בנכסים הנבחרים?`,
            `מה ההבדלים המשמעותיים בין הנכסים?`,
            `איך הנכסים הנבחרים קשורים זה לזה?`,
            `אילו דפוסים עולים מהנכסים הנבחרים?`
        ];
    };

    // Filtered subgraph for selected assets
    const getFilteredSubgraph = (): GraphData | null => {
        if (!graphData || !selectedAssets.length) return null;
        const filteredNodes: AssetNode[] = graphData.nodes.filter((node: AssetNode) =>
            selectedAssets.includes(node.id) ||
            graphData.edges.some((edge: Edge) =>
                (selectedAssets.includes(edge.from) && edge.to === node.id) ||
                (selectedAssets.includes(edge.to) && edge.from === node.id)
            )
        );
        const filteredEdges: Edge[] = graphData.edges.filter((edge: Edge) =>
            filteredNodes.some((node: AssetNode) => node.id === edge.from) &&
            filteredNodes.some((node: AssetNode) => node.id === edge.to)
        );
        return {
            nodes: filteredNodes,
            edges: filteredEdges
        };
    };

    // Main render
    return (
        <div className="enhanced-graph-dashboard max-w-5xl mx-auto p-6">
            {renderAssetSelector()}
            {showVisualization && renderSelectedAssetsVisualization()}
            <div className="query-section bg-white rounded-xl shadow-lg border border-gray-200 p-4 mt-4">
                <div className="suggested-questions mb-4">
                    <h4 className="font-bold text-gray-800 mb-2">שאלות מוצעות:</h4>
                    <div className="flex flex-wrap gap-2">
                        {generateSuggestedQuestions().map((q, i) => (
                            <button key={i} onClick={async () => {
                                setCurrentQuery(q);
                                setSuggestedResponse('מחפש תשובה...');
                                const filteredSubgraph = getFilteredSubgraph();
                                if (filteredSubgraph) {
                                    try {
                                        const result = await chatGraphEnhanced(q, filteredSubgraph, fetchChatCompletion);
                                        setSuggestedResponse(result.answer);
                                    } catch (err) {
                                        setSuggestedResponse('שגיאה בעיבוד השאלה');
                                    }
                                } else {
                                    setSuggestedResponse('אין נתוני גרף זמינים או נכסים נבחרים');
                                }
                            }} className="suggested-question px-4 py-2 bg-blue-100 text-blue-900 rounded hover:bg-blue-300 transition-colors">
                                {q}
                            </button>
                        ))}
                    </div>
                </div>
                {/* QueryInterface and QueryHistory should be implemented or imported as needed */}
                {/* Optionally show the selected query */}
                {currentQuery && (
                    <div className="mt-2 p-2 bg-blue-50 rounded text-blue-900 font-semibold">
                        שאלה שנבחרה: {currentQuery}
                    </div>
                )}
                {suggestedResponse && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-gray-900 prose prose-lg prose-blue text-right" style={{whiteSpace: 'pre-line', fontSize: '1.15em', lineHeight: '1.7'}}>
                        {/* Render with line breaks and readable formatting */}
                        <div dangerouslySetInnerHTML={{ __html: suggestedResponse.replace(/\n/g, '<br />') }} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default EnhancedGraphDashboard;
