// agentService.ts
// The AI Router Agent responsible for creating a query plan.

import type { LLMMessage } from './graphQueryService';

/**
 * Defines the structure of the action plan returned by the agent.
 */
export interface AgentAction {
  action: 'answer_from_config' | 'query_graph';
  question_id?: string; // For answer_from_config
  query_type?: string; // For query_graph
  target_entities?: string[];
  analysis_focus?: string;
}

/**
 * The main function of the Router Agent.
 * It analyzes the user's question and returns the most efficient action plan.
 */
export async function getQueryPlan(
  userQuestion: string,
  predefinedQuestions: { id: string; text: string }[],
  fetchApi: (messages: LLMMessage[]) => Promise<any>
): Promise<AgentAction> {

  const systemPrompt = `You are an expert query routing agent for a heritage knowledge graph.
Your goal is to choose the most efficient way to answer the user's question.
You must return ONLY a valid JSON object with a plan.

Analyze the user's question and the list of predefined questions.

1.  If the user's question is semantically similar to one of the predefined questions, return this JSON structure:
    {
      "action": "answer_from_config",
      "question_id": "the_id_of_the_matching_predefined_question"
    }

2.  If the question is original and requires graph analysis, analyze it deeply and return this JSON structure:
    {
      "action": "query_graph",
      "query_type": "one of ['comparison', 'listing_by_property', 'description', 'relationship_discovery']",
      "target_entities": ["list of main entities (assets, values, architects, etc.)"],
      "analysis_focus": "the main subject of the analysis (e.g., 'architectural style', 'historical period', 'shared properties')"
    }

--- PREDEFINED QUESTIONS ---
${JSON.stringify(predefinedQuestions)}

--- USER QUESTION TO ANALYZE ---
"${userQuestion}"`;

  try {
    const response = await fetchApi([{ role: 'user', content: systemPrompt }]);
    
    // Verify response structure
    if (!response?.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('Unexpected API response structure');
    }
    
    const responseText = response.candidates[0].content.parts[0].text;
    const cleanedJson = responseText.replace(/```json\n|```/g, '').trim();
    
    const plan = JSON.parse(cleanedJson);
    console.log('🤖 [Agent] Generated plan:', plan);
    
    return plan;
  } catch (error) {
    console.warn("[Agent Service] Error getting query plan, falling back:", error);
    return {
      action: 'query_graph',
      query_type: 'description',
      target_entities: [userQuestion],
      analysis_focus: 'general'
    };
  }
}
