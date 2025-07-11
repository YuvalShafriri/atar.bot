# GraphDashboard Component

## מטרה
קובץ `GraphDashboard.tsx` מכיל את כל הלוגיקה הנדרשת לחלק של שאילתות הגרף ב"לוח התוצרים".

## מה כלול בקובץ:
1. **פונקציית `askLLM`** - הפונקציה המרכזית לשליחת שאילתות ל-LLM
2. **קומפוננטת `AiSpot`** - ממשק המשתמש לשאילתות (שדה טקסט, כפתור שאל, שאלות דוגמה)
3. **קומפוננטת `DraggableInfoBox`** - תיבת מידע הניתנת לגרירה שמופיעה כשלוחצים על צמתים
4. **קומפוננטת `GraphDashboard`** - הקומפוננטה הראשית שמנהלת את הגרפים והאינטראקציות

## מה נשאר ב-`index copy.tsx`:
1. **פונקציות LLM לעמודי הטיפים והרעיונות** - `askTipsLLM`, `askBrainstormLLM`
2. **קומפוננטת `AiSpot`** מותאמת לעמודי הטיפים והרעיונות
3. **קומפוננטת `DashboardPage`** פשוטה שמכילה תוכן טקסטואלי ומייבאת את `GraphDashboard`
4. **שאר העמודים** - `HomePage`, `ExperiencePage`, `TipsPage`, `IdeasPage`

## יתרונות החלוקה:
- **הפרדת אחריויות**: כל הקוד הקשור לגרפים במקום אחד
- **קלות תחזוקה**: ניתן לעבוד על פיצ'רים של הגרף בנפרד
- **ארגון טוב יותר**: הקובץ הראשי פחות עמוס ומתמקד בניווט ועמודים כלליים
- **גמישות**: ניתן בקלות להחליף או לשפר את הקומפוננטה של הגרף

## שימוש:
```tsx
import GraphDashboard from './GraphDashboard';

// בתוך הקומפוננטה
<GraphDashboard 
    allGraphData={allGraphData}
    thematicGraphData={thematicGraphData}
    nodeColors={nodeColors}
/>
```
