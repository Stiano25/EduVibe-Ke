import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;

// Prefer a current free Flash model. New keys often can't use gemini-2.5-flash.
const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

if (!apiKey) {
  console.warn('⚠️  GEMINI_API_KEY not found. AI features will be disabled.');
}

export const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export const getModel = () => {
  if (!genAI) {
    throw new Error('Gemini API key not configured');
  }
  return genAI.getGenerativeModel(
    { model: modelName },
    { apiVersion: 'v1beta' }
  );
};

export default genAI;

