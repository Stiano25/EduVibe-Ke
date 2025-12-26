import { useState, useEffect } from 'react'
import { Modal } from './Modal'
import { Note, Grade, Difficulty } from '@/types'
import { Save, X, Upload, Image, Video, FileText, Plus, Trash2 } from 'lucide-react'

interface NoteFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void
  note?: Note | null
  isLoading?: boolean
}

const grades: Grade[] = ['K', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']
const difficulties: Difficulty[] = ['beginner', 'intermediate', 'advanced']

export const NoteFormModal = ({
  isOpen,
  onClose,
  onSave,
  note,
  isLoading = false,
}: NoteFormModalProps) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    grade: 'K' as Grade,
    difficulty: 'beginner' as Difficulty,
    content: '',
    tags: '',
    duration: '',
    subStrandId: '',
    learningObjectives: '',
    keyConcepts: '',
    examples: '',
    summary: '',
  })

  const [images, setImages] = useState<string[]>([])
  const [videos, setVideos] = useState<{ type: 'upload' | 'youtube' | 'vimeo'; url: string }[]>([])

  useEffect(() => {
    if (note) {
      setFormData({
        title: note.title,
        description: note.description,
        grade: note.grade,
        difficulty: note.difficulty,
        content: note.content,
        tags: note.tags.join(', '),
        duration: note.duration.toString(),
        subStrandId: note.subStrandId || '',
        learningObjectives: note.learningObjectives?.join('\n') || '',
        keyConcepts: note.keyConcepts?.join('\n') || '',
        examples: note.examples?.join('\n') || '',
        summary: note.summary || '',
      })
      setImages(note.images || [])
      setVideos(note.videos || [])
    } else {
      setFormData({
        title: '',
        description: '',
        grade: 'K',
        difficulty: 'beginner',
        content: '',
        tags: '',
        duration: '',
        subStrandId: '',
        learningObjectives: '',
        keyConcepts: '',
        examples: '',
        summary: '',
      })
      setImages([])
      setVideos([])
    }
  }, [note, isOpen])

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      // Mock upload - in production, upload to cloud storage
      Array.from(files).forEach((file) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          setImages((prev) => [...prev, reader.result as string])
        }
        reader.readAsDataURL(file)
      })
    }
  }

  const handleVideoAdd = (type: 'upload' | 'youtube' | 'vimeo', url: string) => {
    if (url.trim()) {
      setVideos((prev) => [...prev, { type, url: url.trim() }])
    }
  }

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  const removeVideo = (index: number) => {
    setVideos((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return

    const noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'> = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      grade: formData.grade,
      difficulty: formData.difficulty,
      content: formData.content.trim(),
      tags: formData.tags.split(',').map((t) => t.trim()).filter(Boolean),
      duration: parseInt(formData.duration) || 0,
      subStrandId: formData.subStrandId || undefined,
      images: images.length > 0 ? images : undefined,
      videos: videos.length > 0 ? videos : undefined,
      learningObjectives: formData.learningObjectives
        ? formData.learningObjectives.split('\n').filter(Boolean)
        : undefined,
      keyConcepts: formData.keyConcepts
        ? formData.keyConcepts.split('\n').filter(Boolean)
        : undefined,
      examples: formData.examples
        ? formData.examples.split('\n').filter(Boolean)
        : undefined,
      summary: formData.summary || undefined,
    }

    onSave(noteData)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={note ? 'Edit Note' : 'Create New Note'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-6 max-h-[80vh] overflow-y-auto pr-2">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wide" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Basic Information
          </h3>

          <div>
            <label className="block text-sm font-semibold text-[#0F172A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2.5 rounded-[16px] bg-white border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm"
              style={{ fontFamily: 'Manrope, sans-serif' }}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#0F172A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 rounded-[16px] bg-white border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm resize-none"
              style={{ fontFamily: 'Manrope, sans-serif' }}
              required
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Grade *
              </label>
              <select
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value as Grade })}
                className="w-full px-4 py-2.5 rounded-[16px] bg-white border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm"
                style={{ fontFamily: 'Manrope, sans-serif' }}
                required
              >
                {grades.map((g) => (
                  <option key={g} value={g}>
                    {g === 'K' ? 'Kindergarten' : `Grade ${g}`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Difficulty *
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as Difficulty })}
                className="w-full px-4 py-2.5 rounded-[16px] bg-white border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm"
                style={{ fontFamily: 'Manrope, sans-serif' }}
                required
              >
                {difficulties.map((d) => (
                  <option key={d} value={d}>
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Duration (min) *
              </label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                min="1"
                className="w-full px-4 py-2.5 rounded-[16px] bg-white border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm"
                style={{ fontFamily: 'Manrope, sans-serif' }}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#0F172A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="math, numbers, counting"
              className="w-full px-4 py-2.5 rounded-[16px] bg-white border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4 pt-4 border-t-2 border-slate-200">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wide" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Content (Markdown)
            </h3>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#0F172A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Lesson Content *
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={10}
              placeholder="Write your lesson content in Markdown format..."
              className="w-full px-4 py-2.5 rounded-[16px] bg-white border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm font-mono resize-none"
              style={{ fontFamily: 'Manrope, sans-serif' }}
              required
            />
          </div>
        </div>

        {/* Images */}
        <div className="space-y-4 pt-4 border-t-2 border-slate-200">
          <div className="flex items-center gap-2">
            <Image className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wide" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Images
            </h3>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#0F172A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Upload Images
            </label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className="flex items-center gap-2 px-4 py-2.5 rounded-[16px] bg-indigo-50 border-2 border-indigo-200 hover:bg-indigo-100 cursor-pointer transition-all text-sm font-semibold text-indigo-700"
              style={{ fontFamily: 'Manrope, sans-serif' }}
            >
              <Upload className="w-4 h-4" />
              Choose Images
            </label>
          </div>
          {images.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {images.map((img, index) => (
                <div key={index} className="relative group">
                  <img src={img} alt={`Upload ${index + 1}`} className="w-full h-24 object-cover rounded-[12px] border-2 border-slate-200" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Videos */}
        <div className="space-y-4 pt-4 border-t-2 border-slate-200">
          <div className="flex items-center gap-2">
            <Video className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wide" style={{ fontFamily: 'Manrope, sans-serif' }}>
              Videos
            </h3>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold text-[#0F172A] mb-2" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Add Video URL (YouTube, Vimeo, or Upload)
              </label>
              <div className="flex gap-2">
                <select
                  id="video-type"
                  className="px-3 py-2.5 rounded-[12px] bg-white border-2 border-slate-300 focus:border-indigo-400 outline-none text-sm"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  <option value="youtube">YouTube</option>
                  <option value="vimeo">Vimeo</option>
                  <option value="upload">Upload URL</option>
                </select>
                <input
                  type="text"
                  id="video-url"
                  placeholder="https://..."
                  className="flex-1 px-4 py-2.5 rounded-[12px] bg-white border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                />
                <button
                  type="button"
                  onClick={() => {
                    const type = (document.getElementById('video-type') as HTMLSelectElement).value as 'upload' | 'youtube' | 'vimeo'
                    const url = (document.getElementById('video-url') as HTMLInputElement).value
                    handleVideoAdd(type, url)
                    ;(document.getElementById('video-url') as HTMLInputElement).value = ''
                  }}
                  className="px-4 py-2.5 rounded-[12px] bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-all text-sm flex items-center gap-1.5"
                  style={{ fontFamily: 'Manrope, sans-serif' }}
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            </div>
            {videos.length > 0 && (
              <div className="space-y-2">
                {videos.map((video, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-[12px] border border-slate-200">
                    <span className="text-sm text-[#0F172A] truncate flex-1" style={{ fontFamily: 'Manrope, sans-serif' }}>
                      {video.type}: {video.url}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeVideo(index)}
                      className="w-6 h-6 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center transition-all"
                    >
                      <Trash2 className="w-3 h-3 text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Learning Objectives */}
        <div className="space-y-4 pt-4 border-t-2 border-slate-200">
          <h3 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wide" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Learning Objectives (one per line)
          </h3>
          <textarea
            value={formData.learningObjectives}
            onChange={(e) => setFormData({ ...formData, learningObjectives: e.target.value })}
            rows={3}
            placeholder="Students will be able to..."
            className="w-full px-4 py-2.5 rounded-[16px] bg-white border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm resize-none"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          />
        </div>

        {/* Key Concepts */}
        <div className="space-y-4 pt-4 border-t-2 border-slate-200">
          <h3 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wide" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Key Concepts (one per line)
          </h3>
          <textarea
            value={formData.keyConcepts}
            onChange={(e) => setFormData({ ...formData, keyConcepts: e.target.value })}
            rows={3}
            placeholder="Important terms and concepts..."
            className="w-full px-4 py-2.5 rounded-[16px] bg-white border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm resize-none"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          />
        </div>

        {/* Examples */}
        <div className="space-y-4 pt-4 border-t-2 border-slate-200">
          <h3 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wide" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Examples (one per line)
          </h3>
          <textarea
            value={formData.examples}
            onChange={(e) => setFormData({ ...formData, examples: e.target.value })}
            rows={3}
            placeholder="Real-world examples..."
            className="w-full px-4 py-2.5 rounded-[16px] bg-white border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm resize-none"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          />
        </div>

        {/* Summary */}
        <div className="space-y-4 pt-4 border-t-2 border-slate-200">
          <h3 className="text-sm font-semibold text-[#0F172A] uppercase tracking-wide" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Summary
          </h3>
          <textarea
            value={formData.summary}
            onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
            rows={3}
            placeholder="Brief summary of the lesson..."
            className="w-full px-4 py-2.5 rounded-[16px] bg-white border-2 border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all outline-none text-sm resize-none"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t-2 border-slate-200">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 px-4 py-2.5 rounded-full bg-white border-2 border-slate-200 hover:bg-slate-50 transition-all text-sm font-semibold text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            <X className="w-4 h-4 inline mr-2" />
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !formData.title.trim()}
            className="flex-1 px-4 py-2.5 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            style={{ fontFamily: 'Manrope, sans-serif' }}
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 inline mr-2" />
                {note ? 'Update' : 'Create'} Note
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  )
}

