import crypto from 'crypto';

/**
 * HMAC signing for the adaptive quiz session blob that round-trips through the
 * client. Prevents learners from editing score/phase fields in devtools and
 * submitting an inflated result. The signature lives INSIDE the session object
 * (`_sig`) so the frontend can echo the object back unchanged.
 */

const getSecret = () =>
  process.env.SESSION_SIGNING_SECRET || process.env.JWT_SECRET || 'eduvibe-session-signing';

const canonical = (session) => {
  const { _sig, ...rest } = session || {};
  return JSON.stringify(rest);
};

const hmac = (payload) =>
  crypto.createHmac('sha256', getSecret()).update(payload).digest('hex');

export const signSession = (session) => ({
  ...session,
  _sig: hmac(canonical(session))
});

export const verifySession = (session) => {
  if (!session || typeof session !== 'object' || typeof session._sig !== 'string') {
    return false;
  }
  const expected = Buffer.from(hmac(canonical(session)));
  const received = Buffer.from(session._sig);
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
};

/** Session without its signature (pass this to the quiz engine). */
export const stripSignature = (session) => {
  const { _sig, ...rest } = session || {};
  return rest;
};
