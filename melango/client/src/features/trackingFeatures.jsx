import React, { useEffect, useState } from 'react'
import api, { apiError, asList, contentApi, engagementApi, unwrap } from '../services/api'
import { CoursePicker, Empty, fmtDate, Loading, Panel, useAccessibleCourses } from './shared'

/* Feature 12: Attendance */
export function AttendanceFeature({ user }) {
  const { courses, courseId, setCourseId, loading: coursesLoading } = useAccessibleCourses(user, { autoSelect: user.role !== 'student' })
  const [records, setRecords] = useState([])
  const [summary, setSummary] = useState([])
  const [students, setStudents] = useState([])
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [statusMap, setStatusMap] = useState({})
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const isTeacher = user.role === 'teacher' || user.role === 'admin'

  const load = async () => {
    setLoading(true)
    try {
      if (isTeacher && courseId) {
        const sheets = unwrap(await contentApi.attendance(courseId)) || []
        setRecords(sheets)
        const enrollments = unwrap(await api.get(`/enrollments/course/${courseId}`)) || []
        const roster = enrollments.map((e) => e.studentId).filter(Boolean)
        setStudents(roster)
        const totals = roster.map((student) => {
          let present = 0
          sheets.forEach((sheet) => {
            const row = (sheet.records || []).find((r) => String(r.studentId?._id || r.studentId) === String(student._id))
            if (row && row.status !== 'absent') present += 1
          })
          return { ...student, present, total: sheets.length }
        })
        setSummary(totals)
      } else if (user.role === 'student') {
        const data = unwrap(await api.get('/attendance/my')) || {}
        const allRecords = data.records || asList(data)
        const allSummary = data.summary || []
        if (courseId) {
          setRecords(allRecords.filter((r) => String(r.course?._id || r.courseId) === String(courseId)))
          setSummary(allSummary.filter((s) => String(s.courseId?._id || s.courseId) === String(courseId)))
        } else {
          setRecords(allRecords)
          setSummary(allSummary)
        }
      }
    } catch {
      setRecords([])
      setSummary([])
      setStudents([])
    } finally {
      setLoading(false)
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
      {coursesLoading ? <Loading /> : (
        <CoursePicker
          courses={courses}
          courseId={courseId}
          setCourseId={setCourseId}
          allowAll={user.role === 'student'}
          allLabel="All my courses"
        />
      )}
      {isTeacher && courseId && students.length > 0 && (
        <form className="border rounded p-3 mb-3" onSubmit={take}>
          <p className="small text-muted">Mark who attended this class. Students will see the count for this course.</p>
          <label>Class date<input type="date" className="form-control w-auto mb-2" value={date} onChange={(e) => setDate(e.target.value)} /></label>
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
      {message && <p className="small text-success">{message}</p>}
      {loading ? <Loading /> : (
        <>
          {summary.length > 0 && (
            <div className="row g-3 mb-3">
              {summary.map((s) => (
                <div className="col-md-4" key={s._id || s.courseId?._id || s.name}>
                  <div className="kpi">
                    <div>
                      <small>{user.role === 'student' ? (s.courseId?.courseName || 'Course') : s.name}</small>
                      <strong>{s.present ?? 0}/{s.total ?? 0}</strong>
                      <small className="d-block text-muted">{s.attendancePercentage != null ? `${s.attendancePercentage}% attended` : `${s.total || 0} classes recorded`}</small>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!records.length ? <Empty title="attendance" role={user.role} hint={isTeacher ? 'Save a class session to start the attendance record.' : 'Your teacher has not recorded attendance yet.'} /> : (
            <div className="list-group list-group-flush">
              {records.map((r, i) => (
                <div className="list-group-item px-0" key={r._id || i}>
                  <b>{fmtDate(r.date)}</b>
                  <small className="d-block text-muted">
                    {user.role === 'student'
                      ? `${r.course?.courseName || r.course || 'Course'} · ${r.status}`
                      : `${(r.records || []).length} students recorded`}
                  </small>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Panel>
  )
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const EVENT_TYPES = ['class', 'exam', 'assignment', 'quiz', 'holiday', 'other']

function monthCells(cursor) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
  const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate()
  const cells = Array.from({ length: first.getDay() }, () => null)
  for (let day = 1; day <= days; day += 1) {
    cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), day))
  }
  return cells
}

function sameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function eventOnDay(event, day) {
  const date = new Date(event.eventDate || event.dueDate)
  return sameDay(date, day)
}

/* Feature 14: Calendar */
export function CalendarFeature({ user }) {
  const { courses, courseId, setCourseId } = useAccessibleCourses(user, { autoSelect: false })
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [cursor, setCursor] = useState(() => new Date())
  const [selected, setSelected] = useState(() => new Date())
  const [form, setForm] = useState({ title: '', eventDate: '', eventType: 'other', courseId: '', description: '' })
  const [message, setMessage] = useState('')
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin'

  const load = async () => {
    setLoading(true)
    try {
      setEvents(unwrap(await engagementApi.calendar(courseId ? { courseId } : undefined)) || [])
    } catch {
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [courseId])

  const add = async (e) => {
    e.preventDefault()
    try {
      await engagementApi.addCalendarEvent({
        title: form.title,
        eventDate: new Date(form.eventDate).toISOString(),
        eventType: form.eventType,
        courseId: form.courseId || undefined,
        description: form.description,
      })
      setForm({ title: '', eventDate: '', eventType: 'other', courseId: '', description: '' })
      setMessage('Event added to the calendar.')
      load()
    } catch (err) {
      setMessage(apiError(err))
    }
  }

  const removeEvent = async (event) => {
    if (event.source && event.source !== 'event') return
    try {
      await engagementApi.removeCalendarEvent(event._id)
      setMessage('Event removed.')
      load()
    } catch (err) {
      setMessage(apiError(err))
    }
  }

  const cells = monthCells(cursor)
  const dayEvents = events.filter((event) => eventOnDay(event, selected))
  const monthLabel = cursor.toLocaleString(undefined, { month: 'long', year: 'numeric' })

  return (
    <Panel title="Calendar & deadlines">
      <CoursePicker courses={courses} courseId={courseId} setCourseId={setCourseId} allowAll allLabel="All courses" />
      {message && <p className="small text-success">{message}</p>}

      <form className="border rounded p-3 mb-3" onSubmit={add}>
        <h6 className="mb-2">{isTeacher ? 'Add a course event' : 'Add a personal reminder'}</h6>
        <input className="form-control mb-2" placeholder="Event title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <div className="row g-2 mb-2">
          <div className="col-md-6">
            <input type="datetime-local" className="form-control" required value={form.eventDate} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} />
          </div>
          <div className="col-md-6">
            <select className="form-select" value={form.eventType} onChange={(e) => setForm({ ...form, eventType: e.target.value })}>
              {EVENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
        </div>
        {isTeacher && (
          <select className="form-select mb-2" value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}>
            <option value="">Personal / platform event</option>
            {courses.map((course) => <option key={course._id} value={course._id}>{course.courseName}</option>)}
          </select>
        )}
        <input className="form-control mb-2" placeholder="Notes (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <button type="submit" className="btn btn-primary btn-sm">Add event</button>
      </form>

      <div className="cal-toolbar">
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>Prev</button>
        <strong>{monthLabel}</strong>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>Next</button>
      </div>

      {loading ? <Loading /> : (
        <div className="cal-grid" role="grid" aria-label="Monthly calendar">
          {WEEKDAYS.map((day) => <div key={day} className="cal-weekday">{day}</div>)}
          {cells.map((day, index) => {
            if (!day) return <div key={`empty-${index}`} className="cal-cell is-empty" />
            const items = events.filter((event) => eventOnDay(event, day))
            const isToday = sameDay(day, new Date())
            const isSelected = sameDay(day, selected)
            return (
              <button
                type="button"
                key={day.toISOString()}
                className={`cal-cell ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`}
                onClick={() => setSelected(day)}
              >
                <span className="cal-day">{day.getDate()}</span>
                <span className="cal-dots">
                  {items.slice(0, 3).map((event) => (
                    <i key={event._id} className={`cal-dot cal-dot-${event.eventType || 'other'}`} title={event.title} />
                  ))}
                </span>
              </button>
            )
          })}
        </div>
      )}

      <div className="mt-3">
        <h6>On {selected.toLocaleDateString(undefined, { dateStyle: 'full' })}</h6>
        {!dayEvents.length ? <p className="text-muted small">No assignment due dates or events on this day.</p> : (
          <div className="list-group list-group-flush">
            {dayEvents.map((event) => (
              <div className="list-group-item px-0 py-3" key={event._id || event.title + event.eventDate}>
                <div className="d-flex justify-content-between gap-2">
                  <div>
                    <span className={`badge text-bg-light text-capitalize me-2`}>{event.eventType || event.source}</span>
                    <b>{event.title}</b>
                    <small className="d-block text-muted">{event.courseName || 'General'} · {fmtDate(event.eventDate || event.dueDate)}</small>
                  </div>
                  {event.source === 'event' && (
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeEvent(event)}>Delete</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  )
}

/* Feature 17: Progress Analytics */
export function ProgressFeature({ user }) {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    engagementApi.progress()
      .then((r) => setRecords(asList(unwrap(r))))
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
            <div className="list-group-item px-0 py-3" key={p._id || p.course?._id || p.courseId}>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <b>{p.course?.courseName || p.courseId?.courseName || p.courseName || 'Course'}</b>
                  <small className="d-block text-muted">{p.completedCount ?? p.completedMaterials?.length ?? 0} materials completed</small>
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
