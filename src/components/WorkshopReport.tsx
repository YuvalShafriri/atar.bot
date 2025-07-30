import React, { useState } from 'react';

interface WorkshopReportProps {}

const cardClass = "bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8 transition-all duration-300";
const sectionHeaderClass = "text-2xl font-bold text-blue-700 mb-4 text-center";
const subHeaderClass = "text-xl font-semibold text-gray-800 mb-3 text-center";
const listClass = "space-y-3 text-lg text-gray-700 pl-0 list-disc list-inside";

const tabList = [
  { id: 'panel-failures', label: 'כשלים ואתגרים' },
  { id: 'panel-solutions', label: 'דרכי התמודדות' },
  { id: 'panel-ai-role', label: 'תפקיד ה-AI' }
];

const PRINCIPLE_CARDS = [
  {
    icon: "🔒",
    title: "פרטיות",
    description: "הבוט לא חושף מידע שסופק על ידי המשתמש."
  },
  {
    icon: "📑",
    title: "ציטוט",
    description: "מסתמך רק על קבצי המקור שהועלו."
  },
  {
    icon: "⛔",
    title: "ללא הזיות",
    description: "אינו ממציא עובדות, נתונים או מקורות."
  },
  {
    icon: "🧑‍💻",
    title: "פיקוח אנושי",
    description: "שאלות עצירה מבטיחות שהמומחה נשאר במרכז."
  }
];

const PANEL_CARDS = [
  {
    title: "כשלים מערכתיים ורגולטוריים",
    items: [
      "היעדר דרישה: גופים סטטוטוריים אינם דורשים הערכות מורשת.",
      "קבלת החלטות מוקדמת: החלטות מתקבלות מלחצים פוליטיים וכלכליים.",
      "היעדר אחידות ותקינה: פערים בהנחיות וחוסר בשפה משותפת.",
      "כשל בצד המקבל: גם לגופים הבודקים אין כלים מספקים לנתח את חומר ההערכה.",
      "תרבות ארגונית: תיעוד והערכה נעשים 'רק כדי לסמן וי', מה שמוביל לשחיקה מקצועית."
    ]
  },
  {
    title: "פערים מקצועיים וקוגניטיביים",
    items: [
      "היעדר הכשרה: בתי ספר לאדריכלות אינם מלמדים את שלב ההערכה לעומק.",
      "קשיי שפה והמשגה: קושי להבחין בין 'ערך', 'משמעות' וה'אטריביוט' שלהם, וקושי לבטא ערך באופן ברור ומנומק.",
      "מורכבות וסובייקטיביות: הערכה דורשת חשיבה מורכבת וניתוח ערכים, לא רק איסוף נתונים טכני.",
      "מגבלות כלים: כלים קיימים (אקסל, GIS) מעדיפים נתונים כמותיים על פני איכותיים."
    ]
  }
];

const AI_ROLE_CARDS = [
  {
    color: "border-green-300",
    title: "🛠️ פיגום אנליטי",
    description: "הכלי מספק מסגרת עבודה שיטתית המארגנת, מעמיקה ומרחיבה את תהליך החשיבה, ומאפשר להגיע לתובנות חדשות."
  },
  {
    color: "border-blue-300",
    title: "🧠 עוזר קוגניטיבי",
    description: "אתר.בוט הוא שותף למחשבה. הוא לא מחליף את המומחה, אלא מספק תמיכה אנליטית לתהליך ההערכה המורכב."
  },
  {
    color: "border-yellow-300",
    title: "🧑‍💻 Human-in-the-Loop",
    description: "המומחיות האנושית נשארת במרכז. שאלות עצירה מובנות מבטיחות שהשיפוט המקצועי מנחה את התהליך בכל שלב."
  }
];

const WorkshopReport: React.FC<WorkshopReportProps> = () => {
  const [activeTab, setActiveTab] = useState('panel-failures');

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Intro */}
        <div className={cardClass}>
          <h1 className="text-2xl font-bold text-gray-900 mb-4 text-center"> סיכום סדנאות ההתנסות</h1>
          <p className="text-lg text-gray-700 text-center mb-2">אתר זה מרכז את התוצרים והתובנות שעלו בשלושת מחזורי הסדנאות שלנו.<br/>  הוא נבנה עבור משתתפי הסדנה, ופתוח לעיון לכל המתעניין בצומת שבין הערכת מורשת תרבותית ובינה מלאכותית.</p>
          <p className="text-lg text-gray-700 text-center mb-2">בסדנה בחנו מחדש את הדרכים שבהן אנו מעריכים את משמעותם של נכסי מורשת, תוך שימוש בשיטת CBSA (הערכת משמעות מבוססת הקשר) שמבוססת על הקשר, מידע וקריאה פרשנית. לצד זאת, ניסינו לשלב בינה מלאכותית יוצרת כשותפה קוגניטיבית – שיכולה להרחיב את המבט, לחדד ניסוחים ולחשוף הקשרים, כל עוד נשמרת ביקורת אנושית.</p>
        </div>
       
        {/* Tabs for failures/solutions/AI role */}
        <nav className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setActiveTab('panel-failures')}
            className={`px-6 py-3 rounded-2xl font-semibold text-lg transition-colors border-2 ${activeTab === 'panel-failures' ? 'bg-blue-100 text-blue-700 border-blue-400 shadow-lg' : 'bg-white text-gray-700 border-gray-200 hover:bg-blue-50 hover:text-blue-700'}`}
          >כשלים ואתגרים</button>
          <button
            onClick={() => setActiveTab('panel-solutions')}
            className={`px-6 py-3 rounded-2xl font-semibold text-lg transition-colors border-2 ${activeTab === 'panel-solutions' ? 'bg-blue-100 text-blue-700 border-blue-400 shadow-lg' : 'bg-white text-gray-700 border-gray-200 hover:bg-blue-50 hover:text-blue-700'}`}
          >פערים מקצועיים</button>
          <button
            onClick={() => setActiveTab('panel-ai-role')}
            className={`px-6 py-3 rounded-2xl font-semibold text-lg transition-colors border-2 ${activeTab === 'panel-ai-role' ? 'bg-blue-100 text-blue-700 border-blue-400 shadow-lg' : 'bg-white text-gray-700 border-gray-200 hover:bg-blue-50 hover:text-blue-700'}`}
          >תפקיד ה-AI</button>
        </nav>
        <div className="flex flex-col gap-8">
          {activeTab === 'panel-failures' && (
            <div className={cardClass}>
              <h2 className={sectionHeaderClass}>כשלים מערכתיים ורגולטוריים</h2>
              <ul className={listClass}>
                {PANEL_CARDS[0].items.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {activeTab === 'panel-solutions' && (
            <div className={cardClass}>
              <h2 className={sectionHeaderClass}>פערים מקצועיים וקוגניטיביים</h2>
              <ul className={listClass}>
                {PANEL_CARDS[1].items.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          )}
          {activeTab === 'panel-ai-role' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {AI_ROLE_CARDS.map((card, idx) => (
                <div key={idx} className={`card bg-white p-4 rounded-lg shadow-sm ${card.color} hover:transform hover:-translate-y-1 transition-all`}>
                  <h3 className="text-lg font-bold text-gray-800">{card.title}</h3>
                  <p className="mt-2 text-sm text-gray-600">{card.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
         {/* Principle Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-8">
          {PRINCIPLE_CARDS.map((p, idx) => (
            <div key={idx} className="card bg-gray-100 p-4 rounded-lg hover:transform hover:-translate-y-1 transition-all">
              <p className="text-3xl">{p.icon}</p>
              <p className="font-semibold mt-2">{p.title}</p>
              <p className="text-sm text-gray-600">{p.description}</p>
            </div>
          ))}
        </div>
        {/* Summary Card */}
        <div className={cardClass}>
          <h2 className="text-3xl font-bold text-blue-900 text-center mb-8">סיכום: בין ידיעת הלב לידיעת השכל</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="border-l-2 border-dashed border-gray-300 pl-8">
              <div className="italic text-gray-600 text-lg leading-relaxed text-center">
                <p>"אָדָם גֵּאָה בְּיִדְעוֹתָיו</p>
                <p>וְרָאָה כּוּלָן פֵּרְשׁוּ כַּפָּיו:</p>
                <p>אומנויות ומדעים</p>
                <p>ועוד אלפי אמצעים;</p>
                <p className="mt-4">הרוח הנושב –</p>
                <p>אותו בלבד ידע הלב."</p>
              </div>
            </div>
            <div>
              <p className="text-xl text-gray-700 text-right leading-relaxed">
                ההתייחסות ל"אתר.בוט" כ'כלי' בלבד היא פישוט יתר. בניגוד לכלי פסיבי וצפוי, GenAI הוא שותף פעיל, לעיתים מפתיע, בתהליך החשיבה. הוא מציע, יוצר, אך גם עלול לטעות.
              </p>
              <p className="mt-4 text-xl text-gray-700 text-right leading-relaxed">
                יעילותו ובטיחותו תלויות בפיתוח <strong className="text-blue-800">'אוריינות AI'</strong> – יכולת ביקורתית מתמדת, אימות מידע, ושיפוט אתי של המומחה האנושי, המשלב את "ידיעת השכל" עם "ידיעת הלב".
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { WorkshopReport };
