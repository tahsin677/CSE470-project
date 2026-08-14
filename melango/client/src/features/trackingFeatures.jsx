import React, { useEffect, useState } from 'react'
import api, { apiError, contentApi, engagementApi, unwrap } from '../services/api'
import { CoursePicker, Empty, fmtDate, Loading, Panel, useAccessibleCourses } from './shared'

/* Feature 12: Attendance */
export function AttendanceFeature({ user }) {
  const { courses, courseId, setCourseId, loading: coursesLoading } = useAccessibleCourses(user)
  const [records, setRecords] = useState([])
  const [students, setStudents] = useState([])
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [statusMap, setStatusMap] = useState({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const isTeacher = user.role === 'teacher' || user.role === 'admin'

  const load = async () => {
    if (isTeacher && courseId) {
      setLoading(true)
      try {
        setRecords(unwrap(await contentApi.attendance(courseId)) || [])
        const enrollments = unwrap(await api.get(`/enrollments/course/${courseId}`)) || []
        setStudents(enrollments.map((e) => e.studentId).filter(Boolean))
      } catch {
        setRecords([])
        setStudents([])
      } finally {
        setLoading(false)
      }
    } else if (user.role === 'student') {
      setLoading(true)
      try {
        setRecords(unwrap(await api.get('/attendance/my')) || [])
      } catch {
        setRecords([])
      } finally {
        setLoading(false)
      }
    }
  }

  useEffect(() => { load() }, [courseId, user.role])

  const take = async (e) => {
    e.preventDefault()
    try {
      const recordsPayload = students.map((s) => ({
        studentId: s._id,
        status: statusMap[s._id] || 'present',
      }))
      await contentApi.takeAttendance(courseId, { date, records: recordsPayload })
      setMessage('Attendance saved.')
      load()
    } catch (err) {
      setMessage(apiError(err))
    }
  }

  return (
    <Panel title="Attendance tracking">
      {isTeacher ? (
        <>
          {coursesLoading ? <Loading /> : (
            <>
              <CoursePicker courses={courses} courseId={courseId} setCourseId={setCourseId} />
              {courseId && students.length > 0 && (
                <form className="border rounded p-3 mb-3" onSubmit={take}>
                  <label>Date<input type="date" className="form-control w-auto mb-2" value={date} onChange={(e) => setDate(e.target.value)} /></label>
                  {students.map((s) => (
                    <div key={s._id} className="d-flex align-items-center gap-2 mb-1">
                      <span style={{ minWidth: 120 }}>{s.name}</span>
                      <select className="form-select form-select-sm w-auto" value={statusMap[s._id] || 'present'} onChange={(e) => setStatusMap({ ...statusMap, [s._id]: e.target.value })}>
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="late">Late</option>
                        <option value="excused">Excused</option>
                      </select>
                    </div>
                  ))}
                  <button className="btn btn-primary btn-sm mt-2">Save attendance</button>
                </form>
              )}
            </>
          )}
        </>
      ) : null}
      {message && <p className="small text-success">{message}</p>}
      {loading ? <Loading /> : !records.length ? <Empty title="attendance" role={user.role} /> : (
        <div className="list-group list-group-flush">
          {records.map((r, i) => (
            <div className="list-group-item px-0" key={r._id || i}>
              <b>{fmtDate(r.date)}</b>
              <small className="d-block text-muted">
                {user.role === 'student' ? `Status: ${r.status}` : `${(r.records || []).length} students recorded`}
              </small>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}

/* Feature 14: Calendar */
export function CalendarFeature() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title: '', eventDate: '', eventType: 'general', courseId: '' })

  const load = async () => {
    setLoading(true)
    try {
      setEvents(unwrap(await engagementApi.calendar()) || [])
    } catch {
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const add = async (e) => {
    e.preventDefault()
    try {
      await engagementApi.addCalendarEvent({ ...form, eventDate: new Date(form.eventDate).toISOString() })
      setForm({ title: '', eventDate: '', eventType: 'general', courseId: '' })
      load()
    } catch (err) {
      alert(apiError(err))
    }
  }

  return (
    <Panel title="Calendar & deadlines">
      <form className="border rounded p-3 mb-3" onSubmit={add}>
        <input className="form-control mb-2" placeholder="Event title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input type="datetime-local" className="form-control mb-2" required value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} />
        <button className="btn btn-primary btn-sm">Add event</button>
      </form>
      {loading ? <Loading /> : !events.length ? <Empty title="events" /> : (
        <div className="list-group list-group-flush">
          {events.map((ev) => (
            <div className="list-group-item px-0 py-3" key={ev._id || ev.title + ev.eventDate}>
              <b>{ev.title}</b>
              <small className="d-block text-muted">{ev.eventType} · {ev.courseName || 'General'} · {fmtDate(ev.eventDate || ev.dueDate)}</small>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}

/* Feature 17: Progress Analytics */
export function ProgressFeature({ user }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    engagementApi.progress()
      .then((r) => setRecords(unwrap(r) || []))
      .catch(() => setRecords([]))
      .finally(() => setLoading(false))
  }, [])

  if (user.role !== 'student') {
    return (
      <Panel title="Progress analytics">
        <p className="text-muted">Teachers can view student progress from course enrollments and grading tools.</p>
      </Panel>
    )
  }

  return (
    <Panel title="Progress analytics">
      {loading ? <Loading /> : !records.length ? <Empty title="progress" /> : (
        <div className="list-group list-group-flush">
          {records.map((p) => (
            <div className="list-group-item px-0 py-3" key={p._id || p.courseId}>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <b>{p.courseId?.courseName || p.courseName || 'Course'}</b>
                  <small className="d-block text-muted">{p.completedMaterials?.length || 0} materials completed</small>
                </div>
                <div className="text-end">
                  <strong>{p.completionPercentage ?? 0}%</strong>
                  <div className="progress mt-1" style={{ width: 120, height: 6 }}>
                    <div className="progress-bar" style={{ width: `${p.completionPercentage ?? 0}%` }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}
