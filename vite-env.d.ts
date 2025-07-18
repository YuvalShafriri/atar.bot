/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_PROXY_URL: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
