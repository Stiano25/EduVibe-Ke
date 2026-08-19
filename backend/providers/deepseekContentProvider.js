import { generateWithBackoff } from './generateWithBackoff.js';

/** Default model — override via DEEPSEEK_MODEL. Do not silently substitute other names. */
export const DEFAULT_DEEPSEEK_MODEL = 'deepseek-v4-pro';
export const DEFAULT_DEEPSEEK_BASE_URL = 'https://api.deepseek.com';

export const getDeepSeekModel = () =>
  (process.env.DEEPSEEK_MODEL || DEFAULT_DEEPSEEK_MODEL).trim() || DEFAULT_DEEPSEEK_MODEL;

export const getDeepSeekBaseUrl = () => {
  const raw = (process.env.DEEPSEEK_BASE_URL || DEFAULT_DEEPSEEK_BASE_URL).trim();
  return raw.replace(/\/+$/, '') || DEFAULT_DEEPSEEK_BASE_URL;
};

const getApiKey = () => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error(
      'DEEPSEEK_API_KEY is not configured (required when GENERATION_PROVIDER=deepseek)'
    );
  }
  return apiKey;
};

const chatCompletionsUrl = () => `${getDeepSeekBaseUrl()}/chat/completions`;

const extractText = (message) => {
  if (!message) return '';
  if (typeof message.content === 'string') return message.content;
  if (Array.isArray(message.content)) {
    return message.content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part?.type === 'text' && typeof part.text === 'string') return part.text;
        return '';
      })
      .join('');
  }
  return '';
};

/**
 * Map OpenAI-style finish_reason onto the stop_reason field the usage
 * tracker already understands (Claude uses stop_reason: max_tokens).
 */
const normalizeStopReason = (finishReason) => {
  if (finishReason === 'length') return 'max_tokens';
  return finishReason || null;
};

/**
 * DeepSeek OpenAI-compatible chat adapter.
 * Thinking is disabled so JSON lesson shells stay parseable and tiny
 * connectivity max_tokens budgets are not spent on reasoning tokens.
 */
export const generateContent = async ({
  prompt,
  maxTokens = 8192,
  label = '',
  onWait = null,
  system = null
} = {}) => {
  if (!prompt && prompt !== '') {
    throw new Error('deepseekContentProvider: prompt is required');
  }

  const apiKey = getApiKey();
  const model = getDeepSeekModel();
  const url = chatCompletionsUrl();

  const messages = [];
  if (system) {
    messages.push({ role: 'system', content: system });
  }
  messages.push({ role: 'user', content: prompt });

  const { text, inputTokens, outputTokens, raw } = await generateWithBackoff(
    async () => {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          thinking: { type: 'disabled' }
        })
      });

      const bodyText = await res.text();
      let body;
      try {
        body = bodyText ? JSON.parse(bodyText) : {};
      } catch {
        const err = new Error(
          `DeepSeek returned non-JSON (status ${res.status}): ${bodyText.slice(0, 400)}`
        );
        err.status = res.status;
        err.error = { raw: bodyText.slice(0, 2000) };
        throw err;
      }

      if (!res.ok) {
        const err = new Error(
          body?.error?.message || body?.message || `DeepSeek HTTP ${res.status}`
        );
        err.status = res.status;
        err.error = body?.error || body;
        throw err;
      }

      const choice = body?.choices?.[0];
      const textValue = extractText(choice?.message);
      const inputTokens = Number(body?.usage?.prompt_tokens) || 0;
      const outputTokens = Number(body?.usage?.completion_tokens) || 0;
      const stopReason = normalizeStopReason(choice?.finish_reason);

      return {
        text: textValue,
        inputTokens,
        outputTokens,
        raw: {
          ...body,
          stop_reason: stopReason
        }
      };
    },
    { label, onWait, provider: 'DeepSeek' }
  );

  console.log(
    `[generation] provider=deepseek model=${model} label=${label || '-'} in=${inputTokens} out=${outputTokens}`
  );

  return { text, inputTokens, outputTokens, raw };
};
