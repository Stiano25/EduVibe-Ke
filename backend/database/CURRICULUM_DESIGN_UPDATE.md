# Curriculum Design Structure Update

## Changes Made

The curriculum design structure has been updated so that **each subject has its own curriculum design** with a standardized naming format.

### New Structure

- **Curriculum Design Name Format**: `Grade{number}_{SubjectName}_Curriculum Design`
  - Example: `Grade11_Agriculture_Curriculum Design`
  - Example: `Grade11_Mathematics_Curriculum Design`

- **Relationship**: 
  - Each Subject has one Curriculum Design
  - Curriculum Design is automatically created when a Subject is created
  - Curriculum Design name is auto-generated from grade + subject name

### Database Changes

1. Added `subject_name` column to `curriculum_designs` table
2. Added unique constraint on `(grade, subject_name)` to ensure one design per subject per grade
3. Made `disciplines` array optional (defaults to empty array)

### Migration Steps

If you already have the database tables created, run this migration:

```sql
-- Add subject_name column
ALTER TABLE curriculum_designs 
ADD COLUMN IF NOT EXISTS subject_name TEXT;

-- Add unique constraint
ALTER TABLE curriculum_designs 
ADD CONSTRAINT IF NOT EXISTS unique_grade_subject 
UNIQUE (grade, subject_name);

-- Make disciplines optional (if needed)
ALTER TABLE curriculum_designs 
ALTER COLUMN disciplines SET DEFAULT '{}';
```

Or run the full updated migration from `migrations.sql` if starting fresh.

### API Changes

#### Creating a Subject

When creating a subject, the curriculum design is automatically created:

**Request:**
```json
POST /api/admin/subjects
{
  "name": "Agriculture",
  "grade": "11",
  "discipline": "Agriculture",
  "description": "Agricultural studies",
  "pdfUrl": "optional",
  "pdfFileName": "optional"
}
```

**What happens:**
1. System checks if curriculum design exists for `Grade 11 + Agriculture`
2. If not, creates: `Grade11_Agriculture_Curriculum Design`
3. Creates subject linked to that curriculum design

#### Manual Curriculum Design Creation

You can still create curriculum designs manually, but they should follow the naming convention:

**Request:**
```json
POST /api/admin/curriculum
{
  "grade": "11",
  "subjectName": "Agriculture",
  "name": "Grade11_Agriculture_Curriculum Design", // Optional - auto-generated if not provided
  "disciplines": ["Agriculture"],
  "pdfUrl": "optional",
  "pdfFileName": "optional"
}
```

### Frontend Updates Needed

1. Update Curriculum Design forms to include `subjectName` field
2. When creating a subject, optionally allow PDF upload (which will be attached to the auto-created curriculum design)
3. Display curriculum design name in the format: `Grade{number}_{SubjectName}_Curriculum Design`

### Benefits

- ✅ Clearer structure: One curriculum design per subject
- ✅ Consistent naming: Easy to identify which subject a curriculum design belongs to
- ✅ Automatic creation: No need to manually create curriculum designs before subjects
- ✅ Better organization: Each subject has its own curriculum document





