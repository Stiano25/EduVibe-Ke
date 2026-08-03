import Anthropic from '@anthropic-ai/sdk';
import { generateWithBackoff } from './generateWithBackoff.js';

/** Default model — override via CLAUDE_MODEL. Do not silently substitute other names. */
export const DEFAULT_CLAUDE_MODEL = 'claude-sonnet-5';

export const getClaudeModel = () =>
  (process.env.CLAUDE_MODEL || DEFAULT_CLAUDE_MODEL).trim() || DEFAULT_CLAUDE_MODEL;

const parseTextBlocks = (content) => {
  if (!Array.isArray(content)) return '';
  return content
    .filter((block) => block && block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text)
    .join('');
};

const getClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not configured (required when GENERATION_PROVIDER=claude)'
    );
  }
  return new Anthropic({ apiKey });
};

/**
 * Claude Messages API adapter.
 * Sends the full prompt as a single user message (no system prompt).
 */
export const generateContent = async ({
  prompt,
  maxTokens = 8192,
  label = '',
  onWait = null
} = {}) => {
  if (!prompt && prompt !== '') {
    throw new Error('claudeContentProvider: prompt is required');
  }

  const client = getClient();
  const model = getClaudeModel();

  const { text, inputTokens, outputTokens, raw } = await generateWithBackoff(
    async () => {
      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        messages: [{ role: 'user', content: prompt }]
      });

      const textValue = parseTextBlocks(response.content);
      const inputTokens = Number(response.usage?.input_tokens) || 0;
      const outputTokens = Number(response.usage?.output_tokens) || 0;

      return {
        text: textValue,
        inputTokens,
        outputTokens,
        raw: response
      };
    },
    { label, onWait, provider: 'Claude' }
  );

  console.log(
    `[generation] provider=claude model=${model} label=${label || '-'} in=${inputTokens} out=${outputTokens}`
  );

  return { text, inputTokens, outputTokens, raw };
};
