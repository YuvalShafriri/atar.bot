// AppEnhanced.tsx - Enhanced App component with new dashboard
import React, { useState, useEffect } from 'react';
import ImprovedGraphDashboard from './components/Graph/ImprovedGraphDashboard'; // Original dashboard
import EnhancedGraphDashboard from './components/Graph/EnhancedGraphDashboard'; // New enhanced dashboard
import { WorkshopReport } from './components/WorkshopReport'; // Workshop summary

declare const vis: any;
const LLM_MODEL = 'gemini-2.5-flash-lite';

// Experience steps data from original App.tsx
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

// LLM Functions for Tips and Ideas pages (copied from original App.tsx)
async function askTipsLLM(question: string, tipsList: Array<{ title: string; text: string }>): Promise<string> {
    if (!question.trim()) return '';
    let ideasContext = 'הטיפים הקיימים הם:\n';
    tipsList.forEach(tip => { ideasContext += `- ${tip.title}: ${tip.text}\n`; });
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

    // Token counting
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

    // Token counting
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

// AiSpot component (copied from original App.tsx)
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
            <div className="flex flex-col gap-1 mt-1">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={config.placeholder}
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
};

// Enhanced Dashboard Page with option to switch between dashboards
const EnhancedDashboardPage: React.FC<{ 
    allGraphData: Record<string, any>; 
    allGrapheCleanData: any; 
}> = ({ allGraphData, allGrapheCleanData }) => {
    const [dashboardMode, setDashboardMode] = useState<'original' | 'enhanced'>('enhanced');

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Dashboard Mode Selector */}
            <div className="bg-white shadow-sm border-b border-gray-200 p-4">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <h1 className="text-xl font-bold text-gray-800">גרפי ידע - מורשת תרבותית</h1>
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        <button
                            onClick={() => setDashboardMode('enhanced')}
                            className={`px-4 py-2 rounded transition-colors ${
                                dashboardMode === 'enhanced'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            דשבורד מחודש
                        </button>
                        <button
                            onClick={() => setDashboardMode('original')}
                            className={`px-4 py-2 rounded transition-colors ${
                                dashboardMode === 'original'
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            דשבורד מקורי
                        </button>
                    </div>
                </div>
            </div>

            {/* Dashboard Content */}
            {dashboardMode === 'enhanced' ? (
                <EnhancedGraphDashboard
                    allGraphData={allGraphData}
                    allGrapheCleanData={allGrapheCleanData}
                />
            ) : (
                <ImprovedGraphDashboard
                    allGraphData={allGraphData}
                    allGrapheCleanData={allGrapheCleanData}
                    thematicGraphData={{}}
                    nodeColors={{}}
                />
            )}
        </div>
    );
};

type SpotId = 'home' | 'experience' | 'dashboard' | 'enhanced-dashboard' | 'tips' | 'ideas' | 'workshop-summary';

const HomePage: React.FC<{ onNavClick?: (id: SpotId) => void }> = ({ onNavClick }) => {
    const cards = [
        {
            id: 'enhanced-dashboard' as SpotId,
            title: 'גרפי ידע מתקדמים',
            description: 'ממשק מחודש לניתוח נכסי מורשת עם בינה מלאכותית',
            icon: '🧠',
            gradient: 'from-purple-500 to-blue-600',
            features: ['בחירת נכסים חכמה', 'שאלות מותאמות אישית', 'ניתוח מתקדם']
        },
        {
            id: 'dashboard' as SpotId,
            title: 'גרפי ידע קלאסיים',
            description: 'הממשק המקורי לחקירת קשרים בין נכסי מורשת',
            icon: '🗺️',
            gradient: 'from-blue-500 to-teal-600',
            features: ['ויזואליזציה אינטראקטיבית', 'שאלות מובנות', 'ניתוח קשרים']
        },
        {
            id: 'experience' as SpotId,
            title: 'חוויית הערכה מלאה',
            description: 'תהליך הערכת מורשת מקיף עם ליווי AI',
            icon: '📋',
            gradient: 'from-green-500 to-emerald-600',
            features: ['5 שלבי הערכה', 'ניתוח מעמיק', 'דוח מסכם']
        },
        {
            id: 'tips' as SpotId,
            title: 'טיפים מותאמים',
            description: 'עצות והכוונה לעבודה עם מערכת ההערכה',
            icon: '💡',
            gradient: 'from-yellow-500 to-orange-600',
            features: ['הצעות חכמות', 'למידה אדפטיבית', 'משוב מיידי']
        },
        {
            id: 'ideas' as SpotId,
            title: 'סיעור מוחות',
            description: 'יצירת רעיונות ותובנות חדשות על נכסי מורשת',
            icon: '💭',
            gradient: 'from-pink-500 to-rose-600',
            features: ['יצירתיות מונחית', 'חיבורים חדשים', 'פרספקטיבות מגוונות']
        },
        {
            id: 'workshop-summary' as SpotId,
            title: 'סיכום הסדנה',
            description: 'דוח מפורט על סדנת איקומוס - הערכת מורשת עם AI',
            icon: '📖',
            gradient: 'from-indigo-500 to-purple-600',
            features: ['תובנות מהסדנה', 'אתגרים ופתרונות', 'המלצות יישום']
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-800 mb-4">
                        אתר.בוט - מערכת הערכת מורשת תרבותית
                    </h1>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                        פלטפורמה מתקדמת לניתוח, הערכה וחקירה של נכסי מורשת תרבותית בישראל
                        עם בינה מלאכותית וגרפי ידע אינטראקטיביים
                    </p>
                </div>

                {/* Enhanced Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
                    {cards.map((card) => (
                        <div
                            key={card.id}
                            onClick={() => onNavClick?.(card.id)}
                            className="group cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-2xl"
                        >
                            <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
                                {/* Card Header with Gradient */}
                                <div className={`bg-gradient-to-r ${card.gradient} p-6 text-white`}>
                                    <div className="flex items-center mb-3">
                                        <span className="text-3xl ml-3">{card.icon}</span>
                                        <h3 className="text-xl font-bold">{card.title}</h3>
                                    </div>
                                    <p className="text-white/90 leading-relaxed">
                                        {card.description}
                                    </p>
                                </div>

                                {/* Card Content */}
                                <div className="p-6">
                                    <ul className="space-y-2">
                                        {card.features.map((feature, index) => (
                                            <li key={index} className="flex items-center text-gray-700">
                                                <span className="w-2 h-2 bg-blue-500 rounded-full ml-3"></span>
                                                {feature}
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="mt-4 pt-4 border-t border-gray-100">
                                        <span className="text-blue-600 font-medium group-hover:text-blue-800 transition-colors">
                                            התחל עכשיו ←
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Quick Stats */}
                <div className="mt-16 bg-white rounded-2xl shadow-lg p-8 max-w-4xl mx-auto">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                        <div>
                            <div className="text-3xl font-bold text-blue-600 mb-2">12+</div>
                            <div className="text-gray-600">נכסי מורשת במאגר</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-green-600 mb-2">180+</div>
                            <div className="text-gray-600">קשרים וערכים</div>
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-purple-600 mb-2">AI</div>
                            <div className="text-gray-600">ניתוח חכם ומתקדם</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// TipsPage
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
                    <div key={tip.title} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
                        <h3 className="font-bold text-xl mb-2 text-blue-600">{tip.title}</h3>
                        <p>{tip.text}</p>
                    </div>
                ))}
            </div>
            <AiSpot spotId="tips" onQuery={handleQuery} />
        </div>
    );
};

// IdeasPage
const IdeasPage = () => {
    const ideasList = [
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
                    <div key={idea.title} className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 transition-all duration-300 hover:scale-105 hover:shadow-2xl">
                        <h3 className="font-bold text-xl mb-2 text-green-600">{idea.title}</h3>
                        <p>{idea.text}</p>
                    </div>
                ))}
            </div>
            <AiSpot spotId="ideas" onQuery={handleQuery} />
        </div>
    );
};

// Original Experience Page with accordion-style step breakdown
const ExperiencePage = () => {
    const [openIdx, setOpenIdx] = useState<number | null>(0);

    // Card style for all tabs
    const cardClass = "bg-white rounded-2xl shadow-lg border border-gray-100 p-6 transition-all duration-300 hover:scale-105 hover:shadow-2xl";

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-5xl mx-auto">
                <h2 className="text-2xl font-bold mb-4 text-center">שלבי הערכה תרבותית בגישת CBSA - באתר.בוט</h2>
                {experienceSteps.map((step, idx) => (
                    <div key={idx} className={cardClass + " mb-6"}>
                        <button
                            type="button"
                            className={`w-full flex items-center justify-between font-semibold text-right text-gray-700 bg-white rounded-2xl transition-colors ${openIdx === idx ? 'bg-indigo-50' : ''}`}
                            onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                            style={{padding: '1.5rem'}}
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
                                    <p><strong>🎯 מטרה:</strong> {step.goal}</p>
                                    <p><strong>🧠 פעולות הבוט:</strong> {step.actions}</p>
                                    <p className="bg-indigo-50 p-3 rounded-md mt-2"><strong>❓ שאלות עצירה:</strong> {step.questions}</p>
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
        </div>
    );
};
const AppEnhanced: React.FC = () => {
    const [currentPage, setCurrentPage] = useState<SpotId>('home');
    const [allGraphData] = useState<Record<string, any>>({});
    const [allGrapheCleanData, setAllGrapheCleanData] = useState<any>(null); // Restored setter for data loading

    useEffect(() => {
        // Load graph data
        const loadGraphData = async () => {
            try {
                // Load main graph data
                const response = await fetch(import.meta.env.BASE_URL + 'data/graphMaster.json');
                const graphMaster = await response.json();
                setAllGrapheCleanData(graphMaster);

                // You can also load optimized version if available
                // const optimizedResponse = await fetch(import.meta.env.BASE_URL + 'data/graphMasterOptimized.json');
                // const optimizedData = await optimizedResponse.json();
                
                console.log('Graph data loaded successfully');
            } catch (error) {
                console.error('Error loading graph data:', error);
            }
        };

        loadGraphData();
    }, []);

    const handleNavigation = (spotId: SpotId) => {
        setCurrentPage(spotId);
    };    const renderCurrentPage = () => {
        switch (currentPage) {
            case 'home':
                return <HomePage onNavClick={handleNavigation} />;
            case 'enhanced-dashboard':
                return (
                    <EnhancedDashboardPage
                        allGraphData={allGraphData}
                        allGrapheCleanData={allGrapheCleanData}
                    />
                );
            case 'dashboard':
                return (
                    <ImprovedGraphDashboard
                        allGraphData={allGraphData}
                        allGrapheCleanData={allGrapheCleanData}
                        thematicGraphData={{}}
                        nodeColors={{}}
                    />
                );            case 'experience':
                return <ExperiencePage />;
            case 'tips':
                return <TipsPage />;
            case 'ideas':
                return <IdeasPage />;
            case 'workshop-summary':
                return <WorkshopReport />;
            default:
                return <HomePage onNavClick={handleNavigation} />;
        }
    };    return (
        <div className="min-h-screen bg-gray-50">
            {/* Top Navigation Bar */}
            <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <h1 className="text-xl font-bold text-gray-800">אתר.בוט - מערכת הערכת מורשת</h1>
                        </div>
                        <div className="hidden md:flex items-center space-x-8 space-x-reverse">
                            {[
                                { id: 'home', name: 'דף הבית', icon: '🏠' },
                                { id: 'enhanced-dashboard', name: 'דשבורד מתקדם', icon: '🧠' },
                                { id: 'dashboard', name: 'דשבורד קלאסי', icon: '🗺️' },
                                { id: 'experience', name: 'חוויית הערכה', icon: '📋' },
                                { id: 'tips', name: 'טיפים', icon: '💡' },
                                { id: 'ideas', name: 'רעיונות', icon: '💭' },
                                { id: 'workshop-summary', name: 'סיכום סדנה', icon: '📖' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setCurrentPage(tab.id as SpotId)}
                                    className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                        currentPage === tab.id
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                    }`}
                                >
                                    <span className="ml-2">{tab.icon}</span>
                                    {tab.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
                
                {/* Mobile Navigation */}
                <div className="md:hidden border-t border-gray-200">
                    <div className="px-2 pt-2 pb-3 space-y-1 max-h-48 overflow-y-auto">
                        {[
                            { id: 'home', name: 'דף הבית', icon: '🏠' },
                            { id: 'enhanced-dashboard', name: 'דשבורד מתקדם', icon: '🧠' },
                            { id: 'dashboard', name: 'דשבורד קלאסי', icon: '🗺️' },
                            { id: 'experience', name: 'חוויית הערכה', icon: '📋' },
                            { id: 'tips', name: 'טיפים', icon: '💡' },
                            { id: 'ideas', name: 'רעיונות', icon: '💭' },
                            { id: 'workshop-summary', name: 'סיכום סדנה', icon: '📖' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setCurrentPage(tab.id as SpotId)}
                                className={`w-full text-right flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                    currentPage === tab.id
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                }`}
                            >
                                <span className="ml-2">{tab.icon}</span>
                                {tab.name}
                            </button>
                        ))}
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <div className="transition-all duration-300">
                {renderCurrentPage()}
            </div>
        </div>
    );
};

export default AppEnhanced;
