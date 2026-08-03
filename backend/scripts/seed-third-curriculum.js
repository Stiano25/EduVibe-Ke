/** Grade 3 Science seed for a post-difficulty-fix generation sample. */
import 'dotenv/config';
import { getDbClient } from '../config/supabase.js';
import { Subject } from '../models/Subject.js';
import { Strand } from '../models/Strand.js';
import { SubStrand } from '../models/SubStrand.js';

const db = getDbClient();
let { data: design } = await db
  .from('curriculum_designs')
  .select('*')
  .eq('grade', '3')
  .eq('subject_name', 'Science')
  .maybeSingle();

if (!design) {
  const { data, error } = await db
    .from('curriculum_designs')
    .insert({
      grade: '3',
      subject_name: 'Science',
      name: 'Grade3_Science_Curriculum Design',
      disciplines: ['Science']
    })
    .select()
    .single();
  if (error) throw error;
  design = data;
}

let subjects = await Subject.findByGrade('3');
let subject = subjects.find((s) => s.name === 'Science' && s.curriculumDesignId === design.id);
if (!subject) {
  subject = await Subject.create({
    name: 'Science',
    description: 'Grade 3 Science (difficulty-normalization E2E)',
    curriculumDesignId: design.id,
    grade: '3',
    icon: 'flask',
    color: '#0d9488'
  });
}

let strands = await Strand.findBySubject(subject.id);
let strand = strands.find((s) => s.name === 'Plants');
if (!strand) {
  strand = await Strand.create({
    name: 'Plants',
    description: 'Parts of a plant and their functions',
    subjectId: subject.id,
    theme: 'Living things',
    isAIGenerated: false
  });
}

let subStrands = await SubStrand.findByStrand(strand.id);
let subStrand = subStrands.find((s) => s.name === 'Plant parts');
if (!subStrand) {
  subStrand = await SubStrand.create({
    name: 'Plant parts',
    description: 'Name plant parts and explain what each part does',
    strandId: strand.id,
    subjectId: subject.id,
    learningOutcomes: [
      'Name the main parts of a flowering plant',
      'Explain the function of roots, stem, leaves and flowers'
    ],
    keyInquiryQuestions: [
      'What are the main parts of a plant?',
      'How do roots help a plant survive?'
    ],
    isAIGenerated: false
  });
}

console.log(subStrand.id);
