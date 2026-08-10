import { Lesson } from '../../models/Lesson.js';
import {
  generateLessonsFromSubStrand,
  topUpLessonQuizBank
} from '../services/lessonGenerationService.js';
import { runWithGenerationUsage } from '../../providers/contentProvider.js';
import {
  attachEducationalVisuals,
  previewEducationalDiagram,
  regenerateLessonVisualBrief,
  uploadCustomLessonVisual
} from '../services/lessonMediaService.js';
import multer from 'multer';

const visualUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(png|jpeg|jpg|webp|svg\+xml)$/i.test(file.mimetype);
    cb(ok ? null : new Error('Only PNG, JPG, WEBP, or SVG images allowed'), ok);
  }
});

export const visualUploadMiddleware = visualUpload.single('file');

export const createLesson = async (req, res) => {
  try {
    const lesson = await Lesson.create(req.body);
    res.status(201).json(lesson);
  } catch (error) {
    console.error('Error creating lesson:', error);
    res.status(500).json({ error: 'Failed to create lesson' });
  }
};

export const createAIGeneratedLessons = async (req, res) => {
  try {
    const { subStrandId, numberOfLessons = 2 } = req.body;
    const stream =
      req.query.stream === '1' ||
      String(req.headers.accept || '').includes('text/event-stream');

    if (!subStrandId) {
      return res.status(400).json({ error: 'Sub-strand ID is required' });
    }

    if (numberOfLessons > 5) {
      return res.status(400).json({ error: 'Maximum 5 lessons can be generated at a time' });
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      const send = (payload) => {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      };

      try {
        send({ type: 'progress', percent: 2, message: 'Starting…' });
        const { result: generatedLessons, usage } = await runWithGenerationUsage(() =>
          generateLessonsFromSubStrand(
            subStrandId,
            numberOfLessons,
            ({ percent, message }) => send({ type: 'progress', percent, message })
          )
        );
        send({ type: 'progress', percent: 96, message: 'Saving lessons…' });
        const lessons = await Lesson.createMany(generatedLessons);
        send({
          type: 'done',
          percent: 100,
          message: 'Done',
          lessons,
          usage
        });
      } catch (error) {
        console.error('Error generating AI lessons (stream):', error);
        send({
          type: 'error',
          percent: 100,
          message: error.message || 'Failed to generate AI lessons'
        });
      }
      return res.end();
    }

    const { result: generatedLessons, usage } = await runWithGenerationUsage(() =>
      generateLessonsFromSubStrand(subStrandId, numberOfLessons)
    );
    const lessons = await Lesson.createMany(generatedLessons);

    res.setHeader('X-Generation-Calls', String(usage.calls));
    res.setHeader('X-Generation-Input-Tokens', String(usage.inputTokens));
    res.setHeader('X-Generation-Output-Tokens', String(usage.outputTokens));
    res.status(201).json(lessons);
  } catch (error) {
    console.error('Error generating AI lessons:', error);
    res.status(500).json({ error: error.message || 'Failed to generate AI lessons' });
  }
};

export const getAllLessons = async (req, res) => {
  try {
    const lessons = await Lesson.findAll();
    res.json(lessons);
  } catch (error) {
    console.error('Error fetching lessons:', error);
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
};

export const getLessonById = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }
    res.json(lesson);
  } catch (error) {
    console.error('Error fetching lesson:', error);
    res.status(500).json({ error: 'Failed to fetch lesson' });
  }
};

export const getLessonsByStrand = async (req, res) => {
  try {
    const lessons = await Lesson.findByStrand(req.params.strandId);
    res.json(lessons);
  } catch (error) {
    console.error('Error fetching lessons by strand:', error);
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
};

export const getLessonsBySubStrand = async (req, res) => {
  try {
    const lessons = await Lesson.findBySubStrand(req.params.subStrandId);
    res.json(lessons);
  } catch (error) {
    console.error('Error fetching lessons by sub-strand:', error);
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
};

export const getLessonsBySubject = async (req, res) => {
  try {
    const lessons = await Lesson.findBySubject(req.params.subjectId);
    res.json(lessons);
  } catch (error) {
    console.error('Error fetching lessons by subject:', error);
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
};

export const getLessonsByStatus = async (req, res) => {
  try {
    const lessons = await Lesson.findByStatus(req.params.status);
    res.json(lessons);
  } catch (error) {
    console.error('Error fetching lessons by status:', error);
    res.status(500).json({ error: 'Failed to fetch lessons' });
  }
};

export const updateLesson = async (req, res) => {
  try {
    const lesson = await Lesson.update(req.params.id, req.body);
    res.json(lesson);
  } catch (error) {
    console.error('Error updating lesson:', error);
    res.status(500).json({ error: 'Failed to update lesson' });
  }
};

/** Preview an SVG diagram from a visual brief (no upload). */
export const previewDiagram = async (req, res) => {
  try {
    const preview = previewEducationalDiagram(req.body || {});
    res.json(preview);
  } catch (error) {
    console.error('Error previewing diagram:', error);
    res.status(400).json({ error: error.message || 'Failed to preview diagram' });
  }
};

/** Ask AI to redesign one figure for this topic (admin can then preview/save/approve). */
export const regenerateDiagram = async (req, res) => {
  try {
    const { instruction, preferredType } = req.body || {};
    const result = await regenerateLessonVisualBrief(req.params.id, req.params.briefId, {
      instruction,
      preferredType
    });
    res.json(result);
  } catch (error) {
    console.error('Error regenerating diagram:', error);
    res.status(400).json({ error: error.message || 'Failed to regenerate diagram' });
  }
};

/** Admin uploads their own figure for a brief. */
export const uploadLessonVisual = async (req, res) => {
  try {
    const result = await uploadCustomLessonVisual(req.params.id, req.params.briefId, req.file);
    res.json(result);
  } catch (error) {
    console.error('Error uploading lesson visual:', error);
    res.status(400).json({ error: error.message || 'Failed to upload visual' });
  }
};

/** Save visual briefs / content blocks before approve; clears rendered images so approve re-renders. */
export const updateLessonVisuals = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);
    if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

    const { visualBriefs, contentBlocks } = req.body || {};
    const quiz = {
      ...(lesson.quiz || {}),
      visualAssets: []
    };
    if (Array.isArray(visualBriefs)) quiz.visualBriefs = visualBriefs;
    if (Array.isArray(contentBlocks)) quiz.contentBlocks = contentBlocks;

    const updated = await Lesson.update(req.params.id, {
      quiz,
      images: [],
      visualBriefs: quiz.visualBriefs,
      contentBlocks: quiz.contentBlocks
    });
    res.json(updated);
  } catch (error) {
    console.error('Error updating lesson visuals:', error);
    res.status(500).json({ error: 'Failed to update lesson visuals' });
  }
};

/** Top up an old/short quiz bank to full size without regenerating the lesson. */
export const topUpQuizBank = async (req, res) => {
  try {
    const result = await topUpLessonQuizBank(req.params.id);
    res.json({
      lesson: result.lesson,
      added: result.added,
      bankSize: result.bankSize,
      bankStats: result.bankStats
    });
  } catch (error) {
    console.error('Error topping up quiz bank:', error);
    res.status(400).json({ error: error.message || 'Failed to top up quiz bank' });
  }
};

export const approveLesson = async (req, res) => {
  try {
    let lesson = await Lesson.update(req.params.id, {
      status: 'approved',
      approvedAt: new Date().toISOString()
    });

    // Render SVGs from (possibly admin-edited) visual briefs
    try {
      lesson = await attachEducationalVisuals(req.params.id, { force: true });
    } catch (mediaError) {
      console.error('Lesson approved but visuals failed:', mediaError.message || mediaError);
      lesson = await Lesson.findById(req.params.id);
    }

    res.json(lesson);
  } catch (error) {
    console.error('Error approving lesson:', error);
    res.status(500).json({ error: 'Failed to approve lesson' });
  }
};

export const rejectLesson = async (req, res) => {
  try {
    const lesson = await Lesson.update(req.params.id, {
      status: 'rejected'
    });
    res.json(lesson);
  } catch (error) {
    console.error('Error rejecting lesson:', error);
    res.status(500).json({ error: 'Failed to reject lesson' });
  }
};

export const deleteLesson = async (req, res) => {
  try {
    await Lesson.delete(req.params.id);
    res.json({ message: 'Lesson deleted successfully' });
  } catch (error) {
    console.error('Error deleting lesson:', error);
    res.status(500).json({ error: 'Failed to delete lesson' });
  }
};

