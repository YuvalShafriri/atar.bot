import React, { useState, useEffect } from 'react';
import GraphDashboard from './components/Graph/GraphDashboard';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { geminiService } from './services/gemini';
import { UI_MESSAGES } from './utils/constants';
import './styles/globals.css';

declare const vis: any;

const LLM_MODEL = 'gemini-1.5-flash';

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

// Dashboard Page with the existing GraphDashboard component
const DashboardPage: React.FC<{allGraphData: Record<string, any>; thematicGraphData: any; nodeColors: Record<string, any>}> = ({ allGraphData, thematicGraphData, nodeColors }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [selectedGraph, setSelectedGraph] = useState('all_assets');

    const handleGraphChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedGraph(event.target.value);
    };

    return (
        <div id="dashboard" className="page active">
            <div className="flex items-center mb-0 relative" style={{ minHeight: 0 }}>
                {/* Container for the icon and dropdown */}
                <div className="flex items-center">
                    
                    {/* The original select element */}
                    <select dir="rtl" id="asset-select" className="p-2 border rounded" value={selectedGraph} onChange={handleGraphChange}>
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
                    {/* Info icon with tooltip, to the left of the select */}
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
                        <span className="text-blue-700" style={{ fontSize: 22, fontFamily: 'inherit', display: 'inline-block' }} aria-label="הסבר על הגרפים">
                            ℹ️
                        </span>
                        {showTooltip && (
                            <div className="absolute z-50 right-8 top-1 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700 shadow-lg w-80 max-w-xs" style={{ direction: 'rtl', whiteSpace: 'normal' }}>
                                הגרפים שלהלן מציגים את רשתות הידע שנבנו באמצעות אתר.בוט מתוך הערכות המשמעות שכתבו המשתתפים בסדנאות.<br/>
                                כל גרף חושף את מערכת הקשרים בין צמתים (ערכים, אירועים, דמויות) - שיחדיו יוצרים את מכלול המשמעות של הנכס.
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="graph-dashboard-max">
                <GraphDashboard 
                    allGraphData={allGraphData}
                    thematicGraphData={thematicGraphData}
                    nodeColors={nodeColors}
                    selectedGraph={selectedGraph}
                />
            </div>
        </div>
    );
};

type SpotId = 'home' | 'experience' | 'dashboard' | 'tips' | 'ideas';

const HomePage: React.FC<{ onNavClick?: (id: SpotId) => void }> = () => (
    <div id="home" className="page active">
        <div className="text-center">
            <h1 className="text-2xl md:text-2xl font-bold text-gray-900">אתר.בוט – סיכום סדנאות ההתנסות</h1>
            <p className="mt-2 max-w-4xl mx-auto text-lg text-gray-600">
                אתר זה מרכז את התוצרים והתובנות שעלו בשלושת מחזורי הסדנאות שלנו. <br/>
                הוא נבנה עבור משתתפי הסדנה, ופתוח לעיון לכל המתעניין בצומת שבין הערכת מורשת תרבותית ובינה מלאכותית.
            </p>
        </div>

        <div className="mt-7">
            <div className="flex flex-col gap-6 max-w-4xl mx-auto">
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="font-bold text-xl mb-2">
                        <a href="https://notebooklm.google.com/notebook/1e35445c-cebc-4b5c-a09d-13b13e432254" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            ניתוח אתגרים ופתרונות (קישור ל-NotebookLM)
                        </a>
                    </h3>
                    <p>ניתוח הדיונים בפתיחת המחזורים ובסיכומם, במטרה להפיק תובנות על קידום נושא ההערכה התרבותית ושילוב AI.</p>
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

const ExperiencePage = () => (
   <div className="space-y-4">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-xl font-bold text-slate-800 mb-3">שלב 1 – ניתוח הקשרים ותיאור הנכס</h2>
            <ul className="custom-list space-y-2 text-lg">
                <li>העלו קובץ מידע על נכס מורשת.</li>
                <li>אמרו לבוט: "בצע שלב 1 על המידע שהעליתי".</li>
                <li>בדקו שהתיאור כולל פתיחה, התפתחות היסטורית, סרגל זמן, והקשרים מרכזיים.</li>
            </ul>
        </div>
        <div className="bg-blue-50 border-2 border-dashed border-blue-400 rounded-lg p-6">
            <h3 className="text-xl font-bold text-slate-700 mb-3">רפלקציה שלב 1</h3>
            <ul className="custom-list space-y-2 text-lg">
                <li>מה עבד טוב בתהליך ההפעלה של הבוט?</li>
                <li>איפה נדרשה התערבות אנושית כדי לדייק או להשלים מידע?</li>
            </ul>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-xl font-bold text-slate-800 mb-3">שלבים 2–3–4 – ערכים, אותנטיות והשוואה</h2>
            <ul className="custom-list space-y-2 text-lg">
                <li>בקשו: המשך לשלב הבא</li>
                <li>ודאו שהבוט מזהה היטב את הערכים, בוחן אותנטיות לפי נארה גריד, ומשווה לאתרים דומים.</li>
                <li>במידת הצורך בקשו השלמות, דיוק ומיקוד של המידע.</li>
            </ul>
        </div>
        <div className="bg-blue-50 border-2 border-dashed border-blue-400 rounded-lg p-6">
            <h3 className="text-xl font-bold text-slate-700 mb-3">רפלקציה שלב 2–3–4</h3>
            <ul className="custom-list space-y-2 text-lg">
                <li>האם אתר.בוט הצליח לנסח ערכים מורכבים, ניואנסים ותובנות לא צפויות</li>
                <li>מה דרש חיזוק אנושי או הקשר תרבותי נוסף?</li>
            </ul>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-xl font-bold text-slate-800 mb-3">שלב 5 – ניסוח הצהרת משמעות ראשונית</h2>
            <ul className="custom-list space-y-2 text-lg">
                <li>כתבו: המשך לשלב 5</li>
                <li>ודאו שהצהרת המשמעות משָקפת את כלל הערכים והקשרים.</li>
                <li>שימו לב לשאולות בסוף התהליך.</li>
                <li>נסו להגיע לטיוטה ראשונית של הצהרה בכמה פסקאות.</li>
            </ul>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-xl font-bold text-slate-800 mb-3">ביצוע חוזר – העמקה ודיוק</h2>
            <ul className="custom-list space-y-2 text-lg">
                <li>חזרו לשלבים שבהם התגלו פערים או שאלות.</li>
                <li>בקשו עדכון/דיוק של שלב (למשל: "עדכן שלב 2 עם ערכים קהילתיים").</li>
                <li><strong>ניתוח תמונה:</strong> בצע ניתוח ויזואלי של התמונה ואילו ערכים תרבותיים מיוצגים
                    בתמונה? (אפרופו ניתוח השטח)</li>
                <li><strong>ניתוח סמיוטי:</strong> בצע ניתוח סמיוטי ופרשנות ביקורתית של ההערכה.</li>
                <li><strong>הצפת בעיות:</strong> מהן הבעיות, הדילמות והשאלות העולות מתהליך ההערכה באשר
                    לתכנון השימור?</li>
            </ul>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-xl font-bold text-slate-800 mb-3">פורמט לתוצר סופי ושיתוף</h2>
            <div className="text-lg space-y-3">
                <p>🧩 השתדלו להגיע לא רק לחלוקת ערכים אלא לסינתזה שיוצרת נרטיב מחבר: מה הסיפור הייחודי? מה
                    ראוי במיוחד לשימור ולמה? מהי רשת המשמעויות ואיך דבר קשור לדבר?</p>
            </div>
            <ul className="custom-list space-y-2 text-lg mt-4">
                <li>הבוט ייצור טיוטה של הצהרת המשמעות עם כל הניתוחים.</li>
                <li>העתיקו לוורד ובצעו עריכה סופית.</li>
                <li>העלו את קובץ הוורד לדרייב <a
                        href="https://drive.google.com/drive/folders/1aPSRCph5KVgD2feMP8LKWp_qp6wcB9ea?usp=sharing"
                        target="_blank" rel="noopener" className="text-blue-600 hover:underline">(העלאה לדרייב
                        המשותף)</a></li>
            </ul>
        </div>
    </div>
);

const TipsPage = () => {
    const tipsList = [
        { title: "הגדירו את הפרסונה", text: 'התחילו את הפרומפט בהגדרה ברורה: "אתה אדריכל שימור", "אתה היסטוריון", "אתה מומחה למורשת תרבותית". זה ממקד את הבוט ומייצר תשובות רלוונטיות יותר.' },
        { title: "ספקו הקשר (Context)", text: "הזינו לבוט את המידע הרלוונטי מהדוח שלכם (רקע, תיאור, היסטוריה). ככל שתספקו יותר הקשר, כך הניתוח שלו יהיה מעמיק ומדויק יותר." },
        { title: "בקשו פורמטים ספציפיים", text: 'אל תהססו לבקש מהבוט לארגן את התשובה בפורמט מסוים: "סכם בנקודות", "צור טבלה המשווה בין...", "כתוב כפסקה רציפה".' },
        { title: "בצעו איטרציות", text: "אל תצפו לתשובה מושלמת בפעם הראשונה. השתמשו בתשובה הראשונית כבסיס, ובקשו מהבוט לדייק, להרחיב, לקצר או לשנות את המיקוד." },
        { title: "השתמשו בשרשור (Chaining)", text: 'נהלו "שיחה" עם הבוט. התייחסו לתשובות קודמות שלו ובקשו ממנו להרחיב עליהן. למשל: "בהמשך לתשובתך על הערך האדריכלי, הסבר כיצד הוא בא לידי ביטוי...".' },
        { title: "שאלו על קשרים וסתירות", text: 'אחד היתרונות של הבוט הוא היכולת לזהות קשרים. שאלו אותו: "מה הקשר בין X ל-Y?", "האם קיימת סתירה בין ערך A לערך B?".' },
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
        { title: "גרף ידע מאוחד", text: 'יצירת גרף-על המאחד את כל הנכסים מהסדנאות. גרף כזה יאפשר לזהות קשרים ותמות רוחביות בין נכסים שונים.' },
        { title: "ציר זמן אינטראקטיבי", text: "הצגת כל הנכסים על ציר זמן ויזואלי לפי תקופות. לחיצה על תקופה תסנן את הנכסים הרלוונטיים." },
        { title: "הצהרות משמעות אוטומטיות", text: "לאמן את הבוט לייצר טיוטה ראשונית של הצהרת משמעות (Statement of Significance) על בסיס גרף הידע וההקשר שנמסר לו." },
        { title: "מיפוי ערכים מרחבי", text: "פיצ'ר ליצירת מפת חום אינטראקטיבית המציגה היכן ערכים שונים (אסתטי, קהילתי) ממוקמים פיזית באתר." },
        { title: "מערכת המלצות לתכנון", text: "סוכן המציע פעילויות חינוכיות או תכנוניות על בסיס הערכים הדומיננטיים שזוהו בהערכה." },
        { title: "סימולטור תרחישי שימור", text: "כלי סימולציה הבוחן כיצד שינוי פיזי מוצע (למשל, בניית קומה) ישפיע על מכלול הערכים של האתר." },
        { title: "סוכן לניתוח סנטימנט ציבורי", text: "סוכן הסורק רשתות חברתיות וחדשות כדי לזהות מה הציבור חושב ומעריך באתר, מעבר להערכה המקצועית." },
        { title: "מחולל נרטיבים חלופיים", text: "יכולת לספר את סיפור האתר מנקודות מבט מושתקות (פועל, דיירת) כדי להציף ערכים נסתרים." },
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
    const [page, setPage] = useState('home');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState({
        allGraphData: {},
        thematicGraphData: { nodes: [], edges: [] },
        nodeColors: {}
    });

    useEffect(() => {
        async function loadData() {
            try {
                const [graphRes, thematicRes] = await Promise.all([
                    fetch('data/graphData.json'),
                    fetch('data/thematicGraph.json')
                ]);
                if (!graphRes.ok || !thematicRes.ok) {
                    throw new Error('Network response was not ok.');
                }
                const graphJson = await graphRes.json();
                const thematicJson = await thematicRes.json();
                setData({
                    nodeColors: graphJson.NODE_COLORS,
                    allGraphData: graphJson.allGraphData,
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

    const renderPage = () => {
        if (loading) return <div className="text-center p-10">טוען נתונים...</div>;
        if (error) return <div className="text-center p-10 text-red-500 bg-red-100 border border-red-400 rounded-md">{error}</div>;

        const pageProps = {
            allGraphData: data.allGraphData,
            thematicGraphData: data.thematicGraphData,
            nodeColors: data.nodeColors
        };

        switch (page) {
            case 'home':
                return <HomePage onNavClick={setPage} />;
            case 'experience':
                return <ExperiencePage />;
            case 'dashboard':
                return <DashboardPage {...pageProps} />;
            case 'tips':
                return <TipsPage />;
            case 'ideas':
                return <IdeasPage />;
            default:
                return <HomePage onNavClick={setPage} />;
        }
    };

    const navItems = [
        { id: 'home', label: 'עמוד הבית' },
        { id: 'experience', label: 'תיאור ההתנסות' },
        { id: 'dashboard', label: 'לוח תוצרים' },
        { id: 'tips', label: 'טיפים' },
        { id: 'ideas', label: 'סיעור מוחות' },
    ];

    return (
        <ErrorBoundary>
            <nav className="bg-white shadow-md px-4 py-2 flex items-center gap-2 sm:gap-4 sticky top-0 z-50 overflow-x-auto">
                {navItems.map(item => (
                    <button key={item.id} onClick={() => setPage(item.id)} className={`nav-button ${page === item.id ? 'active' : ''}`}>
                        {item.label}
                    </button>
                ))}
            </nav>

            <main className="container mx-auto">
                {renderPage()}
            </main>

            <footer className="site-footer">
                <div className="footer-container">
                    <p>אתר זה הוא אתר סיכום סדנאות אתר.בוט של <a href="https://www.icomos.org.il/" target="_blank" rel="noopener noreferrer" className="footer-link">איקומוס ישראל</a>.</p>
                    <a href="mailto:info@icomos.org.il" className="footer-link">יצירת קשר</a>
                </div>
            </footer>
        </ErrorBoundary>
    );
};

export default App;
