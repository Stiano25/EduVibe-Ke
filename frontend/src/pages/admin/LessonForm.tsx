import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useLessonStore } from '@/store/useLessonStore'
import type { ContentType, Difficulty, Grade } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { StaggeredEntry } from '@/components/animations/StaggeredEntry'

export const LessonForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addLesson, updateLesson, getLessonById } = useLessonStore()
  const isEdit = !!id

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    contentType: 'video' as ContentType,
    difficulty: 'beginner' as Difficulty,
    grade: 'K' as Grade,
    tags: '',
    duration: '',
    videoUrl: '',
    content: '',
  })

  useEffect(() => {
    if (isEdit && id) {
      const lesson = getLessonById(id)
      if (lesson) {
        setFormData({
          title: lesson.title,
          description: lesson.description,
          contentType: lesson.contentType,
          difficulty: lesson.difficulty,
          grade: lesson.grade,
          tags: lesson.tags.join(', '),
          duration: lesson.duration.toString(),
          videoUrl: lesson.videoUrl || '',
          content: lesson.content || '',
        })
      }
    }
  }, [id, isEdit, getLessonById])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const lessonData = {
      title: formData.title,
      description: formData.description,
      contentType: formData.contentType,
      difficulty: formData.difficulty,
      grade: formData.grade,
      tags: formData.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean),
      duration: parseInt(formData.duration),
      videoUrl: formData.videoUrl || undefined,
      content: formData.content || undefined,
    }

    if (isEdit && id) {
      updateLesson(id, lessonData)
    } else {
      addLesson(lessonData)
    }

    navigate('/admin/lessons')
  }

  return (
    <StaggeredEntry>
      <div className="max-w-3xl">
        <h1 className="text-4xl font-bold text-gray-900 mb-section">
          {isEdit ? 'Edit Lesson' : 'Create New Lesson'}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Title"
            value={formData.title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, title: e.target.value })}
            required
          />

          <Textarea
            label="Description"
            value={formData.description}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
            rows={4}
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label="Content Type"
              value={formData.contentType}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, contentType: e.target.value as ContentType })}
              required
            >
              <option value="video">Video</option>
              <option value="interactive">Interactive</option>
              <option value="reading">Reading</option>
            </Select>

            <Select
              label="Difficulty"
              value={formData.difficulty}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, difficulty: e.target.value as Difficulty })}
              required
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </Select>

            <Select
              label="Grade"
              value={formData.grade}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, grade: e.target.value as Grade })}
              required
            >
              <option value="K">Kindergarten</option>
              <option value="1">Grade 1</option>
              <option value="2">Grade 2</option>
              <option value="3">Grade 3</option>
              <option value="4">Grade 4</option>
              <option value="5">Grade 5</option>
              <option value="6">Grade 6</option>
            </Select>

            <Input
              label="Duration (minutes)"
              type="number"
              value={formData.duration}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, duration: e.target.value })}
              required
              min="1"
            />
          </div>

          <Input
            label="Tags (comma-separated)"
            value={formData.tags}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, tags: e.target.value })}
            placeholder="math, numbers, counting"
          />

          {formData.contentType === 'video' && (
            <Input
              label="Video URL"
              type="url"
              value={formData.videoUrl}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, videoUrl: e.target.value })}
            />
          )}

          {(formData.contentType === 'reading' || formData.contentType === 'interactive') && (
            <Textarea
              label="Content"
              value={formData.content}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, content: e.target.value })}
              rows={8}
            />
          )}

          <div className="flex gap-4">
            <Button type="submit">{isEdit ? 'Update Lesson' : 'Create Lesson'}</Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/admin/lessons')}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </StaggeredEntry>
  )
}

