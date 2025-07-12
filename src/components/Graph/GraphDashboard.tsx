import React, { useState, useEffect, useRef } from 'react';
import { getPresetAnswer, getPresetQuestions, getExampleQuestions } from '../../meta-graph-generator';
import { AiSpot } from '../common/AiSpot';
import { DraggableInfoBox } from '../common/DraggableInfoBox';

declare const vis: any;

// Types
type Node = {
    id: string;
    label: string;
    type: string;
    title?: string;
};

type Edge = {
    from: string;
    to: string;
    label?: string;
};

// LLM Configuration - שונה ל-8b למהירות טובה יותר
// const LLM_MODEL = 'gemini-1.5-flash-8b';
const LLM_MODEL = 'gemini-1.5-flash';
// const LLM_MODEL = 'gemini-2.5-flash';
//const LLM_MODEL = 'gemini-2.5-pro';
// קיצ'ינג פשוט לתשובות
const responseCache = new Map<string, string>();

export async function askLLM(question: string, data: Record<string, any>): Promise<string> {
    console.log('askLLM called with question:', question);
    if (!question.trim()) return '';

    // בדיקת קיצ'ינג
    const cacheKey = `${question}_${JSON.stringify(data).slice(0, 100)}`;
    if (responseCache.has(cacheKey)) {
        console.log('Using cached response');
        return responseCache.get(cacheKey)!;
    }    let contextData = '';

    if (!data) {
        return "שגיאה: אין נתונים להצגה.";
    }

    // --- Meta-graph context support ---
    if (typeof data.metaContext === 'string') {
        contextData = data.metaContext;
    }
    // --- בניית ההקשר (Context) מהנתונים ---
    else if (typeof data === 'string') {
        contextData += `הנכס הנבחר הוא "${data}".`;
    } else if (Object.values(data).every(item => item.hasOwnProperty('nodes') && item.hasOwnProperty('edges'))) {
        contextData += 'המשתמש שואל שאלה כללית על כל נכסי המורשת. להלן המידע על כל הנכסים:\n\n';
        for (const assetId in data) {
            const assetData = data[assetId];
            contextData += `--- נכס: ${assetData.title} ---\n`;
            contextData += `תיאור: ${assetData.description}\n`;
            const nodesArray = Array.isArray(assetData.nodes) ? assetData.nodes : [];
            const edgesArray = Array.isArray(assetData.edges) ? assetData.edges : [];
            contextData += `צמתים:\n`;
            nodesArray.forEach((node: Node) => { contextData += `- ${node.label} (סוג: ${node.type}, תיאור: ${node.title || 'אין תיאור'})\n`; });
            contextData += `קשרים:\n`;
            edgesArray.forEach((edge: Edge) => {
                const fromNode = nodesArray.find((n: Node) => n.id === edge.from);
                const toNode = nodesArray.find((n: Node) => n.id === edge.to);
                if (fromNode && toNode) { contextData += `- "${fromNode.label}" -> ${edge.label || ''} -> "${toNode.label}"\n`; }
            });
            contextData += '\n';
        }
    } else {
        contextData += `הנכס הנבחר הוא "${data.title}".\n`;
        contextData += `תיאור: ${data.description}\n`;
        const nodesArray = Array.isArray(data.nodes) ? data.nodes : [];
        const edgesArray = Array.isArray(data.edges) ? data.edges : [];
        contextData += `הצמתים בגרף הם:\n`;
        nodesArray.forEach(node => { contextData += `- ${node.label} (סוג: ${node.type}, תיאור: ${node.title || 'אין תיאור'})\n`; });
        contextData += `הקשרים בגרף הם:\n`;
        edgesArray.forEach(edge => {
            const fromNode = nodesArray.find((n: Node) => n.id === edge.from);
            const toNode = nodesArray.find((n: Node) => n.id === edge.to);
            if (fromNode && toNode) {
                contextData += `- "${fromNode.label}" -> ${edge.label || ''} -> "${toNode.label}"\n`;
            }
        });
    }

    // --- פרומפט מעודכן עם הנחיות לתשובה קצרה ומדויקת ---
    const systemPrompt = `
אתה עוזר מומחה לניתוח נכסי מורשת תרבותית. תפקידך הוא לענות על שאלות של משתמשים אך ורק על סמך נתוני JSON שיסופקו לך.
התהליך שלך: זהה את הצמתים והקשרים הרלוונטיים מהנתונים כדי לענות על השאלה, וחבר תשובה נרטיבית ומשמעותית.
הנחיות לתשובה:
1. התשובה חייבת להיות קצרה ותמציתית (מקסימום 4 משפטים).
2. התבסס רק על הנתונים המסופקים.
3. ענה בעברית.
5. השתמש במילים פשוטות וברורות.
`;
// 4. התמקד בנקודה המרכזית ביותר.
    const fullPrompt = `
${systemPrompt}

--- נתוני ההקשר (JSON Data) ---
${contextData}
---------------------------------

בהתבסס על ההנחיות ועל נתוני ההקשר בלבד, ענה על השאלה הבאה:
שאלה: ${question}
`;

    const proxyUrl = import.meta.env.VITE_GEMINI_PROXY_URL;
    if (!proxyUrl) {
        console.error("Error: VITE_GEMINI_PROXY_URL is not defined.");
        return "שגיאה בהגדרות השרת.";
    }

    const response = await fetch(proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: LLM_MODEL,
            contents: fullPrompt
        })
    });

    if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ details: 'Could not parse error response.' }));
        console.error("Error from backend proxy:", errorBody);
        const errorMessage = errorBody.details || "שגיאה לא ידועה מהשרת.";
        return `שגיאה בקבלת תשובה מהבוט: ${errorMessage}`;
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "לא התקבלה תשובה מהבוט.";
    
    // שמירה בקיצ'ינג
    responseCache.set(cacheKey, text);

    // --- Token counting and logging ---
    function countTokens(str: string): number {
        // Approximate: count whitespace-separated words (not exact tokens)
        return str.split(/\s+/).filter(Boolean).length;
    }
    const promptTokens = countTokens(systemPrompt);
    const contextTokens = countTokens(contextData);
    const responseTokens = countTokens(text);
    const totalTokens = promptTokens + contextTokens + responseTokens;
    console.log(`\uD83D\uDD11 Token counts: prompt=${promptTokens}, context=${contextTokens}, response=${responseTokens}, total=${totalTokens}`);

    return text;
}

// Graph Dashboard Component
interface GraphDashboardProps {
    allGraphData: Record<string, any>;
    thematicGraphData: any;
    nodeColors: Record<string, any>;
}

const GraphDashboard: React.FC<GraphDashboardProps> = ({ allGraphData, thematicGraphData, nodeColors }) => {
    const [assetId, setAssetId] = useState<string>('');
    const [infoBoxContent, setInfoBoxContent] = useState<string>('');
    const [randomQueries, setRandomQueries] = useState<Record<string, string[]>>({});
    const [selectedQueries, setSelectedQueries] = useState<string[]>([]);
    const [assetKeys, setAssetKeys] = useState<string[]>([]);
    
    // Debug log when selectedQueries changes
    useEffect(() => {
        console.log('selectedQueries updated:', selectedQueries);
    }, [selectedQueries]);    // Fetch graph-queries.json on mount
    useEffect(() => {
        // Import directly from the data folder to ensure we get the right file
        import('../../../data/graph-queries.json')
            .then(module => {
                console.log('Successfully loaded queries from graph-queries.json:', Object.keys(module.default));
                setRandomQueries(module.default);
            })
            .catch(error => {
                console.error("Error importing graph-queries.json:", error);
                setRandomQueries({});
            });
    }, []);

    const askGraphLLM = async (question: string, contextData: any): Promise<string> => {
        // בדוק אם יש תשובה מוכנה בבנק (התאמה מדויקת בלבד)
        const presetAnswer = getPresetAnswer(question);
        if (presetAnswer) {
            return presetAnswer;
        }
        // אם אין תשובה מוכנה, שלח ל-LLM את כל המטא-גרף בלבד
        if (assetId === 'all_assets') {
            // ייבוא meta-graph-config ישירות
            const metaGraphConfig = await import('../../meta-graph-config.json');
            const meta = metaGraphConfig.default.meta_graph;
            // בנה הקשר טקסטואלי קומפקטי
            let metaContext = `${meta.title}\n${meta.description}\n\nNodes:\n`;
            meta.nodes.forEach((n: any) => {
                metaContext += `- ${n.label} (${n.type}): ${n.title}\n`;
            });
            metaContext += '\nקשרים:\n';
            meta.edges.forEach((e: any) => {
                metaContext += `- ${e.from} -> ${e.label} -> ${e.to}\n`;
            });
            return await askLLM(question, { metaContext });
        } else {
            // ליתר הגרפים - שלח את ההקשר הרגיל
            return await askLLM(question, contextData);
        }
    };

    const handleQuery = (question: string) => {
        let contextData;
        if (assetId === 'all_assets') contextData = allGraphData;
        else if (assetId === 'thematic_graph') contextData = thematicGraphData;
        else contextData = allGraphData[assetId];
        return askGraphLLM(question, contextData);
    };

    const graphContainerRef = useRef<HTMLDivElement | null>(null);
    const networkRef = useRef<any>(null);    useEffect(() => {
        // Sort keys by workshopCycle and then alphabetically
        const keys = Object.keys(allGraphData);
        keys.sort((a, b) => {
            const cycleA = parseInt(allGraphData[a].workshopCycle) || Infinity;
            const cycleB = parseInt(allGraphData[b].workshopCycle) || Infinity;
            return cycleA !== cycleB ? cycleA - cycleB : allGraphData[a].title.localeCompare(allGraphData[b].title, 'he');
        });
        setAssetKeys(keys);
        setAssetId('all_assets');
    }, [allGraphData]);    useEffect(() => {
        // When assetId changes, pick 3 random queries for the selected graph
        let queries: string[] = [];
        console.log('Current assetId:', assetId);
        
        // --- Use meta-graph questions for all_assets ---
        if (assetId === 'all_assets') {
            const metaQuestions = getPresetQuestions();
            const exampleIds = getExampleQuestions();
            queries = exampleIds.map((id: string) => {
                const question = metaQuestions.find((q: { id: string; }) => q.id === id);
                return question ? question.text : '';
            }).filter((text: string) => text !== '');
            console.log('Meta questions for all_assets:', queries);
        }
        else if (assetId && randomQueries[assetId]) {
            queries = randomQueries[assetId] as string[];
            console.log(`Using queries for ${assetId}:`, queries);
        } else if (randomQueries["default"]) {
            queries = randomQueries["default"] as string[];
            console.log(`No specific queries found for ${assetId}, using defaults:`, queries);
        }
        
        if (queries && queries.length > 0) {
            // For all_assets use meta-graph questions as-is, for others shuffle and pick 3
            if (assetId === 'all_assets') {
                setSelectedQueries(queries);
                console.log('Using all questions for all_assets:', queries);
            } else {
                // Match the exact behavior of the old version - shuffling and picking 3
                const shuffled = [...queries].sort(() => 0.5 - Math.random());
                setSelectedQueries(shuffled.slice(0, 3));
                console.log('Shuffled and selected 3 queries:', shuffled.slice(0, 3));
            }
        } else {
            setSelectedQueries([]);
            console.log('No queries selected');
        }
    }, [assetId, randomQueries]);

    useEffect(() => {
        if (!graphContainerRef.current || !assetId || !nodeColors || !thematicGraphData) return;

        if (networkRef.current) {
            networkRef.current.destroy();
            networkRef.current = null;
        }

        let nodes, edges, options;        if (assetId !== 'all_assets' && assetId !== 'thematic_graph') {
            const assetData = allGraphData[assetId];
            if (!assetData) return;

            const processedNodes = assetData.nodes.map((n: any) => {
                const color = nodeColors[n.type] ? { background: nodeColors[n.type].b, border: nodeColors[n.type].f } : { background: '#eee', border: '#333' };
                // Use only plain text and <br> for vis.js tooltips
                let tooltipText = `${n.label}\nסוג: ${n.type || 'לא צוין'}`;
                if (n.title) {
                    tooltipText += `\nערך מורשת: ${n.title}`;
                }
                // vis.js will convert \n to <br> in tooltips
                return {
                    ...n,
                    color: color,
                    font: { color: '#333' },
                    title: tooltipText,
                };
            });

            nodes = new vis.DataSet(processedNodes);
            edges = new vis.DataSet(assetData.edges);
            options = {
                nodes: { shape: 'box', font: { face: 'Assistant', size: 16 }, margin: 10 },
                edges: { arrows: 'to', font: { face: 'Assistant', size: 14 }, smooth: { type: 'cubicBezier', roundness: 0.4 } },
                physics: { enabled: true, solver: 'barnesHut', barnesHut: { gravitationalConstant: -8000, centralGravity: 0.1, springLength: 200 } },
                interaction: { hover: true, tooltipDelay: 200 }
            };        } else if (assetId === 'thematic_graph') {
            // שימוש בקונפיגורציה מתוך themes.html
            const COLOR_BY_TYPE = {
                'סגנון': { background: 'rgba(124,58,237,0.7)', border: '#7C3AED' },
                'טיפוס מבני': { background: 'rgba(251,191,36,0.7)', border: '#FBBF24' },
                'אתר': { background: 'rgba(203,213,225,0.7)', border: '#64748B' },
                'תמה מרכזית': { background: 'rgba(34,197,94,0.7)', border: '#22C55E' }
            };

            // הכנת הצמתים עם הסגנון הנכון - דומה לקובץ themes.html
            const processedNodes = thematicGraphData.nodes.map((n: { type: string; label?: string; name?: string; id?: string; title?: string; heritageValue?: string; meaning?: string }) => {
                if (!n.label) n.label = n.name || n.id;
                const col = COLOR_BY_TYPE[n.type as keyof typeof COLOR_BY_TYPE] || { background: 'rgba(200,200,200,0.7)', border: '#666666' };
                const name = n.name || n.label;
                const type = n.type || '';
                const heritageValue = n.heritageValue || n.title || '';
                const meaning = n.meaning || '';
                let tooltipText = `${name}\nסוג: ${type}`;
                if (heritageValue) tooltipText += `\nערך מורשתי: ${heritageValue}`;
                if (meaning) tooltipText += `\nמשמעות: ${meaning}`;
                return {
                    ...n,
                    label: n.name || n.label,
                    color: { background: col.background, border: col.border },
                    title: tooltipText
                };
            });

            nodes = new vis.DataSet(processedNodes);
            edges = new vis.DataSet(thematicGraphData.edges);
            options = {
                nodes: {
                    shape: 'box',
                    font: { align: 'center', size: 14, color: '#333333', face: 'Calibri, Assistant, sans-serif' },
                    borderWidth: 1,
                    margin: { top: 8, right: 10, bottom: 8, left: 10 },
                    widthConstraint: { maximum: 160 }
                },
                edges: {
                    arrows: { to: { enabled: true, scaleFactor: 0.4 } },
                    font: { align: 'middle', size: 11, color: '#555555', strokeWidth: 0, background: 'white', face: 'Calibri, Assistant, sans-serif' },
                    smooth: { type: 'cubicBezier', forceDirection: 'horizontal', roundness: 0.5 },
                    color: { color: '#848484', highlight: '#333333', hover: '#555555', inherit: false }
                },
                layout: { improvedLayout: true },
                physics: {
                    enabled: true,
                    solver: 'repulsion',
                    repulsion: { 
                        nodeDistance: 230, 
                        centralGravity: 0.05, 
                        springLength: 20, 
                        springConstant: 0.005, 
                        damping: 0.09 
                    },
                    stabilization: { iterations: 2500, fit: true }
                },
                interaction: { 
                    hover: true, 
                    tooltipDelay: 200,
                    zoomView: true,
                    dragView: true
                }
            };
        }        if (nodes && edges) {
            networkRef.current = new vis.Network(graphContainerRef.current, { nodes, edges }, options);
            
            // Click events for detailed infobox (only for thematic graph)
            networkRef.current.on('click', (params: any) => {
                setInfoBoxContent('');
                if (params.nodes.length > 0 && assetId === 'thematic_graph') {
                    const nodeId = params.nodes[0];
                    const clickedNode = nodes.get(nodeId);
                    // פורמט infoBox לפי themes.html + תיאור כמו בגרפים פרטניים
                    const name = clickedNode.name || clickedNode.label;
                    const type = clickedNode.type || '';
                    const heritageValue = clickedNode.heritageValue || clickedNode.title || '';
                    const meaning = clickedNode.meaning || '';
                    // Always show description: prefer description, then meaning, then title
                    let content = `

                        <div style="font-family: Calibri, Assistant, sans-serif; background: #ffffff; border: 1px solid #ccc; padding: 8px; 
                            line-height: 1.1rem; direction: rtl; text-align: right; max-width: 280px; font-size: 1.0rem;">
                            <span id="closeinfo" style="float: left; cursor: pointer; font-weight: bold;">✖</span>
                            <h3 id="info_name" style="margin: 0;">${name}</h3>
                            <p style="margin: 5px; padding: 1px;"><strong>סוג:</strong> <span id="info_type">${type}</span></p>
                            <p style="margin: 5px; padding: 1px;"><strong>ערך מורשתי:</strong> <span id="info_heritageValue">${heritageValue}</span></p>
                            <p style="margin: 5px; padding: 1px;"><strong>משמעות:</strong> <span id="info_meaning">${meaning}</span></p>
                        </div>                        `;
                    
                    setInfoBoxContent(content);
                    
                    // הוספת אירוע סגירת infoBox וגם אפשרות לסגור עם מקש Escape
                    setTimeout(() => {
                        const closeButton = document.getElementById('closeinfo');
                        if (closeButton) {
                            closeButton.addEventListener('click', () => setInfoBoxContent(''));
                        }
                        
                        // הוספת יכולת סגירה עם Escape כמו ב-themes.html
                        const escHandler = (e: KeyboardEvent) => {
                            if (e.key === 'Escape') setInfoBoxContent('');
                        };
                        document.addEventListener('keydown', escHandler);
                        
                        // ניקוי האירוע כשהתיבה נסגרת
                        return () => {
                            document.removeEventListener('keydown', escHandler);
                        };
                    }, 0);
                }
            });
        }

    }, [assetId, allGraphData, thematicGraphData, nodeColors]);

    // Define description variable
    const description = assetId === 'all_assets' ? 
   'כאן ניתן שאול שאלות כלליות על אוסף הערכות הנכסים ( 24 נכסים)' : assetId === 'thematic_graph' ? 'גרף נושאים' : allGraphData[assetId]?.description || '';

    return (
        <div className="bg-white p-4 rounded-lg shadow">
            {/* Asset selection dropdown */}            <div className="flex mb-2">
                <select dir="rtl" id="asset-select" className="p-2 border rounded" value={assetId} onChange={(e) => setAssetId(e.target.value)}>
                    <option value="all_assets">כלל הנכסים</option>
                    <option value="thematic_graph">גרף נושאים</option>
                    {assetKeys.map(key => (
                        <option key={key} value={key}>{allGraphData[key].title}</option>
                    ))}
                </select>
            </div>
            <span id="graph-description" className="mb-2">{description}</span>            <AiSpot
                spotId="dashboard"
                onQuery={handleQuery}
                key={`${assetId}-${selectedQueries.length > 0 ? selectedQueries[0] : 'none'}`} // Create a unique key to force re-render
                exampleQueries={selectedQueries}
            />
            <div id="graph-container" ref={graphContainerRef} className="min-h-[500px] border rounded mt-4" style={{ display: (assetId === 'all_assets' ? 'none' : 'block') }}></div>
            <DraggableInfoBox content={infoBoxContent} />
        </div>
    );
};

export default GraphDashboard;
