// services/graphAgentService.ts

import { GraphData, Node, LLMMessage } from './graphQueryService';

// --- ארכיטקטורה חדשה: כלים ייעודיים למשימות שונות ---

const agentTools = [
  {
    "function_declarations": [
      {
        "name": "get_relationship_between_two_entities",
        "description": "מוצא ומחזיר את הנתיב המדויק בין שתי ישויות. יש להשתמש בכלי זה אך ורק לשאלות 'מה הקשר בין X ל-Y'.",
        "parameters": {
          "type": "OBJECT",
          "properties": {
            "entity1_name": { "type": "STRING", "description": "שם הישות הראשונה." },
            "entity2_name": { "type": "STRING", "description": "שם הישות השנייה." }
          }, "required": ["entity1_name", "entity2_name"]
        }
      },
      {
        "name": "get_information_about_entity",
        "description": "אוסף ומחזיר מידע מקיף על ישות בודדת, כולל תיאור וקשרים ישירים. יש להשתמש בכלי זה לשאלות כלליות כמו 'מה זה X' או 'ספר לי על Y'.",
        "parameters": {
          "type": "OBJECT",
          "properties": {
            "entity_name": { "type": "STRING", "description": "שם הישות שעליה נשאלה השאלה." }
          }, "required": ["entity_name"]
        }
      }
    ]
  }
];

// --- מימוש פרוגרמטי של הכלים ---

function levenshteinDistance(a: string = "", b: string = ""): number {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
    for (let i = 0; i <= a.length; i++) { matrix[0][i] = i; }
    for (let j = 0; j <= b.length; j++) { matrix[j][0] = j; }
    for (let j = 1; j <= b.length; j++) {
        for (let i = 1; i <= a.length; i++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + cost);
        }
    }
    return matrix[b.length][a.length];
}

function findNodeByFuzzyMatch(graph: GraphData, query: string): Node | null {
    if (!query) return null;
    const lowerCaseQuery = query.toLowerCase().trim();
    let bestMatch: Node | null = null;
    let minDistance = Infinity;

    for (const node of graph.nodes) {
        const nodeId = node.id.toLowerCase();
        const mainPart = nodeId.split('(')[0].trim();
        const distance = levenshteinDistance(lowerCaseQuery, mainPart);
        if (distance < minDistance) {
            minDistance = distance;
            bestMatch = node;
        }
    }
    if (bestMatch && (minDistance / Math.max(lowerCaseQuery.length, bestMatch.id.length) < 0.5)) {
        return bestMatch;
    }
    return null;
}

function getRelationshipBetweenTwoEntities(graph: GraphData, entity1_name: string, entity2_name: string) {
    const startNode = findNodeByFuzzyMatch(graph, entity1_name);
    const endNode = findNodeByFuzzyMatch(graph, entity2_name);

    if (!startNode || !endNode) return null;

    const queue: { nodeId: string; path: object[] }[] = [{ nodeId: startNode.id, path: [{ ...startNode, type: 'node' }] }];
    const visited = new Set<string>([startNode.id]);

    while (queue.length > 0) {
        const { nodeId, path } = queue.shift()!;
        if (nodeId === endNode.id) return path;

        const edges = graph.edges.filter(e => e.from === nodeId || e.to === nodeId);
        for (const edge of edges) {
            const neighborId = edge.from === nodeId ? edge.to : edge.from;
            if (!visited.has(neighborId)) {
                visited.add(neighborId);
                const neighborNode = graph.nodes.find(n => n.id === neighborId);
                if (neighborNode) {
                    const newPath = [...path, { type: 'edge', ...edge }, { ...neighborNode, type: 'node' }];
                    queue.push({ nodeId: neighborId, path: newPath });
                }
            }
        }
    }
    return null;
}

function getInformationAboutEntity(graph: GraphData, entity_name: string) {
    const node = findNodeByFuzzyMatch(graph, entity_name);
    if (!node) return null;

    const directConnections = graph.edges
        .filter(edge => edge.from === node.id || edge.to === node.id)
        .map(edge => {
            const neighborId = edge.from === node.id ? edge.to : edge.from;
            const neighborNode = graph.nodes.find(n => n.id === neighborId);
            return {
                direction: edge.from === node.id ? 'to' : 'from',
                label: edge.label,
                related_entity: neighborNode?.id || neighborId,
            };
        });

    return {
        entity_info: node,
        connections: directConnections,
    };
}

// --- המנגנון הראשי של הסוכן (Orchestrator) ---

export async function runGraphAgent(
  question: string,
  graph: GraphData,
  fetchChatCompletion: (messages: LLMMessage[], tools?: any[]) => Promise<any>
): Promise<string> {

    const systemPrompt = `אתה סוכן AI מומחה לניתוח גרף ידע על מורשת תרבותית. תפקידך הוא להבין את שאלת המשתמש ולהפעיל את הכלי המתאים ביותר כדי לענות עליה.
- לשאלות 'מה הקשר בין X ל-Y', השתמש ב-'get_relationship_between_two_entities'.
- לשאלות 'מה זה X' או 'ספר לי על Y', השתמש ב-'get_information_about_entity'.
לאחר קבלת התוצאה מהכלי, תרגם אותה לתשובה ברורה ותמציתית בעברית. אם הכלי מחזיר 'null', ציין שלא נמצא מידע בגרף.`;
    
    let messages: LLMMessage[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
    ];

    for (let i = 0; i < 2; i++) {
        const response = await fetchChatCompletion(messages, agentTools);
        const responsePart = response.candidates?.[0]?.content?.parts?.[0];

        if (responsePart?.tool_calls) {
            messages.push({ role: 'assistant', content: '', tool_calls: responsePart.tool_calls });
            
            for (const toolCall of responsePart.tool_calls) {
                const { name: functionName, args } = toolCall.function_call;
                let toolResultContent: any;
                try {
                    if (functionName === 'get_relationship_between_two_entities') {
                        toolResultContent = getRelationshipBetweenTwoEntities(graph, args.entity1_name, args.entity2_name);
                    } else if (functionName === 'get_information_about_entity') {
                        toolResultContent = getInformationAboutEntity(graph, args.entity_name);
                    } else {
                        toolResultContent = { error: `Tool "${functionName}" not found.` };
                    }
                } catch (error) {
                    toolResultContent = { error: `Error executing tool: ${(error as Error).message}` };
                }
                messages.push({ role: 'tool', name: functionName, content: JSON.stringify(toolResultContent, null, 2) });
            }
        } else if (responsePart?.text) {
            return responsePart.text;
        } else {
            return "אירעה שגיאה: התקבלה תשובה לא תקינה מהמודל.";
        }
    }
    return "הסוכן לא הצליח להגיע לתשובה סופית.";
}