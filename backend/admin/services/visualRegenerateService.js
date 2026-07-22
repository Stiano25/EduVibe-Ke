import { getModel } from '../../config/gemini.js';
import { DIAGRAM_TYPES } from './diagramTemplates.js';
import { inferDiagramType } from './diagramService.js';

const TYPE_LIST = [...DIAGRAM_TYPES].join('|');

/**
 * Ask Gemini to pick diagramType + params for a topic/brief.
 * Admin can then preview, save, regenerate again, or upload a custom figure.
 */
export const regenerateVisualBriefFromTopic = async ({
  brief = '',
  skillFocus = '',
  lessonTitle = '',
  contentSnippet = '',
  preferredType = null,
  instruction = ''
} = {}) => {
  const inferred = preferredType && DIAGRAM_TYPES.has(preferredType)
    ? preferredType
    : inferDiagramType(`${brief} ${skillFocus} ${lessonTitle}`, skillFocus);

  const model = getModel({ maxOutputTokens: 2048, temperature: 0.4 });
  const prompt = `You design ONE educational diagram for a Kenyan CBC lesson.

Lesson: ${lessonTitle || 'N/A'}
Skill: ${skillFocus || 'N/A'}
Current brief: ${brief || 'N/A'}
Teaching snippet: ${String(contentSnippet || '').slice(0, 400)}
Preferred type hint: ${inferred}
Admin note: ${instruction || 'Make the figure accurate for this topic.'}

Choose diagramType from ONLY: ${TYPE_LIST}
Guidance:
- trigonometry / sin cos tan / SOHCAHTOA → right_triangle (angleDeg, opposite, adjacent, hypotenuse)
- unit circle / radians / special angles → unit_circle (angleDeg)
- gradients / lines → coordinate_plane (lines:[{m,c,label}])
- matrices → matrix (values:[[...]])
- indices / powers → indices (base, exponent)
- counting objects → counting_circles (count)
- fractions → fraction_bars
If nothing fits, use labeled_boxes with clear labels.

Return ONLY JSON:
{
  "diagramType": "...",
  "brief": "one short accurate description",
  "skillFocus": "...",
  "params": { }
}`;

  const result = await model.generateContent(prompt);
  const text = (await result.response).text();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Could not parse regenerated diagram JSON');
  const data = JSON.parse(match[0]);
  let diagramType = String(data.diagramType || '').trim();
  if (!DIAGRAM_TYPES.has(diagramType)) {
    diagramType = inferred;
  }
  return {
    diagramType,
    brief: String(data.brief || brief || `${diagramType} diagram`).slice(0, 240),
    skillFocus: String(data.skillFocus || skillFocus || 'concept').slice(0, 120),
    params: data.params && typeof data.params === 'object' ? data.params : {},
    source: 'template'
  };
};
