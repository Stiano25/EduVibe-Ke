import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn('⚠️  GEMINI_API_KEY not found. AI features will be disabled.');
}

// Initialize Google Generative AI client
// Note: SDK v0.24.1+ defaults to v1beta API version
export const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Get Gemini 3 Flash Preview model with v1beta API version
export const getModel = () => {
  if (!genAI) {
    throw new Error('Gemini API key not configured');
  }
  // The SDK v0.24.1+ defaults to v1beta, but we can explicitly set it via requestOptions
  return genAI.getGenerativeModel(
    { model: 'gemini-3-flash-preview' },
    { apiVersion: 'v1beta' }
  );
};

export default genAI;

