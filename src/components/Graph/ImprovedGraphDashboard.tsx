import React, { useState, useEffect, useRef } from 'react';
import { prependLangInstruction } from '../../utils/language';
import { GraphData, LLMMessage } from '../../services/graphQueryService';
//import { chatGraphModern } from '../../services/modernGraphQueryService';
import { chatGraphModern } from '../../services/agentService';

import AllAssetsGraph from './AllAssetsGraph';
import { calculateTokenCost, estimateTokens, printTokenLogStyled } from '../../services/tokenCostService';

// Token counting utility
// const estimateTokensGlobal = (text: string): number => {
//     return Math.ceil(text.length / 2.5);
// };

const fetchChatCompletion = async (
    messages: LLMMessage[],
    tools?: any[]
) => {
    const proxyUrl = import.meta.env.VITE_GEMINI_PROXY_URL;
    //VITE_GEMINI_PROXY_URL=https://us-central1-telemyuval.cloudfunctions.net/geminiProxy
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
        const outputTokens = estimateTokens(outputText);        const inputCost = calculateTokenCost(inputTokens, LLM_MODEL);
        const outputCost = calculateTokenCost(outputTokens, LLM_MODEL);
        const totalCost = inputCost + outputCost;

        printTokenLogStyled({
            question: '', // No question variable in scope
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

declare const vis: any;

// LLM Configuration
//const LLM_MODEL = 'gemini-2.5-flash';
const LLM_MODEL = 'gemini-2.5-flash-lite';


// שאלות דוגמה מובנות לפי קטגוריות
const EXAMPLE_QUESTIONS = {
    general_assets: [
        "אילו סוגי נכסים יש במאגר?",
        "מה הטיפולוגיות האדריכליות השונות?",
        "כמה נכסים יש מכל תקופה?",
        "אילו אזורים גיאוגרפיים מיוצגים?"
    ],
    general_values: [
        "אילו ערכי מורשת עיקריים מוזכרים?",
        "מה הערך האסתטי השכיח ביותר?",
        "אילו ערכים חברתיים נזכרים?",
        "מה התפלגות הערכים ההיסטוריים?"
    ],
    context_relations: [
        "מה הקשר בין דוניאנה לתקופה העותמנית?",
        "איך קשור הבאוהאוס לנכסי תל אביב?",
        "מה הקשר בין הסגנון הבינלאומי לשנות ה-50?",
        "איך קשור המנדט הבריטי לפיתוח הערים?"
    ],
    direct_asset_connections: [
        "מה הקשר בין בית שמש לטיגארט?",
        "איך קשורים אולפני הרצליה לבתי בארי?",
        "מה משותף בין נכסי תל אביב?",
        "אילו קשרים ישירים יש בין הנכסים?"
    ],
    indirect_connections: [
        "מה הקשר בין בית רמת השפר לבית שמש?",
        "אילו ערכים משותפים לנכסי הצפון?",
        "מה מחבר בין נכסים מתקופות שונות?",
        "אילו צמתים משותפים יש לנכסי הדרום?"
    ],
    sub_node_relations: [
        "אילו יחסים יש בין סגנונות אדריכליים שונים?",
        "מה הקשר בין ערכים חברתיים וקהילתיים?",
        "איך קשורים סוגי חומרי בנייה שונים?",
        "מה היחס בין תקופות היסטוריות?"
    ],
    meanings_insights: [
        "אילו משמעויות כלליות עולות מכלל הנכסים?",
        "מה הנרטיב המרכזי של אוסף הנכסים?",
        "אילו דפוסים חוזרים ניתן לזהות?",
        "מה המסר התרבותי הכללי?"
    ]
};

// Draggable InfoBox Component
interface DraggableInfoBoxProps {
    content: string;
}

const DraggableInfoBox: React.FC<DraggableInfoBoxProps> = ({ content }) => {
    const boxRef = useRef<HTMLDivElement>(null);
    const isVisible = content.trim() !== '';

    useEffect(() => {
        const el = boxRef.current;
        if (!el || !isVisible) return;

        let isDragging = false;
        let offsetX = 0;
        let offsetY = 0;

        const onMouseDown = (e: MouseEvent) => {
            if ((e.target as HTMLElement).id === 'closeinfo') {
                return;
            }
            isDragging = true;
            const rect = el.getBoundingClientRect();
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - rect.top;
            (el as HTMLElement).style.cursor = 'grabbing';
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        };

        const onMouseMove = (e: MouseEvent) => {
            if (isDragging) {
                (el as HTMLElement).style.left = `${e.clientX - offsetX}px`;
                (el as HTMLElement).style.top = `${e.clientY - offsetY}px`;
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

// Enhanced AiSpot Component with question categories
interface AiSpotProps {
    spotId: string;
    onQuery: (input: string) => Promise<string>;
    placeholder?: string;
}

const AiSpot: React.FC<AiSpotProps> = ({ spotId: _spotId, onQuery, placeholder }) => {
    const [input, setInput] = useState<string>('');
    const [output, setOutput] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedQuestion, setSelectedQuestion] = useState<string>('');

    const handleAsk = async (customInput?: string) => {
        const q = typeof customInput === 'string' ? customInput : input;
        if (!q.trim() || isLoading) return;
        setIsLoading(true);
        setOutput('');
        
        try {
            const answer = await onQuery(q);
            // הצג תשובה עם אפקט typing
            const cleanAnswer = answer.trim();
            const words = cleanAnswer.split(' ').filter(word => word.length > 0);
            let currentText = '';
            for (let i = 0; i < words.length; i++) {
                currentText += words[i];
                if (i < words.length - 1) currentText += ' ';
                setOutput(currentText);
                await new Promise(resolve => setTimeout(resolve, 20));
            }
        } catch (error) {
            console.error("AI Query Error:", error);
            setOutput('Error getting response from bot.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleAsk();
        }
    };

    const handleCategoryChange = (category: string) => {
        setSelectedCategory(category);
        setSelectedQuestion('');
    };

    const handleQuestionSelect = (question: string) => {
        setSelectedQuestion(question);
        setInput(question);
    };

    const handleQuestionSubmit = () => {
        if (selectedQuestion.trim()) {
            handleAsk(selectedQuestion);
        }
    };

    const getCategoryDisplayName = (category: string): string => {
        const names: Record<string, string> = {
            general_assets: "1. שאלות כלליות על נכסים וטיפולוגיות",
            general_values: "2. שאלות כלליות על ערכים",
            context_relations: "3. קשרים הקשריים (דוניאנה ← עותמנית)",
            direct_asset_connections: "4. קשרים ישירים בין נכסים",
            indirect_connections: "5. קשרים עקיפים דרך צמתים משותפים",
            sub_node_relations: "6. יחסים בין צמתי משנה",
            meanings_insights: "7. משמעויות כלליות ותובנות"
        };
        return names[category] || category;
    };

    return (
        <div className="ai-spot mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-bold text-lg text-blue-800 mb-3">🤖 שאל את הבוט - מצב משופר</h4>
            
            {/* שורת הזנה ידנית */}
            <div className="flex gap-2 mb-4">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder || 'הקלד שאלה כלשהי...'}
                    className="flex-grow p-2 border rounded bg-white text-gray-900 placeholder:text-gray-500"
                    disabled={isLoading}
                />
                <button
                    onClick={() => handleAsk()}
                    className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                    disabled={isLoading || !input.trim()}
                >
                    {isLoading ? 'חושב...' : 'שאל'}
                </button>
            </div>

            {/* דרופדאון לבחירת קטגוריית שאלות */}
            <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    או בחר קטגוריית שאלות:
                </label>
                <select
                    value={selectedCategory}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full p-2 border rounded bg-white text-gray-900"
                    dir="rtl"
                >
                    <option value="">-- בחר קטגוריה --</option>
                    {Object.keys(EXAMPLE_QUESTIONS).map(category => (
                        <option key={category} value={category}>
                            {getCategoryDisplayName(category)}
                        </option>
                    ))}
                </select>
            </div>

            {/* דרופדאון לבחירת שאלה ספציפית */}
            {selectedCategory && (
                <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        בחר שאלה ספציפית:
                    </label>
                    <div className="flex gap-2">
                        <select
                            value={selectedQuestion}
                            onChange={(e) => handleQuestionSelect(e.target.value)}
                            className="flex-grow p-2 border rounded bg-white text-gray-900"
                            dir="rtl"
                        >
                            <option value="">-- בחר שאלה --</option>
                            {(EXAMPLE_QUESTIONS as any)[selectedCategory].map((question: string, index: number) => (
                                <option key={index} value={question}>
                                    {question}
                                </option>
                            ))}
                        </select>
                        <button
                            onClick={handleQuestionSubmit}
                            disabled={!selectedQuestion || isLoading}
                            className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            שאל
                        </button>
                    </div>
                </div>
            )}

            {/* תיבת תשובה */}
            <div className="p-3 mt-2 bg-white rounded border border-gray-200 min-h-[60px] whitespace-pre-wrap">
                {output}
            </div>
        </div>
    );
};

// Simple LLM function for individual graphs (original approach)
async function askLLMSimple(question: string, graphData: any): Promise<string> {
    if (!question.trim()) return '';

    // בניית הקשר הטקסטואלי - עם דגש על זיהוי קשרים עקיפים
    let contextData = '';

    // זיהוי קשרים עקיפים אם השאלה מכילה שמות נכסים
    const questionLower = question.toLowerCase();
    if (questionLower.includes('קשר') && graphData.nodes && graphData.edges) {
        // מציאת נכסי מורשת בגרף
        const heritageAssets = graphData.nodes.filter((n: any) => n.asset === true || n.Asset === true);
        
        if (heritageAssets.length >= 2) {
            contextData += `--- קשרים עקיפים בין נכסי מורשת ---\n`;
            
            for (let i = 0; i < heritageAssets.length; i++) {
                for (let j = i + 1; j < heritageAssets.length; j++) {
                    const asset1 = heritageAssets[i];
                    const asset2 = heritageAssets[j];
                    
                    // מציאת קשרים משותפים
                    const asset1Connections = graphData.edges.filter((e: any) => e.from === asset1.id).map((e: any) => e.to);
                    const asset2Connections = graphData.edges.filter((e: any) => e.from === asset2.id).map((e: any) => e.to);
                    
                    const sharedConnections = asset1Connections.filter((conn: string) => asset2Connections.includes(conn));
                    
                    if (sharedConnections.length > 0) {
                        const sharedNodes = sharedConnections.map((connId: string) => {
                            const node = graphData.nodes.find((n: any) => n.id === connId);
                            return node ? node.label : connId;
                        });

                        contextData += `קשר עקיף: ${asset1.id} ↔ ${asset2.id} דרך: ${sharedNodes.join(', ')}\n`;
                    }
                }
            }
            contextData += '\n';
        }
    }

    // הוספת צמתים
    contextData += `--- צמתים בגרף ---\n`;
    graphData.nodes?.forEach((node: any) => {
        contextData += `- ${node.id} (${node.type}${node.meaning ? `, תיאור: ${node.meaning}` : ''})`;
        if (node.title) {
            contextData += ` - ${node.title}`;
        }
        contextData += '\n';
    });

    // הוספת קשרים
    contextData += `\n--- קשרים בגרף ---\n`;
    graphData.edges?.forEach((edge: any) => {
        const fromNode = graphData.nodes?.find((n: any) => n.id === edge.from);
        const toNode = graphData.nodes?.find((n: any) => n.id === edge.to);
        if (fromNode && toNode) {
            contextData += `- "${fromNode.label}" -> ${edge.label || ''} -> "${toNode.label}"\n`;
        }
    });

    const systemPrompt = `
    אתה עוזר מומחה לניתוח נכסי מורשת תרבותית. תפקידך הוא לספק תשובות תמציתיות ומדויקות על בסיס הגרף בלבד.

    **כללי תשובה**:
    1. תשובות קצרות (1-2 משפטים) ומדויקות - רק מה שיש בגרף
    2. אם נשאל על "קשר" בין צמתים - זהה קשרים ישירים או עקיפים דרך צמתים משותפים
    3. קשר עקיף = שני צמתים מחוברים לאותו צומת ביניים
    4. ציין בבירור אם הקשר ישיר או עקיף ודרך מה

    **חשוב לנכסים**: נכסי מורשת = רק צמתים עם asset=true. עבור שאלות על קשרים בין נכסים, חפש צמתים משותפים שמחברים ביניהם.

    **השתמש תמיד ב-id של הצומת וב-label של הקשר בדיוק כפי שמופיעים בנתונים.**

    הנחיות נוספות:
    1. היה תמציתי - לא צריך הסברים מפורטים
    2. אם אין קשר בגרף - אמר שאין קשר
    3. התבסס רק על הנתונים המסופקים
    4. התשובה תיתן במנעד השפה של הקלט (ענה באותה שפה כמו השאלה)
    `;

    const fullPromptBase = `
        ${systemPrompt}

        --- נתוני ההקשר (JSON Data) ---
        ${contextData}
        ---------------------------------

        בהתבסס על ההנחיות ועל נתוני ההקשר בלבד, ענה על השאלה הבאה:
        שאלה: ${question}
        `;
    const fullPrompt = prependLangInstruction(fullPromptBase, question);

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
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || "לא התקבלה תשובה מהבוט.";
    const text = rawText.trim().replace(/\s+/g, ' ').replace(/\s+$/, '');

    // Token counting for individual graphs
    function countTokens(str: string): number {
        return Math.ceil(str.length / 2.5);
    }
    const promptTokens = countTokens(systemPrompt);
    const contextTokens = countTokens(contextData);
    const questionTokens = countTokens(question);
    const responseTokens = countTokens(text);
    const inputTokens = promptTokens + contextTokens + questionTokens;

    // Use unified token logging
    printTokenLogStyled({
        question,
        inputTokens,
        outputTokens: responseTokens,
        model: LLM_MODEL,
        cost: calculateTokenCost(inputTokens, LLM_MODEL) + calculateTokenCost(responseTokens, LLM_MODEL)
    });

    return text;
}

// Main Improved Graph Dashboard Component
interface ImprovedGraphDashboardProps {
    allGraphData: Record<string, any>;
    allGrapheCleanData: any;
    thematicGraphData: any;
    nodeColors: Record<string, any>;
    selectedGraph?: string;
}

const ImprovedGraphDashboard: React.FC<ImprovedGraphDashboardProps> = ({ 
    allGraphData, 
    allGrapheCleanData, 
    thematicGraphData, 
    nodeColors, 
    selectedGraph 
}) => {
    const [assetId, setAssetId] = useState<string>(selectedGraph || 'all_assets');
    const [showTooltip, setShowTooltip] = useState(false);
    const [infoBoxContent, setInfoBoxContent] = useState<string>('');
    
    const graphContainerRef = useRef<HTMLDivElement | null>(null);
    const networkRef = useRef<any>(null);

    // Cache for queries
    const queryCache = useRef(new Map<string, string>());

    const handleGraphChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setAssetId(event.target.value);
    };

    const handleQuery = async (question: string) => {
        if (!question.trim()) return '';
        
        const cacheKey = assetId + '|' + question.trim();
        if (queryCache.current.has(cacheKey)) {
            console.log('[CACHE] Returning cached answer for:', cacheKey);
            return queryCache.current.get(cacheKey)!;
        }

        let graphData: GraphData;
        
        if (assetId === 'all_assets') {
            // טוען את הגרף המאסטר לשאלות כלליות
            try {
                graphData = await fetch('data/graphMaster.json').then(r => r.json());
                if (Array.isArray(graphData.nodes)) {
                    graphData.nodes = graphData.nodes.map((node: any) => ({
                        ...node,
                        label: node.label || node.name || node.id
                    }));
                }
            } catch (error) {
                console.error('[Graph] Failed to load graphMaster.json, falling back to allGrapheCleanData:', error);
                graphData = allGrapheCleanData;
            }
            
            // שימוש ב-LLM מתקדם לשאלות כלליות
            console.log('[QUERY MODE] מנגנון: מודרני/סוכן (Modern/Agent)');
            const result = await chatGraphModern(question, graphData, fetchChatCompletion);
            queryCache.current.set(cacheKey, result);
            return result;
        } else {
            // עבור גרפים פרטניים - השתמש במנגנון הפשוט המקורי
            if (assetId === 'thematic_graph') {
                graphData = thematicGraphData;
                console.log('[QUERY MODE] מנגנון: פשוט (Simple) - גרף נושאים');
            } else {
                graphData = allGraphData[assetId];
                console.log('[QUERY MODE] מנגנון: פשוט (Simple) - גרף בודד');
            }

            if (!graphData) {
                return "שגיאה: לא נמצא נתוני גרף.";
            }

            // המנגנון הפשוט המקורי לגרפים בודדים
            const result = await askLLMSimple(question, graphData);
            queryCache.current.set(cacheKey, result);
            return result;
        }
    };

    // Graph visualization effects
    useEffect(() => {
        if (!graphContainerRef.current || !assetId || !nodeColors || !thematicGraphData) return;

        if (networkRef.current) {
            networkRef.current.destroy();
            networkRef.current = null;
        }

        let nodes, edges, options;

        if (assetId !== 'all_assets' && assetId !== 'thematic_graph') {
            const assetData = allGraphData[assetId];
            if (!assetData) return;

            const processedNodes = assetData.nodes.map((n: any) => {
                const color = nodeColors[n.type] ? { background: nodeColors[n.type].b, border: nodeColors[n.type].f } : { background: '#eee', border: '#333' };
                let tooltipText = `${n.label}\nסוג: ${n.type || 'לא צוין'}`;
                if (n.title) {
                    tooltipText += `\nערך מורשת: ${n.title}`;
                }
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
            };

        } else if (assetId === 'thematic_graph') {
            const COLOR_BY_TYPE = {
                'סגנון': { background: 'rgba(124,58,237,0.7)', border: '#7C3AED' },
                'טיפוס מבני': { background: 'rgba(251,191,36,0.7)', border: '#FBBF24' },
                'ערך': { background: 'rgba(239,68,68,0.7)', border: '#EF4444' },
                'תקופה': { background: 'rgba(34,197,94,0.7)', border: '#22C55E' },
                'מיקום': { background: 'rgba(59,130,246,0.7)', border: '#3B82F6' },
                'אתר': { background: 'rgba(203,213,225,0.7)', border: '#64748B' },
                'תמה מרכזית': { background: 'rgba(34,197,94,0.7)', border: '#22C55E' }
            };

            const processedNodes = thematicGraphData.nodes.map((n: any) => {
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
        }

        if (nodes && edges) {
            networkRef.current = new vis.Network(graphContainerRef.current, { nodes, edges }, options);

            // Click events for detailed infobox (only for thematic graph)
            networkRef.current.on('click', (params: any) => {
                setInfoBoxContent('');
                if (params.nodes.length > 0 && assetId === 'thematic_graph') {
                    const nodeId = params.nodes[0];
                    const clickedNode = nodes.get(nodeId);
                    const name = clickedNode.name || clickedNode.label;
                    const type = clickedNode.type || '';
                    const heritageValue = clickedNode.heritageValue || clickedNode.title || '';
                    const meaning = clickedNode.meaning || '';

                    let content = `
                        <div style="font-family: Calibri, Assistant, sans-serif; background: #ffffff; border: 1px solid #ccc; padding: 8px; 
                            line-height: 1.1rem; direction: rtl; text-align: right; max-width: 280px; font-size: 1.0rem;">
                            <span id="closeinfo" style="float: left; cursor: pointer; font-weight: bold;">✖</span>
                            <h3 id="info_name" style="margin: 0;">${name}</h3>
                            <p style="margin: 5px; padding: 1px;"><strong>סוג:</strong> <span id="info_type">${type}</span></p>
                            ${heritageValue ? `<p style="margin: 5px; padding: 1px;"><strong>ערך מורשתי:</strong> <span id="info_heritage">${heritageValue}</span></p>` : ''}
                            ${meaning ? `<p style="margin: 5px; padding: 1px;"><strong>משמעות:</strong> <span id="info_meaning">${meaning}</span></p>` : ''}
                        </div>
                    `;
                    setInfoBoxContent(content);
                }
            });
        }

    }, [assetId, allGraphData, thematicGraphData, nodeColors]);    const description = assetId === 'all_assets' ?
        'כאן ניתן לשאול שאלות כלליות על אוסף הערכות הנכסים (24 נכסים)' :
        assetId === 'thematic_graph' ?
            'גרף המתאר את התמות העיקריות העולות מאוסף הנכסים' :
            (allGraphData[assetId] as any)?.description || '';

    return (
        <div className="bg-white p-3 rounded-lg shadow">
            <div id="graph-description" className="text-xs text-gray-600 mb-2">{description}</div>

            {/* Graph Selection Dropdown */}
            <div className="flex items-center mb-4 relative">
                <div className="flex items-center">
                    <select
                        dir="rtl"
                        id="asset-select"
                        className="p-2 border rounded"
                        value={assetId}
                        onChange={handleGraphChange}                    >
                        <option value="all_assets">כלל הנכסים</option>
                        <option value="thematic_graph">גרף נושאים</option>
                        <option value="herzliyaStudios">אולפני הרצליה</option>
                        <option value="bateiBairy">בתי בארי, תל אביב</option>
                        <option value="haifaHangar15">האנגר 15, נמל חיפה</option>
                        <option value="zichronFoundersCourt">חצר המייסדים 37, זכרון יעקב</option>
                        <option value="sheferAlley">מבנה בסמטת שפר, תל אביב</option>
                        <option value="regbaWaterTower">מגדל המים, מושב רגבה</option>
                        <option value="mandelbaumGate">מעבר מנדלבאום, ירושלים</option>
                        <option value="beitShemeshPolice">משטרת בית שמש (מצודת טיגארט)</option>
                        <option value="gezerRegionalSurvey_v4">סקר מורשת, מ.א. גזר (כולל ערכים)</option>
                        <option value="akkoCourtyardHouse">בית חצר עות'מאני בעכו העתיקה</option>
                        <option value="manofFarm">החווה החקלאית בעכו(מנוף)</option>
                        <option value="roosterGaaton">התרנגול, געתון</option>
                        <option value="einTzviTower">מגדל שמירה 2, מעין צבי</option>
                        <option value="duniyeRestaurant_unified">מסעדת דוניינא, עכו (ניתוח מאוחד)</option>
                        <option value="tegertForts">מצודות טיגארט</option>
                        <option value="givatHatanach">מצודת האייל, גבעת התנ"ך</option>
                        <option value="etzionGever">מתחם עציון גבר, יפו</option>
                        <option value="pardesGutGurevich">פרדס גוט-גורביץ'</option>
                        <option value="kiryatShmuel">שכונת קריית שמואל, טבריה</option>
                        <option value="kfarYehoshua_unified">תחנת רכבת העמק, כפר יהושע (שני דוחות)</option>
                        <option value="nirOzCamp_v2">אתר המחנה בניר עוז</option>
                        <option value="bayaratBarakat_v2">בית באר בראכאת, יפו</option>
                        <option value="dagonSilos_unified">ממגורות דגון, חיפה (ניתוח מורחב)</option>
                        <option value="shivta">שבטה</option>
                    </select>                    <div
                        className="relative flex items-center mr-2"
                        tabIndex={0}
                        onMouseEnter={() => setShowTooltip(true)}
                        onMouseLeave={() => setShowTooltip(false)}
                        onClick={() => setShowTooltip((v) => !v)}
                        onFocus={() => setShowTooltip(true)}
                        onBlur={() => setShowTooltip(false)}
                        style={{ cursor: 'pointer' }}
                    >
                        <img
                            src={`${import.meta.env.BASE_URL ?? "/"}images/i.png`}
                            alt="הסבר על הגרפים"
                            style={{ width: 22, height: 22, display: 'inline-block' }}
                            aria-label="הסבר על הגרפים"
                        />
                        {showTooltip && (
                            <div className="absolute z-50 right-8 top-1 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 shadow-lg w-80 max-w-xs"
                                style={{ direction: 'rtl', whiteSpace: 'normal' }}>
                                הגרפים מציגים רשתות ידע מהערכות משמעות שכתבו משתתפי הסדנאות. כל גרף מתחבר לנתונים ולהיגיון שונה במובן הערכת המורשת התרבותית. מצב משופר: שאלות מקובצות לפי סוגים ובאמצעות מבחרי שאלות ייעודיים.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* AI Query Interface */}
            <AiSpot
                spotId="improved-dashboard"
                onQuery={handleQuery}
                placeholder="שאל שאלה כלשהי על הנכסים, הערכים או הקשרים..."
            />            {/* Graph Display */}
            <div className="min-h-[500px] border rounded mt-2">
                {assetId === 'all_assets' ? (
                    <AllAssetsGraph />
                ) : (
                    <div ref={graphContainerRef} style={{ width: '100%', height: 600 }} />
                )}
            </div>
            <DraggableInfoBox content={infoBoxContent} />
        </div>
    );
};

export default ImprovedGraphDashboard;
