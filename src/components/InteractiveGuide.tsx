import React, { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

interface InfoDetails {
  advantage: {
    [key: string]: string;
  };
  challenge: {
    [key: string]: string;
  };
}

const InteractiveGuide: React.FC = () => {
  const [activeTab, setActiveTab] = useState('panel-1');
  const [infoType, setInfoType] = useState<'advantage' | 'challenge' | null>(null);
  const [infoKey, setInfoKey] = useState<string | null>(null);

  const infoDetails: InfoDetails = {
    advantage: {
      'new-world': "הכלי חושף בפני המשתמשים אפשרויות ודרכי חשיבה שלא היו זמינות קודם, ומאפשר גישה חדשנית לתהליך ההערכה.",
      'precision': "בניגוד לכלי AI כלליים, 'אתר.בוט' כוונן במיוחד למתודולוגיית הערכת מורשת, מה שמאפשר לו לספק תוצרים רלוונטיים ומדויקים יותר.",
      'perspectives': "ה-AI יכול לזהות קשרים ותבניות בטקסט שאדם עשוי לפספס, ובכך להציע מסקנות מרעננות ולהרחיב את זוויות המבט על הנכס.",
      'research': "על ידי ניתוח מהיר של חומרים קיימים, הכלי יכול לזהות פערים במידע, להצביע על כיווני חקירה נדרשים ולחסוך זמן יקר."
    },
    challenge: {
      'garbage': "זוהי המגבלה המרכזית. הבוט הוא מראה של המידע המוזן. אם המידע המקורי מוטה, חלקי או שגוי, התוצאה תשקף זאת במדויק.",
      'hallucinations': "ביטחון היתר של ה-AI עלול להטעות. הוא יכול 'להמציא' עובדות, מקורות וציטוטים. אימות ובדיקה הם שלבים קריטיים שאינם ניתנים לדילוג.",
      'black-box': "לא תמיד ברור כיצד ה-AI הגיע למסקנה מסוימת. חוסר השקיפות הזה מקשה על הערכת אמינות התוצר ודורש שיפוט אנושי מעמיק.",
      'literacy': "שימוש נכון דורש מיומנות. יש ללמוד כיצד לנסח שאלות (פרומפטים), כיצד לאתגר את הכלי, וכיצד לזהות את מגבלותיו והטיותיו."
    }
  };

  const chartData = {
    labels: ['יעילות ומהירות', 'עומק וחדשנות', 'דיוק ומיקוד', 'אמינות', 'שקיפות', 'צורך במיומנות'],
    datasets: [{
      label: 'יתרונות',
      data: [8, 9, 7.5, 0, 0, 0],
      fill: true,
      backgroundColor: 'rgba(22, 163, 74, 0.2)',
      borderColor: 'rgb(22, 163, 74)',
      pointBackgroundColor: 'rgb(22, 163, 74)',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: 'rgb(22, 163, 74)'
    }, {
      label: 'אתגרים',
      data: [0, 0, 0, 8, 7, 9],
      fill: true,
      backgroundColor: 'rgba(220, 38, 38, 0.2)',
      borderColor: 'rgb(220, 38, 38)',
      pointBackgroundColor: 'rgb(220, 38, 38)',
      pointBorderColor: '#fff',
      pointHoverBackgroundColor: '#fff',
      pointHoverBorderColor: 'rgb(220, 38, 38)'
    }]
  };
  const chartOptions = {
    maintainAspectRatio: false,
    responsive: true,
    elements: {
      line: {
        borderWidth: 3
      }
    },
    scales: {
      r: {
        angleLines: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        pointLabels: {
          font: {
            size: 12,
            weight: 'bold' as const
          },
          color: '#374151'
        },
        ticks: {
          backdropColor: 'rgba(255, 255, 255, 0.75)',
          color: '#4b5563'
        },
        suggestedMin: 0,
        suggestedMax: 10
      }
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          font: {
            size: 14,
            weight: 'bold' as const
          }
        }
      }
    }
  };

  const updateInfo = (type: 'advantage' | 'challenge', key: string) => {
    setInfoType(type);
    setInfoKey(key);
  };

  const smoothScrollTo = (targetId: string) => {
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const getInfoBoxClass = () => {
    let baseClass = "guide-info-box p-4 rounded-r-lg transition-opacity duration-300";
    if (infoType === 'advantage') {
      return `${baseClass} border-l-4 border-green-500 text-green-800 bg-green-50`;
    } else if (infoType === 'challenge') {
      return `${baseClass} border-l-4 border-red-500 text-red-800 bg-red-50`;
    } else {
      return `${baseClass} border-l-4 border-blue-500 text-blue-800 bg-blue-50 opacity-0`;
    }
  };

  const getInfoText = () => {
    if (infoType && infoKey) {
      return infoDetails[infoType][infoKey];
    }
    return "לחצו על אחד היתרונות או האתגרים למעלה כדי לראות מידע נוסף כאן.";
  };

  return (
    <div className="guide-container bg-stone-50 text-gray-800" dir="rtl">
      {/* Header */}
      <header className="guide-header bg-white shadow-sm sticky top-0 z-50">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-700">אתר.בוט 🤖</h1>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4 space-x-reverse">
                <button onClick={() => smoothScrollTo('intro')} className="guide-nav-link text-gray-600 px-3 py-2 rounded-md text-sm font-medium">מבוא</button>
                <button onClick={() => smoothScrollTo('methodology')} className="guide-nav-link text-gray-600 px-3 py-2 rounded-md text-sm font-medium">איך זה עובד?</button>
                <button onClick={() => smoothScrollTo('balance')} className="guide-nav-link text-gray-600 px-3 py-2 rounded-md text-sm font-medium">יתרונות מול אתגרים</button>
                <button onClick={() => smoothScrollTo('conclusion')} className="guide-nav-link text-gray-600 px-3 py-2 rounded-md text-sm font-medium">מסקנות</button>
              </div>
            </div>
          </div>
        </nav>
      </header>

      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        {/* Introduction Section */}
        <section id="intro" className="py-12 sm:py-16 text-center">
          <h2 className="text-3xl font-bold text-blue-800 sm:text-4xl">המדריך האינטראקטיבי ל"אתר.בוט"</h2>
          <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
            יישום זה מתרגם את דוח הסיכום של סדנת איקומוס לכדי חוויה אינטראקטיבית. גלו את הפוטנציאל, הבינו את המגבלות, וחקרו את העתיד של הערכת מורשת בעזרת בינה מלאכותית.
          </p>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="guide-card bg-white p-6 rounded-lg shadow-md border-t-4 border-blue-400">
              <h3 className="text-xl font-bold text-gray-800">🧠 עוזר קוגניטיבי</h3>
              <p className="mt-2 text-gray-600">
                אתר.בוט הוא שותף חכם למחשבה. הוא לא מחליף את המומחה, אלא מספק תמיכה אנליטית לתהליך ההערכה המורכב.
              </p>
            </div>
            <div className="guide-card bg-white p-6 rounded-lg shadow-md border-t-4 border-green-400">
              <h3 className="text-xl font-bold text-gray-800">🛠️ פיגום אנליטי</h3>
              <p className="mt-2 text-gray-600">
                הכלי מספק מסגרת עבודה שיטתית המארגנת, מעמיקה ומרחיבה את תהליך החשיבה, ועוזר להגיע לתובנות חדשות.
              </p>
            </div>
            <div className="guide-card bg-white p-6 rounded-lg shadow-md border-t-4 border-yellow-400">
              <h3 className="text-xl font-bold text-gray-800">🧑‍💻 Human-in-the-Loop</h3>
              <p className="mt-2 text-gray-600">
                המומחיות האנושית נשארת במרכז. שאלות עצירה מובנות מבטיחות שהשיפוט המקצועי מנחה את התהליך בכל שלב.
              </p>
            </div>
          </div>
        </section>

        {/* Methodology Section */}
        <section id="methodology" className="py-12 sm:py-16 bg-white rounded-xl shadow-lg">
          <div className="text-center px-4">
            <h2 className="text-3xl font-bold text-blue-800">איך זה עובד? מתודת ה-CBSA</h2>
            <p className="mt-3 text-lg text-gray-600 max-w-3xl mx-auto">
              אתר.בוט מנחה את המשתמש דרך חמשת השלבים של הערכת משמעות מבוססת הקשר (CBSA). לחצו על כל שלב כדי לגלות עוד.
            </p>
          </div>
          <div className="mt-10 max-w-4xl mx-auto px-4">
            <div className="flex flex-col md:flex-row border-b md:border-b-0 md:border-r border-gray-200">
              <div className="flex md:flex-col overflow-x-auto -mb-px md:mb-0">
                <button 
                  onClick={() => setActiveTab('panel-1')}
                  className={`guide-tab whitespace-nowrap text-right p-4 border-b-2 md:border-b-0 md:border-r-2 font-semibold border-transparent ${activeTab === 'panel-1' ? 'active' : ''}`}
                >
                  1. תיאור והקשרים
                </button>
                <button 
                  onClick={() => setActiveTab('panel-2')}
                  className={`guide-tab whitespace-nowrap text-right p-4 border-b-2 md:border-b-0 md:border-r-2 font-semibold border-transparent ${activeTab === 'panel-2' ? 'active' : ''}`}
                >
                  2. ניתוח ערכים
                </button>
                <button 
                  onClick={() => setActiveTab('panel-3')}
                  className={`guide-tab whitespace-nowrap text-right p-4 border-b-2 md:border-b-0 md:border-r-2 font-semibold border-transparent ${activeTab === 'panel-3' ? 'active' : ''}`}
                >
                  3. אותנטיות ושלמות
                </button>
                <button 
                  onClick={() => setActiveTab('panel-4')}
                  className={`guide-tab whitespace-nowrap text-right p-4 border-b-2 md:border-b-0 md:border-r-2 font-semibold border-transparent ${activeTab === 'panel-4' ? 'active' : ''}`}
                >
                  4. הערכה השוואתית
                </button>
                <button 
                  onClick={() => setActiveTab('panel-5')}
                  className={`guide-tab whitespace-nowrap text-right p-4 border-b-2 md:border-b-0 md:border-r-2 font-semibold border-transparent ${activeTab === 'panel-5' ? 'active' : ''}`}
                >
                  5. הצהרת משמעות
                </button>
              </div>
              <div className="flex-1 p-6">
                {activeTab === 'panel-1' && (
                  <div>
                    <h3 className="text-xl font-bold mb-2">תיאור נכס והקשרים</h3>
                    <p className="text-gray-700">סיוע ביצירת תיאור מקיף ועשיר (מעל 800 מילים) של הנכס, תוך זיהוי וניתוח ההקשרים ההיסטוריים, הפיזיים והחברתיים שלו. זהו הבסיס לכל תהליך ההערכה.</p>
                  </div>
                )}
                {activeTab === 'panel-2' && (
                  <div>
                    <h3 className="text-xl font-bold mb-2">ניתוח ערכים</h3>
                    <p className="text-gray-700">זיהוי וניתוח של ערכים מרכזיים כמו ערך אסתטי, היסטורי, חברתי, רוחני ועוד. השלב כולל קישור של כל ערך לעדויות קונקרטיות מהנכס עצמו.</p>
                  </div>
                )}
                {activeTab === 'panel-3' && (
                  <div>
                    <h3 className="text-xl font-bold mb-2">אותנטיות ושלמות (Nara Grid)</h3>
                    <p className="text-gray-700">ניתוח מצב השימור, השלמות והאותנטיות של הנכס. שלב זה מעריך את השפעתם של גורמים אלו על ערכיו באמצעות טבלת "נארה גריד" מובנית.</p>
                  </div>
                )}
                {activeTab === 'panel-4' && (
                  <div>
                    <h3 className="text-xl font-bold mb-2">הערכה השוואתית</h3>
                    <p className="text-gray-700">ביצוע ניתוח השוואתי של הנכס מול אתרים דומים כדי להבין את ייחודיותו. ההשוואה נעשית מבחינה ערכית, תפקודית והיסטורית.</p>
                  </div>
                )}
                {activeTab === 'panel-5' && (
                  <div>
                    <h3 className="text-xl font-bold mb-2">ניסוח הצהרת משמעות</h3>
                    <p className="text-gray-700">גיבוש נרטיב מסכם, קוהרנטי ומבוסס המשלב את כל ממצאי הניתוח לכדי הצהרת משמעות תרבותית שלמה. זהו התוצר הסופי של התהליך.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Balance Section */}
        <section id="balance" className="py-12 sm:py-16">
          <div className="text-center px-4">
            <h2 className="text-3xl font-bold text-blue-800">מאזן הכוחות: יתרונות מול אתגרים</h2>
            <p className="mt-3 text-lg text-gray-600 max-w-3xl mx-auto">
              לכל טכנולוגיה חדשה יש שני צדדים. תרשים הרדאר מציג את המתח בין הפוטנציאל לסיכון בשימוש ב-AI להערכת מורשת.
            </p>
          </div>
          <div className="mt-10">
            <div className="guide-chart-container">
              <Radar data={chartData} options={chartOptions} />
            </div>
          </div>
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            <div>
              <h3 className="text-2xl font-bold text-green-600 text-center mb-4">✅ יתרונות ופוטנציאל</h3>
              <div className="space-y-4">
                <div className="guide-card bg-white p-4 rounded-lg shadow-sm cursor-pointer" onClick={() => updateInfo('advantage', 'new-world')}>
                  <h4 className="font-bold">פתיחת "עולם חדש"</h4>
                  <p className="text-sm text-gray-600">הכלי פותח אפשרויות חדשות ומסייע לראות את המידע והתהליך באור אחר.</p>
                </div>
                <div className="guide-card bg-white p-4 rounded-lg shadow-sm cursor-pointer" onClick={() => updateInfo('advantage', 'precision')}>
                  <h4 className="font-bold">דיוק ויכולת כוונון</h4>
                  <p className="text-sm text-gray-600">ממוקד יותר מכלי AI כלליים, עם יכולת להבין מידע ספציפי שהוזן לו.</p>
                </div>
                <div className="guide-card bg-white p-4 rounded-lg shadow-sm cursor-pointer" onClick={() => updateInfo('advantage', 'perspectives')}>
                  <h4 className="font-bold">הרחבת נקודות מבט</h4>
                  <p className="text-sm text-gray-600">מספק תובנות, "מסקנות מרעננות" וזוויות מבט חדשות, גם על טקסטים קיימים.</p>
                </div>
                <div className="guide-card bg-white p-4 rounded-lg shadow-sm cursor-pointer" onClick={() => updateInfo('advantage', 'research')}>
                  <h4 className="font-bold">סיוע בחקירה והנגשה</h4>
                  <p className="text-sm text-gray-600">יכול לסייע בחקירה מעמיקה, זיהוי חוסרים במידע וחיסכון בזמן.</p>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-red-600 text-center mb-4">⚠️ אתגרים וסיכונים</h3>
              <div className="space-y-4">
                <div className="guide-card bg-white p-4 rounded-lg shadow-sm cursor-pointer" onClick={() => updateInfo('challenge', 'garbage')}>
                  <h4 className="font-bold">Garbage In, Garbage Out</h4>
                  <p className="text-sm text-gray-600">איכות התוצר תלויה לחלוטין באיכות חומר הגלם. מידע שגוי יוביל לתוצאה שגויה.</p>
                </div>
                <div className="guide-card bg-white p-4 rounded-lg shadow-sm cursor-pointer" onClick={() => updateInfo('challenge', 'hallucinations')}>
                  <h4 className="font-bold">"הזיות" ויכולת שכנוע</h4>
                  <p className="text-sm text-gray-600">הכלי עלול להמציא מידע ולהציגו בצורה משכנעת. חובה קריטית לבדוק מקורות.</p>
                </div>
                <div className="guide-card bg-white p-4 rounded-lg shadow-sm cursor-pointer" onClick={() => updateInfo('challenge', 'black-box')}>
                  <h4 className="font-bold">"קופסה שחורה"</h4>
                  <p className="text-sm text-gray-600">אופן הפעולה לא תמיד שקוף, והכלי עלול לספק תשובות שונות לאותה שאלה.</p>
                </div>
                <div className="guide-card bg-white p-4 rounded-lg shadow-sm cursor-pointer" onClick={() => updateInfo('challenge', 'literacy')}>
                  <h4 className="font-bold">הצורך ב"אוריינות AI"</h4>
                  <p className="text-sm text-gray-600">דורש מיומנות חדשה: לנסח שאלות נכון, להיות ביקורתי ולזהות הטיות.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 max-w-4xl mx-auto">
            <div className={getInfoBoxClass()}>
              <p className="font-semibold">{getInfoText()}</p>
            </div>
          </div>
        </section>

        {/* Conclusion Section */}
        <section id="conclusion" className="py-12 sm:py-16 bg-gray-800 text-white rounded-xl shadow-lg">
          <div className="text-center px-4">
            <h2 className="text-3xl font-bold">המסקנה: שותפות, לא החלפה</h2>
            <div className="mt-6 max-w-3xl mx-auto">
              <blockquote className="border-r-4 border-yellow-400 pr-4 italic text-xl">
                "האחריות הסופית על ניתוח, שיפוט ואתיקה נשארת, ותמיד תישאר, בידי המומחה האנושי. העתיד אינו טמון באוטומציה מלאה של ההערכה, אלא בשותפות חכמה בין איש המקצוע לבין העוזר הקוגניטיבי שלו."
              </blockquote>
            </div>
            <div className="mt-8">
              <button 
                onClick={() => smoothScrollTo('intro')} 
                className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
              >
                חזרה להתחלה
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="text-center py-6 bg-white border-t mt-12">
        <p className="text-gray-600">נוצר כמדריך אינטראקטיבי לדוח סדנת איקומוס אתר.בוט</p>
      </footer>
    </div>
  );
};

export { InteractiveGuide };