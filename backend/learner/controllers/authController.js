import { User } from '../../models/User.js';
import bcrypt from 'bcrypt';
import { signToken } from '../../utils/jwt.js';

const publicUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  grade: user.grade,
  avatar: user.avatar
});

const authResponse = (user, message) => ({
  message,
  token: signToken(user),
  user: publicUser(user)
});

// Register a new learner
export const registerLearner = async (req, res) => {
  try {
    const { name, email, password, grade } = req.body;

    if (!name || !email || !password || !grade) {
      return res.status(400).json({ error: 'Name, email, password, and grade are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      role: 'learner',
      grade,
      passwordHash
    });

    res.status(201).json(authResponse(user, 'User registered successfully'));
  } catch (error) {
    console.error('Error registering learner:', error.message || error);

    if (error.code === '23505') {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('grade')) {
      return res.status(500).json({
        error: 'Database schema error. The grade column may be missing.',
        details: 'Please run the migration: backend/database/migration_add_learner_features.sql',
        hint: error.message || error.hint
      });
    }

    return res.status(500).json({
      error: 'Failed to register user',
      message: error.message || String(error)
    });
  }
};

// Login (learner or admin — same endpoint, role comes from the user record)
export const loginLearner = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findByEmail(email, true);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.passwordHash) {
      return res.status(401).json({
        error: 'Account not set up with password. Please reset your password or contact support.'
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    res.json(authResponse(user, 'Login successful'));
  } catch (error) {
    console.error('Error logging in:', error.message || error);
    res.status(500).json({
      error: 'Failed to login',
      message: error.message
    });
  }
};
