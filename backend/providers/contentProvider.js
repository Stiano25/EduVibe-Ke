import { envPath } from '../config/loadEnv.js';
import dotenv from 'dotenv';
import { AsyncLocalStorage } from 'node:async_hooks';
import * as geminiProvider from './geminiContentProvider.js';
import * as claudeProvider from './claudeContentProvider.js';

/** Re-read .env so GENERATION_PROVIDER changes apply without stale process env. */
const refreshEnv = () => {
  dotenv.config({ path: envPath, override: true });
};

const createUsageSession = () => ({
  calls: 0,
  inputTokens: 0,
  outputTokens: 0,
  byLabel: []
});

/**
 * Request-local usage avoids mixing token totals when two admins generate
 * lessons concurrently. The fallback session preserves existing script APIs.
 */
const usageStorage = new AsyncLocalStorage();
let usageSession = createUsageSession();
const activeUsage = () => usageStorage.getStore() || usageSession;
const snapshotUsage = (session) => ({
  calls: session.calls,
  inputTokens: session.inputTokens,
  outputTokens: session.outputTokens,
  byLabel: [...session.byLabel]
});

export const resetGenerationUsage = () => {
  const active = usageStorage.getStore();
  if (active) {
    active.calls = 0;
    active.inputTokens = 0;
    active.outputTokens = 0;
    active.byLabel = [];
  } else {
    usageSession = createUsageSession();
  }
};

export const getGenerationUsage = () => snapshotUsage(activeUsage());

/** Run one generation request with an isolated usage tally. */
export const runWithGenerationUsage = async (fn) => {
  if (typeof fn !== 'function') {
    throw new Error('runWithGenerationUsage requires a function');
  }
  const session = createUsageSession();
  return usageStorage.run(session, async () => {
    const result = await fn();
    return { result, usage: snapshotUsage(session) };
  });
};

const recordUsage = (provider, result, label, maxTokens) => {
  const session = activeUsage();
  const inputTokens = Number(result?.inputTokens) || 0;
  const outputTokens = Number(result?.outputTokens) || 0;
  const tokenLimit = Number(maxTokens) || null;
  const stopReason = result?.raw?.stop_reason || null;
  const reachedTokenLimit =
    stopReason === 'max_tokens' ||
    (tokenLimit !== null && outputTokens >= Math.max(0, tokenLimit - 32));
  session.calls += 1;
  session.inputTokens += inputTokens;
  session.outputTokens += outputTokens;
  session.byLabel.push({
    provider,
    label: label || '-',
    inputTokens,
    outputTokens,
    maxTokens: tokenLimit,
    stopReason,
    reachedTokenLimit
  });
  if (reachedTokenLimit) {
    console.warn(
      `[generation] label=${label || '-'} reached output budget ` +
        `(out=${outputTokens}, max=${tokenLimit ?? 'unknown'}, stop=${stopReason ?? 'unknown'})`
    );
  }
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

  recordUsage(used, result, options.label, options.maxTokens);
  return result;
};
