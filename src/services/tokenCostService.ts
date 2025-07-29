// מחיר למיליון טוקנים לפי מודל
const MODEL_PRICING: Record<string, number> = {
    'gemini-2.5-flash-lite': 0.1,
    'gemini-2.5-flash': 0.3,
    // אפשר להוסיף מודלים נוספים כאן
};

// פונקציה לחישוב עלות
export function calculateTokenCost(tokens: number, model: string): number {
    const pricePerMillion = MODEL_PRICING[model] ?? 0.1; // ברירת מחדל ל-lite
    return (tokens / 1_000_000) * pricePerMillion;
}

// פונקציה אחידה לחישוב טוקנים מטקסט
export function estimateTokens(text: string): number {
    return Math.ceil(text.length / 2.5);
}

// פונקציה ללוג טוקנים וגדלים
export function logTokenUsage(context: string, data: any, isInput: boolean = true) {
    const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
    const tokens = estimateTokens(dataStr);
    const size = (dataStr.length / 1024).toFixed(2);
    const direction = isInput ? 'Input' : 'Output';
    console.log(`[${context} Tokens] ${direction} tokens: ${tokens.toLocaleString()}`);
    console.log(`[${context} Tokens] ${direction} size: ${size} KB`);
    return tokens;
}

// פונקציה לקבלת לוג טוקנים בפורמט ויזואלי פשוט
export function getTokenLog({ inputTokens, outputTokens, model }: { inputTokens: number, outputTokens: number, model: string }) {
    const totalTokens = inputTokens + outputTokens;
    const inputCost = calculateTokenCost(inputTokens, model);
    const outputCost = calculateTokenCost(outputTokens, model);
    const totalCost = inputCost + outputCost;
    return [
        '===== TOKEN SUMMARY =====',
        `LLM Input: ${inputTokens.toLocaleString()} tokens`,
        `LLM Output: ${outputTokens.toLocaleString()} tokens`,
        `Total: ${totalTokens.toLocaleString()} tokens`,
        `Cost: ₪${totalCost.toFixed(6)}`,
        '========================='
    ].join('\n');
}

// לוג טוקנים מעוצב עם אייקונים וצבעים
export function printTokenLogStyled({
    question,
    inputTokens,
    outputTokens,
    graphTokens = 0,
    ragTokens = 0,
    model,
    cost,
    timeMs
}: {
    question: string,
    inputTokens: number,
    outputTokens: number,
    graphTokens?: number,
    ragTokens?: number,
    model: string,
    cost?: number,
    timeMs?: number
}) {
    const totalTokens = inputTokens + outputTokens;
    const inputCost = calculateTokenCost(inputTokens, model);
    const outputCost = calculateTokenCost(outputTokens, model);
    const totalCost = cost ?? (inputCost + outputCost);
    const tokenSavings = graphTokens > 0 ? graphTokens - inputTokens : 0;
    const savingsPercent = graphTokens > 0 ? (tokenSavings / graphTokens * 100) : 0;
    const ragLine = ragTokens ? `📚 RAG Context: ${ragTokens.toLocaleString()} tokens` : '';
    const timeLine = timeMs ? `⏱️ Time: ${timeMs}ms` : '';
    // עיצוב צבעים ב-console (לרוב דפדפנים)
    const cyan = 'color: #06b6d4';
    const pink = 'color: #ec4899';
    const green = 'color: #22c55e';
    const orange = 'color: #f59e42';
    const gray = 'color: #64748b';
    const bold = 'font-weight: bold';
    // הדפסה
    console.log('%c===== TOKEN SUMMARY =====', cyan);
    if (question) console.log(`%c🎯 Question: "%s"`, bold, question);
    if (graphTokens) console.log(`%c📊 Input Graph: %s tokens`, pink, graphTokens.toLocaleString());
    if (ragLine) console.log(`%c%s`, gray, ragLine);
    console.log(`%c🤖 LLM Input: %s tokens`, cyan, inputTokens.toLocaleString());
    console.log(`%c🤖 LLM Output: %s tokens`, cyan, outputTokens.toLocaleString());
    if (tokenSavings > 0) console.log(`%c💰 Token Savings: %s tokens (%.1f%%)`, orange, tokenSavings.toLocaleString(), savingsPercent);
    console.log(`%c💲 Estimated Cost: $%s`, green, totalCost.toFixed(4));
    if (timeLine) console.log(`%c%s`, gray, timeLine);
    console.log('%c=========================', cyan);
}