// quickHybridSetup.ts - הפעלה מהירה של המערכת ההיברידית
// קובץ זה מאפשר הפעלה מהירה ללא שינויים נרחבים בקוד הקיים

import { hybridChatGraph } from './services/hybridGraphQueryService';
import { HeritageInferenceConfig } from './types/heritageInferenceTypes';
import heritageConfigJson from './config/heritageInferenceRules.json';

// טעינת כללי ההיסק
const heritageConfig: HeritageInferenceConfig = heritageConfigJson as HeritageInferenceConfig;

/**
 * פונקציה ראשית להחלפה זמנית במערכת ההיברידית
 * להשתמש בה במקום chatGraph הרגילה
 */
export async function quickHybridChat(
  question: string,
  graph: any,
  fetchChatCompletion: (messages: any[], tools?: any[]) => Promise<any>
): Promise<string> {
  console.log('🚀 [QUICK HYBRID] Activating advanced inference mode');
  
  return await hybridChatGraph(
    question,
    graph,
    fetchChatCompletion,
    heritageConfig.rules
  );
}

/**
 * פונקציה להשוואה מהירה בין שתי המערכות
 */
export async function quickCompare(
  question: string,
  graph: any,
  fetchChatCompletion: (messages: any[], tools?: any[]) => Promise<any>
) {
  console.log('🔍 [QUICK COMPARE] Running both systems...');
  
  // המערכת הרגילה
  const { chatGraph } = await import('./services/graphQueryService');
  const standardResult = await chatGraph(question, graph, fetchChatCompletion);
  
  // המערכת ההיברידית
  const hybridResult = await hybridChatGraph(question, graph, fetchChatCompletion, heritageConfig.rules);
  
  return {
    standard: standardResult,
    hybrid: hybridResult
  };
}

// ייצוא גם של הכללי היסק לשימוש ישיר
export { heritageConfig };

// הוראות שימוש מהיר:
// 1. יבוא: import { quickHybridChat } from './quickHybridSetup';
// 2. החלפה: const answer = await quickHybridChat(question, graphData, fetchChatCompletion);
// 3. השוואה: const comparison = await quickCompare(question, graphData, fetchChatCompletion);
