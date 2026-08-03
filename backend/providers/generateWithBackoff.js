const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const isQuotaError = (error) => {
  const msg = String(error?.message || error || '');
  const status = error?.status || error?.statusCode || error?.status_code;
  if (status === 429) return true;
  return /429|too many requests|quota|rate limit|resource.?exhausted/i.test(msg);
};

/**
 * Retry fn on quota/rate-limit errors with fixed waits (15s, then 30s).
 * Non-quota errors rethrow immediately.
 */
export const generateWithBackoff = async (fn, { label = '', onWait = null, provider = '' } = {}) => {
  const waits = [15000, 30000];
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!isQuotaError(error) || attempt >= waits.length) throw error;
      const wait = waits[attempt];
      const who = provider || 'AI';
      console.warn(
        `${who} quota hit${label ? ` (${label})` : ''} — waiting ${wait / 1000}s before retry ${attempt + 1}/${waits.length}…`
      );
      if (typeof onWait === 'function') {
        onWait(`Rate limited — waiting ${wait / 1000}s before retrying…`);
      }
      await sleep(wait);
    }
  }
};
