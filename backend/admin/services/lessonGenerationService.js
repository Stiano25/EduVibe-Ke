import { getModel } from '../../config/gemini.js';
import { SubStrand } from '../../models/SubStrand.js';
import { Strand } from '../../models/Strand.js';
import { Subject } from '../../models/Subject.js';

/**
 * Generate lessons from a sub-strand using Gemini AI
 * Uses learning outcomes and key inquiry questions from the sub-strand
 */
export const generateLessonsFromSubStrand = async (subStrandId, numberOfLessons = 5) => {
  try {
    if (numberOfLessons > 5) {
      throw new Error('Maximum 5 lessons can be generated at a time');
    }

    const model = getModel();
    
    // Get sub-strand with all its data
    const subStrand = await SubStrand.findById(subStrandId);
    if (!subStrand) {
      throw new Error('Sub-strand not found');
    }

    // Get strand to get theme
    const strand = await Strand.findById(subStrand.strandId);
    if (!strand) {
      throw new Error('Strand not found');
    }

    // Get subject to get grade
    const subject = await Subject.findById(subStrand.subjectId);
    if (!subject) {
      throw new Error('Subject not found');
    }

    const grade = subject.grade;
    const gradeNumber = grade === 'K' ? 0 : parseInt(grade);
    const ageGroup = gradeNumber <= 2 ? 'very young children (ages 5-7)' : 
                     gradeNumber <= 5 ? 'young children (ages 8-10)' :
                     gradeNumber <= 8 ? 'pre-teens (ages 11-13)' : 'teens (ages 14+)';

    const prompt = `You are creating FUN QUIZ CHALLENGE LESSONS for ${ageGroup} (Grade ${grade}). These are NOT theory sessions - they are interactive, engaging quiz challenges that kids will enjoy!

Context:
- Grade: ${grade} (${ageGroup})
- Subject: ${subject.name}
- Strand: ${strand.name}
${strand.theme ? `- Theme: ${strand.theme}` : ''}
- Sub-strand: ${subStrand.name}
- Description: ${subStrand.description || 'N/A'}

Learning Outcomes:
${subStrand.learningOutcomes.map((outcome, i) => `${i + 1}. ${outcome}`).join('\n')}

Key Inquiry Questions:
${subStrand.keyInquiryQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

CRITICAL REQUIREMENTS FOR KID-FRIENDLY QUIZ LESSONS:
1. LANGUAGE: Use SIMPLE, EASY words that ${ageGroup} can understand. NO hard or complex words!
2. FORMAT: This is a FUN QUIZ CHALLENGE, not a boring theory lesson. Make it exciting and interactive!
3. CONTENT TYPE: Always use 'interactive' - these are quiz-based lessons
4. QUESTIONS: Generate EXACTLY 10 multiple choice questions per lesson, covering ALL difficulty bands:
   - Include difficulty per question: one of "easy", "intermediate", "advanced" (balanced mix)
   - Simple, clear question text
   - 3-4 simple answer options (use easy words!)
   - Simple examples that kids can relate to (real-life examples)
   - Provide BOTH feedbackCorrect and feedbackIncorrect with encouraging tone
5. HIGHLIGHTING EXERCISES: Include a short paragraph (2-3 sentences) in the content that kids can highlight key words or phrases from. Make it simple and fun!
6. TONE: Make it fun, encouraging, and age-appropriate. Use emojis sparingly if it helps engagement.
7. EXAMPLES: Use simple, relatable examples that kids understand (toys, animals, games, friends, family, etc.)

Each lesson must have:
- title: Fun, engaging title (keep it simple!)
- description: Brief, exciting description that makes kids want to play
- contentType: "interactive" (always)
- difficulty: Match the grade level appropriately
- content: A short, simple introduction paragraph (2-3 sentences) followed by a highlighting exercise paragraph. Keep it VERY simple!
- tags: Simple, relevant tags
- duration: 10-15 minutes (short and focused)
- quiz: Object with:
  - title: Fun quiz title
  - questions: Array of EXACTLY 10 multiple choice questions, each with:
    - question: Simple question text (use easy words!)
    - type: "multiple-choice"
    - options: Array of 3-4 simple options (use easy words!)
    - correctAnswerIndex: Index (0-based) of correct answer
    - explanation: Simple, encouraging overall explanation for the question
    - optionExplanations: Array of explanations, one per option, explaining:
        * why the correct option IS correct
        * why each incorrect option is NOT correct
      (Use kid-friendly language and real-life examples)
    - feedbackCorrect: A short congratulatory message with real-life example
    - feedbackIncorrect: A short corrective message with real-life example
    - difficulty: "easy" | "intermediate" | "advanced" (balanced across the 10)
    - points: 10-20 points per question
  - passingScore: 60-70 (encouraging for kids)
  - timeLimit: 10-15 minutes

IMPORTANT: 
- NO complex vocabulary
- NO long explanations
- Make it FUN and GAME-LIKE
- Kids will check their results after completing the quiz
- Each question should feel like a fun challenge, not a test

Return as JSON array with ${numberOfLessons} lessons:
[
  {
    "title": "Fun, simple title",
    "description": "Exciting, simple description",
    "contentType": "interactive",
    "difficulty": "beginner",
    "content": "A short simple intro (2-3 sentences).\\n\\nThen a paragraph for highlighting exercise (2-3 sentences with key words kids can highlight).",
    "tags": ["simple", "fun", "quiz"],
    "duration": 12,
    "quiz": {
      "title": "Fun Quiz Challenge",
      "questions": [
        {
          "question": "Simple question?",
          "type": "multiple-choice",
          "options": ["Simple option A", "Simple option B", "Simple option C"],
          "correctAnswerIndex": 0,
          "explanation": "Simple, encouraging explanation",
          "points": 15
        }
      ],
      "passingScore": 65,
      "timeLimit": 12
    }
  }
]`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    let lessonsData;
    try {
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonText = jsonMatch ? jsonMatch[1] : text;
      lessonsData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      // Fallback: create basic lesson structure
      lessonsData = Array.from({ length: numberOfLessons }, (_, i) => ({
        title: `Lesson ${i + 1}: ${subStrand.name}`,
        description: `A lesson about ${subStrand.name}`,
        contentType: 'reading',
        difficulty: 'beginner',
        content: `# ${subStrand.name}\n\nContent here...`,
        learningObjectives: subStrand.learningOutcomes.slice(0, 3),
        keyConcepts: [],
        examples: [],
        summary: 'Summary',
        tags: [],
        duration: 30,
        quiz: {
          questions: [],
          passingScore: 70,
          timeLimit: 15
        }
      }));
    }

    // Map to expected format
    return lessonsData.map(lesson => ({
      title: lesson.title,
      description: lesson.description || '',
      strandId: subStrand.strandId,
      subStrandId: subStrand.id,
      subjectId: subStrand.subjectId,
      grade: subject.grade,
      contentType: lesson.contentType || 'interactive',
      difficulty: lesson.difficulty || 'beginner',
      tags: lesson.tags || [],
      duration: lesson.duration || 30,
      content: lesson.content || '',
      learningObjectives: lesson.learningObjectives || [],
      keyConcepts: lesson.keyConcepts || [],
      examples: lesson.examples || [],
      summary: lesson.summary || '',
      isAIGenerated: true,
      status: 'pending',
      quiz: lesson.quiz // Include quiz if present
    }));
  } catch (error) {
    console.error('Error generating lessons from sub-strand:', error);
    throw error;
  }
};

