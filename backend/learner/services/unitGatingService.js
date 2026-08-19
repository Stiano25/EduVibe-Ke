import { SubStrand } from '../../models/SubStrand.js';
import { Unit } from '../../models/CurriculumGraph.js';
import { getDbClient } from '../../config/supabase.js';
import { unlockFlagsForSequence } from '../../utils/lessonUnlock.js';

export const loadStrandUnitUnlock = async (userId, strandId) => {
  const subStrands = await SubStrand.findByStrand(strandId);
  const units = strandId ? await Unit.findByStrand(strandId) : [];
  const unitsBySubStrandId = new Map(units.map((unit) => [unit.subStrandId, unit]));
  if (subStrands.length === 0) {
    return {
      subStrands,
      flagsById: new Map(),
      lessonsBySub: new Map(),
      progressByLessonId: new Map(),
      units,
      unitsBySubStrandId
    };
  }

  const ids = subStrands.map((ss) => ss.id);
  const db = getDbClient();
  const { data: lessonRows, error: lessonError } = await db
    .from('lessons')
    .select('id, title, sub_strand_id, duration, lesson_order')
    .in('sub_strand_id', ids)
    .eq('status', 'approved');
  if (lessonError) throw lessonError;

  const lessonsBySub = new Map();
  for (const row of lessonRows || []) {
    if (!lessonsBySub.has(row.sub_strand_id)) lessonsBySub.set(row.sub_strand_id, []);
    lessonsBySub.get(row.sub_strand_id).push({
      id: row.id,
      title: row.title,
      lessonOrder: row.lesson_order,
      duration: row.duration,
      subStrandId: row.sub_strand_id
    });
  }

  const allLessonIds = (lessonRows || []).map((r) => r.id);
  const progressByLessonId = new Map();
  if (userId && allLessonIds.length > 0) {
    const { data: progressData, error: progressError } = await db
      .from('lesson_progress')
      .select('lesson_id, progress, completed')
      .eq('user_id', userId)
      .in('lesson_id', allLessonIds);
    if (progressError) throw progressError;
    for (const p of progressData || []) {
      progressByLessonId.set(p.lesson_id, p);
    }
  }

  const flags = unlockFlagsForSequence(subStrands, lessonsBySub, progressByLessonId);
  const flagsById = new Map(subStrands.map((ss, i) => [ss.id, flags[i]]));
  return { subStrands, flagsById, lessonsBySub, progressByLessonId, units, unitsBySubStrandId };
};
