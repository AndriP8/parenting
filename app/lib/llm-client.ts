import { GoogleGenAI } from '@google/genai'

export interface LLMClient {
  generateResponse(systemPrompt: string, userMessage: string): Promise<string>
}

export class GeminiLLMClient implements LLMClient {
  private ai: GoogleGenAI

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey })
  }

  async generateResponse(
    systemPrompt: string,
    userMessage: string,
  ): Promise<string> {
    const chat = await this.ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.2,
      },
    })
    return chat.text || 'Terjadi kesalahan dalam menghasilkan jawaban.'
  }
}
