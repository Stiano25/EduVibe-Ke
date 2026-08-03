import { envPath } from '../config/loadEnv.js';
import dotenv from 'dotenv';
import * as geminiProvider from './geminiContentProvider.js';
import * as claudeProvider from './claudeContentProvider.js';

/** Re-read .env so GENERATION_PROVIDER changes apply without stale process env. */
const refreshEnv = () => {
  dotenv.config({ path: envPath, override: true });
};

/** In-process usage tally for cost reporting (reset per generation run). */
let usageSession = {
  calls: 0,
  inputTokens: 0,
  outputTokens: 0,
  byLabel: []
};

export const resetGenerationUsage = () => {
  usageSession = { calls: 0, inputTokens: 0, outputTokens: 0, byLabel: [] };
};

export const getGenerationUsage = () => ({
  calls: usageSession.calls,
  inputTokens: usageSession.inputTokens,
  outputTokens: usageSession.outputTokens,
  byLabel: [...usageSession.byLabel]
});

const recordUsage = (provider, result, label) => {
  const inputTokens = Number(result?.inputTokens) || 0;
  const outputTokens = Number(result?.outputTokens) || 0;
  usageSession.calls += 1;
  usageSession.inputTokens += inputTokens;
  usageSession.outputTokens += outputTokens;
  usageSession.byLabel.push({
    provider,
    label: label || '-',
    inputTokens,
    outputTokens
  });
};

export const getGenerationProvider = () => {
  refreshEnv();
  return (process.env.GENERATION_PROVIDER || 'claude').toLowerCase().trim();
};

/**
 * Shared generation entry point for lessonGenerationService.
 * Default: claude. Set GENERATION_PROVIDER=gemini to use getModel / AI_PROVIDER.
 *
 * @returns {{ text: string, inputTokens: number, outputTokens: number }}
 */
export const generateContent = async (options = {}) => {
  const provider = getGenerationProvider();

  let result;
  let used = provider;

  if (provider === 'gemini') {
    result = await geminiProvider.generateContent(options);
  } else if (provider === 'claude') {
    result = await claudeProvider.generateContent(options);
  } else {
    console.warn(
      `[generation] Unknown GENERATION_PROVIDER="${provider}" — falling back to claude`
    );
    used = 'claude';
    result = await claudeProvider.generateContent(options);
  }

  recordUsage(used, result, options.label);
  return result;
};
