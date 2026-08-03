import { getModel } from '../config/gemini.js';
import { generateWithBackoff } from './generateWithBackoff.js';

/**
 * Thin adapter around existing getModel() / AI_PROVIDER path.
 * Preserves single-string prompt behavior and 15s/30s quota backoff.
 */
export const generateContent = async ({
  prompt,
  maxTokens = 8192,
  label = '',
  onWait = null,
  temperature
} = {}) => {
  if (!prompt && prompt !== '') {
    throw new Error('geminiContentProvider: prompt is required');
  }

  const model = getModel({ maxOutputTokens: maxTokens, temperature });

  const { text, inputTokens, outputTokens } = await generateWithBackoff(
    async () => {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const textValue = typeof response.text === 'function' ? response.text() : '';
      const usage = response.usageMetadata || {};
      return {
        text: textValue,
        inputTokens: Number(usage.promptTokenCount) || 0,
        outputTokens: Number(usage.candidatesTokenCount) || 0
      };
    },
    { label, onWait, provider: 'Gemini' }
  );

  console.log(
    `[generation] provider=gemini label=${label || '-'} in=${inputTokens} out=${outputTokens}`
  );

  return { text, inputTokens, outputTokens };
};
