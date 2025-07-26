// agentService.ts
// שירות סוכן מודרני: קריאה ל־LLM (Gemini) עם קאשינג פנימי וללא שגיאות חיצוניות

const LLM_MODEL = 'gemini-1.5-flash';

const responseCache = new Map<string, string>();

export async function askAgent(question: string, context: string): Promise<string> {
    if (!question.trim()) return '';
    const cacheKey = question + '_' + context.slice(0, 100);
    if (responseCache.has(cacheKey)) {
        return responseCache.get(cacheKey)!;
    }
    const systemPrompt = [
        'אתה עוזר מומחה לניתוח נכסי מורשת תרבותית. תפקידך לענות על שאלות אך ורק על סמך הנתונים שיסופקו.',
        'ענה בקצרה, בעברית, ובבהירות. אל תסביר מגבלות טכניות.',
    ].join('\n');
    const fullPrompt = [
        systemPrompt,
        '',
        '--- נתוני ההקשר ---',
        context,
        '---------------------',
        'שאלה: ' + question,
        ''
    ].join('\n');
    const proxyUrl = import.meta.env.VITE_GEMINI_PROXY_URL;
    if (!proxyUrl) {
        return 'שגיאה: הגדרת שרת חסרה.';
    }
    try {
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: LLM_MODEL,
                contents: [{ parts: [{ text: fullPrompt }] }]
            })
        });
        if (!response.ok) {
            return 'שגיאה בקבלת תשובה מהבוט.';
        }
        const result = await response.json();
        const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const text = rawText.trim().replace(/\s+/g, ' ');
        responseCache.set(cacheKey, text);
        return text;
    } catch {
        return 'שגיאה כללית בתקשורת עם הבוט.';
    }
}
