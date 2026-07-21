import { getModel, genAI } from '../../config/gemini.js';
import { Strand } from '../../models/Strand.js';
import { SubStrand } from '../../models/SubStrand.js';
import https from 'https';
import http from 'http';
import { URL } from 'url';

/**
 * Download PDF from URL and extract text
 */
const downloadPDF = async (pdfUrl) => {
  // Check if it's a blob URL (shouldn't happen, but handle gracefully)
  if (pdfUrl.startsWith('blob:')) {
    throw new Error('Blob URLs are not supported. Please upload the PDF to Supabase Storage first.');
  }
  
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(pdfUrl);
      
      // Only support http and https protocols
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        reject(new Error(`Unsupported protocol: ${url.protocol}. Only http:// and https:// URLs are supported.`));
        return;
      }
      
      const client = url.protocol === 'https:' ? https : http;
      
      client.get(pdfUrl, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download PDF: ${response.statusCode}`));
          return;
        }
        
        const chunks = [];
        response.on('data', (chunk) => chunks.push(chunk));
        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve(buffer);
        });
        response.on('error', reject);
      }).on('error', reject);
    } catch (urlError) {
      reject(new Error(`Invalid PDF URL: ${urlError.message}`));
    }
  });
};

/**
 * Extract text from PDF using pdf-parse or similar
 * For now, we'll send the PDF buffer to Gemini which can handle PDFs
 */
const extractTextFromPDF = async (pdfBuffer) => {
  try {
    // Try to use pdf-parse if available
    try {
      const pdfParse = await import('pdf-parse');
      const data = await pdfParse.default(pdfBuffer);
      return data.text;
    } catch {
      // pdf-parse unavailable — Gemini prompt will use URL fallback
      return null;
    }
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    return null;
  }
};

/**
 * Parse PDF content and extract curriculum structure
 * Returns: { theme, strands: [{ name, description, subStrands: [{ name, learningOutcomes, keyInquiryQuestions }] }] }
 */
export const parsePDFContent = async (pdfUrl, subjectId, subjectName, grade) => {
  try {
    const model = getModel();

    let pdfBuffer;
    let pdfText = null;

    try {
      pdfBuffer = await downloadPDF(pdfUrl);
      pdfText = await extractTextFromPDF(pdfBuffer);
    } catch (downloadError) {
      console.error('Error downloading PDF:', downloadError.message || downloadError);
      throw new Error('Failed to download PDF: ' + downloadError.message);
    }
    
    // Prepare prompt
    let prompt;
    
    if (pdfText && pdfText.length > 0) {
      // Use extracted text
      prompt = `You are parsing a curriculum design PDF for ${subjectName} (Grade ${grade}).

Here is the extracted text from the PDF:

${pdfText.substring(0, 100000)} ${pdfText.length > 100000 ? '...[truncated]' : ''}

Extract the following structure from this curriculum document:
1. Theme (if present) - the overarching theme
2. Strands (topics) - each strand should have:
   - name: The strand/topic name
   - description: Brief description
   - subStrands: Array of sub-strands, each with:
     - name: Sub-strand name
     - description: Brief description
     - learningOutcomes: Array of specific learning outcomes (look for phrases like "By the end of...", "Learners should be able to...", "Learning outcomes:", etc.)
     - keyInquiryQuestions: Array of key inquiry questions (look for phrases like "Key inquiry questions:", "Guiding questions:", etc.)

Return the response as a JSON object with this structure:
{
  "theme": "optional theme name",
  "strands": [
    {
      "name": "Strand name",
      "description": "Description",
      "subStrands": [
        {
          "name": "Sub-strand name",
          "description": "Description",
          "learningOutcomes": ["outcome 1", "outcome 2"],
          "keyInquiryQuestions": ["question 1", "question 2"]
        }
      ]
    }
  ]
}

Make sure to extract ALL strands and sub-strands from the document. Be thorough and comprehensive.`;
    } else {
      // Fallback: Use Gemini's file handling (if supported) or provide URL
      // Note: Gemini API might support file uploads, but for now we'll use a simpler approach
      prompt = `You are parsing a curriculum design PDF for ${subjectName} (Grade ${grade}).

The PDF is available at: ${pdfUrl}

However, I cannot directly access the PDF content. Please provide a general structure based on typical curriculum design documents for ${subjectName} at Grade ${grade} level.

Extract the following structure:
1. Theme (if present)
2. Strands (topics) with sub-strands, learning outcomes, and key inquiry questions

Return as JSON with the structure specified.`;
    }

    const result = await model.generateContent(prompt);
    const text = (await result.response).text();

    let parsedData;
    try {
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : text;
      parsedData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse AI PDF response:', parseError.message || parseError);
      throw new Error('Failed to parse PDF content: ' + parseError.message);
    }

    return parsedData;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF content: ' + error.message);
  }
};

/**
 * Process parsed PDF data and save to database.
 * Reuses existing strands by name so re-parsing does not create duplicates.
 */
export const processParsedPDF = async (parsedData, subjectId) => {
  try {
    const { theme, strands } = parsedData;
    const createdStrands = [];
    const createdSubStrands = [];

    for (const strandData of strands || []) {
      const strandName = (strandData.name || '').trim();
      if (!strandName) continue;

      let strand = await Strand.findBySubjectAndName(subjectId, strandName);
      if (!strand) {
        strand = await Strand.create({
          name: strandName,
          description: strandData.description || '',
          subjectId,
          theme: theme || null,
          isAIGenerated: true
        });
      }
      createdStrands.push(strand);

      if (strandData.subStrands?.length > 0) {
        const existingSubStrands = await SubStrand.findByStrand(strand.id);
        const existingNames = new Set(
          existingSubStrands.map((s) => (s.name || '').trim().toLowerCase())
        );

        const subStrandsData = strandData.subStrands
          .filter((subStrand) => {
            const name = (subStrand.name || '').trim();
            return name && !existingNames.has(name.toLowerCase());
          })
          .map((subStrand) => ({
            name: (subStrand.name || '').trim(),
            description: subStrand.description || '',
            strandId: strand.id,
            subjectId,
            learningOutcomes: subStrand.learningOutcomes || [],
            keyInquiryQuestions: subStrand.keyInquiryQuestions || [],
            isAIGenerated: true
          }));

        if (subStrandsData.length > 0) {
          const subStrands = await SubStrand.createMany(subStrandsData);
          createdSubStrands.push(...subStrands);
        }
      }
    }

    return {
      theme,
      strands: createdStrands,
      subStrands: createdSubStrands
    };
  } catch (error) {
    console.error('Error processing parsed PDF:', error);
    throw error;
  }
};

