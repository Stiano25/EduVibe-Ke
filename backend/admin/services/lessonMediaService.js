import { randomUUID } from 'crypto';
import { supabase, supabaseAdmin } from '../../config/supabase.js';
import { Lesson } from '../../models/Lesson.js';
import { outcomeKey } from '../../utils/outcomeKey.js';
import { renderVisualBriefToSvg } from './diagramService.js';
import { regenerateVisualBriefFromTopic } from './visualRegenerateService.js';

const BUCKET = 'lesson-media';
/** Teaching (2) + per-question visual bank (~6–12) */
const MAX_DIAGRAMS = 24;

const getStorage = () => {
  const storageClient = supabaseAdmin || supabase;
  if (!storageClient) throw new Error('Supabase storage not configured');
  return storageClient;
};

export const uploadLessonMediaBuffer = async (buffer, lessonId, contentType = 'image/svg+xml', ext = 'svg') => {
  const storageClient = getStorage();
  const path = `lessons/${lessonId}/${randomUUID()}.${ext}`;
  const { error } = await storageClient.storage.from(BUCKET).upload(path, buffer, {
    contentType,
    upsert: false
  });
  if (error) throw error;
  const { data: urlData } = storageClient.storage.from(BUCKET).getPublicUrl(path);
  return urlData.publicUrl;
};

const uploadLessonSvg = async (buffer, lessonId) =>
  uploadLessonMediaBuffer(buffer, lessonId, 'image/svg+xml', 'svg');

/** Preview SVG without uploading (admin review). */
export const previewEducationalDiagram = (briefObj = {}) => {
  const rendered = renderVisualBriefToSvg(briefObj);
  return {
    svg: rendered.svg,
    diagramType: rendered.diagramType,
    mimeType: rendered.mimeType
  };
};

const persistBriefsAndAssets = async (lesson, briefs, assets, imageUrls) => {
  const quiz = {
    ...(lesson.quiz || {}),
    visualBriefs: briefs,
    visualAssets: assets,
    contentBlocks: lesson.quiz?.contentBlocks || lesson.contentBlocks || []
  };
  return Lesson.update(lesson.id, {
    images: imageUrls,
    quiz,
    visualBriefs: briefs,
    contentBlocks: quiz.contentBlocks
  });
};

/**
 * Render visual briefs as SVG diagrams into Supabase Storage and attach URLs.
 * Keeps admin-uploaded assets (source=upload) instead of re-templating them.
 */
export const attachEducationalVisuals = async (lessonId, { force = true } = {}) => {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) throw new Error('Lesson not found');

  const allBriefs = lesson.visualBriefs || [];
  const briefs = allBriefs.slice(0, MAX_DIAGRAMS);
  if (briefs.length === 0) {
    return lesson;
  }

  const existingById = new Map(
    (lesson.visualAssets || []).filter((a) => a?.id).map((a) => [a.id, a])
  );

  if (
    !force &&
    lesson.images?.length > 0 &&
    lesson.visualAssets?.length > 0 &&
    lesson.visualAssets.length >= briefs.length
  ) {
    return lesson;
  }

  const assets = [];
  const imageUrls = [];

  for (const brief of briefs) {
    try {
      if ((brief.source === 'upload' || brief.customUrl) && (brief.customUrl || existingById.get(brief.id)?.url)) {
        const url = brief.customUrl || existingById.get(brief.id)?.url;
        imageUrls.push(url);
        assets.push({
          id: brief.id || null,
          url,
          skillFocus: brief.skillFocus,
          outcomeKey: brief.outcomeKey || outcomeKey(brief.skillFocus || brief.brief),
          alt: brief.brief || brief.skillFocus || 'Educational diagram',
          brief: brief.brief,
          diagramType: brief.diagramType || 'custom',
          attribution: 'Admin upload',
          source: 'upload',
          scope: brief.scope || (String(brief.id || '').startsWith('qvb-') ? 'question' : 'teaching'),
          questionId: brief.questionId || null
        });
        continue;
      }

      const rendered = renderVisualBriefToSvg(brief);
      const url = await uploadLessonSvg(rendered.buffer, lessonId);
      imageUrls.push(url);
      assets.push({
        id: brief.id || null,
        url,
        skillFocus: brief.skillFocus,
        outcomeKey: brief.outcomeKey || outcomeKey(brief.skillFocus || brief.brief),
        alt: brief.brief || brief.skillFocus || 'Educational diagram',
        brief: brief.brief,
        diagramType: rendered.diagramType,
        attribution: 'EduVibe SVG template',
        source: 'template',
        scope: brief.scope || (String(brief.id || '').startsWith('qvb-') ? 'question' : 'teaching'),
        questionId: brief.questionId || null
      });
    } catch (err) {
      console.error('SVG render failed for brief:', brief.skillFocus, err.message || err);
    }
  }

  if (assets.length === 0) {
    return lesson;
  }

  return persistBriefsAndAssets(lesson, allBriefs, assets, imageUrls);
};

/** Regenerate one brief's diagramType/params from topic context (template path). */
export const regenerateLessonVisualBrief = async (lessonId, briefId, { instruction, preferredType } = {}) => {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) throw new Error('Lesson not found');

  const briefs = [...(lesson.visualBriefs || [])];
  const idx = briefs.findIndex((b) => b.id === briefId);
  if (idx < 0) throw new Error('Visual brief not found');

  const current = briefs[idx];
  const generated = await regenerateVisualBriefFromTopic({
    brief: current.brief,
    skillFocus: current.skillFocus,
    lessonTitle: lesson.title,
    contentSnippet: lesson.content,
    preferredType: preferredType || current.diagramType,
    instruction
  });

  briefs[idx] = {
    ...current,
    ...generated,
    id: current.id,
    scope: current.scope,
    questionId: current.questionId,
    source: 'template',
    customUrl: undefined
  };

  // Drop uploaded asset for this brief so approve re-renders template
  const assets = (lesson.visualAssets || []).filter((a) => a.id !== briefId);
  const updated = await persistBriefsAndAssets(lesson, briefs, assets, assets.map((a) => a.url));
  return {
    lesson: updated,
    brief: briefs[idx]
  };
};

/** Attach an admin-uploaded image/SVG as the figure for one brief. */
export const uploadCustomLessonVisual = async (lessonId, briefId, file) => {
  const lesson = await Lesson.findById(lessonId);
  if (!lesson) throw new Error('Lesson not found');
  if (!file?.buffer) throw new Error('No file uploaded');

  const briefs = [...(lesson.visualBriefs || [])];
  const idx = briefs.findIndex((b) => b.id === briefId);
  if (idx < 0) throw new Error('Visual brief not found');

  const mime = file.mimetype || 'image/png';
  const ext = mime.includes('svg')
    ? 'svg'
    : mime.includes('jpeg') || mime.includes('jpg')
      ? 'jpg'
      : mime.includes('webp')
        ? 'webp'
        : 'png';

  const url = await uploadLessonMediaBuffer(file.buffer, lessonId, mime, ext);
  briefs[idx] = {
    ...briefs[idx],
    source: 'upload',
    customUrl: url,
    diagramType: briefs[idx].diagramType || 'custom'
  };

  const assets = [...(lesson.visualAssets || []).filter((a) => a.id !== briefId)];
  assets.push({
    id: briefId,
    url,
    skillFocus: briefs[idx].skillFocus,
    outcomeKey: briefs[idx].outcomeKey || outcomeKey(briefs[idx].skillFocus || briefs[idx].brief),
    alt: briefs[idx].brief || 'Custom diagram',
    brief: briefs[idx].brief,
    diagramType: 'custom',
    attribution: 'Admin upload',
    source: 'upload',
    scope: briefs[idx].scope,
    questionId: briefs[idx].questionId || null
  });

  const updated = await persistBriefsAndAssets(
    lesson,
    briefs,
    assets,
    assets.map((a) => a.url)
  );
  return { lesson: updated, brief: briefs[idx], url };
};
