import React, { useState, useEffect, useRef } from 'react';

interface WorkshopReportProps {}

const WorkshopReport: React.FC<WorkshopReportProps> = () => {  const [activeTab, setActiveTab] = useState('panel-failures');
  const [geminiInput, setGeminiInput] = useState('בית הכנסת הגדול בחיפה, שנבנה ב-1925 בסגנון אקלקטי, שימש כמרכז קהילתי חשוב עבור עולי הבלקן. כיום המבנה נטוש וסובל מהזנחה.');
  const [geminiResults, setGeminiResults] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [accordionOpen, setAccordionOpen] = useState<{[key: number]: boolean}>({});

  const accordionData = [
    {
      title: "שלב 1 – ניתוח הקשרים ותיאור הנכס",
      goal: "יצירת תיאור מקיף של הנכס (לפחות 800 מילים) על בסיס ההקשרים שזוהו.",
      actions: "עיבוד מידע וזיהוי הקשרים (מבני, היסטורי, חברתי וכו'), כתיבת תיאור מובנה הכולל פתיחה, התפתחות היסטורית וסרגל זמן.",
      questions: "האם יש פרטים נוספים שכדאי להוסיף לתיאור? האם לדייק את התיאור?"
    },
    {
      title: "שלב 2 – ניתוח משמעות תרבותית (ערכים)",
      goal: "זיהוי וניתוח הערכים המרכזיים של הנכס, תוך התבססות על הקשרים ועדויות.",
      actions: "זיהוי ערכים (אסתטי, היסטורי, חברתי), ניתוח אופן ביטויים בנכס, וקישורם להקשרים רחבים.",
      questions: "האם יש ערכים נוספים? האם יש נרטיבים מתנגשים או ערכים קהילתיים שלא באו לידי ביטוי?"
    },
    {
      title: "שלב 3 – ניתוח אותנטיות ושלמות",
      goal: "ניתוח מצב השימור, השלמות והאותנטיות של הנכס והשפעתם על ערכיו.",
      actions: "השוואה בין מצב נוכחי להיסטורי, יישום של Nara Grid לבחינת היבטים כמו צורה, חומרים ושימוש, והערכת מצב ההשתמרות הכללי.",
      questions: "האם יש פרטים נוספים על מצב השימור? האם התיאור מדויק?"
    },
    {
      title: "שלב 4 – הערכה השוואתית",
      goal: "ניתוח ייחודיות הנכס בהשוואה לאתרים דומים מבחינה ערכית, תפקודית והיסטורית.",
      actions: "זיהוי אתרי השוואה, ניתוח מאפיינים עיצוביים ותפקודיים, והדגשת הייחודיות או הנדירות של הנכס.",
      questions: "האם ידוע לך על אתרים נוספים להשוואה? האם יש נקודות השוואה נוספות להדגיש?"
    },
    {
      title: "שלב 5 – ניסוח הצהרת משמעות תרבותית",
      goal: "ניסוח נרטיב מגובש, שלם ומבוסס המבליט את משמעותו התרבותית של הנכס.",
      actions: "כתיבה סינתטית המשלבת את כלל הממצאים, הדגשת תרומת הנכס לערכים, שימוש בשפה מקצועית ונרטיבית.",
      questions: "האם ההצהרה משקפת את מהות הנכס? האם תרצה להוסיף המלצות לשימור או לבצע ניתוח סמיוטי?"
    }
  ];

  // Utility to render bold markdown-like **bold** segments
  const renderWithBold = (text: string) => {
    return text.split(/(\*\*[^*]+\*\*)/g).map((part, idx) => {
      const match = part.match(/^\*\*(.+)\*\*$/);
      if (match) {
        return <strong key={idx} className="font-bold">{match[1]}</strong>;
      }
      return part;
    });
  };

  const callGeminiAPI = async (prompt: string): Promise<string> => {
    const proxyUrl = import.meta.env.VITE_GEMINI_PROXY_URL;
    if (!proxyUrl) {
      throw new Error("שגיאה בהגדרות השרת - לא נמצא GEMINI_PROXY_URL");
    }

    const response = await fetch(proxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: 'gemini-1.5-flash',
        contents: prompt
      })
    });

    if (!response.ok) {
      throw new Error("שגיאה בקבלת תשובה מהבוט");
    }

    const result = await response.json();
    return result.candidates?.[0]?.content?.parts?.[0]?.text || "לא התקבלה תשובה מהבוט";
  };  const handleAnalyze = async () => {
    if (!geminiInput.trim() || isAnalyzing) return;
    setIsAnalyzing(true);
    setGeminiResults('');
    try {
      const prompt = `אתה עוזר ניתוח המתמחה בהערכת מורשת. בהתבסס על הטקסט הבא, בצע את המשימות הבאות:
1. זהה את הערכים התרבותיים המרכזיים (כגון ערך היסטורי, חברתי, אדריכלי).
2. זהה את הישויות המרכזיות (כגון אנשים, מקומות, אירועים).
3. הצע 3 שאלות מפתח לחקירה נוספת.

**כללי ברזל:**
* היצמד אך ורק למידע הקיים בטקסט שסופק.
* אסור לך להמציא, להוסיף או להסיק מידע חיצוני שאינו מופיע בטקסט.
* אם מידע מסוים חסר או לא ברור, ציין זאת במפורש.
* השב תמיד בעברית.

הטקסט לניתוח: "${geminiInput}"`;
      const proxyUrl = import.meta.env.VITE_GEMINI_PROXY_URL;
      if (!proxyUrl) throw new Error("שגיאה בהגדרות השרת - לא נמצא GEMINI_PROXY_URL");
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'gemini-1.5-flash', contents: prompt, stream: true })
      });
      if (!response.ok) throw new Error("שגיאה בקבלת תשובה מהבוט");
      if (!response.body) {
        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "לא התקבלה תשובה מהבוט";
        setGeminiResults(text);
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      // Based on logs, the response is a single JSON object, not an SSE stream.
      // We will read the first chunk and parse it.
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: false }); // stream: false, as it's a single object
          try {
            const data = JSON.parse(chunk);
            const newText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (newText) {
              setGeminiResults(newText); // Set the full text at once
            }
            break; // Exit after processing the first chunk
          } catch (e) {
            console.error("Error parsing JSON from chunk:", chunk, e);
            setGeminiResults('שגיאה בעיבוד התשובה מהשרת.');
          }
        }
      }
    } catch (error) {
      console.error("Error analyzing text:", error);
      setGeminiResults('שגיאה בניתוח הטקסט. אנא נסה שוב מאוחר יותר.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleAccordion = (index: number) => {
    setAccordionOpen(prev => ({
      ...prev,
      [index]: !prev[index]//
    }));
  };

  const smoothScrollTo = (targetId: string) => {
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }  };

  return (
    <div className="workshop-report bg-stone-50 text-gray-800" dir="rtl">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-700">דו"ח סיכום סדנה (מורחב)</h1>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-6 space-x-reverse">
                <button onClick={() => smoothScrollTo('challenge')} className="workshop-nav-link text-gray-600 font-medium">האתגר והמענה</button>
                <button onClick={() => smoothScrollTo('inside')} className="workshop-nav-link text-gray-600 font-medium">אל תוך הבוט</button>
                <button onClick={() => smoothScrollTo('gemini-interactive')} className="workshop-nav-link text-gray-600 font-medium">התנסות עם Gemini ✨</button>
                <button onClick={() => smoothScrollTo('conclusion')} className="workshop-nav-link text-gray-600 font-medium">סיכום</button>
              </div>
            </div>
          </div>
        </nav>
      </header>

      <main className="container mx-auto p-2 sm:p-6 lg:p-8 pt-2">
        {/* Introduction */}
        <section id="intro" className="pt-12 sm:pt-16 pb-0 text-center">
          <p className="mt-2 text-lg text-gray-600 max-w-3xl mx-auto font-semibold text-justify">
            חלק זה מדגים אפשרות להציג ניתוח של דיונים כתוכן אינטראקטיבי. התוכן הוא שילוב של ניתוח תמלולי הדיונים עם NotebookLM ואתר.בוט
            (משלושת המחזורים), ולאחר מכן עיצוב התוצאה כמדיה אינטרנטית באמצעות כלי הCanvas של גימיני.
          </p>
        </section>

        {/* Challenge and Response Section */}
        <section id="challenge" className="pb-12 sm:pb-16">
          <div className="text-center px-1 pt-1">
            <h2 className="pt-1 text-2xl font-bold text-blue-900">האתגר והמענה: הערכת מורשת בישראל</h2>
            <p className="mt-1 text-lg text-gray-600 max-w-3xl mx-auto pt-1">
              הערכת מורשת ניצבת בפני אתגרים מורכבים. בדיונים ובסיכום בחנו את הכשלים והאתגרים, ואת מקום ה-AI.
            </p>
          </div>
          
          <div className="mt-10 max-w-6xl mx-auto">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-4 space-x-reverse justify-center" aria-label="Tabs">
                <button 
                  onClick={() => setActiveTab('panel-failures')}
                  className={`tab whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg ${
                    activeTab === 'panel-failures' ? 'active border-blue-500 bg-white text-blue-800 font-bold' : 'border-transparent'
                  }`}
                >
                  1. כשלים ואתגרים
                </button>
                <button 
                  onClick={() => setActiveTab('panel-solutions')}
                  className={`tab whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg ${
                    activeTab === 'panel-solutions' ? 'active border-blue-500 bg-white text-blue-800 font-bold' : 'border-transparent'
                  }`}
                >
                  2. דרכי התמודדות
                </button>
                <button 
                  onClick={() => setActiveTab('panel-ai-role')}
                  className={`tab whitespace-nowrap py-4 px-1 border-b-2 font-medium text-lg ${
                    activeTab === 'panel-ai-role' ? 'active border-blue-500 bg-white text-blue-800 font-bold' : 'border-transparent'
                  }`}
                >
                  3. תפקיד ה-AI
                </button>
              </nav>
            </div>
            
            <div className="mt-8">
              {/* Panel 1: Failures */}
              {activeTab === 'panel-failures' && (
                <div className="challenge-panel">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="font-bold text-xl mb-2 text-red-700 text-right">כשלים מערכתיים ורגולטוריים</h3>
                      <ul className="list-disc list-inside space-y-2 text-gray-700 text-right">
                        <li><b>היעדר דרישה:</b> גופים סטטוטוריים אינם דורשים הערכות מורשת.</li>
                        <li><b>קבלת החלטות מוקדמת:</b> החלטות מתקבלות מלחצים פוליטיים וכלכליים.</li>
                        <li><b>היעדר אחידות ותקינה:</b> פערים בהנחיות וחוסר בשפה משותפת.</li>
                        <li><span className="bg-yellow-200 px-2 py-1 rounded border border-yellow-400"><b>כשל בצד המקבל:</b> גם לגופים הבודקים אין כלים מספקים לנתח את חומר ההערכה.</span></li>
                        <li><span className="bg-yellow-200 px-2 py-1 rounded border border-yellow-400"><b>תרבות ארגונית:</b> תיעוד והערכה נעשים "רק כדי לסמן וי", מה שמוביל לשחיקה מקצועית.</span></li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-bold text-xl mb-2 text-red-700 text-right">פערים מקצועיים וקוגניטיביים</h3>
                      <ul className="list-disc list-inside space-y-2 text-gray-700 text-right">
                        <li><b>היעדר הכשרה:</b> בתי ספר לאדריכלות אינם מלמדים את שלב ההערכה לעומק.</li>
                        <li><span className="bg-yellow-200 px-2 py-1 rounded border border-yellow-400"><b>קשיי שפה והמשגה:</b> קושי להבחין בין "ערך", "משמעות" וה"אטריביוט" (תכונה בנכס) שלהם, וקושי לבטא ערך באופן ברור ומנומק.</span></li>
                        <li><span className="bg-yellow-200 px-2 py-1 rounded border border-yellow-400"><b>מורכבות וסובייקטיביות:</b> הערכה דורשת חשיבה מורכבת וניתוח ערכים, לא רק איסוף נתונים טכני.</span></li>
                        <li><span className="bg-yellow-200 px-2 py-1 rounded border border-yellow-400"><b>מגבלות כלים:</b> כלים קיימים (אקסל, GIS) מעדיפים נתונים כמותיים על פני איכותיים.</span></li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Panel 2: Solutions */}
              {activeTab === 'panel-solutions' && (
                <div className="challenge-panel">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h3 className="font-bold text-xl mb-2 text-green-700 text-right">פתרונות מערכתיים וארגוניים</h3>
                      <ul className="list-disc list-inside space-y-2 text-gray-700 text-right">
                        <li><b>הגדרת סטנדרט:</b> גיבוש "קודקס מנחה" ארצי ועגינת חובת הגשת דוח ערכי בתקנות.</li>
                        <li><b>שדרוג הכשרה:</b> הוספת קורסים ייעודיים להערכה תרבותית ועבודת צוות רב-תחומית.</li>
                        <li><b>חיזוק שפה ותקשורת:</b> פיתוח "מדריך לשפה" מוסכם וסדנאות כתיבה.</li>
                        <li><b>חיזוק אתיקה:</b> יצירת קוד אתי מחייב ומנגנוני בקרה מקצועיים.</li>
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-bold text-xl mb-2 text-green-700 text-right">פתרונות אישיים (למתעד)</h3>
                      <ul className="list-disc list-inside space-y-2 text-gray-700 text-right">
                        <li><b>ארגז כלים אישי:</b> גיבוש checklist ותבנית אחידה, שגרת רישום תצפיות.</li>
                        <li><b>עבודה רב-תחומית:</b> גיוס שותפים (היסטוריון, נציג קהילה) גם ללא חובה פורמלית.</li>
                        <li><b>שילוב "הסיפור":</b> שימוש בסטוריטלינג חזותי, עדויות אישיות וסיפורים.</li>
                        <li><b>עמידה על אתיקה ושקיפות:</b> תיעוד ניסיונות לחפף תהליכים וחשיפת יזמים לסיפורי קהילות.</li>
                        <li><span className="bg-yellow-200 px-2 py-1 rounded border border-yellow-400"><b>גישה יזמית ופרואקטיבית:</b> להיות "אושיית שימור", לצבור מוניטין ולהשתמש בהשוואות ככלי שכנוע.</span></li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Panel 3: AI Role */}
              {activeTab === 'panel-ai-role' && (
                <div className="challenge-panel">
                  <h3 className="font-bold text-xl mb-8 text-blue-700 text-center">תפקיד ה-AI: מאזן הכוחות בשותפות</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h4 className="font-bold text-lg text-green-700 text-right mb-3">✅ יתרונות ופוטנציאל</h4>
                      <div className="space-y-4">
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                          <h5 className="font-semibold text-green-800">פתיחת "עולם חדש"</h5>
                          <p className="text-sm text-gray-600 mt-1">הכלי חושף אפשרויות ודרכי חשיבה שלא היו זמינות קודם, ומאפשר גישה חדשנית לתהליך ההערכה.</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                          <h5 className="font-semibold text-green-800">סיוע בחקירה והנגשה</h5>
                          <p className="text-sm text-gray-600 mt-1">על ידי ניתוח מהיר של חומרים קיימים, הכלי יכול לזהות פערים במידע, להצביע על כיווני חקירה נדרשים, לאפשר שלב הערכה ראשוני מהיר, ולחסוך זמן יקר.</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                          <h5 className="font-semibold text-green-800">דיוק ויכולת כוונון</h5>
                          <p className="text-sm text-gray-600 mt-1">בניגוד לכלי AI כלליים, ניתן לאמן את הבוט על מידע ספציפי, מה שמאפשר לו לספק תוצרים רלוונטיים ומדויקים יותר להקשר.</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                          <h5 className="font-semibold text-green-800">הרחבת נקודות מבט</h5>
                          <p className="text-sm text-gray-600 mt-1">ה-AI יכול לזהות קשרים ותבניות בטקסט שאדם עשוי לפספס, ובכך להציע מסקנות מרעננות ולהרחיב את זוויות המבט על הנכס.</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-red-700 text-right mb-3">⚠️ אתגרים וסיכונים</h4>
                      <div className="space-y-4">
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                          <h5 className="font-semibold text-red-800">"הזיות" ויכולת שכנוע</h5>
                          <p className="text-sm text-gray-600 mt-1">ביטחון היתר של ה-AI עלול להטעות. הוא יכול 'להמציא' עובדות ומקורות. אימות ובדיקה הם שלבים קריטיים.</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                          <h5 className="font-semibold text-red-800">הצורך ב"אוריינות AI"</h5>
                          <p className="text-sm text-gray-600 mt-1">שימוש נכון דורש מיומנות: לדעת כיצד לנסח שאלות, לאתגר את הכלי, ולזהות את מגבלותיו והטיותיו.</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                          <h5 className="font-semibold text-red-800">Garbage In, Garbage Out</h5>
                          <p className="text-sm text-gray-600 mt-1">איכות התוצר תלויה לחלוטין באיכות חומר הגלם. <span className="bg-yellow-200 px-1 rounded">הבוט ישקף במדויק כל הטיה או שגיאה במידע המקורי.</span></p>
                        </div>
                        <div className="bg-white p-4 rounded-lg shadow-sm">
                          <h5 className="font-semibold text-red-800">אי-דטרמיניסטיות ומגבלת "רוח המקום"</h5>
                          <p className="text-sm text-gray-600 mt-1">המודל עלול לספק תשובות שונות לאותה שאלה, ו<span className="bg-yellow-200 px-1 rounded">מתקשה להבין היבטים סובייקטיביים כמו "רוח המקום", תחושות ואווירה.</span></p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Summary cards */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <div className="card bg-white p-4 rounded-lg shadow-sm border-b-4 border-green-300 hover:transform hover:-translate-y-1 transition-all">
              <h3 className="text-lg font-bold text-gray-800">🛠️ פיגום אנליטי</h3>
              <p className="mt-2 text-sm text-gray-600">
                הכלי מספק מסגרת עבודה שיטתית המארגנת, מעמיקה ומרחיבה את תהליך החשיבה, ומאפשר להגיע לתובנות חדשות.
              </p>
            </div>
            <div className="card bg-white p-4 rounded-lg shadow-sm border-b-4 border-blue-300 hover:transform hover:-translate-y-1 transition-all">
              <h3 className="text-lg font-bold text-gray-800">🧠 עוזר קוגניטיבי</h3>
              <p className="mt-2 text-sm text-gray-600">
                אתר.בוט הוא שותף למחשבה. הוא לא מחליף את המומחה, אלא מספק תמיכה אנליטית לתהליך ההערכה המורכב.
              </p>
            </div>
            <div className="card bg-white p-4 rounded-lg shadow-sm border-b-4 border-yellow-300 hover:transform hover:-translate-y-1 transition-all">
              <h3 className="text-lg font-bold text-gray-800">🧑‍💻 Human-in-the-Loop</h3>
              <p className="mt-2 text-sm text-gray-600">
                המומחיות האנושית נשארת במרכז. שאלות עצירה מובנות מבטיחות שהשיפוט המקצועי מנחה את התהליך בכל שלב.
              </p>
            </div>
          </div>
        </section>


        <section id="inside" className="py-12 sm:py-16 bg-white rounded-xl shadow-lg">
          <div className="text-center px-4">
            <h2 className="text-3xl font-bold text-blue-900">אל תוך הבוט: מתודולוגיה ועקרונות יסוד</h2>
            <p className="mt-3 text-lg text-gray-600 max-w-3xl mx-auto">
              כדי להבין את "אתר.בוט", יש להכיר את שיטת הפעולה המובנית שלו (CBSA) ואת עקרונות היסוד המנחים אותו.
            </p>
          </div>

          <div className="mt-10 max-w-5xl mx-auto px-4 space-y-4">
            {accordionData.map((item, index) => (
              <div key={index} className="border border-gray-200 rounded-lg">
                <h2>
                  <button
                    type="button"
                    className={`accordion-button flex items-center justify-between w-full p-5 font-semibold text-right text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors ${accordionOpen[index] ? 'bg-indigo-50' : ''}`}
                    onClick={() => toggleAccordion(index)}
                  >
                    <span>{item.title}</span>
                    <svg
                      className={`w-6 h-6 shrink-0 transform transition-transform ${accordionOpen[index] ? 'rotate-180' : ''}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"></path>
                    </svg>
                  </button>
                </h2>
                <div
                  className={`accordion-content border-t border-gray-200 text-right overflow-hidden transition-all duration-300 ${accordionOpen[index] ? 'max-h-screen p-5' : 'max-h-0'}`}
                >
                  <div className="space-y-4 text-gray-600">
                    <p><strong>🎯 מטרה:</strong> {item.goal}</p>
                    <p><strong>🧠 פעולות הבוט:</strong> {item.actions}</p>
                    <p className="bg-indigo-50 p-3 rounded-md"><strong>❓ שאלות עצירה (Human-in-the-Loop):</strong> {item.questions}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 max-w-5xl mx-auto px-4">
            <h3 className="text-2xl font-bold text-center mb-6">עקרונות מנחים (כללי ברזל)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="card bg-gray-100 p-4 rounded-lg hover:transform hover:-translate-y-1 transition-all">
                <p className="text-3xl">🔒</p>
                <p className="font-semibold mt-2">פרטיות</p>
                <p className="text-sm text-gray-600">הבוט לא חושף מידע שסופק על ידי המשתמש.</p>
              </div>
              <div className="card bg-gray-100 p-4 rounded-lg hover:transform hover:-translate-y-1 transition-all">
                <p className="text-3xl">📑</p>
                <p className="font-semibold mt-2">ציטוט</p>
                <p className="text-sm text-gray-600">מסתמך רק על קבצי המקור שהועלו.</p>
              </div>
              <div className="card bg-gray-100 p-4 rounded-lg hover:transform hover:-translate-y-1 transition-all">
                <p className="text-3xl">⛔</p>
                <p className="font-semibold mt-2">ללא הזיות</p>
                <p className="text-sm text-gray-600">אינו ממציא עובדות, נתונים או מקורות.</p>
              </div>
              <div className="card bg-gray-100 p-4 rounded-lg hover:transform hover:-translate-y-1 transition-all">
                <p className="text-3xl">🧑‍💻</p>
                <p className="font-semibold mt-2">פיקוח אנושי</p>
                <p className="text-sm text-gray-600">שאלות עצירה מבטיחות שהמומחה נשאר במרכז.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Gemini Interactive Section */}
        <section id="gemini-interactive" className="py-12 sm:py-16 bg-blue-50/50 rounded-xl">
          <div className="text-center px-4">
            <h2 className="text-3xl font-bold text-blue-900">התנסות אינטראקטיבית עם Gemini ✨</h2>
            <p className="mt-3 text-lg text-gray-600 max-w-3xl mx-auto">
              הדביקו טקסט המתאר נכס מורשת, ו-Gemini ינתח אותו עבורכם לפי עקרונות מתודת CBSA.
            </p>
          </div>

          <div className="mt-10 max-w-4xl mx-auto px-4">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <div className="mt-4">
                <textarea
                  className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 transition"
                  rows={4}
                  value={geminiInput}
                  onChange={(e) => setGeminiInput(e.target.value)}
                  placeholder="הזן טקסט לניתוח..." />
                <button
                  onClick={handleAnalyze}
                  className="mt-3 w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-transform transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed"
                  disabled={isAnalyzing || !geminiInput.trim()}
                >
                  {isAnalyzing ? 'מנתח...' : 'נתח טקסט'}
                </button>
              </div>
              {geminiResults && (
                <div className="mt-6 bg-gray-100 p-4 rounded-lg border border-gray-200 text-right">
                  <h4 className="font-bold text-lg mb-2 text-gray-800">תוצאות הניתוח:</h4>
                  <div className="text-gray-700 whitespace-pre-wrap">{renderWithBold(geminiResults)}</div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Conclusion Section */}
        <section id="conclusion" className="py-12 sm:py-16">
          <div className="max-w-5xl mx-auto bg-white p-8 rounded-lg shadow-lg">
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
                  ההתייחסות ל"אתר.בוט" כ'כלי' בלבד היא פישוט יתר. בניגוד לכלי פסיבי וצפוי, GenAI הוא שותף
                  פעיל, לעיתים מפתיע, בתהליך החשיבה. הוא מציע, יוצר, אך גם עלול לטעות.
                </p>
                <p className="mt-4 text-xl text-gray-700 text-right leading-relaxed">
                  יעילותו ובטיחותו תלויות בפיתוח <strong className="text-blue-800">'אוריינות AI'</strong> – יכולת
                  ביקורתית מתמדת, אימות מידע, ושיפוט אתי של המומחה האנושי, המשלב את "ידיעת השכל" עם "ידיעת הלב".
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="text-center py-6 bg-white border-t mt-12">
        <p className="text-gray-600">נוצר כמדריך מאוחד לדוח סדנת איקומוס אתר.בוט</p>
      </footer>
    </div>
  );
};

export { WorkshopReport };
