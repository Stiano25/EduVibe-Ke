import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  coerceLabeledBoxesParams,
  renderProcessFlow
} from '../admin/services/diagramTemplates.js';
import { renderVisualBriefToSvg } from '../admin/services/diagramService.js';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const artifactPath = path.resolve(__dirname, '../../docs/first-claude-generation-g3-science.json');
const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
const briefs = artifact.lesson?.visualBriefs || artifact.lesson?.quiz?.visualBriefs || [];
const plantBrief = briefs.find((brief) => brief.id === 'vb-1');

assert(plantBrief, 'Grade 3 Science fixture must contain visual brief vb-1');
const plantSvg = renderVisualBriefToSvg(plantBrief).svg;
for (const label of ['Roots', 'Stem', 'Leaves']) {
  assert(plantSvg.includes(label), `vb-1 SVG must include ${label}`);
}
assert(/Flowers?/.test(plantSvg), 'vb-1 SVG must include Flower or Flowers');
assert(!plantSvg.includes('>Idea<'), 'vb-1 SVG must not render the placeholder Idea item');

const legacyBoxes = coerceLabeledBoxesParams({
  items: [{ label: 'Idea', text: '' }],
  boxes: [
    { label: 'Roots', detail: 'Absorb water and hold plant in soil' },
    { label: 'Stem', detail: 'Carries water and holds plant upright' },
    { label: 'Leaves', detail: 'Make food using sunlight' },
    { label: 'Flowers', detail: 'Make seeds for new plants' }
  ]
});
assert(
  legacyBoxes.items.length === 4 && legacyBoxes.items[3].label === 'Flowers',
  'legacy boxes/detail must override an empty Idea placeholder'
);

const boxesOnly = coerceLabeledBoxesParams({
  items: [{ label: 'Idea', text: 'Default skill focus' }],
  boxes: [
    { label: 'Addends', detail: 'Numbers being added' },
    { label: 'Sum', detail: 'The total' }
  ]
});
assert(
  boxesOnly.items.length === 2 &&
    boxesOnly.items[0].label === 'Addends' &&
    boxesOnly.items[1].text === 'The total',
  'real boxes must override the default labeled-box shell'
);

const longStep =
  'Observe the coloured water moving slowly through the celery stem until it reaches every leaf';
const processSvg = renderProcessFlow({
  title: 'Long process text',
  steps: [longStep, 'Record the final observation carefully']
});
for (const word of ['Observe', 'slowly', 'celery', 'reaches', 'every', 'leaf']) {
  assert(processSvg.includes(word), `process-flow SVG must preserve the word "${word}"`);
}

console.log('verify-diagram-rendering: OK', {
  plantLabels: ['Roots', 'Stem', 'Leaves', 'Flower(s)'],
  legacyBoxesLabels: legacyBoxes.items.map((item) => item.label),
  boxesOnlyLabels: boxesOnly.items.map((item) => item.label),
  longProcessPreserved: true
});
