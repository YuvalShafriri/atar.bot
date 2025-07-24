// hybridExample.tsx - דוגמה להפעלת המערכת ההיברידית
// קובץ דוגמה המראה איך להשתמש במערכת החדשה

import { hybridChatGraph } from '../services/hybridGraphQueryService';
import { HeritageInferenceConfig } from '../types/heritageInferenceTypes';
import heritageConfigJson from '../config/heritageInferenceRules.json';

// טעינת כללי ההיסק
const heritageRulesConfig: HeritageInferenceConfig = heritageConfigJson as HeritageInferenceConfig;

// דוגמה 1: שימוש בסיסי במערכת ההיברידית
export async function basicHybridExample(question: string, graphData: any, fetchFunction: any): Promise<string> {
  return await hybridChatGraph(
    question,
    graphData,
    fetchFunction,
    heritageRulesConfig.rules
  );
}

// דוגמה 2: שימוש עם כללי היסק מותאמים
export async function customRulesExample(question: string, graphData: any, fetchFunction: any): Promise<string> {
  // כללי היסק מותאמים - רק אדריכלים ותקופות
  const customRules = [
    {
      id: "shared_architect",
      name: "אדריכל משותף", 
      description: "זיהוי קשרים בין נכסים שתוכננו על ידי אותו אדריכל",
      weight: 0.95, // ודאות גבוהה יותר
      enabled: true
    },
    {
      id: "same_period",
      name: "תקופה זהה",
      description: "זיהוי קשרים בין נכסים מאותה תקופה היסטורית", 
      weight: 0.85, // ודאות גבוהה יותר
      enabled: true
    }
  ];

  return await hybridChatGraph(
    question,
    graphData,
    fetchFunction,
    customRules
  );
}

// דוגמה 3: שימוש מותנה - עם אפשרות חזרה למערכת הרגילה
export async function conditionalHybridExample(
  question: string, 
  graphData: any, 
  fetchFunction: any,
  useHybrid: boolean = true
): Promise<string> {
    if (useHybrid) {
    console.log('🚀 Using HYBRID mode with advanced inference');
    return await hybridChatGraph(
      question,
      graphData,
      fetchFunction,
      heritageRulesConfig.rules
    );
  } else {
    console.log('📊 Using STANDARD mode');
    // יבוא של הפונקציה הרגילה
    const { chatGraph } = await import('../services/graphQueryService');
    return await chatGraph(question, graphData, fetchFunction);
  }
}

// דוגמה 4: השוואה בין שתי המערכות
export async function compareModesExample(question: string, graphData: any, fetchFunction: any) {
  console.log('🔍 Comparing STANDARD vs HYBRID modes...');
  
  // רצה את שתי המערכות
  const standardStart = Date.now();
  const { chatGraph } = await import('../services/graphQueryService');
  const standardResult = await chatGraph(question, graphData, fetchFunction);
  const standardTime = Date.now() - standardStart;
    const hybridStart = Date.now();
  const hybridResult = await hybridChatGraph(question, graphData, fetchFunction, heritageRulesConfig.rules);
  const hybridTime = Date.now() - hybridStart;
  
  // הדפס השוואה
  console.log('\n📊 ===== COMPARISON RESULTS =====');
  console.log(`❓ Question: "${question}"`);
  console.log(`⏱️ Standard Time: ${standardTime}ms`);
  console.log(`⏱️ Hybrid Time: ${hybridTime}ms`);
  console.log(`📏 Standard Length: ${standardResult.length} chars`);
  console.log(`📏 Hybrid Length: ${hybridResult.length} chars`);
  console.log('📊 ===============================\n');
  
  return {
    standard: {
      result: standardResult,
      time: standardTime
    },
    hybrid: {
      result: hybridResult,
      time: hybridTime
    }
  };
}

// דוגמה 5: שאילתות בדיקה מומלצות
export const TEST_QUESTIONS = [
  "מה הקשר בין בית שמש לטיגארט?",
  "אילו נכסים קשורים לאדריכל ריכרד קאופמן?",
  "מה המשותף בין הבתים בשכונת רחביה?",
  "אילו מבנים נבנו בתקופת המנדט הבריטי?",
  "מה הקשר בין הבתים ברחוב רוטשילד לאלו בדיזנגוף?"
];

// דוגמה 6: הרצת בדיקות אוטומטיות
export async function runAutomatedTests(graphData: any, fetchFunction: any) {
  console.log('🧪 Running automated tests...');
  
  for (const question of TEST_QUESTIONS) {
    console.log(`\n🔍 Testing: "${question}"`);
      try {
      const result = await hybridChatGraph(question, graphData, fetchFunction, heritageRulesConfig.rules);
      console.log(`✅ Success - Answer length: ${result.length} chars`);
    } catch (error) {
      console.log(`❌ Error:`, error);
    }
  }
  
  console.log('\n🧪 Automated tests completed');
}
