/**
 * Seed a second subject/grade for a fuller generation sample.
 */
import 'dotenv/config';
import { getDbClient } from '../config/supabase.js';
import { Subject } from '../models/Subject.js';
import { Strand } from '../models/Strand.js';
import { SubStrand } from '../models/SubStrand.js';

const db = getDbClient();

let { data: design } = await db
  .from('curriculum_designs')
  .select('*')
  .eq('grade', '5')
  .eq('subject_name', 'English')
  .maybeSingle();

if (!design) {
  const { data, error } = await db
    .from('curriculum_designs')
    .insert({
      grade: '5',
      subject_name: 'English',
      name: 'Grade5_English_Curriculum Design',
      disciplines: ['English']
    })
    .select()
    .single();
  if (error) throw error;
  design = data;
}

let subjects = await Subject.findByGrade('5');
let subject = subjects.find((s) => s.name === 'English' && s.curriculumDesignId === design.id);
if (!subject) {
  subject = await Subject.create({
    name: 'English',
    description: 'Grade 5 English (seed for quiz quality E2E #2)',
    curriculumDesignId: design.id,
    grade: '5',
    icon: 'book',
    color: '#059669'
  });
}

let strands = await Strand.findBySubject(subject.id);
let strand = strands.find((s) => s.name === 'Reading');
if (!strand) {
  strand = await Strand.create({
    name: 'Reading',
    description: 'Comprehension and vocabulary',
    subjectId: subject.id,
    theme: 'Literacy',
    isAIGenerated: false
  });
}

let subStrands = await SubStrand.findByStrand(strand.id);
let subStrand = subStrands.find((s) => s.name === 'Main idea');
if (!subStrand) {
  subStrand = await SubStrand.create({
    name: 'Main idea',
    description: 'Identify the main idea and supporting details in short passages',
    strandId: strand.id,
    subjectId: subject.id,
    learningOutcomes: [
      'Identify the main idea of a short informational passage',
      'Select supporting details that best explain the main idea'
    ],
    keyInquiryQuestions: [
      'What is this passage mostly about?',
      'Which detail supports the main idea?'
    ],
    isAIGenerated: false
  });
}

console.log(JSON.stringify({ subjectId: subject.id, strandId: strand.id, subStrandId: subStrand.id }, null, 2));
