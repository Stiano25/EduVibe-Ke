/**
 * Seed minimal CBC curriculum + admin for end-to-end lesson generation tests.
 * Safe to re-run: skips creating duplicates by name/email where practical.
 */
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { getDbClient } from '../config/supabase.js';
import { User } from '../models/User.js';
import { Subject } from '../models/Subject.js';
import { Strand } from '../models/Strand.js';
import { SubStrand } from '../models/SubStrand.js';

const ADMIN_EMAIL = 'admin@eduvibe.com';
const ADMIN_PASSWORD = 'password';

async function ensureAdmin() {
  const existing = await User.findByEmail(ADMIN_EMAIL, true);
  if (existing) {
    console.log('Admin exists:', existing.email, existing.role);
    return existing;
  }
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  const user = await User.create({
    name: 'Test Admin',
    email: ADMIN_EMAIL,
    role: 'admin',
    passwordHash
  });
  console.log('Created admin:', user.email);
  return user;
}

async function ensureCurriculum() {
  const db = getDbClient();

  // Curriculum design
  let { data: design } = await db
    .from('curriculum_designs')
    .select('*')
    .eq('grade', '4')
    .eq('subject_name', 'Mathematics')
    .maybeSingle();

  if (!design) {
    const { data, error } = await db
      .from('curriculum_designs')
      .insert({
        grade: '4',
        subject_name: 'Mathematics',
        name: 'Grade4_Mathematics_Curriculum Design',
        disciplines: ['Mathematics']
      })
      .select()
      .single();
    if (error) throw error;
    design = data;
    console.log('Created curriculum design:', design.id);
  } else {
    console.log('Curriculum design exists:', design.id);
  }

  // Subject
  let subjects = await Subject.findByGrade('4');
  let subject = subjects.find((s) => s.name === 'Mathematics' && s.curriculumDesignId === design.id);
  if (!subject) {
    subject = await Subject.create({
      name: 'Mathematics',
      description: 'Grade 4 Mathematics (seed for quiz quality E2E)',
      curriculumDesignId: design.id,
      grade: '4',
      icon: 'calculator',
      color: '#2563eb'
    });
    console.log('Created subject:', subject.id);
  } else {
    console.log('Subject exists:', subject.id);
  }

  // Strand
  let strands = await Strand.findBySubject(subject.id);
  let strand = strands.find((s) => s.name === 'Numbers');
  if (!strand) {
    strand = await Strand.create({
      name: 'Numbers',
      description: 'Whole numbers and place value',
      subjectId: subject.id,
      theme: 'Number',
      isAIGenerated: false
    });
    console.log('Created strand:', strand.id);
  } else {
    console.log('Strand exists:', strand.id);
  }

  // Sub-strand with two clear learning outcomes (coverage testing)
  let subStrands = await SubStrand.findByStrand(strand.id);
  let subStrand = subStrands.find((s) => s.name === 'Place value');
  if (!subStrand) {
    subStrand = await SubStrand.create({
      name: 'Place value',
      description: 'Read, write and compare numbers using place value up to 10 000',
      strandId: strand.id,
      subjectId: subject.id,
      learningOutcomes: [
        'Identify the place value of digits in numbers up to 10 000',
        'Compare and order whole numbers up to 10 000 using place value'
      ],
      keyInquiryQuestions: [
        'How does the position of a digit change its value?',
        'How can place value help us compare two numbers?'
      ],
      isAIGenerated: false
    });
    console.log('Created sub-strand:', subStrand.id);
  } else {
    console.log('Sub-strand exists:', subStrand.id);
  }

  return { design, subject, strand, subStrand };
}

const { subStrand } = await (async () => {
  await ensureAdmin();
  return ensureCurriculum();
})();

console.log('\nSeed complete.');
console.log('Admin login: admin@eduvibe.com / password');
console.log('subStrandId for generation:', subStrand.id);
