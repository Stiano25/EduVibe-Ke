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

const prompt = `You are creating SUBJECT-AWARE, INTERACTIVE LEARNING LESSONS for ${ageGroup} (Grade ${grade}).  
The goal is REAL LEARNING: knowledge, practical skill, and thinking ability — not just fun quizzes.

Lessons must help learners:
- Understand concepts
- Apply knowledge
- Think logically
- Improve skills in the way each subject is naturally learned

Context:
- Grade: ${grade} (${ageGroup})
- Subject: ${subject.name}
- Strand: ${strand.name}
${strand.theme ? `- Theme: ${strand.theme}` : ''}
- Sub-strand: ${subStrand.name}
- Description: ${subStrand.description || 'N/A'}

Learning Outcomes:
${subStrand.learningOutcomes.map((o, i) => `${i + 1}. ${o}`).join('\n')}

Key Inquiry Questions:
${subStrand.keyInquiryQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

────────────────────────────
SUBJECT-SPECIFIC CONTENT STYLE (MUST FOLLOW)
────────────────────────────

📐 MATHEMATICS:
- Content must be "Worked Examples + Mini Notes"
- NO stories
- Include 2–3 worked examples with step-by-step workings
- Then include 2 quick practice prompts (not graded)
- Focus on numbers, operations, patterns, time, money, measurement
- At least 7/10 quiz questions must be calculations
- Explanations must show working in steps

🗣 LANGUAGES (French, English, Kiswahili, etc.):
- Content must be "Comprehension + Vocabulary + Sentence Use"
- Include:
  - 1 short comprehension passage OR dialogue (6–10 lines)
  - 6–10 new vocabulary words/phrases with simple meanings
  - 2 usage tips (best ways to say things)
- Use cloze-test style questions (with and without options)
- Focus on correct phrasing, sentence structure, vocabulary growth

🔬 SCIENCE:
- Content must be scenario-based
- Use real-life situations (weather, plants, body, home, school)
- Focus on cause → effect and “why” reasoning
- Encourage observation and explanation

🌍 SOCIAL STUDIES:
- Content must be story or real-life scenario
- May include history-related short story
- Focus on people, systems, roles, decisions, society

✝️ RELIGIOUS EDUCATION:
- Content must use short Bible/Quran text or moral story
- Focus on meaning, values, lessons, interpretation

🎨 ART / MUSIC / PHE:
- Content must be practical and skill-based
- Include activity-style guidance (what to do, how to do)
- Include knowledge of real people in the field (artists, musicians, athletes)

────────────────────────────
THINKING SKILLS REQUIREMENT
────────────────────────────

Each lesson must build:
- Recall
- Understanding
- Application
- Reasoning

At least 3 questions must be real-life or best-choice reasoning.

────────────────────────────
QUIZ STRUCTURE
────────────────────────────

Generate EXACTLY 10 multiple choice questions.

Difficulty is about THINKING LEVEL:
- easy = recall
- intermediate = apply
- advanced = reasoning

Distribution:
- 4 easy
- 4 intermediate
- 2 advanced

Each question must include:
- question
- type: "multiple-choice"
- options (3–4)
- correctAnswerIndex
- explanation (short, meaningful)
- optionExplanations (why each is right/wrong)
- feedbackCorrect
- feedbackIncorrect
- difficulty
- points (10–20)

────────────────────────────
STYLE RULES
────────────────────────────

- Use age-appropriate language
- Introduce correct academic terms but explain simply
- No long paragraphs
- No textbook tone
- No trick questions
- Make learning feel structured and purposeful

────────────────────────────
LESSON STRUCTURE
────────────────────────────

Each lesson must include:
- title
- description
- contentType: "interactive"
- difficulty
- content (based on subject style above)
- tags
- duration (10–15)
- quiz (object defined above)

IMPORTANT CONTENT FORMAT RULE:
- The "content" field MUST be PLAIN TEXT ONLY.
- Do NOT use any markdown (no # headings, no **bold**, no bullet lists, no tables).
- Do NOT use LaTeX or math delimiters (no $...$, no \\( ... \\), no \\[ ... \\]).
- Write any maths and symbols as simple readable text, e.g. "A plus B equals C" or "A + B = C".
- Do NOT include emojis or special decorative icons.

Return ONLY valid JSON (no markdown, no extra text) as an array with ${numberOfLessons} lessons.

[
  {
    "title": "Lesson Title",
    "description": "Exciting short description",
    "contentType": "interactive",
    "difficulty": "beginner",
    "content": "Subject-style content here",
    "tags": ["practice"],
    "duration": 12,
    "quiz": {
      "title": "Quiz Challenge",
      "questions": [
        {
          "question": "Question text?",
          "type": "multiple-choice",
          "options": ["A", "B", "C"],
          "correctAnswerIndex": 0,
          "explanation": "Why it is correct.",
          "optionExplanations": ["A reason", "B reason", "C reason"],
          "feedbackCorrect": "Great!",
          "feedbackIncorrect": "Try again!",
          "difficulty": "easy",
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
        content: `${subStrand.name} - Content here...`,
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

    // Ensure content is plain text (no markdown/LaTeX/emojis) as a safety net
    const sanitizeContent = (content = '') => {
      return content
        // Remove common markdown heading/emphasis markers
        .replace(/[#*_`]+/g, '')
        // Remove LaTeX math delimiters
        .replace(/\$+/g, '')
        // Strip a few common emoji/decoration characters that often appear in prompts
        .replace(/[📐🗣🔬🌍✝️🎨🎵🔥⭐✅❌]/g, '')
        .trim();
    };

    // Map to expected format
    return lessonsData.map((lesson, index) => ({
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
      content: sanitizeContent(lesson.content || ''),
      learningObjectives: lesson.learningObjectives || [],
      keyConcepts: lesson.keyConcepts || [],
      examples: lesson.examples || [],
      summary: lesson.summary || '',
      isAIGenerated: true,
      status: 'pending',
      lessonOrder: lesson.lessonOrder ?? index + 1,
      quiz: lesson.quiz // Include quiz if present
    }));
  } catch (error) {
    console.error('Error generating lessons from sub-strand:', error);
    throw error;
  }
};

