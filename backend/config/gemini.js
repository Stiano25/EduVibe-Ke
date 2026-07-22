/**
 * Backward-compatible exports — prefer importing from ./ai.js for new code.
 * Provider is selected via AI_PROVIDER=gemini|groq|ollama
 */
export { genAI, getModel, getActiveAiProvider } from './ai.js';
export { default } from './ai.js';
