import React, { useEffect, useState } from 'react'
import { FileText } from '../icons'
import { courseApi, unwrap } from '../services/api'

export function Loading() {
  return <div className="loading"><span></span> Loading…</div>
}

export function Empty({ title, role, hint }) {
  return (
    <div className="empty">
      <FileText size={40} />
      <h5>No {title?.toLowerCase()} yet</h5>
      <p>{hint || (role === 'teacher' ? 'Create your first item to get started.' : 'Nothing here yet.')}</p>
    </div>
  )
}

export function useAccessibleCourses(user, { autoSelect = true } = {}) {
  const [courses, setCourses] = useState([])
  const [courseId, setCourseId] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      try {
        let list = []
        if (user.role === 'student') {
          const enrollments = unwrap(await courseApi.myEnrollments()) || []
          list = enrollments.map((e) => e.courseId).filter(Boolean)
        } else if (user.role === 'admin') {
          list = unwrap(await courseApi.list()) || []
        } else {
          list = unwrap(await courseApi.list({ mine: 'true' })) || []
        }
        if (active) {
          setCourses(list)
          if (autoSelect && list[0]?._id) setCourseId(list[0]._id)
        }
      } catch {
        if (active) setCourses([])
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [user, autoSelect])

  return { courses, courseId, setCourseId, loading }
}

export function CoursePicker({ courses, courseId, setCourseId, allowAll = false, allLabel = 'All courses' }) {
  if (!courses.length && !allowAll) return <p className="text-muted small">Enroll in or create a course first.</p>
  return (
    <select className="form-select w-auto mb-3" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
      {allowAll ? <option value="">{allLabel}</option> : null}
      {courses.map((c) => (
        <option key={c._id} value={c._id}>{c.courseName}</option>
      ))}
    </select>
  )
}

export function Panel({ title, children, action }) {
  return (
    <div className="panel workspace-panel">
      {(title || action) && (
        <div className="d-flex justify-content-between align-items-center mb-3">
          {title && <h5 className="mb-0">{title}</h5>}
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

export function fmtDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

export function toLocalInput(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function personName(value) {
  if (!value) return 'User'
  if (typeof value === 'string') return value
  return value.name || value.userId?.name || 'User'
}

export function instructorName(course) {
  if (!course) return 'Instructor'
  return course.teacherId?.name || course.instructor?.name || 'Instructor'
}

export async function downloadBlob(request, fileName) {
  const response = await request
  const blob = response.data instanceof Blob ? response.data : new Blob([response.data])
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName || 'download'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
