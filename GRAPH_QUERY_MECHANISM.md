# מנגנון השאילתות בגרפי הידע – תיעוד עדכני

## סקירה כללית
מנגנון השאילתות בגרפי הידע תומך במספר מצבים (modes) לביצוע שאילתה על גרף או גרפים, בהתאם לסוג הגרף שנבחר ולדרישות המשתמש. כל מצב משתמש בלוגיקת שאילתה שונה, ומבצע לוגינג אחיד ומעוצב של עלות וטוקנים באמצעות הפונקציה `printTokenLogStyled`.

## מצבי שאילתה (Query Modes)

1. **Simple Query (שאילתה פשוטה)**
   - מופעל כאשר המשתמש בוחר גרף יחיד או גרף תמאטי.
   - מתבצע באמצעות הפונקציה `askLLMSimple`.
   - לא משתמש ב-RAG (Retrieval Augmented Generation).
   - לוגינג: נרשם `[QUERY MODE] Simple`.

2. **Hybrid Query (שאילתה היברידית)**
   - מופעל כאשר נבחרים מספר גרפים או נדרש שילוב בין מספר מקורות מידע.
   - מתבצע באמצעות השירות `hybridGraphQueryService`.
   - משלב בין שאילתה פשוטה ל-RAG.
   - לוגינג: נרשם `[QUERY MODE] Hybrid`.

3. **Modern/Agent Query (שאילתה מודרנית/סוכן)**
   - מופעל במצבים מתקדמים, לדוג' שאילתות מורכבות או אינטגרציה עם Agent.
   - מתבצע באמצעות השירות `modernGraphQueryService`.
   - לוגינג: נרשם `[QUERY MODE] Agent` או `[QUERY MODE] Modern`.

4. **RAG Query (שאילתה מבוססת RAG)**
   - מופעל כאשר יש צורך בהשלמת מידע מהקשר חיצוני (Retrieval).
   - מתבצע באמצעות השירות `graphQueryService`.
   - לוגינג: נרשם `[QUERY MODE] RAG`.

## לוגינג אחיד ומעוצב
כל מצב שאילתה מבצע לוגינג של עלות וטוקנים באמצעות הפונקציה `printTokenLogStyled` מתוך `tokenCostService.ts`. הפונקציה מציגה את המידע בצורה אחידה, ברורה ומעוצבת בקונסול.

## דוגמה ל-flow:
1. המשתמש בוחר גרף/גרפים.
2. המערכת מזהה את סוג הבחירה:
   - גרף יחיד/תמאטי → Simple Query
   - מספר גרפים → Hybrid/Modern/RAG Query
3. מתבצעת השאילתה בהתאם למצב.
4. נרשם לוג `[QUERY MODE] ...` עם סוג השאילתה.
5. נרשם לוג עלות וטוקנים באמצעות `printTokenLogStyled`.

## קבצים עיקריים:
- `src/services/tokenCostService.ts` – לוגינג עלות וטוקנים.
- `src/services/graphQueryService.tsx` – שאילתות RAG.
- `src/services/modernGraphQueryService.tsx` – שאילתות Agent/Modern.
- `src/services/hybridGraphQueryService.tsx` – שאילתות היברידיות.
- `src/components/Graph/ImprovedGraphDashboard.tsx` – ניהול מצב השאילתה.
- `src/components/Graph/GraphDashboard.tsx` – דשבורד גרפים.

## הערות:
- כל שינוי במנגנון השאילתות מתועד בלוגים ברורים.
- ניתן להרחיב את המנגנון למצבים נוספים בעתיד.

---
*עודכן בתאריך: 28.7.2025*
