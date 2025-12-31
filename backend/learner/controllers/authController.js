import { User } from '../../models/User.js';
import bcrypt from 'bcrypt';

// Register a new learner
export const registerLearner = async (req, res) => {
  try {
    const { name, email, password, grade } = req.body;

    // Validate required fields
    if (!name || !email || !password || !grade) {
      return res.status(400).json({ error: 'Name, email, password, and grade are required' });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create new learner user
    const user = await User.create({
      name,
      email,
      role: 'learner',
      grade,
      passwordHash
    });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        grade: user.grade
      }
    });
  } catch (error) {
    console.error('Error registering learner:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    
    // Provide more specific error messages
    if (error.code === '23505') { // Unique constraint violation
      return res.status(409).json({ error: 'User with this email already exists' });
    }
    
    if (error.code === '42703' || error.message?.includes('column') || error.message?.includes('grade')) {
      return res.status(500).json({ 
        error: 'Database schema error. The grade column may be missing.',
        details: 'Please run the migration: backend/database/migration_add_learner_features.sql',
        hint: error.message || error.hint
      });
    }
    
    // Return detailed error in development
    const errorMessage = error.message || String(error);
    const errorDetails = {
      error: 'Failed to register user',
      message: errorMessage,
      ...(process.env.NODE_ENV === 'development' && {
        code: error.code,
        details: error.details,
        hint: error.hint
      })
    };
    
    res.status(500).json(errorDetails);
  }
};

// Login a learner
export const loginLearner = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user by email
    const user = await User.findByEmail(email, true); // Use admin client to get password hash
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if user has a password hash (for users created before password was added)
    if (!user.passwordHash) {
      return res.status(401).json({ 
        error: 'Account not set up with password. Please reset your password or contact support.' 
      });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Return user data (without password hash)
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        grade: user.grade,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Error logging in learner:', error);
    res.status(500).json({ 
      error: 'Failed to login',
      message: error.message 
    });
  }
};

