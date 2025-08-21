export function detectLanguageHint(text: string): string | null {
    if (!text) return null;

    // Scripts
    if (/[\u0590-\u05FF]/u.test(text)) return 'השב באותה שפה שבה נכתבה הקלט.'; // Hebrew
    if (/[\u0600-\u06FF]/u.test(text)) return 'الرجاء الرد بنفس لغة الإدخال.'; // Arabic
    if (/[\u0400-\u04FF]/u.test(text)) return 'Пожалуйста, ответьте на том же языке, что и ввод.'; // Cyrillic (Russian, etc.)
    if (/[\u4E00-\u9FFF]/u.test(text)) return '请使用与输入相同的语言回复。'; // CJK Unified Ideographs (Chinese)
    if (/[\u3040-\u30FF\u31F0-\u31FF]/u.test(text)) return '入力と同じ言語で返信してください。'; // Japanese
    if (/[\uAC00-\uD7AF]/u.test(text)) return '입력과 동일한 언어로 응답해 주세요.'; // Korean
    if (/[\u0900-\u097F]/u.test(text)) return 'कृपया उसी भाषा में उत्तर दें जिसका उपयोग इनपुट में किया गया है।'; // Devanagari (Hindi)
    if (/[\u0370-\u03FF]/u.test(text)) return 'Παρακαλώ απαντήστε στην ίδια γλώσσα με την είσοδο.'; // Greek

    // Latin-script heuristics (try to guess common Romance/Germanic languages)
    const lower = text.toLowerCase();
    if (/\b(¿|por|para|que|el|la|los|las|es|una|un)\b/.test(lower)) return 'Por favor responda en el mismo idioma que la entrada.'; // Spanish
    if (/\b(le|la|les|est|un|une|que|pour|dans)\b/.test(lower)) return "Veuillez répondre dans la même langue que l'entrée."; // French
    if (/\b(der|die|das|und|ist|nicht|ein)\b/.test(lower)) return 'Bitte antworten Sie in derselben Sprache wie die Eingabe.'; // German

    // Fallback for Latin script: prefer English instruction so model has explicit guidance
    if (/[A-Za-z]/.test(text)) return 'Please reply in the same language as the input.';

    // Final fallback: default to English
    return 'Please reply in English.';
}

export function prependLangInstruction(text: string, userText: string): string {
    // If the prompt already contains a clear language instruction, don't add another one.
    const languageDirectiveRegex = /\b(השב|ענה בעברית|please reply|please respond|answer in|répondez|por favor|الرجاء الرد|Bitte antworten)\b/i;
    if (languageDirectiveRegex.test(text)) return text;

    const hint = detectLanguageHint(userText);
    return hint ? `${hint}\n\n${text}` : text;
}
