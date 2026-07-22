import { GoogleGenerativeAI } from '@google/generative-ai';
import { envPath } from './loadEnv.js';
import dotenv from 'dotenv';

/**
 * AI provider switch for lesson generation / testing.
 *
 * AI_PROVIDER=gemini  → Google Gemini (free tier is low: ~20 req/day on some models)
 * AI_PROVIDER=groq    → Groq free tier (much higher limits; get key at https://console.groq.com)
 * AI_PROVIDER=ollama  → Local Ollama (no cloud caps; install https://ollama.com then `ollama pull llama3.2`)
 */

/** Re-read .env so changing AI_PROVIDER works after nodemon / without stale values. */
const refreshEnv = () => {
  dotenv.config({ path: envPath, override: true });
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const extractRetryMs = (err) => {
  const msg = String(err?.message || err || '');
  const sec = msg.match(/retry in ([\d.]+)\s*s/i);
  if (sec) return Math.ceil(Number(sec[1]) * 1000) + 500;
  const details = err?.errorDetails;
  if (Array.isArray(details)) {
    const info = details.find((d) => d.retryDelay);
    if (info?.retryDelay) {
      const n = parseFloat(String(info.retryDelay).replace(/s$/i, ''));
      if (Number.isFinite(n)) return Math.ceil(n * 1000) + 500;
    }
  }
  return 60000;
};

/** OpenAI-compatible chat → Gemini-shaped { generateContent } */
const openAiCompatibleModel = ({
  baseUrl,
  apiKey,
  model,
  label,
  maxOutputTokens,
  temperature
}) => {
  const generateContent = async (promptOrParts) => {
    const prompt =
      typeof promptOrParts === 'string'
        ? promptOrParts
        : Array.isArray(promptOrParts)
          ? promptOrParts.map((p) => (typeof p === 'string' ? p : p?.text || '')).join('\n')
          : String(promptOrParts?.text || promptOrParts || '');

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

    const url = `${baseUrl}/chat/completions`;
    let lastErr;
    for (let attempt = 0; attempt < 3; attempt++) {
      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          temperature: temperature ?? 0.7,
          max_tokens: maxOutputTokens || 8192,
          messages: [
            {
              role: 'system',
              content:
                'You are a careful JSON generator for an education app. Return valid JSON only when asked.'
            },
            { role: 'user', content: prompt }
          ]
        })
      });

      if (res.status === 429) {
        const wait = 15000 * (attempt + 1);
        console.warn(`${label} rate limit — waiting ${Math.round(wait / 1000)}s (attempt ${attempt + 1}/3)…`);
        await sleep(wait);
        lastErr = new Error(`${label} rate limited (429)`);
        continue;
      }

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`${label} error ${res.status}: ${body.slice(0, 400)}`);
      }

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content || '';
      return { response: { text: async () => text } };
    }
    throw lastErr || new Error(`${label} failed after retries`);
  };

  return {
    generateContent: async (input) => {
      const result = await generateContent(input);
      const textValue = await result.response.text();
      return {
        response: {
          text: () => textValue
        }
      };
    }
  };
};

const geminiModelWrapper = (options = {}) => {
  const geminiKey = process.env.GEMINI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
  if (!geminiKey) {
    throw new Error('Gemini API key not configured (set GEMINI_API_KEY or switch AI_PROVIDER)');
  }
  const genAI = new GoogleGenerativeAI(geminiKey);
  const maxOutputTokens = options.maxOutputTokens || 8192;
  const model = genAI.getGenerativeModel(
    {
      model: geminiModel,
      generationConfig: {
        maxOutputTokens,
        temperature: options.temperature ?? 0.7
      }
    },
    { apiVersion: 'v1beta' }
  );

  return {
    generateContent: async (input) => {
      let lastErr;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          return await model.generateContent(input);
        } catch (err) {
          lastErr = err;
          const status = err?.status || err?.statusCode;
          if (status === 429 || /429|Too Many Requests|quota/i.test(String(err?.message || ''))) {
            const wait = extractRetryMs(err);
            console.warn(
              `Gemini quota/rate limit — waiting ${Math.round(wait / 1000)}s (attempt ${attempt + 1}/3)…`
            );
            await sleep(wait);
            continue;
          }
          throw err;
        }
      }
      throw lastErr;
    }
  };
};

export const getActiveAiProvider = () => {
  refreshEnv();
  return (process.env.AI_PROVIDER || 'gemini').toLowerCase().trim();
};

/** Lazy genAI for callers that still import it (embeddings may use Gemini separately). */
export const genAI = (() => {
  const key = process.env.GEMINI_API_KEY;
  return key ? new GoogleGenerativeAI(key) : null;
})();

export const getModel = (options = {}) => {
  refreshEnv();
  const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase().trim();
  const groqKey = process.env.GROQ_API_KEY;
  const groqModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  const groqBase = process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1';
  const ollamaBase = (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
  const ollamaModel = process.env.OLLAMA_MODEL || 'llama3.2';
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.0-flash';

  if (provider === 'groq') {
    if (!groqKey) {
      throw new Error(
        'AI_PROVIDER=groq but GROQ_API_KEY is missing. Get a free key at https://console.groq.com/keys'
      );
    }
    console.log(`AI provider: groq (${groqModel})`);
    return openAiCompatibleModel({
      baseUrl: groqBase,
      apiKey: groqKey,
      model: groqModel,
      label: 'Groq',
      maxOutputTokens: options.maxOutputTokens || 8192,
      temperature: options.temperature
    });
  }

  if (provider === 'ollama') {
    console.log(`AI provider: ollama (${ollamaModel} @ ${ollamaBase})`);
    return openAiCompatibleModel({
      baseUrl: `${ollamaBase}/v1`,
      apiKey: process.env.OLLAMA_API_KEY || 'ollama',
      model: ollamaModel,
      label: 'Ollama',
      maxOutputTokens: options.maxOutputTokens || 8192,
      temperature: options.temperature
    });
  }

  console.log(`AI provider: gemini (${geminiModel})`);
  return geminiModelWrapper(options);
};

export default genAI;
