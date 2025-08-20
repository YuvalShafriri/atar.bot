// --- navItems array (must be at the very top for global scope) ---
const navItems = [
   
     { id: 'discussion', label: 'Discussion', visible: true },
    { id: 'hands-on-2', label: 'Hands-on 2', visible: true },
     { id: 'hands-on-1', label: 'Hands-on 1', visible: true },
  
     { id: 'home-en', label: 'Home', visible: true },
    { id: 'home', label: 'עמוד הבית', visible: false },
    { id: 'dashboard', label: 'גרפי ידע', visible: false },
    { id: 'experience', label: 'תיאור ההתנסות', visible: false },
    { id: 'experience-en', label: 'Experience Description', visible: false },
    { id: 'tips', label: 'טיפים', visible: false },
    { id: 'ideas', label: 'סיעור מוחות', visible: false },
    { id: 'workshop-report', label: 'דוח סיכום הסדנה', visible: false },
    // { id: 'neo4j', label: 'גרף Neo4j', visible: false },
    //{ id: 'workshop-report-new', label: 'סיכום סדנה (חדש)', visible: false },
];
import React, { useState, useEffect } from 'react';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { geminiService } from './services/gemini';
import { UI_MESSAGES } from './utils/constants';
import './styles/globals.css';
import infoIcon from './images/i.png';
import AtarBotTab from './components/AtarBotTab';
// import Neo4jGraph from './components/Neo4jGraph';
import { WorkshopReport } from './components/WorkshopReport';
// import GraphDashboard from './components/Graph/GraphDashboard'; // ⚠️ הדשבורד הישן - זמין להחלפה במידת הצורך
import ImprovedGraphDashboard from './components/Graph/ImprovedGraphDashboard';
declare const vis: any;
const LLM_MODEL = 'gemini-2.5-flash-lite';
//const LLM_MODEL = 'gemini-1.5-flash';
console.log('[Gemini] Using LLM_MODEL:', LLM_MODEL);

// AI Configuration
const ai = {
    enabled: true
};

// LLM Functions for Tips and Ideas pages
async function askTipsLLM(question: string, tipsList: Array<{ title: string; text: string }>): Promise<string> {
    if (!ai) return "שגיאה: מפתח ה-API אינו מוגדר.";
    let ideasContext = 'הרעיונות הקיימים הם:\n';
    tipsList.forEach(idea => { ideasContext += `- ${idea.title}: ${idea.text}\n`; });
    const prompt = `${question} (ענה בקצרה מאוד. אל תחזור על טיפים שכבר מוצגים למעלה)`;
    const proxyUrl = import.meta.env.VITE_GEMINI_PROXY_URL;
    if (!proxyUrl) {
        console.error("Error: VITE_GEMINI_PROXY_URL is not defined. Please check your .env.local file in the project root.");
        return "שגיאה בהגדרות השרת.";
    }
    const response = await fetch(proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: LLM_MODEL,
            contents: ideasContext + '\n' + prompt
        })
    });

    if (!response.ok) {
        return "שגיאה בקבלת תשובה מהבוט.";
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "לא התקבלה תשובה מהבוט.";

    // --- Token counting and cost calculation ---
    function countTokens(str: string): number {
        return Math.ceil(str.length / 2.5);
    }
    const inputTokens = countTokens(ideasContext + '\n' + prompt);
    const outputTokens = countTokens(text);
    const totalTokens = inputTokens + outputTokens;
    const cost = totalTokens * 0.0000001;
    console.log(`[Tips LLM] Input: ${inputTokens} | Output: ${outputTokens} | Total: ${totalTokens} | Cost: $${cost.toFixed(6)}`);

    return text;
}

async function askBrainstormLLM(question: string, ideasList: any[]): Promise<string> {
    if (!ai) return "שגיאה: מפתח ה-API אינו מוגדר.";
    if (!question.trim()) return '';
    let ideasContext = 'הרעיונות הקיימים הם:\n';
    ideasList.forEach(idea => { ideasContext += `- ${idea.title}: ${idea.text}\n`; });
    const prompt = `${question} (ענה בקצרה מאוד. אל תחזור על רעיונות שכבר מוצגים למעלה)`;
    const proxyUrl = import.meta.env.VITE_GEMINI_PROXY_URL;
    if (!proxyUrl) {
        console.error("Error: VITE_GEMINI_PROXY_URL is not defined. Please check your .env.local file in the project root.");
        return "שגיאה בהגדרות השרת.";
    }
    const response = await fetch(proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            model: LLM_MODEL,
            contents: ideasContext + '\n' + prompt
        })
    });

    if (!response.ok) {
        return "שגיאה בקבלת תשובה מהבוט.";
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "לא התקבלה תשובה מהבוט.";

    // --- Token counting and cost calculation ---
    function countTokens(str: string): number {
        return Math.ceil(str.length / 2.5);
    }
    const inputTokens = countTokens(ideasContext + '\n' + prompt);
    const outputTokens = countTokens(text);
    const totalTokens = inputTokens + outputTokens;
    const cost = totalTokens * 0.0000001;
    console.log(`[Brainstorm LLM] Input: ${inputTokens} | Output: ${outputTokens} | Total: ${totalTokens} | Cost: $${cost.toFixed(6)}`);

    return text;
}

// --- COMPONENTS ---

interface AiSpotProps {
    spotId: string;
    onQuery: (input: string) => Promise<string>;
    placeholder?: string;
    exampleQueries?: string[];
}

const AiSpot: React.FC<AiSpotProps> = ({ spotId, onQuery, exampleQueries }) => {
    const [input, setInput] = useState<string>('');
    const [output, setOutput] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const config = {
        tips: {
            title: 'שאל את הבוט על טיפים נוספים',
            description: 'רוצה טיפ ספציפי? בקש מהבוט להרחיב על נושא מסוים או לספק טיפ חדש.',
            placeholder: 'לדוגמה: תן לי טיפ על ניסוח פרומפט...'
        },
        ideas: {
            title: 'בקש מהבוט רעיונות נוספים',
            description: 'צריך השראה? בקש מהבוט רעיון חדש שמתבסס על הרעיונות הקיימים.',
            placeholder: 'לדוגמה: הצע רעיון המשלב מפה וציר זמן...'
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
        setOutput('שולח שאילתה ל-Gemini...');
        try {
            const answer = await onQuery(q);
            setOutput(answer);
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
        <div className="ai-spot mt-2">
            <div className="flex items-baseline gap-2 mb-2">
                <h4 className="font-bold text-lg text-blue-800">{config.title}</h4>
                <p className="text-sm text-gray-600">{config.description}</p>
            </div>
            <div>
                {exampleQueries && exampleQueries.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-1">
                        {exampleQueries.map((q, i) => (
                            <button
                                key={i}
                                className="px-2 py-1 rounded border text-xs bg-gray-100 border-gray-300 hover:bg-blue-100"
                                style={{ fontSize: '0.85em' }}
                                onClick={() => handleAsk(q)}
                                disabled={isLoading}
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <div className="p-3 mt-2 bg-white rounded border border-gray-200 min-h-[60px] whitespace-pre-wrap">{output}</div>
        </div>
    );
// --- Fade transition CSS (move to CSS file in production) ---
if (typeof window !== 'undefined' && !document.getElementById('fade-transition-style')) {
    const style = document.createElement('style');
    style.id = 'fade-transition-style';
    style.innerHTML = `
    .fade-transition {
        opacity: 1;
        transition: opacity 0.2s;
    }
    .fade-in {
        opacity: 1;
    }
    .fade-out {
        opacity: 0;
    }
    `;
    document.head.appendChild(style);
}

// --- navItems array (must be before App component) ---
const navItems = [
    { id: 'home-en', label: 'Home', visible: true },
    { id: 'hands-on-1', label: 'Hands-on 1', visible: true },
    { id: 'hands-on-2', label: 'Hands-on 2', visible: true },
    { id: 'discussion', label: 'Discussion', visible: true },
    { id: 'home', label: 'עמוד הבית', visible: false },
    { id: 'dashboard', label: 'גרפי ידע', visible: false },
    { id: 'experience', label: 'תיאור ההתנסות', visible: false },
    { id: 'experience-en', label: 'Experience Description', visible: false },
    { id: 'tips', label: 'טיפים', visible: false },
    { id: 'ideas', label: 'סיעור מוחות', visible: false },
    { id: 'workshop-report', label: 'דוח סיכום הסדנה', visible: false },
    // { id: 'neo4j', label: 'גרף Neo4j', visible: false },
    //{ id: 'workshop-report-new', label: 'סיכום סדנה (חדש)', visible: false },
];
};

// Dashboard Page with ImprovedGraphDashboard component
const DashboardPage: React.FC<{ allGraphData: Record<string, any>; allGrapheCleanData: any; thematicGraphData: any; nodeColors: Record<string, any> }> = ({ allGraphData, allGrapheCleanData, thematicGraphData, nodeColors }) => {
    return (
        <div id="dashboard" className="page active">
            <div className="mb-4">
                <h2 className="text-2xl font-bold mb-2">גרפי ידע - מצב משופר</h2>
                <p className="text-gray-600">
                    הגרפים שלהלן מציגים את רשתות הידע שנבנו באמצעות אתר.בוט מתוך הערכות המשמעות שכתבו המשתתפים בסדנאות.
                    כל גרף חושף את מערכת הקשרים בין צמתים (ערכים, אירועים, דמויות) - שיחדיו יוצרים את מכלול המשמעות של הנכס.
                    <br /><strong>מצב חדש:</strong> שאלות מקובצות לפי סוגים עם דרופדאון נוח.
                </p>
            </div>
            
            <ImprovedGraphDashboard 
                allGraphData={allGraphData}
                allGrapheCleanData={allGrapheCleanData}
                thematicGraphData={thematicGraphData}
                nodeColors={nodeColors}
            />
            
            {/* 
            ⚠️ הערה למתכנת: ניתן להחליף חזרה לדשבורד הישן על ידי החלפת ImprovedGraphDashboard ב-GraphDashboard
            ועדכון הייבוא בראש הקובץ
            */}
        </div>
    );
};

type SpotId = 'home' | 'experience' | 'dashboard' | 'tips' | 'ideas';

const HomePage: React.FC<{ onNavClick?: (id: SpotId) => void }> = () => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [showBrainTooltip, setShowBrainTooltip] = useState(false);

    return (
        <div id="home" className="page active">
            <div className="text-center">
                <h1 className="text-2xl md:text-2xl font-bold text-gray-900">אתר.בוט – סיכום סדנאות ההתנסות</h1>
                <p className="mt-2 max-w-4xl mx-auto text-lg text-gray-600">
                    אתר זה מרכז את התוצרים והתובנות שעלו בשלושת מחזורי הסדנאות שלנו. <br />
                    הוא נבנה עבור משתתפי הסדנה, ופתוח לעיון לכל המתעניין בצומת שבין הערכת מורשת תרבותית ובינה מלאכותית.
                </p>
            </div>

            <div className="mt-7">
                <div className="flex flex-col gap-6 max-w-4xl mx-auto">
                    <div className="bg-white p-6 rounded-lg shadow">

                        <ul className="custom-list space-y-2 text-lg mb-2">
                            <li><a href="https://chatgpt.com/g/g-687366896c1c81918ebf923352f45b31-tr-bvt-yqvmvs" target="_blank" rel="noopener" className="text-blue-600 hover:underline">קישור לאתר.בוט</a></li>
                            {/* <li><a href="https://drive.google.com/drive/folders/1E-6f7xjL7ui0jSbQ02zYaB_Bq8dPstxm?usp=sharing" target="_blank" rel="noopener" className="text-blue-600 hover:underline">שיתוף תוצרים</a></li> */}
                            <li className="relative flex items-center">
                              <a
                                href="https://drive.google.com/file/d/1UJkHNSPJA5hjsN6-uVkOVmNHzpyIieaN/view?usp=sharing"
                                // href="../prompts/instructions.md"
                                // href="https://drive.google.com/file/d/1drgIzYAl28Y-W0ySfFUI_RjQhkWifiFH/view?usp=sharing"
                                target="_blank"
                                rel="noopener"
                                className="text-blue-600 hover:underline"
                              >
                                קובץ 'המוח' של אתר.בוט
                              </a>
                              <div
                                className="relative flex items-center ml-2"
                                tabIndex={0}
                                onMouseEnter={() => setShowBrainTooltip(true)}
                                onMouseLeave={() => setShowBrainTooltip(false)}
                                onFocus={() => setShowBrainTooltip(true)}
                                onBlur={() => setShowBrainTooltip(false)}
                                style={{ cursor: 'pointer', position: 'relative' }}
                              >
                            &nbsp;
                                <img
                                  src={infoIcon}
                                  alt="הסבר"
                                  style={{ width: 18, height: 18, display: 'inline-block' }}
                                  aria-label="הסבר"
                                />
                                {showBrainTooltip && (
                                  <div
                                    className="absolute z-50 right-full mr-2 top-1/2 -translate-y-1/2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 shadow-lg w-72 max-w-xs"
                                    style={{ direction: 'rtl', whiteSpace: 'normal' }}
                                  >
                                    הקובץ מכיל את כל שלבי התהליך , ההנחיות והידע אודת CBSA הנדרש לביצוע.
                                    ניתן לשמור אותו ולהעלות לכל סביבת צאטבוט (גמיני, קלוד, צאטגפט וכו) ולבצע את התהליך שם - מומלץ להתשמש בו בסביבת פרויקט המאפשר זיכרון בין שיחות הפרויקט
                                  </div>
                                )}
                              </div>
                            </li>
                            <li><a href="https://poloclub.github.io/transformer-explainer/" target="_blank" rel="noopener" className="text-blue-600 hover:underline">הדמיה של מנגנון הטרנספורמר לכתיבת המילה הבאה </a></li>
                            <li className="relative flex items-center">
                                <a
                                    href="https://notebooklm.google.com/notebook/1e35445c-cebc-4b5c-a09d-13b13e432254/"
                                    target="_blank"
                                    rel="noopener"
                                    className="text-blue-600 hover:underline"
                                >
                                    ניתוח אתגרים ופתרונות (NotebookLM)
                                </a>
                                <div
                                    className="relative flex items-center ml-2"
                                    tabIndex={0}
                                    onMouseEnter={() => setShowTooltip(true)}
                                    onMouseLeave={() => setShowTooltip(false)}
                                    onFocus={() => setShowTooltip(true)}
                                    onBlur={() => setShowTooltip(false)}
                                    style={{ cursor: 'pointer', position: 'relative' }}
                                >
                                  &nbsp;
                                    <img
                                        src={infoIcon}
                                        alt="הסבר"
                                        style={{ width: 18, height: 18, display: 'inline-block' }}
                                        aria-label="הסבר"
                                    />
                                    {showTooltip && (
                                        <div
                                            className="absolute z-50 right-full mr-2 top-1/2 -translate-y-1/2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 shadow-lg w-72 max-w-xs"
                                            style={{ direction: 'rtl', whiteSpace: 'normal' }}
                                        >
                                            ניתוח הדיונים בפתיחת המחזורים ובסיכומם, במטרה להפיק תובנות על קידום נושא ההערכה התרבותית ושילוב AI.
                                        </div>
                                    )}
                                </div>
                            </li>

 

                        </ul>
                        {/* <h3 className="font-bold text-xl mb-2">
                            <a href="https://notebooklm.google.com/notebook/1e35445c-cebc-4b5c-a09d-13b13e432254" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                ניתוח אתגרים ופתרונות (קישור ל-NotebookLM)
                            </a>
                        </h3> */}
                        {/* <p>ניתוח הדיונים בפתיחת המחזורים ובסיכומם, במטרה להפיק תובנות על קידום נושא ההערכה התרבותית ושילוב AI.</p> */}
                    </div>
                    <div className="bg-white p-3 rounded-lg shadow">
                        <p className="mt-2 text-gray-700 leading-relaxed">
                            בסדנת אתר.בוט בחנו מחדש את הדרכים שבהן אנו מעריכים את משמעותם של נכסי מורשת, תוך שימוש בשיטת CBSA (הערכת משמעות מבוססת הקשר) שמבוססת על הקשר, מידע וקריאה פרשנית. לצד זאת, ניסינו לשלב בינה מלאכותית יוצרת כשותפה קוגניטיבית – שיכולה להרחיב את המבט, לחדד ניסוחים ולחשוף הקשרים, כל עוד נשמרת ביקורת אנושית.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <img src="https://alephplace.com/atar.bot/llms.jpg" alt="איור סאטירי על האכלת מודלי שפה באינטרנט" className="w-full h-auto rounded-md object-cover" />
                            <img src="https://alephplace.com/atar.bot/alice.jpg" alt="איור של עליסה בארץ הפלאות מסתכלת במראה" className="w-full h-auto rounded-md object-cover" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const HomePageEn: React.FC<{ onNavClick?: (id: SpotId) => void }> = () => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [showBrainTooltip, setShowBrainTooltip] = useState(false);

    return (
        <div id="home-en" className="page active" dir="ltr">
            <div className="text-center">
                <h1 className="text-2xl md:text-2xl font-bold text-gray-900">atar.bot – Workshop Experience Summary</h1>
                <p className="mt-2 max-w-4xl mx-auto text-lg text-gray-600">
                    This site centralizes the outcomes and insights from our three workshop cycles. <br />
                    It was built for workshop participants and is open for review by anyone interested in the intersection between cultural heritage assessment and artificial intelligence.
                </p>
            </div>

            <div className="mt-7">
                <div className="flex flex-col gap-6 max-w-4xl mx-auto">
                    <div className="bg-white p-6 rounded-lg shadow">

                        <ul className="custom-list space-y-2 text-lg mb-2">
                            <li><a href="https://chatgpt.com/g/g-687366896c1c81918ebf923352f45b31-tr-bvt-yqvmvs" target="_blank" rel="noopener" className="text-blue-600 hover:underline">Link to atar.bot</a></li>
                            <li className="relative flex items-center">
                              <a
                                href="https://drive.google.com/file/d/1UJkHNSPJA5hjsN6-uVkOVmNHzpyIieaN/view?usp=sharing"
                                target="_blank"
                                rel="noopener"
                                className="text-blue-600 hover:underline"
                              >
                                atar.bot 'Brain' File
                              </a>
                              <div
                                className="relative flex items-center ml-2"
                                tabIndex={0}
                                onMouseEnter={() => setShowBrainTooltip(true)}
                                onMouseLeave={() => setShowBrainTooltip(false)}
                                onFocus={() => setShowBrainTooltip(true)}
                                onBlur={() => setShowBrainTooltip(false)}
                                style={{ cursor: 'pointer', position: 'relative' }}
                              >
                                &nbsp;
                                <img
                                  src={infoIcon}
                                  alt="Info"
                                  style={{ width: 18, height: 18, display: 'inline-block' }}
                                  aria-label="Info"
                                />
                                {showBrainTooltip && (
                                  <div
                                    className="absolute z-50 left-full ml-2 top-1/2 -translate-y-1/2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 shadow-lg w-72 max-w-xs"
                                    style={{ direction: 'ltr', whiteSpace: 'normal' }}
                                  >
                                    The file contains all process steps, guidelines and CBSA knowledge required for implementation.
                                    You can save it and upload it to any chatbot environment (Gemini, Claude, ChatGPT, etc.) and perform the process there - recommended to use it in a project environment that allows memory between project conversations.
                                  </div>
                                )}
                              </div>
                            </li>
                            <li><a href="https://poloclub.github.io/transformer-explainer/" target="_blank" rel="noopener" className="text-blue-600 hover:underline">Visualization of Transformer Mechanism for Next Word Generation</a></li>
                            <li className="relative flex items-center">
                                <a
                                    href="https://notebooklm.google.com/notebook/1e35445c-cebc-4b5c-a09d-13b13e432254/"
                                    target="_blank"
                                    rel="noopener"
                                    className="text-blue-600 hover:underline"
                                >
                                    Challenges and Solutions Analysis (NotebookLM)
                                </a>
                                <div
                                    className="relative flex items-center ml-2"
                                    tabIndex={0}
                                    onMouseEnter={() => setShowTooltip(true)}
                                    onMouseLeave={() => setShowTooltip(false)}
                                    onFocus={() => setShowTooltip(true)}
                                    onBlur={() => setShowTooltip(false)}
                                    style={{ cursor: 'pointer', position: 'relative' }}
                                >
                                  &nbsp;
                                    <img
                                        src={infoIcon}
                                        alt="Info"
                                        style={{ width: 18, height: 18, display: 'inline-block' }}
                                        aria-label="Info"
                                    />
                                    {showTooltip && (
                                        <div
                                            className="absolute z-50 left-full ml-2 top-1/2 -translate-y-1/2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 shadow-lg w-72 max-w-xs"
                                            style={{ direction: 'ltr', whiteSpace: 'normal' }}
                                        >
                                            Analysis of discussions at cycle openings and conclusions, aimed at extracting insights on advancing cultural assessment and AI integration.
                                        </div>
                                    )}
                                </div>
                            </li>
                        </ul>
                    </div>
                    <div className="bg-white p-3 rounded-lg shadow">
                        <p className="mt-2 text-gray-700 leading-relaxed">
                            In the atar.bot workshop, we re-examined the ways we assess the significance of heritage assets, using the CBSA (Context-Based Significance Assessment) method based on context, information and interpretive reading. Alongside this, we attempted to integrate generative artificial intelligence as a cognitive partner – one that can expand perspective, sharpen formulations and reveal contexts, as long as human oversight is maintained.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <img src="https://alephplace.com/atar.bot/llms.jpg" alt="Satirical illustration about feeding language models with internet content" className="w-full h-auto rounded-md object-cover" />
                            <img src="https://alephplace.com/atar.bot/alice.jpg" alt="Illustration of Alice in Wonderland looking in a mirror" className="w-full h-auto rounded-md object-cover" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// const ExperiencePage = () => (
//     <div className="space-y-4">
//         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
//             <h2 className="text-xl font-bold text-slate-800 mb-3">שלב 1 – ניתוח הקשרים ותיאור הנכס</h2>
//             <ul className="custom-list space-y-2 text-lg">
//                 <li>העלו קובץ מידע על נכס מורשת.</li>
//                 <li>אמרו לבוט: "בצע שלב 1 על המידע שהעליתי".</li>
//                 <li>בדקו שהתיאור כולל פתיחה, התפתחות היסטורית, סרגל זמן, והקשרים מרכזיים.</li>
//             </ul>
//         </div>
//         <div className="bg-blue-50 border-2 border-dashed border-blue-400 rounded-lg p-6">
//             <h3 className="text-xl font-bold text-slate-700 mb-3">רפלקציה שלב 1</h3>
//             <ul className="custom-list space-y-2 text-lg">
//                 <li>מה עבד טוב בתהליך ההפעלה של הבוט?</li>
//                 <li>איפה נדרשה התערבות אנושית כדי לדייק או להשלים מידע?</li>
//             </ul>
//         </div>
//         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
//             <h2 className="text-xl font-bold text-slate-800 mb-3">שלבים 2–3–4 – ערכים, אותנטיות והשוואה</h2>
//             <ul className="custom-list space-y-2 text-lg">
//                 <li>בקשו: המשך לשלב הבא</li>
//                 <li>ודאו שהבוט מזהה היטב את הערכים, בוחן אותנטיות לפי נארה גריד, ומשווה לאתרים דומים.</li>
//                 <li>במידת הצורך בקשו השלמות, דיוק ומיקוד של המידע.</li>
//             </ul>
//         </div>
//         <div className="bg-blue-50 border-2 border-dashed border-blue-400 rounded-lg p-6">
//             <h3 className="text-xl font-bold text-slate-700 mb-3">רפלקציה שלב 2–3–4</h3>
//             <ul className="custom-list space-y-2 text-lg">
//                 <li>האם אתר.בוט הצליח לנסח ערכים מורכבים, ניואנסים ותובנות לא צפויות</li>
//                 <li>מה דרש חיזוק אנושי או הקשר תרבותי נוסף?</li>
//             </ul>
//         </div>
//         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
//             <h2 className="text-xl font-bold text-slate-800 mb-3">שלב 5 – ניסוח הצהרת משמעות ראשונית</h2>
//             <ul className="custom-list space-y-2 text-lg">
//                 <li>כתבו: המשך לשלב 5</li>
//                 <li>ודאו שהצהרת המשמעות משָקפת את כלל הערכים והקשרים.</li>
//                 <li>שימו לב לשאולות בסוף התהליך.</li>
//                 <li>נסו להגיע לטיוטה ראשונית של הצהרה בכמה פסקאות.</li>
//             </ul>
//         </div>
//         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
//             <h2 className="text-xl font-bold text-slate-800 mb-3">ביצוע חוזר – העמקה ודיוק</h2>
//             <ul className="custom-list space-y-2 text-lg">
//                 <li>חזרו לשלבים שבהם התגלו פערים או שאלות.</li>
//                 <li>בקשו עדכון/דיוק של שלב (למשל: "עדכן שלב 2 עם ערכים קהילתיים").</li>
//                 <li><strong>ניתוח תמונה:</strong> בצע ניתוח ויזואלי של התמונה ואילו ערכים תרבותיים מיוצגים
//                     בתמונה? (אפרופו ניתוח השטח)</li>
//                 <li><strong>ניתוח סמיוטי:</strong> בצע ניתוח סמיוטי ופרשנות ביקורתית של ההערכה.</li>
//                 <li><strong>הצפת בעיות:</strong> מהן הבעיות, הדילמות והשאלות העולות מתהליך ההערכה באשר
//                     לתכנון השימור?</li>
//             </ul>
//         </div>
//         <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
//             <h2 className="text-xl font-bold text-slate-800 mb-3">פורמט לתוצר סופי ושיתוף</h2>
//             <div className="text-lg space-y-3">
//                 <p>🧩 השתדלו להגיע לא רק לחלוקת ערכים אלא לסינתזה שיוצרת נרטיב מחבר: מה הסיפור הייחודי? מה
//                     ראוי במיוחד לשימור ולמה? מהי רשת המשמעויות ואיך דבר קשור לדבר?</p>
//             </div>
//             <ul className="custom-list space-y-2 text-lg mt-4">
//                 <li>הבוט ייצור טיוטה של הצהרת המשמעות עם כל הניתוחים.</li>
//                 <li>העתיקו לוורד ובצעו עריכה סופית.</li>
//                 <li>העלו את קובץ הוורד לדרייב <a
//                     href="https://drive.google.com/drive/folders/1aPSRCph5KVgD2feMP8LKWp_qp6wcB9ea?usp=sharing"
//                     target="_blank" rel="noopener" className="text-blue-600 hover:underline">(העלאה לדרייב
//                     המשותף)</a></li>
//             </ul>
//         </div>
//     </div>
// );

const experienceSteps = [
    {
        title: "שלב 1 – ניתוח הקשרים ותיאור הנכס",
        practical: [
            "העלו קובץ מידע על נכס מורשת.",
            "אמרו לבוט: \"בצע שלב 1 על המידע שהעליתי\".",
            "בדקו שהתיאור כולל פתיחה, התפתחות היסטורית, סרגל זמן, והקשרים מרכזיים."
        ],
        goal: "יצירת תיאור מקיף של הנכס (לפחות 800 מילים) על בסיס ההקשרים שזוהו.",
        actions: "עיבוד מידע וזיהוי הקשרים (מבני, היסטורי, חברתי וכו'), כתיבת תיאור מובנה הכולל פתיחה, התפתחות היסטורית וסרגל זמן.",
        questions: "האם יש פרטים נוספים שכדאי להוסיף לתיאור? האם לדייק את התיאור?",
        reflection: [
            "מה עבד טוב בתהליך ההפעלה של הבוט?",
            "איפה נדרשה התערבות אנושית כדי לדייק או להשלים מידע?"
        ]
    },
    {
        title: "שלב 2 – ניתוח משמעות תרבותית (ערכים)",
        practical: [
            "בקשו: המשך לשלב 2",
            "ודאו שהבוט מזהה היטב את הערכים המרכזיים (אסתטי, היסטורי, חברתי).",
            "במידת הצורך בקשו השלמות, דיוק ומיקוד של המידע."
        ],
        goal: "זיהוי וניתוח הערכים המרכזיים של הנכס, תוך התבססות על הקשרים ועדויות.",
        actions: "זיהוי ערכים (אסתטי, היסטורי, חברתי), ניתוח אופן ביטויים בנכס, וקישורם להקשרים רחבים.",
        questions: "האם יש ערכים נוספים? האם יש נרטיבים מתנגשים או ערכים קהילתיים שלא באו לידי ביטוי?",
        reflection: [
            "האם אתר.בוט הצליח לנסח ערכים מורכבים, ניואנסים ותובנות לא צפויות?",
            "מה דרש חיזוק אנושי או הקשר תרבותי נוסף?"
        ]
    },
    {
        title: "שלב 3 – ניתוח אותנטיות ושלמות",
        practical: [
            "בקשו: המשך לשלב 3",
            "ודאו שהבוט בוחן אותנטיות לפי נארה גריד (צורה, חומרים, שימוש).",
            "במידת הצורך בקשו השלמות או דיוק."
        ],
        goal: "ניתוח מצב השימור, השלמות והאותנטיות של הנכס והשפעתם על ערכיו.",
        actions: "השוואה בין מצב נוכחי להיסטורי, יישום של Nara Grid לבחינת היבטים כמו צורה, חומרים ושימוש, והערכת מצב ההשתמרות הכללי.",
        questions: "האם יש פרטים נוספים על מצב השימור? האם התיאור מדויק?",
        reflection: [
            "האם הבוט הצליח להבחין בין שלמות פיזית לערכים תרבותיים?",
            "האם נדרשה הבהרה או השלמה אנושית?"
        ]
    },
    {
        title: "שלב 4 – הערכה השוואתית",
        practical: [
            "בקשו: המשך לשלב 4",
            "ודאו שהבוט מזהה אתרי השוואה, מנתח מאפיינים עיצוביים ותפקודיים, ומדגיש ייחודיות או נדירות."
        ],
        goal: "ניתוח ייחודיות הנכס בהשוואה לאתרים דומים מבחינה ערכית, תפקודית והיסטורית.",
        actions: "זיהוי אתרי השוואה, ניתוח מאפיינים עיצוביים ותפקודיים, והדגשת הייחודיות או הנדירות של הנכס.",
        questions: "האם ידוע לך על אתרים נוספים להשוואה? האם יש נקודות השוואה נוספות להדגיש?",
        reflection: [
            "האם הבוט הצליח להדגיש את ייחודיות הנכס?",
            "האם נדרשה השלמה אנושית או דוגמאות נוספות?"
        ]
    },
    {
        title: "שלב 5 – ניסוח הצהרת משמעות תרבותית",
        practical: [
            "כתבו: המשך לשלב 5",
            "ודאו שהצהרת המשמעות משקפת את כלל הערכים והקשרים.",
            "נסו להגיע לטיוטה ראשונית של הצהרה בכמה פסקאות."
        ],
        goal: "ניסוח נרטיב מגובש, שלם ומבוסס המבליט את משמעותו התרבותית של הנכס.",
        actions: "כתיבה סינתטית המשלבת את כלל הממצאים, הדגשת תרומת הנכס לערכים, שימוש בשפה מקצועית ונרטיבית.",
        questions: "האם ההצהרה משקפת את מהות הנכס? האם תרצה להוסיף המלצות לשימור או לבצע ניתוח סמיוטי?",
        reflection: [
            "האם ההצהרה מסכמת את כל הערכים והקשרים?",
            "האם יש מקום להרחבה או דיוק נוסף?"
        ]
    }
];

const experienceStepsEn = [
    {
        title: "Step 1 – Context Analysis and Asset Description",
        practical: [
            "Upload a heritage asset information file.",
            "Tell the bot: \"Perform step 1 on the information I uploaded\".",
            "Check that the description includes introduction, historical development, timeline, and key contexts."
        ],
        goal: "Create a comprehensive description of the asset (at least 800 words) based on identified contexts.",
        actions: "Information processing and context identification (structural, historical, social, etc.), writing a structured description including introduction, historical development and timeline.",
        questions: "Are there additional details worth adding to the description? Should the description be refined?",
        reflection: [
            "What worked well in the bot activation process?",
            "Where was human intervention needed to refine or complete information?"
        ]
    },
    {
        title: "Step 2 – Cultural Significance Analysis (Values)",
        practical: [
            "Request: Continue to step 2",
            "Ensure the bot properly identifies the key values (aesthetic, historical, social).",
            "If needed, request completions, refinement and focus of the information."
        ],
        goal: "Identification and analysis of the asset's key values, based on contexts and evidence.",
        actions: "Value identification (aesthetic, historical, social), analysis of how they are expressed in the asset, and linking them to broader contexts.",
        questions: "Are there additional values? Are there conflicting narratives or community values not expressed?",
        reflection: [
            "Did atar.bot succeed in articulating complex values, nuances and unexpected insights?",
            "What required human reinforcement or additional cultural context?"
        ]
    },
    {
        title: "Step 3 – Authenticity and Integrity Analysis",
        practical: [
            "Request: Continue to step 3",
            "Ensure the bot examines authenticity according to Nara Grid (form, materials, use).",
            "If needed, request completions or refinement."
        ],
        goal: "Analysis of conservation status, integrity and authenticity of the asset and their impact on its values.",
        actions: "Comparison between current and historical state, application of Nara Grid to examine aspects like form, materials and use, and assessment of overall preservation condition.",
        questions: "Are there additional details about conservation status? Is the description accurate?",
        reflection: [
            "Did the bot succeed in distinguishing between physical integrity and cultural values?",
            "Was human clarification or completion needed?"
        ]
    },
    {
        title: "Step 4 – Comparative Assessment",
        practical: [
            "Request: Continue to step 4",
            "Ensure the bot identifies comparison sites, analyzes design and functional characteristics, and highlights uniqueness or rarity."
        ],
        goal: "Analysis of the asset's uniqueness compared to similar sites in terms of value, function and history.",
        actions: "Identification of comparison sites, analysis of design and functional characteristics, and highlighting the uniqueness or rarity of the asset.",
        questions: "Do you know of additional sites for comparison? Are there additional comparison points to highlight?",
        reflection: [
            "Did the bot succeed in highlighting the asset's uniqueness?",
            "Was human completion or additional examples needed?"
        ]
    },
    {
        title: "Step 5 – Cultural Significance Statement Formulation",
        practical: [
            "Write: Continue to step 5",
            "Ensure the significance statement reflects all values and contexts.",
            "Try to reach an initial draft of the statement in several paragraphs."
        ],
        goal: "Formulation of a cohesive, complete and evidence-based narrative highlighting the cultural significance of the asset.",
        actions: "Synthetic writing integrating all findings, emphasizing the asset's contribution to values, using professional and narrative language.",
        questions: "Does the statement reflect the essence of the asset? Would you like to add conservation recommendations or perform semiotic analysis?",
        reflection: [
            "Does the statement summarize all values and contexts?",
            "Is there room for further expansion or refinement?"
        ]
    }
];

const ExperiencePage = () => {
    const [openIdx, setOpenIdx] = useState<number | null>(0);

    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold mb-4 text-center">שלבי הערכה תרבותית בגישת CBSA - באתר.בוט</h2>
            {experienceSteps.map((step, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg mb-2">
                    <button
                        type="button"
                        className={`w-full flex items-center justify-between p-5 font-semibold text-right text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors ${openIdx === idx ? 'bg-indigo-50' : ''}`}
                        onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                    >
                        <span>{step.title}</span>
                        <svg className={`w-6 h-6 shrink-0 transform transition-transform ${openIdx === idx ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"></path>
                        </svg>
                    </button>
                    <div className={`overflow-hidden transition-all duration-300 ${openIdx === idx ? 'max-h-screen p-5' : 'max-h-0'}`}>
                        {openIdx === idx && (
                            <div className="space-y-4">
                                <ul className="custom-list space-y-2 text-lg">
                                    {step.practical.map((item, i) => <li key={i}>{item}</li>)}
                                </ul>
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <p><strong>🎯 מטרה:</strong> {step.goal}</p>
                                    <p><strong>🧠 פעולות הבוט:</strong> {step.actions}</p>
                                    <p className="bg-indigo-50 p-3 rounded-md mt-2"><strong>❓ שאלות עצירה:</strong> {step.questions}</p>
                                </div>
                                <div className="bg-blue-50 border-2 border-dashed border-blue-400 rounded-lg p-4 mt-2">
                                    <h3 className="text-xl font-bold text-slate-700 mb-3">רפלקציה</h3>
                                    <ul className="custom-list space-y-2 text-lg">
                                        {step.reflection.map((item, i) => <li key={i}>{item}</li>)}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}; 

const ExperiencePageEn = () => {
    const [openIdx, setOpenIdx] = useState<number | null>(0);

    return (
        <div className="space-y-4" dir="ltr">
            <h2 className="text-2xl font-bold mb-4 text-center">Cultural Assessment Steps using CBSA Approach - with atar.bot</h2>
            {experienceStepsEn.map((step, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg mb-2">
                    <button
                        type="button"
                        className={`w-full flex items-center justify-between p-5 font-semibold text-left text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors ${openIdx === idx ? 'bg-indigo-50' : ''}`}
                        onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                    >
                        <span>{step.title}</span>
                        <svg className={`w-6 h-6 shrink-0 transform transition-transform ${openIdx === idx ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"></path>
                        </svg>
                    </button>
                    <div className={`overflow-hidden transition-all duration-300 ${openIdx === idx ? 'max-h-screen p-5' : 'max-h-0'}`}>
                        {openIdx === idx && (
                            <div className="space-y-4">
                                <ul className="custom-list space-y-2 text-lg">
                                    {step.practical.map((item, i) => <li key={i}>{item}</li>)}
                                </ul>
                                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                    <p><strong>🎯 Goal:</strong> {step.goal}</p>
                                    <p><strong>🧠 Bot Actions:</strong> {step.actions}</p>
                                    <p className="bg-indigo-50 p-3 rounded-md mt-2"><strong>❓ Stop Questions:</strong> {step.questions}</p>
                                </div>
                                <div className="bg-blue-50 border-2 border-dashed border-blue-400 rounded-lg p-4 mt-2">
                                    <h3 className="text-xl font-bold text-slate-700 mb-3">Reflection</h3>
                                    <ul className="custom-list space-y-2 text-lg">
                                        {step.reflection.map((item, i) => <li key={i}>{item}</li>)}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}; 

const HandsOn2Page = () => {
    return (
        <div className="space-y-4" dir="ltr">
            <h2 className="text-2xl font-bold mb-4 text-center">Hands-on 2</h2>
            <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-600 text-center">Content coming soon...</p>
            </div>
        </div>
    );
};

const DiscussionPage = () => {
    return (
        <div className="space-y-4" dir="ltr">
            <h2 className="text-2xl font-bold mb-4 text-center">Discussion</h2>
            <div className="bg-white p-6 rounded-lg shadow">
                <p className="text-gray-600 text-center">Content coming soon...</p>
            </div>
        </div>
    );
};

const TipsPage = () => {
    const tipsList = [
        { title: "הגדירו את הפרסונה", text: 'התחילו את הפרומפט בהגדרה ברורה: "אתה אדריכל שימור", "אתה היסטוריון", "אתה מומחה למורשת תרבותית". זה ממקד את הבוט ומייצר תשובות רלוונטיות יותר.' },
        { title: "ספקו הקשר (Context)", text: "הזינו לבוט את המידע הרלוונטי מהדוח שלכם (רקע, תיאור, היסטוריה). ככל שתספקו יותר הקשר, כך הניתוח שלו יהיה מעמיק ומדויק יותר." },
        { title: "בקשו פורמטים ספציפיים", text: 'אל תהססו לבקש מהבוט לארגן את התשובה בפורמט מסוים: "סכם בנקודות", "צור טבלה המשווה בין...", "כתוב כפסקה רציפה".' },
        { title: "בצעו איטרציות", text: "אל תצפו לתשובה מושלמת בפעם הראשונה. השתמשו בתשובה הראשונית כבסיס, ובקשו מהבוט לדייק, להרחיב, לקצר או לשנות את המיקוד." },
        { title: "השתמשו בשרשור (Chaining)", text: 'נהלו "שיחה" עם הבוט. התייחסו לתשובות קודמות שלו ובקשו ממנו להרחיב עליהן. למשל: "בהמשך לתשובתך על הערך האדריכלי, הסבר כיצד הוא בא לידי ביטוי...".' },
        { title: "שאלו על קשרים וסתירות", text: 'אחד היתרונות של אתר.בוט הוא היכולת לזהות קשרים. שאלו אותו: "מה הקשר בין X ל-Y?", "זהה אם קיימים ערכים שיש בינהם סתירות"' },
        { title: "התמקדות", text: "אפשרות להפעיל רק שלב מסוים (למשל רק נארה גריד) או שאלות על המידע ללא ביצוע התהליך." },
        { title: "השתמשו בשאלות פתוחות", text: 'שאלות כמו "אילו שלבי בנייה מבטאים ערכים שונים?" או "כיצד להעריך את האותנטיות לצרכי תכנון כשיש יותר משלב בנייה אחד בעל ערך?" מאפשרות לבוט להרחיב את התשובה.' },
        { title: "בדקו את התשובות", text: "לאחר קבלת תשובה, קראו אותה בעיון. האם היא עונה על הציפיות? האם יש מקום לשיפור? אל תהססו לבקש הבהרות." },
        { title: "התנסו עם פרומפטים שונים", text: 'אל תתביישו לנסות ניסוחים שונים של השאלות. לפעמים שינוי קטן יכול להביא לתשובה שונה לחלוטין.' }

    
    ];

    const handleQuery = (question: string) => askTipsLLM(question, tipsList);

    return (
        <div id="tips" className="page active">
            <h2 className="text-3xl font-bold mb-6 text-gray-900">טיפים לעבודה עם הבוט</h2>
            <div className="card-grid">
                {tipsList.map(tip => (
                    <div key={tip.title} className="bg-white p-6 rounded-lg shadow">
                        <h3 className="font-bold text-xl mb-2 text-blue-600">{tip.title}</h3>
                        <p>{tip.text}</p>
                    </div>
                ))}
            </div>
            <AiSpot spotId="tips" onQuery={handleQuery} />
        </div>
    );
};

const IdeasPage = () => {
    const ideasList = [
        // { title: "גרף ידע מאוחד", text: 'יצירת גרף-על המאחד את כל הנכסים מהסדנאות. גרף כזה יאפשר לזהות קשרים ותמות רוחביות בין נכסים שונים.' },
        { title: "ציר זמן אינטראקטיבי", text: "הצגת כל הנכסים על ציר זמן ויזואלי לפי תקופות. לחיצה על תקופה תסנן את הנכסים הרלוונטיים." },
        { title: "מיפוי ערכים מרחבי", text: "פיצ'ר ליצירת מפת חום אינטראקטיבית המציגה היכן ערכים שונים (אסתטי, קהילתית) ממוקמים פיזית באתר." },
        { title: "מערכת המלצות לתכנון", text: "סוכן המציע פעילויות חינוכיות או תכנוניות על בסיס הערכים הדומיננטיים שזוהו בהערכה." },
        { title: "סימולטור תרחישי שימור", text: "כלי סימולציה הבוחן כיצד שינוי פיזי מוצע (למשל, בניית קומה) ישפיע על מכלול הערכים של האתר." },
        { title: "סוכן לניתוח סנטימנט ציבורי", text: "סוכן הסורק רשתות חברתיות וחדשות כדי לזהות מה הציבור חושב ומעריך באתר, מעבר להערכה המקצועית." },
        { title: "מחולל נרטיבים חלופיים", text: "יכולת לספר את סיפור האתר מנקודות מבט טופ-דאון (פועל, דיירת) כדי להציף ערכים נסתרים." },
        { title: "ניתוח השוואתי למכלול נכסים", text: "הזנת מספר הערכות למערכת כדי לזהות תמות משותפות ולסייע בגיבוש מדיניות שימור רחבה." },
        { title: " 'סנגור השטן'", text: "סוכן המקבל פרסונה ביקורתית ומעלה טיעוני נגד כדי לאתגר ולחזק את הצהרת המשמעות." }
    ];

    const handleQuery = (question: string) => askBrainstormLLM(question, ideasList);

    return (
        <div id="ideas" className="page active">
            <h2 className="text-3xl font-bold mb-6 text-gray-900">סיעור מוחות: רעיונות להמשך</h2>
            <div className="card-grid">
                {ideasList.map(idea => (
                    <div key={idea.title} className="bg-white p-6 rounded-lg shadow">
                        <h3 className="font-bold text-xl mb-2 text-green-600">{idea.title}</h3>
                        <p>{idea.text}</p>
                    </div>
                ))}
            </div>
            <AiSpot spotId="ideas" onQuery={handleQuery} />
        </div>
    );
};

const App = () => {
    const [page, setPage] = useState('home-en');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);    const [data, setData] = useState({
        allGraphData: {},
        allGrapheCleanData: { nodes: [], edges: [] },
        thematicGraphData: { nodes: [], edges: [] },
        nodeColors: {}
    });

    useEffect(() => {
        async function loadData() {            try {
                const [graphRes, thematicRes, allGrapheCleanRes] = await Promise.all([
                    fetch('/icomos/atar.bot/data/graphData.json'),
                    fetch('/icomos/atar.bot/data/thematicGraph.json'),
                    fetch('/icomos/atar.bot/data/allGrapheClean.json')
                ]);
                if (!graphRes.ok || !thematicRes.ok || !allGrapheCleanRes.ok) {
                    throw new Error('Network response was not ok.');
                }
                const graphJson = await graphRes.json();
                const thematicJson = await thematicRes.json();
                const allGrapheCleanJson = await allGrapheCleanRes.json();                setData({
                    nodeColors: graphJson.NODE_COLORS,
                    allGraphData: graphJson.allGraphData,
                    allGrapheCleanData: allGrapheCleanJson,
                    thematicGraphData: thematicJson,
                });
            } catch (err) {
                console.error("Failed to load data:", err);
                setError("שגיאה בטעינת נתוני הגרפים. אנא בדוק את קבצי הנתונים ורענן את הדף.");
            } finally {
                setLoading(false);
            }
        }
        loadData();
    }, []);

    // Validate configuration on app start
    useEffect(() => {
        if (!geminiService.validateConfiguration()) {
            console.error(UI_MESSAGES.CONFIG_ERROR);
        }
    }, []);

    // --- Smooth fade transition for page changes ---
    const [fade, setFade] = useState(true);
    const [displayedPage, setDisplayedPage] = useState(page);

    useEffect(() => {
        if (page !== displayedPage) {
            setFade(false); // Start fade out
            const timeout = setTimeout(() => {
                setDisplayedPage(page);
                setFade(true); // Fade in new page
            }, 200); // Fade out duration
            return () => clearTimeout(timeout);
        }
    }, [page, displayedPage]);

    const renderPage = () => {
        if (loading) return <div className="text-center p-10">טוען נתונים...</div>;
        if (error) return <div className="text-center p-10 text-red-500 bg-red-100 border border-red-400 rounded-md">{error}</div>;
        const pageProps = {
            allGraphData: data.allGraphData,
            allGrapheCleanData: data.allGrapheCleanData,
            thematicGraphData: data.thematicGraphData,
            nodeColors: data.nodeColors
        };

        switch (displayedPage) {
            // English pages
            case 'home-en':
                return <HomePageEn onNavClick={setPage} />;
            case 'hands-on-1':
                return <ExperiencePageEn />;
            case 'hands-on-2':
                return <HandsOn2Page />;
            case 'discussion':
                return <DiscussionPage />;
            // ...existing code...
            case 'home':
                return <HomePage onNavClick={setPage} />;
            case 'experience':
                return <ExperiencePage />;
            case 'experience-en':
                return <ExperiencePageEn />;
            case 'dashboard':
                return <DashboardPage {...pageProps} />;
            case 'tips':
                return <TipsPage />;
            case 'ideas':
                return <IdeasPage />;
            case 'atarbot':
                return <AtarBotTab />;
            case 'workshop-report':
                return <WorkshopReport />;
            case 'workshop-report-new':
                return (
                    <div className="workshop-report bg-stone-50 text-gray-800" dir="rtl">
                        {/* ...existing code... */}
                    </div>
                );
            default:
                return <HomePageEn onNavClick={setPage} />;
        }
    };
    // (removed stray navItems array/object literal fragment here)

    return (
        <ErrorBoundary>
            <nav className="bg-white shadow-md px-4 py-2 flex justify-center items-center gap-2 sm:gap-4 sticky top-0 z-50 overflow-x-auto">
                {navItems.filter(item => item.visible !== false).map(item => (
                    <button key={item.id} onClick={() => setPage(item.id)} className={`nav-button ${page === item.id ? 'active' : ''}`}>
                        {item.label}
                    </button>
                ))}
            </nav>

            {/* Fade transition wrapper */}
            <main className="container mx-auto">
                <div
                    className={`fade-transition${fade ? ' fade-in' : ' fade-out'}`}
                    style={{ transition: 'opacity 0.2s', opacity: fade ? 1 : 0 }}
                >
                    {renderPage()}
                </div>
            </main>

            <footer className="site-footer">
                <div className="footer-container">
                    <p>אתר זה הוא אתר סיכום סדנאות אתר.בוט של <a href="https://www.icomos.org.il/" target="_blank" rel="noopener noreferrer" className="footer-link">איקומוס ישראל</a>.</p>
                    <a href="mailto:info@icomos.org.il" className="footer-link">יצירת קשר</a>
                </div>
            </footer>
        </ErrorBoundary>
    );
// --- Fade transition CSS ---
// You can move this to your main CSS file if preferred
const style = document.createElement('style');
style.innerHTML = `
.fade-transition {
    opacity: 1;
    transition: opacity 0.2s;
}
.fade-in {
    opacity: 1;
}
.fade-out {
    opacity: 0;
}
`;
if (typeof window !== 'undefined' && !document.getElementById('fade-transition-style')) {
    style.id = 'fade-transition-style';
    document.head.appendChild(style);
}
};

export default App;
