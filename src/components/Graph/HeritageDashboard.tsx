import React, { useState, useEffect, useRef } from 'react';
import { chatGraph } from '../../services/graphQueryService';
import type { GraphData, LLMMessage } from '../../services/graphQueryService';
import { quickHybridChat } from '../../quickHybridSetup';
import { getPresetQuestions } from './meta-graph-generator';
import AllAssetsGraph from './AllAssetsGraph';
import { askAgent } from '../../services/agentService';

declare const vis: any;

// Utility functions for robust id/label access
function getNodeId(node: any): string {
    return node.id || node.label || '';
}

function getNodeLabel(node: any): string {
    return node.label || node.id || '';
}

function getEdgeFrom(edge: any): string {
    return edge.from || edge.source || '';
}

function getEdgeTo(edge: any): string {
    return edge.to || edge.target || '';
}

type Node = {
    id: string;
    type: string;
    title?: string;
    label?: string;
};

type Edge = {
    from: string;
    to: string;
    label?: string;
};

// AiSpot Component
interface AiSpotProps {
    spotId: string;
    onQuery: (input: string) => Promise<string>;
    placeholder?: string;
    exampleQueries?: string[];
}

const AiSpot: React.FC<AiSpotProps> = ({ spotId, onQuery, placeholder, exampleQueries }) => {
    const [input, setInput] = useState<string>('');
    const [output, setOutput] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const config = {
        dashboard: {
            title: '',
            description: '',
            placeholder: placeholder || 'שאל את הבוט על הנכס - קבל הסבר על קשרים, ערכים או מושגים המופיעים בגרף...'
        }
    }[spotId] ?? {
        title: '',
        description: '',
        placeholder: ''
    };

    const handleAsk = async (customInput?: string) => {
        const q = typeof customInput === 'string' ? customInput : input;
        if (!q.trim() || isLoading) return;
        setIsLoading(true);
        setOutput('');

        try {
            const answer = await onQuery(q);
            const cleanAnswer = answer.trim().replace(/\s+$/, '');
            const words = cleanAnswer.split(' ').filter(word => word.length > 0);
            let currentText = '';
            for (let i = 0; i < words.length; i++) {
                currentText += words[i];
                if (i < words.length - 1) currentText += ' ';
                setOutput(currentText);
                await new Promise(resolve => setTimeout(resolve, 30));
            }
        } catch (error) {
            console.error("AI Query Error:", error);
            setOutput('שגיאה בקבלת תשובה מהבוט.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleAsk();
        }
    };

    return (
        <div className="ai-spot mt-1">
            <div className="flex flex-col gap-1">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={config.placeholder}
                        className="flex-grow p-2 border rounded bg-white text-gray-900 placeholder:text-gray-500 text-sm"
                        disabled={isLoading}
                    />
                    <button
                        onClick={() => handleAsk()}
                        className="px-3 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                        disabled={isLoading || !input.trim()}
                    >
                        {isLoading ? 'חושב...' : 'שאל'}
                    </button>
                </div>
                {/* כפתורי שאלות לדוגמה */}
                {exampleQueries && exampleQueries.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                        {exampleQueries.map((q, i) => (
                            <button
                                key={i}
                                className="px-2 py-1 rounded border text-xs bg-gray-100 border-gray-300 hover:bg-blue-100"
                                style={{ fontSize: '0.75em' }}
                                onClick={() => handleAsk(q)}
                                disabled={isLoading}
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            {/* תיבת התשובה */}
            {output && (
                <div className="px-2 pt-2 pb-1 mt-1 bg-white rounded border border-gray-200 text-sm leading-tight"
                     style={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>{output}</div>
            )}
        </div>
    );
};

// DraggableInfoBox Component
type DraggableInfoBoxProps = { content: string };
const DraggableInfoBox: React.FC<DraggableInfoBoxProps> = ({ content }) => {
    const boxRef = useRef<HTMLDivElement | null>(null);
    const [isVisible, setIsVisible] = useState<boolean>(false);

    useEffect(() => {
        setIsVisible(!!content);
    }, [content]);

    useEffect(() => {
        const el = boxRef.current;
        if (!el || !isVisible) return;

        el.style.position = 'absolute';
        el.style.zIndex = '1000';
        el.style.cursor = 'grab';
        el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';

        if (!el.style.left && !el.style.top) {
            el.style.left = '20px';
            el.style.top = '20px';
        }

        let isDragging = false;
        let offsetX = 0, offsetY = 0;

        const onMouseDown = (e: MouseEvent) => {
            if ((e.target as HTMLElement).id !== 'closeinfo') {
                isDragging = true;
                const htmlEl = el as HTMLElement;
                offsetX = e.clientX - htmlEl.offsetLeft;
                offsetY = e.clientY - htmlEl.offsetTop;
                htmlEl.style.cursor = 'grabbing';
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            }
        };

        const onMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                (el as HTMLElement).style.left = (e.clientX - offsetX) + 'px';
                (el as HTMLElement).style.top = (e.clientY - offsetY) + 'px';
            }
        };

        const onMouseUp = () => {
            isDragging = false;
            (el as HTMLElement).style.cursor = 'grab';
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        el.addEventListener('mousedown', onMouseDown);
        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
            el.removeEventListener('mousedown', onMouseDown);
        };
    }, [isVisible]);

    if (!isVisible) return null;

    return (
        <div id="infoBox" ref={boxRef} dangerouslySetInnerHTML={{ __html: content }} />
    );
};

// HeritageDashboard Component
interface HeritageDashboardProps {
    allGraphData: Record<string, any>;
    allGrapheCleanData: any;
    thematicGraphData: any;
    nodeColors: Record<string, any>;
    selectedGraph?: string;
}

const HeritageDashboard: React.FC<HeritageDashboardProps> = ({ 
    allGraphData, 
    allGrapheCleanData, 
    thematicGraphData, 
    nodeColors, 
    selectedGraph 
}) => {
    const [assetId, setAssetId] = useState<string>(selectedGraph || 'all_assets');
    const [showTooltip, setShowTooltip] = useState(false);
    const [infoBoxContent, setInfoBoxContent] = useState<string>('');
    const [randomQueries, setRandomQueries] = useState<Record<string, string[]>>({});
    const [selectedQueries, setSelectedQueries] = useState<string[]>([]);
    
    // מצב השאילתה: רגיל / היברידי / agent
    const QUERY_MODES = [
        { key: 'regular', label: 'רגיל' },
        { key: 'hybrid', label: 'היברידי' },
        { key: 'agent', label: 'Agent' }
    ];

    const [queryMode, setQueryMode] = useState<'regular' | 'hybrid' | 'agent'>('agent');

    const graphContainerRef = useRef<HTMLDivElement | null>(null);
    const networkRef = useRef<any>(null);
    const queryCache = useRef(new Map<string, string>());

    const handleGraphChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setAssetId(event.target.value);
    };

    const buildContextData = (graphData: GraphData): string => {
        let contextData = '';
        if (typeof graphData === 'string') {
            contextData = 'הנכס הנבחר הוא "' + graphData + '".';
        } else if (graphData && graphData.nodes && graphData.edges) {
            contextData += 'הגרף מכיל את הצמתים והקשרים הבאים:\n';
            graphData.nodes.forEach((node: Node) => {
                contextData += '- ' + getNodeId(node) + ' (סוג: ' + node.type + (node.title ? ', תיאור: ' + node.title : '') + ')\n';
            });
            contextData += 'קשרים:\n';
            graphData.edges.forEach((edge: Edge) => {
                contextData += '- "' + getEdgeFrom(edge) + '" -> ' + (edge.label || '') + ' -> "' + getEdgeTo(edge) + '"\n';
            });
        } else {
            contextData = JSON.stringify(graphData);
        }
        return contextData;
    };

    const handleQuery = async (question: string): Promise<string> => {
        const cacheKey = assetId + '|' + queryMode + '|' + question.trim();
        if (queryCache.current.has(cacheKey)) {
            console.log('[CACHE] Returning cached answer for:', cacheKey);
            return queryCache.current.get(cacheKey)!;
        }

        let graphData: GraphData;
        if (assetId === 'all_assets') {
            try {
                const metaGraph = await fetch('data/meta-graph-asset-flag.json').then(r => r.json());
                graphData = metaGraph;
            } catch (error) {
                console.error('[Graph] Failed to load meta-graph, falling back to allGrapheCleanData:', error);
                graphData = allGrapheCleanData;
            }
        } else if (assetId === 'thematic_graph') {
            graphData = thematicGraphData;
        } else {
            graphData = allGraphData[assetId];
        }

        if (!graphData) {
            return 'שגיאה: לא נמצא נתוני גרף.';
        }

        const contextData = buildContextData(graphData);
        let answer = '';

        try {
            if (queryMode === 'agent') {
                answer = await askAgent(question, contextData);
            } else if (queryMode === 'regular') {
                answer = await chatGraph(
                    question,
                    graphData,
                    async (messages: LLMMessage[], tools?: any[]) => {
                        // Send plain string for contents (not Gemini array/object)
                        const proxyUrl = import.meta.env.VITE_GEMINI_PROXY_URL;
                        const model = 'gemini-1.5-flash';
                        // Join all messages into a single string (system + user)
                        const contextString = messages.map(m => m.content).join('\n---\n');
                        const response = await fetch(proxyUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ model, contents: contextString })
                        });
                        const result = await response.json();
                        return result;
                    }
                );
            } else if (queryMode === 'hybrid') {
                answer = await quickHybridChat(
                    question,
                    graphData,
                    async (messages: any[], tools?: any[]) => {
                        // Send plain string for contents (not Gemini array/object)
                        const proxyUrl = import.meta.env.VITE_GEMINI_PROXY_URL;
                        const model = 'gemini-1.5-flash';
                        const contextString = messages.map(m => m.content).join('\n---\n');
                        const response = await fetch(proxyUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ model, contents: contextString })
                        });
                        const result = await response.json();
                        return result;
                    }
                );
            }

            // אם התשובה היא אובייקט candidates, נחלץ את הטקסט
            if (answer && typeof answer === 'object' && 'candidates' in answer) {
                answer = (answer as any).candidates?.[0]?.content?.parts?.[0]?.text || answer;
            }

            queryCache.current.set(cacheKey, answer);
            return answer;
        } catch (error) {
            console.error('[Query Error]:', error);
            return 'שגיאה בביצוע השאילתה. אנא נסה שוב.';
        }
    };

    // Fetch graph-queries.json on mount
    useEffect(() => {
        fetch('data/graph-queries.json')
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch graph-queries.json');
                return res.json();
            })
            .then(json => {
                setRandomQueries(json);
            })
            .catch((error) => {
                setRandomQueries({});
            });
    }, []);

    // Update selectedQueries when assetId changes
    useEffect(() => {
        if (randomQueries[assetId]) {
            setSelectedQueries(randomQueries[assetId]);
        } else if (randomQueries.default) {
            setSelectedQueries(randomQueries.default);
        } else {
            setSelectedQueries([]);
        }
    }, [assetId, randomQueries]);

    // Graph visualization effects
    useEffect(() => {
        if (!graphContainerRef.current || !assetId || !nodeColors || !thematicGraphData) return;

        if (networkRef.current) {
            networkRef.current.destroy();
            networkRef.current = null;
        }

        let nodes, edges, options;

        if (assetId !== 'thematic_graph') {
            const assetData = allGraphData[assetId];
            if (!assetData) return;

            const processedNodes = assetData.nodes.map((n: any) => {
                const color = nodeColors[n.type] ? 
                    { background: nodeColors[n.type].b, border: nodeColors[n.type].f } : 
                    { background: '#eee', border: '#333' };
                let tooltipText = getNodeId(n) + '\nסוג: ' + (n.type || 'לא צוין');
                if (n.title) {
                    tooltipText += '\nערך מורשת: ' + n.title;
                }
                return {
                    ...n,
                    id: getNodeId(n),
                    label: getNodeLabel(n),
                    color: color,
                    font: { color: '#333' },
                    title: tooltipText,
                };
            });

            nodes = new vis.DataSet(processedNodes);
            edges = new vis.DataSet(assetData.edges.map((e: any) => ({
                ...e,
                from: getEdgeFrom(e),
                to: getEdgeTo(e)
            })));
            
            options = {
                nodes: { shape: 'box', font: { face: 'Assistant', size: 16 }, margin: 10 },
                edges: { arrows: 'to', font: { face: 'Assistant', size: 14 }, smooth: { type: 'cubicBezier', roundness: 0.4 } },
                physics: { enabled: true, solver: 'barnesHut', barnesHut: { gravitationalConstant: -8000, centralGravity: 0.1, springLength: 200 } },
                interaction: { hover: true, tooltipDelay: 200 }
            };

        } else { // thematic_graph
            const COLOR_BY_TYPE = {
                'סגנון': { background: 'rgba(124,58,237,0.7)', border: '#7C3AED' },
                'טיפוס מבני': { background: 'rgba(251,191,36,0.7)', border: '#FBBF24' },
                'אתר': { background: 'rgba(203,213,225,0.7)', border: '#64748B' },
                'תמה מרכזית': { background: 'rgba(34,197,94,0.7)', border: '#22C55E' }
            };

            const processedNodes = thematicGraphData.nodes.map((n: any) => {
                const col = COLOR_BY_TYPE[n.type as keyof typeof COLOR_BY_TYPE] || 
                    { background: 'rgba(200,200,200,0.7)', border: '#666666' };
                const name = getNodeId(n);
                const type = n.type || '';
                const heritageValue = n.heritageValue || n.title || '';
                const meaning = n.meaning || '';
                let tooltipText = name + '\nסוג: ' + type;
                if (heritageValue) tooltipText += '\nערך מורשתי: ' + heritageValue;
                if (meaning) tooltipText += '\nמשמעות: ' + meaning;
                return { ...n, id: name, label: name, color: col, title: tooltipText };
            });

            nodes = new vis.DataSet(processedNodes);
            edges = new vis.DataSet(thematicGraphData.edges);
            
            options = {
                nodes: { shape: 'box', font: { face: 'Assistant', size: 16 }, margin: 10 },
                edges: { arrows: 'to', font: { face: 'Assistant', size: 14 }, smooth: { type: 'cubicBezier', roundness: 0.4 } },
                physics: { enabled: true, solver: 'barnesHut', barnesHut: { gravitationalConstant: -8000, centralGravity: 0.1, springLength: 200 } },
                interaction: { hover: true, tooltipDelay: 200 }
            };
        }

        const data = { nodes, edges };
        const network = new vis.Network(graphContainerRef.current, data, options);
        networkRef.current = network;

        network.on('showPopup', (params: any) => {
            const content = (document.getElementById(params) as HTMLElement)?.innerHTML;
            if (content) {
                setInfoBoxContent(content);
            }
        });

        network.on('hidePopup', () => {
            setInfoBoxContent('');
        });

        network.on('hoverNode', ({ node }: any) => {
            setShowTooltip(true);
        });

        network.on('blurNode', ({ node }: any) => {
            setShowTooltip(false);
        });

        return () => {
            if (networkRef.current) {
                networkRef.current.destroy();
                networkRef.current = null;
            }
        };
    }, [assetId, allGraphData, thematicGraphData, nodeColors]);

    // רינדור המחלקה הראשית
    if (assetId === 'all_assets') {
        return (
            <div className="graph-dashboard-container p-1 bg-gray-50 rounded-lg shadow-inner" style={{ direction: 'rtl' }}>
                <div className="controls p-1 bg-white rounded-lg shadow-sm">
                    <div className="flex justify-between items-center mb-1">
                        <h2 className="text-lg font-bold text-gray-800">לוח בקרה - כל הנכסים</h2>
                        <select
                            onChange={handleGraphChange}
                            value={assetId}
                            className="p-1 border rounded bg-white text-sm"
                        >
                            <option value="all_assets">כל הנכסים</option>
                            <option value="thematic_graph">גרף תמטי</option>
                            {Object.keys(allGraphData).map(id => (
                                <option key={id} value={id}>{allGraphData[id].title}</option>
                            ))}
                        </select>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                        גרף זה מציג את כל נכסי המורשת והקשרים ביניהם. ניתן להשתמש בבוט כדי לשאול שאלות על כלל הנכסים.
                    </p>
                    
                    {/* כפתורי מצב השאילתה */}
                    <div className="flex gap-2 mb-2">
                        {QUERY_MODES.map(mode => (
                            <button
                                key={mode.key}
                                className={
                                    'px-3 py-2 rounded font-bold text-sm ' +
                                    (queryMode === mode.key
                                        ? 'bg-blue-600 text-white shadow'
                                        : 'bg-gray-200 text-gray-700 hover:bg-blue-100')
                                }
                                onClick={() => setQueryMode(mode.key as any)}
                            >
                                {mode.label}
                            </button>
                        ))}
                    </div>
                    
                    <AiSpot
                        spotId="dashboard"
                        onQuery={handleQuery}
                        placeholder="שאל על קשרים בין נכסים, תמות משותפות, או כל שאלה אחרת..."
                        exampleQueries={selectedQueries}
                    />
                </div>
                <div className="graph-container-wrapper mt-2" style={{ height: 'calc(100vh - 250px)', position: 'relative' }}>
                    <AllAssetsGraph />
                </div>
            </div>
        );
    }

    const currentData = allGraphData[assetId] || {};
    const title = assetId === 'thematic_graph' ? 'גרף תמטי' : currentData.title;
    const description = assetId === 'thematic_graph' ? 'גרף הקשרים התמטיים בין מושגים' : currentData.description;

    return (
        <div className="graph-dashboard-container p-1 bg-gray-50 rounded-lg shadow-inner" style={{ direction: 'rtl' }}>
            <div className="controls p-1 bg-white rounded-lg shadow-sm">
                <div className="flex justify-between items-center mb-1">
                    <h2 className="text-lg font-bold text-gray-800">{title}</h2>
                    <select
                        onChange={handleGraphChange}
                        value={assetId}
                        className="p-1 border rounded bg-white text-sm"
                    >
                        <option value="all_assets">כל הנכסים</option>
                        <option value="thematic_graph">גרף תמטי</option>
                        {Object.keys(allGraphData).map(id => (
                            <option key={id} value={id}>{allGraphData[id].title}</option>
                        ))}
                    </select>
                </div>
                <p className="text-sm text-gray-600 mb-2">{description}</p>
                
                {/* כפתורי מצב השאילתה */}
                <div className="flex gap-2 mb-2">
                    {QUERY_MODES.map(mode => (
                        <button
                            key={mode.key}
                            className={
                                'px-3 py-2 rounded font-bold text-sm ' +
                                (queryMode === mode.key
                                    ? 'bg-blue-600 text-white shadow'
                                    : 'bg-gray-200 text-gray-700 hover:bg-blue-100')
                            }
                            onClick={() => setQueryMode(mode.key as any)}
                        >
                            {mode.label}
                        </button>
                    ))}
                </div>
                
                <AiSpot
                    spotId="dashboard"
                    onQuery={handleQuery}
                    placeholder="שאל את הבוט על הנכס..."
                    exampleQueries={selectedQueries}
                />
            </div>
            
            <div ref={graphContainerRef} className="graph-container mt-2 bg-white rounded" style={{ height: 'calc(100vh - 250px)', width: '100%' }} />
            {infoBoxContent && <DraggableInfoBox content={infoBoxContent} />}
        </div>
    );
};

export default HeritageDashboard;
