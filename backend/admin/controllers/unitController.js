import { Unit } from '../../models/CurriculumGraph.js';
import { PrerequisiteEdge } from '../../models/CurriculumGraph.js';
import { SubStrand } from '../../models/SubStrand.js';

export const getUnits = async (req, res) => {
  try {
    const { strandId, subjectId } = req.query || {};
    if (!strandId && !subjectId) {
      return res.status(400).json({ error: 'strandId or subjectId is required' });
    }
    const units = strandId
      ? await Unit.findByStrand(strandId)
      : await Unit.findBySubject(subjectId);
    res.json(units);
  } catch (error) {
    console.error('Error listing units:', error);
    res.status(500).json({ error: error.message || 'Failed to list units' });
  }
};

export const getPrerequisiteEdges = async (req, res) => {
  try {
    const { edgeType } = req.query || {};
    const counts = await PrerequisiteEdge.countByType();
    const sample = await PrerequisiteEdge.list({ edgeType: edgeType || null, limit: 20 });
    res.json({ counts, sample });
  } catch (error) {
    console.error('Error listing prerequisite edges:', error);
    res.status(500).json({ error: error.message || 'Failed to list prerequisite edges' });
  }
};

export const getUnitsForStrandWithSubStrands = async (req, res) => {
  try {
    const strandId = req.params.strandId;
    const [units, subStrands] = await Promise.all([
      Unit.findByStrand(strandId),
      SubStrand.findByStrand(strandId)
    ]);
    const bySub = new Map(subStrands.map((ss) => [ss.id, ss]));
    res.json(
      units.map((unit) => ({
        ...unit,
        subStrand: bySub.get(unit.subStrandId) || null
      }))
    );
  } catch (error) {
    console.error('Error listing strand units:', error);
    res.status(500).json({ error: error.message || 'Failed to list units' });
  }
};
