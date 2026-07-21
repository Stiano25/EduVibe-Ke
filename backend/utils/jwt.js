import jwt from 'jsonwebtoken';

const DEFAULT_EXPIRES_IN = '7d';

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set in environment variables');
  }
  return secret;
};

/**
 * Sign a session token for an authenticated user.
 * Payload keeps identity fields the API needs without a DB hit on every request.
 */
export const signToken = (user) => {
  const payload = {
    id: user.id,
    role: user.role,
    grade: user.grade ?? null,
    email: user.email,
    name: user.name
  };

  return jwt.sign(payload, getSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || DEFAULT_EXPIRES_IN
  });
};

export const verifyToken = (token) => {
  return jwt.verify(token, getSecret());
};
