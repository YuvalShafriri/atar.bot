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