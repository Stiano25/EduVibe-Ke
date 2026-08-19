/**
 * One-shot DeepSeek connectivity check.
 * Authorized single API call only — do not extend or re-run in loops.
 *
 * Usage (from backend/): node scripts/test-deepseek-connectivity.js
 */
import '../config/loadEnv.js';
import {
  generateContent,
  getDeepSeekModel,
  getDeepSeekBaseUrl
} from '../providers/deepseekContentProvider.js';

const main = async () => {
  console.log('DeepSeek connectivity test');
  console.log(`Model: ${getDeepSeekModel()}`);
  console.log(`Base URL: ${getDeepSeekBaseUrl()}`);
  console.log(`DEEPSEEK_API_KEY set: ${Boolean(process.env.DEEPSEEK_API_KEY)}`);

  try {
    const result = await generateContent({
      system: 'You are a test.',
      prompt: 'Reply with exactly one word: OK',
      maxTokens: 16,
      label: 'connectivity-test'
    });

    console.log('\n--- parsed text ---');
    console.log(result.text);

    console.log('\n--- token usage ---');
    console.log({ inputTokens: result.inputTokens, outputTokens: result.outputTokens });

    console.log('\n--- raw response ---');
    const raw = result.raw;
    const choice = raw?.choices?.[0];
    console.log(
      JSON.stringify(
        {
          id: raw?.id,
          object: raw?.object,
          model: raw?.model,
          created: raw?.created,
          choices: raw?.choices,
          usage: raw?.usage,
          stop_reason: raw?.stop_reason,
          finish_reason: choice?.finish_reason
        },
        null,
        2
      )
    );
  } catch (err) {
    const status = err?.status || err?.statusCode || err?.status_code || err?.error?.status;
    console.error('\n--- API error (exact) ---');
    console.error('status:', status ?? '(none)');
    console.error('message:', err?.message || String(err));
    if (err?.error) {
      console.error('error body:', JSON.stringify(err.error, null, 2));
    }
    process.exitCode = 1;
  }
};

main();
