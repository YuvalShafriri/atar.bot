import React, { useState, useEffect, useRef } from 'react';
import { chatGraph, GraphData, LLMMessage } from '../../services/graphQueryService';
import { chatGraphModern } from '../../services/modernGraphQueryService';
import { quickHybridChat } from '../../quickHybridSetup';
import { getPresetQuestions } from './meta-graph-generator';
import AllAssetsGraph from './AllAssetsGraph';

// Token counting utility
const estimateTokensGlobal = (text: string): number => {
  return Math.ceil(text.length / 4);
};

const fetchChatCompletion = async (
  messages: LLMMessage[],
  tools?: any[]
) => {
  const proxyUrl = import.meta.env.VITE_GEMINI_PROXY_URL;
  const contents = messages.map(m => ({ text: m.content }));
  const body = { model: 'gemini-1.5-flash', contents, tools };
  
  const bodyJson = JSON.stringify(body);
  const inputTokens = estimateTokensGlobal(bodyJson);
    // console.log(`[LLM Tokens] Input tokens: ${inputTokens.toLocaleString()}`);
  
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
    const outputTokens = estimateTokensGlobal(outputText);
    const totalTokens = inputTokens + outputTokens;
    
    const inputCost = (inputTokens / 1000) * 0.03;
    const outputCost = (outputTokens / 1000) * 0.06;
    const totalCost = inputCost + outputCost;
    
    // Essential metrics only
    console.log(`[Dashboard LLM] In: ${inputTokens.toLocaleString()} | Out: ${outputTokens.toLocaleString()} | Total: ${totalTokens.toLocaleString()} | Cost: $${totalCost.toFixed(4)} | Time: ${endTime - startTime}ms`);
    
    return result;
  } catch (err) {
    console.error('[Gemini] fetchChatCompletion - ERROR:', err);
    throw err;
  }
};

// Simple preset answer function
const getPresetAnswer = (question: string): string | null => {
  const presetQuestions = getPresetQuestions();
  const normalizedQuestion = question.trim().toLowerCase();
  
  for (const preset of presetQuestions) {
    if (preset.text.toLowerCase().includes(normalizedQuestion) || 
        normalizedQuestion.includes(preset.text.toLowerCase())) {
      return preset.answer;
    }
  }  return null;
};

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
const LLM_MODEL = 'gemini-1.5-flash';
//const LLM_MODEL = 'gemini-1.5-flash';
 //const LLM_MODEL = 'gemini-2.5-flash';
//const//  LLM_MODEL = 'gemini-2.5-pro';
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
4. השתמש במילים פשוטות וברורות.
5. **אל תסביר מגבלות או תוסיף הערות על היכולות הטכניות שלך**.
6. **התמקד במה שיש, לא במה שחסר**.
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
    }    const result = await response.json();
    const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || "לא התקבלה תשובה מהבוט.";
    // Clean up LLM response: trim whitespace, normalize line breaks, and remove any trailing whitespace
    const text = rawText.trim().replace(/\s+/g, ' ').replace(/\s+$/, '');
    
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

// AiSpot Component - עם streaming effect לחוויית משתמש טובה יותר
interface AiSpotProps {
    spotId: string;
    onQuery: (input: string) => Promise<string>;
    placeholder?: string;
    exampleQueries?: string[];
    useHybridMode?: boolean; // ⭐ הוספת prop למצב היברידי
    onToggleHybrid?: () => void; // ⭐ הוספת callback לשינוי מצב
}

const AiSpot: React.FC<AiSpotProps> = ({ spotId, onQuery, placeholder, exampleQueries, useHybridMode, onToggleHybrid }) => {
    const [input, setInput] = useState<string>('');
    const [output, setOutput] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);    const config = {
        dashboard: {
            title: '',
            description: '',
            placeholder: placeholder || 'שאל את הבוט על הנכס - קבלו הסבר על קשרים, ערכים או מושגים המופיעים בגרף...'
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
        setOutput('');        try {
            const answer = await onQuery(q);
            // הצג תשובה עם אפקט typing - trim and clean the response thoroughly
            const cleanAnswer = answer.trim().replace(/\s+$/, ''); // Remove any trailing whitespace
            const words = cleanAnswer.split(' ').filter(word => word.length > 0); // Filter out empty strings
            let currentText = '';
            for (let i = 0; i < words.length; i++) {
                currentText += words[i];
                if (i < words.length - 1) currentText += ' '; // Add space only between words, not after last word
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
    };    return (
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
                    />                    <button
                        onClick={() => handleAsk()}
                        className="px-3 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
                        disabled={isLoading || !input.trim()}
                    >
                        {isLoading ? 'חושב...' : 'שאל'}
                    </button>                    {/* ⭐ כפתור היברידי */}
                    {onToggleHybrid && (
                        <button
                            onClick={onToggleHybrid}
                            className={`px-3 py-2 font-bold rounded-lg transition text-sm ${
                                useHybridMode 
                                    ? 'bg-purple-600 text-white hover:bg-purple-700' 
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                            title={useHybridMode ? "מערכת היברידית: מופעלת" : "מערכת רגילה: מופעלת"}
                        >
                            🧠 {useHybridMode ? 'HYBRID' : 'STANDARD'}
                        </button>
                    )}
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
                )}            </div>            {/* תיבת התשובה */}
            {output && (
                <div className="px-2 pt-2 pb-1 mt-1 bg-white rounded border border-gray-200 text-sm leading-tight"
                     style={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>{output}</div>
            )}
        </div>
    );
};


// DraggableInfoBox Component - מעוצב כמו בקובץ themes.html
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

        // הגדרת סגנון התיבה
        el.style.position = 'absolute';
        el.style.zIndex = '1000';
        el.style.cursor = 'grab';
        el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.15)';
        
        // הצבה במיקום ראשוני סביר
        if (!el.style.left && !el.style.top) {
            el.style.left = '20px';
            el.style.top = '20px';
        }

        let isDragging = false;
        let offsetX = 0, offsetY = 0;

        const onMouseDown = (e: MouseEvent) => {
            // רק אם לחיצה לא על כפתור הסגירה
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

// Graph Dashboard Component
interface GraphDashboardProps {
    allGraphData: Record<string, any>;
    allGrapheCleanData: any;
    thematicGraphData: any;
    nodeColors: Record<string, any>;
    selectedGraph?: string;
}

const GraphDashboard: React.FC<GraphDashboardProps> = ({ allGraphData, allGrapheCleanData, thematicGraphData, nodeColors, selectedGraph }) => {
    const [assetId, setAssetId] = useState<string>(selectedGraph || 'all_assets');
    const [showTooltip, setShowTooltip] = useState(false);
    const [infoBoxContent, setInfoBoxContent] = useState<string>('');
    const [randomQueries, setRandomQueries] = useState<Record<string, string[]>>({});
    const [selectedQueries, setSelectedQueries] = useState<string[]>([]);
    const [useHybridMode, setUseHybridMode] = useState<boolean>(false); // ⭐ הוספת mode היברידי
    const [useAgentMode, setUseAgentMode] = useState<boolean>(false); // ⭐ הוספת מצב agent

    const graphContainerRef = useRef<HTMLDivElement | null>(null);
    const networkRef = useRef<any>(null);

    // Cache for queries: key = assetId + '|' + question
    const queryCache = useRef(new Map<string, string>());

    const handleGraphChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setAssetId(event.target.value);
    };

    const estimateGraphTokens = (graphData: GraphData): number => {
        if (!graphData?.nodes || !graphData?.edges) return 0;
        
        const nodesJson = JSON.stringify(graphData.nodes);
        const edgesJson = JSON.stringify(graphData.edges);
        const totalChars = nodesJson.length + edgesJson.length;
        
        return Math.ceil(totalChars / 4);
    };

    const handleQuery = async (question: string) => {
        const cacheKey = assetId + '|' + question.trim() + (useAgentMode ? '|agent' : '') + (useHybridMode ? '|hybrid' : '');
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
            const queryStartTime = Date.now();
            let result;
            if (useAgentMode) {
                // ⭐ Agent mode: use modernGraphQueryService
                result = await chatGraphModern(question, graphData, fetchChatCompletion);
            } else if (useHybridMode) {
                result = await quickHybridChat(question, graphData, fetchChatCompletion);
            } else {
                result = await chatGraph(question, graphData, fetchChatCompletion);
            }
            const queryEndTime = Date.now();
            const totalDuration = queryEndTime - queryStartTime;
            queryCache.current.set(cacheKey, result);
            return result;
        } else {
            // עבור גרפים פרטניים - השתמש במנגנון הפשוט המקורי
            if (assetId === 'thematic_graph') {
                graphData = thematicGraphData;
            } else {
                graphData = allGraphData[assetId];
            }
            
            if (!graphData) {
                return "שגיאה: לא נמצא נתוני גרף.";
            }
              // בניית הקשר הטקסטואלי - עם דגש על זיהוי קשרים עקיפים
            let contextData = '';
            
            // זיהוי קשרים עקיפים אם השאלה מכילה שמות נכסים
            const questionLower = question.toLowerCase();
            if (questionLower.includes('קשר') && graphData.nodes && graphData.edges) {
                // חפש צמתים שעשויים להיות נכסים הנזכרים בשאלה
                const mentionedAssets = graphData.nodes.filter((node: any) => 
                    questionLower.includes(node.label.toLowerCase()) ||
                    (node.name && questionLower.includes(node.name.toLowerCase()))
                );
                
                if (mentionedAssets.length >= 2) {
                    // חפש קשרים עקיפים בין הנכסים הנזכרים
                    contextData += `--- ניתוח קשרים עקיפים ---\n`;
                    for (let i = 0; i < mentionedAssets.length; i++) {
                        for (let j = i + 1; j < mentionedAssets.length; j++) {
                            const asset1 = mentionedAssets[i];
                            const asset2 = mentionedAssets[j];
                            
                            // מצא צמתים משותפים
                            const asset1Connections = graphData.edges
                                .filter((e: any) => e.from === asset1.id)
                                .map((e: any) => e.to);
                            
                            const asset2Connections = graphData.edges
                                .filter((e: any) => e.from === asset2.id)
                                .map((e: any) => e.to);
                            
                            const sharedConnections = asset1Connections.filter((conn: string) => 
                                asset2Connections.includes(conn)
                            );
                            
                            if (sharedConnections.length > 0) {
                                const sharedNodes = sharedConnections.map((connId: string) => {
                                    const node = graphData.nodes.find((n: any) => n.id === connId);
                                    return node ? node.label : connId;
                                });
                                
                                contextData += `קשר עקיף: ${asset1.label} ↔ ${asset2.label} דרך: ${sharedNodes.join(', ')}\n`;
                            }
                        }
                    }
                    contextData += '\n';
                }
            }
            
            // הוספת צמתים
            contextData += `--- צמתים בגרף ---\n`;
            graphData.nodes?.forEach((node: any) => {
                contextData += `- ${node.label} (${node.type})`;
                if (node.title) {
                    contextData += ` - ${node.title}`;
                }
                contextData += '\n';
            });
            
            // הוספת קשרים
            contextData += `\n--- קשרים בגרף ---\n`;
            graphData.edges?.forEach(edge => {
                const fromNode = graphData.nodes?.find(n => n.id === edge.from);
                const toNode = graphData.nodes?.find(n => n.id === edge.to);
                if (fromNode && toNode) {
                    contextData += `- "${fromNode.label}" -> ${edge.label || ''} -> "${toNode.label}"\n`;
                }
            });
              // פרומפט מותאם לתשובות תמציתיות ומדויקות
            const systemPrompt = `
אתה עוזר מומחה לניתוח נכסי מורשת תרבותית. תפקידך הוא לספק תשובות תמציתיות ומדויקות על בסיס הגרף בלבד.

**כללי תשובה**:
1. תשובות קצרות (1-2 משפטים) ומדויקות - רק מה שיש בגרף
2. אם נשאל על "קשר" בין צמתים - זהה קשרים ישירים או עקיפים דרך צמתים משותפים
3. קשר עקיף = שני צמתים מחוברים לאותו צומת ביניים
4. ציין בבירור אם הקשר ישיר או עקיף ודרך מה

**חשוב לנכסים**: נכסי מורשת = רק צמתים עם asset=true. עבור שאלות על קשרים בין נכסים, חפש צמתים משותפים שמחברים ביניהם.

הנחיות נוספות:
1. היה תמציתי - לא צריך הסברים מפורטים
2. אם אין קשר בגרף - אמר שאין קשר
3. התבסס רק על הנתונים המסופקים
4. ענה בעברית פשוטה וברורה
`;

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
                    model: 'gemini-1.5-flash',
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
                return str.split(/\s+/).filter(Boolean).length;
            }
            const promptTokens = countTokens(systemPrompt);
            const contextTokens = countTokens(contextData);
            const questionTokens = countTokens(question);
            const responseTokens = countTokens(text);
            const inputTokens = promptTokens + contextTokens + questionTokens;
            const totalTokens = inputTokens + responseTokens;
            
            // פישוט לוג הטוקנים
            console.log(`===== TOKEN SUMMARY =====`);
            console.log(`LLM Input: ${inputTokens} tokens`);
            console.log(`LLM Output: ${responseTokens} tokens`);
            console.log(`Total: ${totalTokens} tokens`);
            console.log(`=========================`);
            
            queryCache.current.set(cacheKey, text);
            return text;
        }
    };    // Fetch graph-queries.json on mount
    useEffect(() => {
        fetch('data/graph-queries.json')
            .then(res => {
                if (!res.ok) throw new Error('Failed to fetch graph-queries.json');
                return res.json();
            })
            .then(json => {
                console.log('[Graph Queries] Loaded queries:', json);
                setRandomQueries(json);
            })
            .catch((error) => {
                console.error('[Graph Queries] Failed to load:', error);
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
                            <p style="margin: 5px; padding: 1px;"><strong>ערך מורשתי:</strong> <span id="info_heritageValue">${heritageValue}</span></p>
                            <p style="margin: 5px; padding: 1px;"><strong>משמעות:</strong> <span id="info_meaning">${meaning}</span></p>
                        </div>
                    `;
                    
                    setInfoBoxContent(content);
                    
                    setTimeout(() => {
                        const closeButton = document.getElementById('closeinfo');
                        if (closeButton) {
                            closeButton.addEventListener('click', () => setInfoBoxContent(''));
                        }
                        
                        const escHandler = (e: KeyboardEvent) => {
                            if (e.key === 'Escape') setInfoBoxContent('');
                        };
                        document.addEventListener('keydown', escHandler);
                        
                        return () => {
                            document.removeEventListener('keydown', escHandler);
                        };
                    }, 0);
                }
            });
        }

    }, [assetId, allGraphData, thematicGraphData, nodeColors]);

    const description = assetId === 'all_assets' ? 
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
                        onChange={handleGraphChange}
                    >
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
                    </select>
                    
                    {/* Info icon with tooltip */}
                    <div
                        className="relative flex items-center mr-2"
                        onMouseEnter={() => setShowTooltip(true)}
                        onMouseLeave={() => setShowTooltip(false)}
                        onClick={() => setShowTooltip((v) => !v)}
                        tabIndex={0}
                        onFocus={() => setShowTooltip(true)}
                        onBlur={() => setShowTooltip(false)}
                        style={{ cursor: 'pointer' }}
                    >
                        <img
                            src="./images/i.png"
                            alt="הסבר על הגרפים"
                            style={{ width: 22, height: 22, display: 'inline-block' }}
                            aria-label="הסבר על הגרפים"
                        />
                        {showTooltip && (
                            <div className="absolute z-50 right-8 top-1 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 shadow-lg w-80 max-w-xs" 
                                 style={{ direction: 'rtl', whiteSpace: 'normal' }}>
                                הגרפים שלהלן מציגים את רשתות הידע שנבנו באמצעות אתר.בוט מתוך הערכות המשמעות שכתבו המשתתפים בסדנאות.<br />
                                כל גרף חושף את מערכת הקשרים בין צמתים (ערכים, אירועים, דמויות) - שיחדיו יוצרים את מכלול המשמעות של הנכס.
                            </div>
                        )}
                    </div>
                </div>
            </div>            {/* AI Query Interface */}
            <AiSpot
                spotId="dashboard"
                onQuery={handleQuery}
                key={assetId + (useAgentMode ? '|agent' : '') + (useHybridMode ? '|hybrid' : '')}
                exampleQueries={selectedQueries}
                placeholder="שאל את הבוט על הנכס - קבלו הסבר על קשרים, ערכים או מושגים המופיעים בגרף..."
                useHybridMode={useHybridMode}
                onToggleHybrid={() => setUseHybridMode(!useHybridMode)}
            />
            {/* ⭐ Agent mode toggle button */}
            <div className="flex gap-2 mt-2">
                <button
                    onClick={() => { setUseAgentMode(false); setUseHybridMode(false); }}
                    className={`px-3 py-2 font-bold rounded-lg transition text-sm ${(!useAgentMode && !useHybridMode) ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                    רגיל
                </button>
                <button
                    onClick={() => { setUseHybridMode(!useHybridMode); setUseAgentMode(false); }}
                    className={`px-3 py-2 font-bold rounded-lg transition text-sm ${useHybridMode ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                    🧠 HYBRID
                </button>
                <button
                    onClick={() => { setUseAgentMode(!useAgentMode); setUseHybridMode(false); }}
                    className={`px-3 py-2 font-bold rounded-lg transition text-sm ${useAgentMode ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}`}
                >
                    🤖 AGENT
                </button>
            </div>
            {/* Graph Display */}
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

export default GraphDashboard;
