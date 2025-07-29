// SimpleGraphQuery.tsx - גישה פשוטה וישירה לשאילתות גרף
// ללא עיקוב טוקנים, ללא RAG מיותר - רק LLM שמבין גרפים

import React, { useState } from 'react';

// סוגי נתונים בסיסיים
export interface Node {
  id: string;
  name?: string;
  label?: string;
  type: string;
  meaning?: string;
}

export interface Edge {
  from: string;
  to: string;
  label?: string;
}

export interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// פונקציה פשוטה לשליחת שאילתה ל-LLM
async function queryLLM(question: string, graph: GraphData): Promise<string> {
  const proxyUrl = import.meta.env.VITE_GEMINI_PROXY_URL;
  
  // בניית הקשר פשוט - רק הגרף והשאלה
  const systemPrompt = `אתה מומחה לניתוח גרפים של מורשת תרבותית.
הגרף מכיל ${graph.nodes.length} צמתים ו-${graph.edges.length} קשרים.

נתוני הגרף:
צמתים: ${graph.nodes.map(n => `${n.name || n.label || n.id} (${n.type})`).join(', ')}

קשרים: ${graph.edges.map(e => {
  const fromNode = graph.nodes.find(n => n.id === e.from);
  const toNode = graph.nodes.find(n => n.id === e.to);
  return `${fromNode?.name || e.from} → ${toNode?.name || e.to}`;
}).join(', ')}

ענה על השאלות בצורה מדויקת על בסיס הנתונים שלמעלה.`;

  const contents = [
    { text: systemPrompt },
    { text: `שאלה: ${question}` }
  ];

  try {
    const response = await fetch(proxyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'gemini-2.5-flash-lite',
        contents
      })
    });

    const result = await response.json();
    return result.candidates?.[0]?.content?.parts?.[0]?.text || 'לא ניתן היה לקבל תשובה';
    
  } catch (error) {
    console.error('שגיאה בשאילתה:', error);
    return 'אירעה שגיאה בעת שליחת השאילתה';
  }
}

// קומפוננט פשוט לשאילתות
interface SimpleQueryProps {
  graph: GraphData;
}

const SimpleGraphQuery: React.FC<SimpleQueryProps> = ({ graph }) => {
  const [question, setQuestion] = useState('כמה נכסים קשורים עקיף לסמטת שפר?');
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAsk = async () => {
    if (!question.trim() || isLoading) return;
    
    setIsLoading(true);
    setAnswer('מחפש תשובה...');
    
    try {
      const result = await queryLLM(question, graph);
      setAnswer(result);
    } catch (error) {
      setAnswer('אירעה שגיאה');
    } finally {
      setIsLoading(false);
    }
  };

  const exampleQuestions = [
    'כמה נכסים קשורים עקיף לסמטת שפר?',
    'מה הקשר בין נכסי המורשת השונים?',
    'איזה סוגי נכסים יש בגרף?',
    'מהם הקשרים הנפוצים ביותר?'
  ];

  return (
    <div className="p-4 bg-white rounded border">
      <h3 className="text-lg font-bold mb-3">שאל על הגרף</h3>
      
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
          className="flex-1 p-2 border rounded"
          placeholder="הקלד שאלה על הגרף..."
          disabled={isLoading}
        />
        <button
          onClick={handleAsk}
          disabled={isLoading || !question.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
        >
          {isLoading ? 'חושב...' : 'שאל'}
        </button>
      </div>

      <div className="mb-3">
        <p className="text-sm text-gray-600 mb-2">שאלות לדוגמה:</p>
        <div className="flex flex-wrap gap-2">
          {exampleQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => setQuestion(q)}
              className="px-3 py-1 bg-gray-100 rounded text-sm hover:bg-gray-200"
              disabled={isLoading}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {answer && (
        <div className="p-3 bg-gray-50 rounded">
          <h4 className="font-medium mb-2">תשובה:</h4>
          <div className="whitespace-pre-wrap">{answer}</div>
        </div>
      )}

      <div className="mt-3 text-xs text-gray-500">
        גרף: {graph.nodes.length} צמתים, {graph.edges.length} קשרים
      </div>
    </div>
  );
};

export default SimpleGraphQuery;
