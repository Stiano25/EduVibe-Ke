/**
 * One-shot Claude connectivity check.
 * Authorized single API call only — do not extend or re-run in loops.
 *
 * Usage (from backend/): node scripts/test-claude-connectivity.js
 */
import '../config/loadEnv.js';
import { generateContent, getClaudeModel } from '../providers/claudeContentProvider.js';

const main = async () => {
  console.log('Claude connectivity test');
  console.log(`Model: ${getClaudeModel()}`);
  console.log(`ANTHROPIC_API_KEY set: ${Boolean(process.env.ANTHROPIC_API_KEY)}`);

  try {
    const result = await generateContent({
      prompt: 'Reply with exactly one word: OK',
      maxTokens: 10,
      label: 'connectivity-test'
    });

    console.log('\n--- parsed text ---');
    console.log(result.text);

    console.log('\n--- token usage ---');
    console.log({ inputTokens: result.inputTokens, outputTokens: result.outputTokens });

    console.log('\n--- raw response (content + usage) ---');
    const raw = result.raw;
    console.log(
      JSON.stringify(
        {
          id: raw?.id,
          model: raw?.model,
          role: raw?.role,
          stop_reason: raw?.stop_reason,
          content: raw?.content,
          usage: raw?.usage
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
