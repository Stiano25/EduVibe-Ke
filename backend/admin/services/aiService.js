import { getModel } from '../../config/gemini.js';
import { Strand } from '../../models/Strand.js';
import { Lesson } from '../../models/Lesson.js';

/**
 * Generate strands from a curriculum PDF using Gemini AI
 */
export const generateStrandsFromPDF = async (pdfUrl, subjectId, curriculumDesignId) => {
  try {
    const model = getModel();
    
    // TODO: Extract text from PDF (would need PDF parsing library)
    // For now, using a placeholder prompt
    const prompt = `Based on the curriculum PDF at ${pdfUrl}, generate educational strands for this subject. 
    Each strand should have:
    - name: A clear, descriptive name
    - description: A brief description of what the strand covers
    
    Return the response as a JSON array of objects with 'name' and 'description' fields.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse the JSON response
    let strandsData;
    try {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : text;
      strandsData = JSON.parse(jsonText);
    } catch (parseError) {
      // If parsing fails, create a default structure
      console.warn('Failed to parse AI response, using fallback');
      strandsData = [
        { name: 'Strand 1', description: 'Generated from curriculum' },
        { name: 'Strand 2', description: 'Generated from curriculum' }
      ];
    }

    // Map to the expected format
    return strandsData.map(strand => ({
      name: strand.name,
      description: strand.description || '',
      subjectId,
      curriculumDesignId,
      isAIGenerated: true
    }));
  } catch (error) {
    console.error('Error generating strands from PDF:', error);
    throw new Error('Failed to generate strands from PDF');
  }
};

/**
 * Generate lessons from a strand using Gemini AI
 */
export const generateLessonsFromStrand = async (strandId, subjectId) => {
  try {
    const model = getModel();
    
    // Get the strand to understand what to generate
    const strand = await Strand.findById(strandId);
    if (!strand) {
      throw new Error('Strand not found');
    }

    const prompt = `Based on the strand "${strand.name}" with description "${strand.description}", 
    generate educational lessons. Each lesson should have:
    - title: A clear, engaging title
    - description: A brief description
    - contentType: One of 'video', 'interactive', or 'reading'
    - difficulty: One of 'beginner', 'intermediate', or 'advanced'
    - tags: Array of relevant tags
    - duration: Estimated duration in minutes
    - content: Detailed markdown content for the lesson
    - learningObjectives: Array of learning objectives
    - keyConcepts: Array of key concepts covered
    - examples: Array of examples
    - summary: A summary of the lesson
    
    Return the response as a JSON array of lesson objects.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse the JSON response
    let lessonsData;
    try {
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : text;
      lessonsData = JSON.parse(jsonText);
    } catch (parseError) {
      console.warn('Failed to parse AI response, using fallback');
      lessonsData = [
        {
          title: 'Introduction to ' + strand.name,
          description: 'An introductory lesson',
          contentType: 'reading',
          difficulty: 'beginner',
          tags: [],
          duration: 30,
          content: '# Introduction\n\nContent here',
          learningObjectives: [],
          keyConcepts: [],
          examples: [],
          summary: 'Summary here'
        }
      ];
    }

    // Map to the expected format
    return lessonsData.map(lesson => ({
      title: lesson.title,
      description: lesson.description || '',
      strandId,
      subjectId,
      grade: '11', // TODO: Get from strand/subject
      contentType: lesson.contentType || 'reading',
      difficulty: lesson.difficulty || 'beginner',
      tags: lesson.tags || [],
      duration: lesson.duration || 30,
      content: lesson.content || '',
      learningObjectives: lesson.learningObjectives || [],
      keyConcepts: lesson.keyConcepts || [],
      examples: lesson.examples || [],
      summary: lesson.summary || '',
      isAIGenerated: true,
      status: 'pending'
    }));
  } catch (error) {
    console.error('Error generating lessons from strand:', error);
    throw new Error('Failed to generate lessons from strand');
  }
};

