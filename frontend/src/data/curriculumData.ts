import { 
  Beaker, Sprout, Laptop, ChefHat, Palette, Paintbrush, Music2, Activity, Trophy, Film,
  Languages, BookText, GraduationCap, Briefcase, Users, MapPin, History, BookMarked,
  Bookmark, ScrollText, Microscope, FlaskConical, Atom, Zap, Plane, Ship, Tv, Hammer,
  Building2, Calculator, BookOpen
} from 'lucide-react'

export interface SubStrand {
  id: string
  name: string
}

export interface CurriculumSubject {
  id: string
  name: string
  icon: any
  color: string
  subStrands: SubStrand[]
}

export interface MainSubject {
  id: string
  name: string
  icon: any
  color: string
  curriculumSubjects: CurriculumSubject[]
}

export const curriculumData: MainSubject[] = [
  {
    id: 'applied-sciences',
    name: 'Applied Sciences',
    icon: Beaker,
    color: 'from-green-500 to-emerald-600',
    curriculumSubjects: [
      {
        id: 'agriculture',
        name: 'Agriculture',
        icon: Sprout,
        color: 'from-green-600 to-lime-600',
        subStrands: [
          { id: 'crop-production', name: 'Crop Production' },
          { id: 'livestock-production', name: 'Livestock Production' },
          { id: 'agricultural-economics', name: 'Agricultural Economics' },
          { id: 'soil-science', name: 'Soil Science' },
          { id: 'agricultural-extension', name: 'Agricultural Extension' },
        ]
      },
      {
        id: 'computer-studies',
        name: 'Computer Studies',
        icon: Laptop,
        color: 'from-blue-600 to-cyan-600',
        subStrands: [
          { id: 'programming', name: 'Programming' },
          { id: 'database-management', name: 'Database Management' },
          { id: 'networking', name: 'Networking' },
          { id: 'web-development', name: 'Web Development' },
          { id: 'computer-hardware', name: 'Computer Hardware' },
          { id: 'software-engineering', name: 'Software Engineering' },
        ]
      },
      {
        id: 'home-science',
        name: 'Home Science',
        icon: ChefHat,
        color: 'from-pink-600 to-rose-600',
        subStrands: [
          { id: 'food-nutrition', name: 'Food and Nutrition' },
          { id: 'clothing-textiles', name: 'Clothing and Textiles' },
          { id: 'home-management', name: 'Home Management' },
          { id: 'consumer-education', name: 'Consumer Education' },
        ]
      }
    ]
  },
  {
    id: 'arts-sports',
    name: 'Arts and Sports',
    icon: Palette,
    color: 'from-purple-500 to-violet-600',
    curriculumSubjects: [
      {
        id: 'fine-art',
        name: 'Fine Art',
        icon: Paintbrush,
        color: 'from-yellow-600 to-orange-600',
        subStrands: [
          { id: 'drawing', name: 'Drawing' },
          { id: 'painting', name: 'Painting' },
          { id: 'sculpture', name: 'Sculpture' },
          { id: 'art-history', name: 'Art History' },
        ]
      },
      {
        id: 'music-dance',
        name: 'Music and Dance',
        icon: Music2,
        color: 'from-purple-600 to-pink-600',
        subStrands: [
          { id: 'music-theory', name: 'Music Theory' },
          { id: 'performance', name: 'Performance' },
          { id: 'composition', name: 'Composition' },
          { id: 'dance-techniques', name: 'Dance Techniques' },
        ]
      },
      {
        id: 'phe',
        name: 'PHE',
        icon: Activity,
        color: 'from-red-600 to-orange-600',
        subStrands: [
          { id: 'physical-fitness', name: 'Physical Fitness' },
          { id: 'sports-skills', name: 'Sports Skills' },
          { id: 'health-education', name: 'Health Education' },
        ]
      },
      {
        id: 'sports-recreation',
        name: 'Sports and Recreation',
        icon: Trophy,
        color: 'from-amber-600 to-yellow-600',
        subStrands: [
          { id: 'team-sports', name: 'Team Sports' },
          { id: 'individual-sports', name: 'Individual Sports' },
          { id: 'recreation-activities', name: 'Recreation Activities' },
        ]
      },
      {
        id: 'theatre-film',
        name: 'Theatre and Film',
        icon: Film,
        color: 'from-indigo-600 to-purple-600',
        subStrands: [
          { id: 'acting', name: 'Acting' },
          { id: 'directing', name: 'Directing' },
          { id: 'scriptwriting', name: 'Scriptwriting' },
          { id: 'film-production', name: 'Film Production' },
        ]
      }
    ]
  },
  {
    id: 'foreign-language',
    name: 'Foreign Language',
    icon: Languages,
    color: 'from-teal-500 to-cyan-600',
    curriculumSubjects: [
      {
        id: 'arabic',
        name: 'Arabic',
        icon: BookText,
        color: 'from-emerald-600 to-teal-600',
        subStrands: [
          { id: 'arabic-grammar', name: 'Arabic Grammar' },
          { id: 'arabic-literature', name: 'Arabic Literature' },
          { id: 'arabic-conversation', name: 'Arabic Conversation' },
        ]
      },
      {
        id: 'french',
        name: 'French',
        icon: Languages,
        color: 'from-blue-600 to-indigo-600',
        subStrands: [
          { id: 'french-grammar', name: 'French Grammar' },
          { id: 'french-literature', name: 'French Literature' },
          { id: 'french-conversation', name: 'French Conversation' },
        ]
      },
      {
        id: 'german',
        name: 'German',
        icon: Languages,
        color: 'from-gray-600 to-slate-600',
        subStrands: [
          { id: 'german-grammar', name: 'German Grammar' },
          { id: 'german-literature', name: 'German Literature' },
          { id: 'german-conversation', name: 'German Conversation' },
        ]
      },
      {
        id: 'mandarin',
        name: 'Mandarin',
        icon: Languages,
        color: 'from-red-600 to-rose-600',
        subStrands: [
          { id: 'mandarin-grammar', name: 'Mandarin Grammar' },
          { id: 'mandarin-literature', name: 'Mandarin Literature' },
          { id: 'mandarin-conversation', name: 'Mandarin Conversation' },
        ]
      }
    ]
  },
  {
    id: 'humanities',
    name: 'Humanities',
    icon: GraduationCap,
    color: 'from-indigo-500 to-blue-600',
    curriculumSubjects: [
      {
        id: 'business-studies',
        name: 'Business Studies',
        icon: Briefcase,
        color: 'from-blue-600 to-cyan-600',
        subStrands: [
          { id: 'business-management', name: 'Business Management' },
          { id: 'accounting', name: 'Accounting' },
          { id: 'entrepreneurship', name: 'Entrepreneurship' },
          { id: 'marketing', name: 'Marketing' },
        ]
      },
      {
        id: 'community-service',
        name: 'Community Service',
        icon: Users,
        color: 'from-green-600 to-emerald-600',
        subStrands: [
          { id: 'community-outreach', name: 'Community Outreach' },
          { id: 'social-work', name: 'Social Work' },
          { id: 'volunteerism', name: 'Volunteerism' },
        ]
      },
      {
        id: 'geography',
        name: 'Geography',
        icon: MapPin,
        color: 'from-teal-600 to-cyan-600',
        subStrands: [
          { id: 'physical-geography', name: 'Physical Geography' },
          { id: 'human-geography', name: 'Human Geography' },
          { id: 'geographic-information-systems', name: 'Geographic Information Systems' },
        ]
      },
      {
        id: 'history-citizenship',
        name: 'History and Citizenship',
        icon: History,
        color: 'from-amber-600 to-orange-600',
        subStrands: [
          { id: 'world-history', name: 'World History' },
          { id: 'african-history', name: 'African History' },
          { id: 'citizenship-education', name: 'Citizenship Education' },
        ]
      }
    ]
  },
  {
    id: 'language',
    name: 'Language',
    icon: BookMarked,
    color: 'from-pink-500 to-rose-600',
    curriculumSubjects: [
      {
        id: 'english',
        name: 'English',
        icon: BookText,
        color: 'from-blue-600 to-indigo-600',
        subStrands: [
          { id: 'english-grammar', name: 'English Grammar' },
          { id: 'english-literature', name: 'English Literature' },
          { id: 'creative-writing', name: 'Creative Writing' },
          { id: 'oral-skills', name: 'Oral Skills' },
        ]
      },
      {
        id: 'fasihi-ya-kiswahili',
        name: 'Fasihi ya Kiswahili',
        icon: ScrollText,
        color: 'from-green-600 to-emerald-600',
        subStrands: [
          { id: 'fasihi-simulizi', name: 'Fasihi Simulizi' },
          { id: 'fasihi-andishi', name: 'Fasihi Andishi' },
          { id: 'ushairi', name: 'Ushairi' },
        ]
      },
      {
        id: 'indigenous-languages',
        name: 'Indigenous Languages',
        icon: Languages,
        color: 'from-amber-600 to-yellow-600',
        subStrands: [
          { id: 'kikuyu', name: 'Kikuyu' },
          { id: 'kalenjin', name: 'Kalenjin' },
          { id: 'luhya', name: 'Luhya' },
          { id: 'luo', name: 'Luo' },
        ]
      },
      {
        id: 'kiswahili',
        name: 'Kiswahili',
        icon: Bookmark,
        color: 'from-teal-600 to-cyan-600',
        subStrands: [
          { id: 'kiswahili-grammar', name: 'Kiswahili Grammar' },
          { id: 'kiswahili-literature', name: 'Kiswahili Literature' },
          { id: 'kiswahili-composition', name: 'Kiswahili Composition' },
        ]
      },
      {
        id: 'literature',
        name: 'Literature',
        icon: BookOpen,
        color: 'from-purple-600 to-violet-600',
        subStrands: [
          { id: 'prose', name: 'Prose' },
          { id: 'poetry', name: 'Poetry' },
          { id: 'drama', name: 'Drama' },
          { id: 'literary-criticism', name: 'Literary Criticism' },
        ]
      }
    ]
  },
  {
    id: 'pure-sciences',
    name: 'Pure Sciences',
    icon: Microscope,
    color: 'from-cyan-500 to-blue-600',
    curriculumSubjects: [
      {
        id: 'biology',
        name: 'Biology',
        icon: Sprout,
        color: 'from-green-600 to-emerald-600',
        subStrands: [
          { id: 'cell-biology', name: 'Cell Biology' },
          { id: 'genetics', name: 'Genetics' },
          { id: 'ecology', name: 'Ecology' },
          { id: 'human-physiology', name: 'Human Physiology' },
          { id: 'plant-physiology', name: 'Plant Physiology' },
        ]
      },
      {
        id: 'chemistry',
        name: 'Chemistry',
        icon: FlaskConical,
        color: 'from-blue-600 to-cyan-600',
        subStrands: [
          { id: 'organic-chemistry', name: 'Organic Chemistry' },
          { id: 'inorganic-chemistry', name: 'Inorganic Chemistry' },
          { id: 'physical-chemistry', name: 'Physical Chemistry' },
          { id: 'analytical-chemistry', name: 'Analytical Chemistry' },
        ]
      },
      {
        id: 'core-mathematics',
        name: 'Core Mathematics',
        icon: Calculator,
        color: 'from-indigo-600 to-purple-600',
        subStrands: [
          { id: 'algebra', name: 'Algebra' },
          { id: 'geometry', name: 'Geometry' },
          { id: 'trigonometry', name: 'Trigonometry' },
          { id: 'calculus', name: 'Calculus' },
          { id: 'statistics', name: 'Statistics' },
        ]
      },
      {
        id: 'essential-mathematics',
        name: 'Essential Mathematics',
        icon: Calculator,
        color: 'from-blue-600 to-indigo-600',
        subStrands: [
          { id: 'basic-algebra', name: 'Basic Algebra' },
          { id: 'basic-geometry', name: 'Basic Geometry' },
          { id: 'financial-mathematics', name: 'Financial Mathematics' },
        ]
      },
      {
        id: 'general-science',
        name: 'General Science',
        icon: Atom,
        color: 'from-teal-600 to-green-600',
        subStrands: [
          { id: 'scientific-method', name: 'Scientific Method' },
          { id: 'integrated-sciences', name: 'Integrated Sciences' },
        ]
      },
      {
        id: 'physics',
        name: 'Physics',
        icon: Zap,
        color: 'from-yellow-600 to-orange-600',
        subStrands: [
          { id: 'mechanics', name: 'Mechanics' },
          { id: 'thermodynamics', name: 'Thermodynamics' },
          { id: 'optics', name: 'Optics' },
          { id: 'electricity-magnetism', name: 'Electricity and Magnetism' },
          { id: 'modern-physics', name: 'Modern Physics' },
        ]
      }
    ]
  },
  {
    id: 'religious-education',
    name: 'Religious Education',
    icon: BookOpen,
    color: 'from-amber-500 to-yellow-600',
    curriculumSubjects: [
      {
        id: 'cre',
        name: 'CRE',
        icon: BookText,
        color: 'from-blue-600 to-indigo-600',
        subStrands: [
          { id: 'bible-studies', name: 'Bible Studies' },
          { id: 'christian-ethics', name: 'Christian Ethics' },
          { id: 'church-history', name: 'Church History' },
        ]
      },
      {
        id: 'hre',
        name: 'HRE',
        icon: BookText,
        color: 'from-orange-600 to-red-600',
        subStrands: [
          { id: 'hindu-philosophy', name: 'Hindu Philosophy' },
          { id: 'hindu-scriptures', name: 'Hindu Scriptures' },
          { id: 'hindu-practices', name: 'Hindu Practices' },
        ]
      },
      {
        id: 'ire',
        name: 'IRE',
        icon: BookText,
        color: 'from-green-600 to-emerald-600',
        subStrands: [
          { id: 'islamic-theology', name: 'Islamic Theology' },
          { id: 'quran-studies', name: 'Quran Studies' },
          { id: 'islamic-law', name: 'Islamic Law' },
        ]
      }
    ]
  },
  {
    id: 'technical',
    name: 'Technical',
    icon: Building2,
    color: 'from-slate-500 to-gray-600',
    curriculumSubjects: [
      {
        id: 'aviation',
        name: 'Aviation',
        icon: Plane,
        color: 'from-sky-600 to-blue-600',
        subStrands: [
          { id: 'flight-principles', name: 'Flight Principles' },
          { id: 'aircraft-systems', name: 'Aircraft Systems' },
          { id: 'aviation-safety', name: 'Aviation Safety' },
        ]
      },
      {
        id: 'bc',
        name: 'B/C',
        icon: Building2,
        color: 'from-orange-600 to-amber-600',
        subStrands: [
          { id: 'building-construction', name: 'Building Construction' },
          { id: 'construction-materials', name: 'Construction Materials' },
          { id: 'construction-management', name: 'Construction Management' },
        ]
      },
      {
        id: 'electricity',
        name: 'Electricity',
        icon: Zap,
        color: 'from-yellow-600 to-amber-600',
        subStrands: [
          { id: 'electrical-circuits', name: 'Electrical Circuits' },
          { id: 'electrical-installation', name: 'Electrical Installation' },
          { id: 'electronics', name: 'Electronics' },
        ]
      },
      {
        id: 'marine-fisheries',
        name: 'Marine and Fisheries',
        icon: Ship,
        color: 'from-blue-600 to-cyan-600',
        subStrands: [
          { id: 'marine-biology', name: 'Marine Biology' },
          { id: 'fisheries-management', name: 'Fisheries Management' },
          { id: 'aquaculture', name: 'Aquaculture' },
        ]
      },
      {
        id: 'media',
        name: 'Media',
        icon: Tv,
        color: 'from-purple-600 to-pink-600',
        subStrands: [
          { id: 'journalism', name: 'Journalism' },
          { id: 'broadcasting', name: 'Broadcasting' },
          { id: 'digital-media', name: 'Digital Media' },
        ]
      },
      {
        id: 'woodwork',
        name: 'Woodwork',
        icon: Hammer,
        color: 'from-amber-600 to-orange-600',
        subStrands: [
          { id: 'woodworking-techniques', name: 'Woodworking Techniques' },
          { id: 'furniture-design', name: 'Furniture Design' },
          { id: 'wood-materials', name: 'Wood Materials' },
        ]
      }
    ]
  }
]

