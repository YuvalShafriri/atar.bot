// global.d.ts - הגדרות טיפוסים גלובליים
declare module "*.json" {
  const value: any;
  export default value;
}
interface ImportMetaEnv {
  readonly VITE_GEMINI_PROXY_URL: string;
  // אפשר להוסיף משתנים נוספים כאן
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}