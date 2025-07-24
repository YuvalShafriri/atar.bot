export const metaGraphConfig = {
  "questions": [
    {
      "id": "asset_types",
      "text": "אילו סוגי נכסים מוצגים בגרף?",
      "answer": "אתרים ארכיאולוגיים, מבנים תעשייתיים, שכונות מגורים, מבני הגנה ויצירות אמנות."
    },
    {
      "id": "mandate_assets",
      "text": "איזה נכסים קשורים לתקופת המנדט?",
      "answer": "מצודות טיגארט, תחנת רכבת העמק, מגדל המים ברגבה ומבנים בריטיים נוספים."
    },
    {
      "id": "northern_region",
      "text": "מה המשותף בין נכסי הצפון?",
      "answer": "רובם קשורים לחקלאות, לקיבוצים ולהתיישבות, עם דגש על ערכים קהילתיים."
    },
    {
      "id": "industrial_heritage",
      "text": "איזה נכסים קשורים לתעשייה?",
      "answer": "ממגורות דגון, האנגר 15, אולפני הרצליה ומסעדת דוניינא."
    },
    {
      "id": "heritage_values",
      "text": "אילו ערכי מורשת עיקריים מופיעים?",
      "answer": "ערך היסטורי, ערך חברתי-קהילתי, ערך אדריכלי וערך נופי."
    },    {
      "id": "preservation_challenges",
      "text": "מהם האתגרים בשימור הנכסים?",
      "answer": "פיתוח עירוני, שינויי שימוש, התנגשות עם אינטרסים כלכליים ואובדן זיכרון קולקטיבי."
    },
    {
      "id": "total_assets",
      "text": "כמה נכסים יש בסך הכל?",
      "answer": "ישנם 24 נכסי מורשת המחולקים בין 3 אזורים גיאוגרפיים עיקריים."
    },
    {
      "id": "central_region",
      "text": "מה מיוחד באזור המרכז?",
      "answer": "מתרכזים בו נכסי תעשייה ומבנים עירוניים, עם דגש על התפתחות תעשיית הקולנוע והתרבות."
    },
    {
      "id": "southern_region",
      "text": "איזה נכסים נמצאים בדרום?",
      "answer": "בעיקר אתרים ארכיאולוגיים עתיקים כמו שבטה, סקר גזר ועציון גבר."
    }
  ],
  "example_buttons": ["asset_types", "heritage_values", "total_assets"],
  "meta_graph": {
    "title": "גרף מטא-נתונים - כלל הנכסים",
    "description": "גרף מסכם המציג את הקטגוריות והקשרים העיקריים בין נכסי המורשת",
    "nodes": [
      {"id": "archaeological_theme", "label": "נכסים ארכיאולוגיים", "type": "נושא", "title": "3 נכסים: שבטה, סקר גזר, עציון גבר"},
      {"id": "industrial_theme", "label": "נכסי תעשייה", "type": "נושא", "title": "4 נכסים: ממגורות דגון, האנגר 15, אולפני הרצליה, מסעדת דוניינא"},
      {"id": "residential_theme", "label": "נכסי מגורים", "type": "נושא", "title": "4 נכסים: קריית שמואל, בתי בארי, בית חצר עכו, חצר המייסדים"},
      {"id": "agricultural_theme", "label": "נכסי חקלאות", "type": "נושא", "title": "5 נכסים: פרדס גוט-גורביץ', החווה בעכו, מגדל המים ברגבה"},
      {"id": "mandate_theme", "label": "נכסי המנדט", "type": "נושא", "title": "6 נכסים: מצודות טיגארט, תחנת רכבת העמק, מצודת האייל"},
      {"id": "defense_theme", "label": "מבני הגנה", "type": "נושא", "title": "4 נכסים: מצודות טיגארט, מגדלי שמירה, ניר עוז"},
      {"id": "art_culture_theme", "label": "אמנות ותרבות", "type": "נושא", "title": "2 נכסים: התרנגול בגעתון, מסעדת דוניינא"},
      
      {"id": "northern_region", "label": "אזור הצפון", "type": "אזור", "title": "8 נכסים"},
      {"id": "central_region", "label": "אזור המרכז", "type": "אזור", "title": "10 נכסים"},
      {"id": "southern_region", "label": "אזור הדרום", "type": "אזור", "title": "6 נכסים"},
      
      {"id": "historical_value", "label": "ערך היסטורי", "type": "ערך", "title": "נפוץ ביותר - 18 נכסים"},
      {"id": "social_value", "label": "ערך חברתי", "type": "ערך", "title": "מאפיין קיבוצים ושכונות - 12 נכסים"},
      {"id": "architectural_value", "label": "ערך אדריכלי", "type": "ערך", "title": "מאפיין מבנים מנדטוריים - 10 נכסים"},
      {"id": "landscape_value", "label": "ערך נופי", "type": "ערך", "title": "חקלאות ואתרים פתוחים - 8 נכסים"},
      
      {"id": "ottoman_period", "label": "תקופה עות'מאנית", "type": "תקופה", "title": "4 נכסים"},
      {"id": "british_mandate", "label": "תקופת המנדט", "type": "תקופה", "title": "8 נכסים"},
      {"id": "israeli_period", "label": "תקופה ישראלית", "type": "תקופה", "title": "12 נכסים"}
    ],
    "edges": [
      {"from": "archaeological_theme", "to": "historical_value", "label": "מאופיינים ב"},
      {"from": "industrial_theme", "to": "central_region", "label": "מרוכז ב"},
      {"from": "residential_theme", "to": "social_value", "label": "מייצג"},
      {"from": "agricultural_theme", "to": "northern_region", "label": "נפוץ ב"},
      {"from": "mandate_theme", "to": "british_mandate", "label": "שייך ל"},
      {"from": "defense_theme", "to": "architectural_value", "label": "בעל"},
      {"from": "british_mandate", "to": "architectural_value", "label": "הותיר"},
      {"from": "israeli_period", "to": "social_value", "label": "מפתח"},
      {"from": "northern_region", "to": "agricultural_theme", "label": "עשיר ב"},
      {"from": "central_region", "to": "industrial_theme", "label": "מתאפיין ב"},
      {"from": "southern_region", "to": "archaeological_theme", "label": "מכיל"},
      {"from": "mandate_theme", "to": "defense_theme", "label": "כולל"},
      {"from": "ottoman_period", "to": "architectural_value", "label": "השאיר"},
      {"from": "art_culture_theme", "to": "social_value", "label": "מקדם"}    ]
  }
};
