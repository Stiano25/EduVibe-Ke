import { getModel } from '../../config/gemini.js';
import { Strand } from '../../models/Strand.js';

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
    } catch {
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
    } catch {
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

/**
 * Find semantically similar lessons using AI
 */
export const findSimilarLessonsWithAI = async (currentLesson, candidateLessons) => {
  try {
    if (!candidateLessons?.length) return [];

    const model = getModel();
    const candidatesList = candidateLessons.map((lesson, index) => ({
      index,
      id: lesson.id,
      title: lesson.title,
      description: lesson.description || '',
      strandName: lesson.strandName || '',
      grade: lesson.grade
    }));

    const prompt = `You are an educational content matching system. Your task is to find lessons that are semantically related to the current lesson, even if they have different names.

Current Lesson:
- Title: "${currentLesson.title}"
- Description: "${currentLesson.description || ''}"
- Strand/Topic: "${currentLesson.strandName || ''}"
- Grade: ${currentLesson.grade}

Candidate Lessons from Lower Grades:
${JSON.stringify(candidatesList, null, 2)}

Analyze each candidate lesson and determine if it is semantically related to the current lesson. For example:
- "Polite language" is related to "Being polite", "Polite communication", "Polite expressions"
- "Fractions" is related to "Understanding fractions", "Working with fractions", "Fraction operations"
- "Photosynthesis" is related to "How plants make food", "Plant energy process"

Consider:
1. Semantic similarity (same or related concepts)
2. Educational relevance (would help a student understand the same topic)
3. Topic alignment (covers similar learning objectives)

Return ONLY a JSON array of the indices (0-based) of the lessons that are semantically related, ordered by relevance (most relevant first).
Maximum 3 lessons.

Example response format:
[2, 5, 8]

If no lessons are related, return an empty array: []`;

    const result = await model.generateContent(prompt);
    const text = (await result.response).text();

    let relatedIndices = [];
    try {
      let jsonText = text;
      const codeBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        jsonText = codeBlockMatch[1];
      } else {
        const arrayMatch = text.match(/\[[\d,\s]+\]/);
        if (arrayMatch) jsonText = arrayMatch[0];
      }

      relatedIndices = JSON.parse(jsonText.trim());
      if (!Array.isArray(relatedIndices)) relatedIndices = [];

      relatedIndices = relatedIndices
        .filter((idx) => typeof idx === 'number' && idx >= 0 && idx < candidateLessons.length)
        .slice(0, 3);
    } catch {
      relatedIndices = [0, 1, 2].filter((idx) => idx < candidateLessons.length);
    }

    const relatedLessons = relatedIndices
      .map((idx) => candidateLessons[idx])
      .filter(Boolean);

    if (relatedLessons.length === 0 && candidateLessons.length > 0) {
      return candidateLessons.slice(0, 3);
    }

    return relatedLessons;
  } catch (error) {
    console.error('Error finding similar lessons with AI:', error.message || error);
    return candidateLessons.slice(0, 3);
  }
};




