import type { GeminiResponse } from '../types';

class GeminiService {
  private proxyUrl: string;

  constructor() {
    this.proxyUrl = import.meta.env.VITE_GEMINI_PROXY_URL;
    if (!this.proxyUrl) {
      throw new Error('VITE_GEMINI_PROXY_URL is not configured');
    }
  }

  async sendMessage(message: string): Promise<string> {
    try {
      const response = await fetch(this.proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: message }] }],
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: GeminiResponse = await response.json();
      return data.candidates[0]?.content?.parts[0]?.text || 'No response received';
    } catch (error) {
      console.error('Gemini API Error:', error);
      if (error instanceof Error) {
        throw new Error(`Failed to get response from AI: ${error.message}`);
      }
      throw new Error('Failed to get response from AI');
    }
  }

  validateConfiguration(): boolean {
    return !!this.proxyUrl;
  }
}

export const geminiService = new GeminiService();
