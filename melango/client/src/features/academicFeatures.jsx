import React, { useEffect, useState } from 'react'
import { Plus } from '../icons'
import api, { apiError, contentApi, unwrap } from '../services/api'
import { CoursePicker, Empty, fmtDate, Loading, Panel, useAccessibleCourses } from './shared'

/* Features 5–8: Assignments, Submission, Grading, Feedback */
export function AssignmentsFeature({ user }) {
  const { courses, courseId, setCourseId, loading: coursesLoading } = useAccessibleCourses(user)
  const [assignments, setAssignments] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', dueDate: '', totalMarks: 100 })
  const [submitForm, setSubmitForm] = useState({ assignmentId: '', text: '', link: '' })
  const [message, setMessage] = useState('')
  const [viewSubmissions, setViewSubmissions] = useState(null)

  const load = async () => {
    if (!courseId) return
    setLoading(true)
    try {
      setAssignments(unwrap(await contentApi.assignments(courseId)) || [])
      if (user.role === 'student') {
        const all = unwrap(await contentApi.mySubmissions()) || []
        setSubmissions(all.filter((s) => String(s.courseId?._id || s.courseId) === String(courseId)))
      }
    } catch {
      setAssignments([])
      setSubmissions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [courseId, user.role])

  const createAssignment = async (e) => {
    e.preventDefault()
    try {
      await contentApi.addAssignment(courseId, { ...form, dueDate: new Date(form.dueDate).toISOString() })
      setMessage('Assignment created.')
      setShowForm(false)
      setForm({ title: '', description: '', dueDate: '', totalMarks: 100 })
      load()
    } catch (err) {
      setMessage(apiError(err))
    }
  }

  const submitWork = async (e) => {
    e.preventDefault()
    try {
      await contentApi.submitAssignment(submitForm.assignmentId, { text: submitForm.text, link: submitForm.link })
      setMessage('Submission sent!')
      setSubmitForm({ assignmentId: '', text: '', link: '' })
      load()
    } catch (err) {
      setMessage(apiError(err))
    }
  }

  const loadSubmissions = async (assignmentId) => {
    setViewSubmissions(assignmentId)
    try {
      const data = unwrap(await api.get(`/assignments/${assignmentId}/submissions`)) || []
      setSubmissions(data)
    } catch {
      setSubmissions([])
    }
  }

  const isTeacher = user.role === 'teacher' || user.role === 'admin'

  return (
    <Panel
      title="Assignments"
      action={isTeacher && courseId ? (
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}><Plus size={16} /> Add</button>
      ) : null}
    >
      {coursesLoading ? <Loading /> : (
        <>
          <CoursePicker courses={courses} courseId={courseId} setCourseId={setCourseId} />
          {message && <p className="small text-success">{message}</p>}

          {showForm && isTeacher && (
            <form className="border rounded p-3 mb-3" onSubmit={createAssignment}>
              <label className="d-block mb-2">Title<input className="form-control" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
              <label className="d-block mb-2">Description<textarea className="form-control" rows="2" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
              <label className="d-block mb-2">Due date<input type="datetime-local" className="form-control" required value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></label>
              <button className="btn btn-primary btn-sm">Save assignment</button>
            </form>
          )}

          {loading ? <Loading /> : !assignments.length ? <Empty title="assignments" role={user.role} /> : (
            <div className="list-group list-group-flush">
              {assignments.map((a) => {
                const mine = submissions.find((s) => String(s.assignmentId?._id || s.assignmentId) === String(a._id))
                return (
                  <div className="list-group-item px-0 py-3" key={a._id}>
                    <div className="d-flex justify-content-between">
                      <div>
                        <b>{a.title}</b>
                        <small className="d-block text-muted">Due {fmtDate(a.dueDate)} · {a.totalMarks} marks</small>
                        {mine && <small className="d-block">Status: {mine.status}{mine.marks != null ? ` · ${mine.marks} marks` : ''}</small>}
                      </div>
                      <div className="d-flex gap-2">
                        {isTeacher && <button className="btn btn-sm btn-outline-secondary" onClick={() => loadSubmissions(a._id)}>Submissions</button>}
                        {user.role === 'student' && !mine && (
                          <button className="btn btn-sm btn-primary" onClick={() => setSubmitForm({ ...submitForm, assignmentId: a._id })}>Submit</button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {user.role === 'student' && submitForm.assignmentId && (
            <form className="border rounded p-3 mt-3" onSubmit={submitWork}>
              <h6>Submit assignment</h6>
              <textarea className="form-control mb-2" placeholder="Your answer or notes" value={submitForm.text} onChange={(e) => setSubmitForm({ ...submitForm, text: e.target.value })} />
              <input className="form-control mb-2" placeholder="Link (optional)" value={submitForm.link} onChange={(e) => setSubmitForm({ ...submitForm, link: e.target.value })} />
              <button className="btn btn-primary btn-sm">Send submission</button>
            </form>
          )}

          {isTeacher && viewSubmissions && (
            <div className="mt-4">
              <h6>Submissions & grading</h6>
              {!submissions.length ? <p className="text-muted small">No submissions yet.</p> : submissions.map((s) => (
                <div className="border rounded p-3 mb-2" key={s._id}>
                  <b>{s.studentId?.name || 'Student'}</b>
                  <p className="small mb-1">{s.text || s.link || 'File submission'}</p>
                  <small className="text-muted">Submitted {fmtDate(s.submittedAt)} · {s.status}</small>
                  {s.status !== 'graded' ? (
                    <form className="mt-2 d-flex gap-2 flex-wrap" onSubmit={async (e) => {
                      e.preventDefault()
                      const marks = e.target.marks.value
                      const comments = e.target.comments.value
                      try {
                        await contentApi.feedback(s._id, { marks: Number(marks), comments })
                        setMessage('Graded successfully.')
                        loadSubmissions(viewSubmissions)
                      } catch (err) {
                        setMessage(apiError(err))
                      }
                    }}>
                      <input name="marks" type="number" className="form-control form-control-sm w-auto" placeholder="Marks" required />
                      <input name="comments" className="form-control form-control-sm" placeholder="Feedback comments" />
                      <button type="submit" className="btn btn-sm btn-primary">Grade</button>
                    </form>
                  ) : (
                    <p className="small mt-1 mb-0">Graded: {s.marks} marks{s.feedbackId?.comments ? ` — ${s.feedbackId.comments}` : ''}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Panel>
  )
}

/* Feature 13: Learning Materials */
export function MaterialsFeature({ user }) {
  const { courses, courseId, setCourseId, loading: coursesLoading } = useAccessibleCourses(user)
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ title: '', fileType: 'pdf' })
  const [message, setMessage] = useState('')

  const load = async () => {
    if (!courseId) return
    setLoading(true)
    try {
      setMaterials(unwrap(await contentApi.materials(courseId)) || [])
    } catch {
      setMaterials([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [courseId])

  const addMaterial = async (e) => {
    e.preventDefault()
    const fd = new FormData()
    fd.append('title', form.title)
    fd.append('fileType', form.fileType)
    const fileInput = e.target.querySelector('input[type=file]')
    if (fileInput?.files[0]) fd.append('file', fileInput.files[0])
    try {
      await api.post(`/courses/${courseId}/materials`, fd)
      setMessage('Material uploaded.')
      setForm({ title: '', fileType: 'pdf' })
      load()
    } catch (err) {
      setMessage(apiError(err))
    }
  }

  const complete = async (id) => {
    try {
      await api.post(`/progress/material/${id}/complete`)
      setMaterials((list) => list.map((item) => item._id === id ? { ...item, isCompleted: true } : item))
      setMessage('Marked as complete.')
    } catch (err) {
      setMessage(apiError(err))
    }
  }

  const isTeacher = user.role === 'teacher' || user.role === 'admin'

  return (
    <Panel title="Learning materials">
      {coursesLoading ? <Loading /> : (
        <>
          <CoursePicker courses={courses} courseId={courseId} setCourseId={setCourseId} />
          {message && <p className="small text-success">{message}</p>}
          {isTeacher && courseId && (
            <form className="border rounded p-3 mb-3" onSubmit={addMaterial}>
              <input className="form-control mb-2" placeholder="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <input type="file" className="form-control mb-2" />
              <button className="btn btn-primary btn-sm">Upload material</button>
            </form>
          )}
          {loading ? <Loading /> : !materials.length ? <Empty title="materials" role={user.role} /> : (
            <div className="list-group list-group-flush">
              {materials.map((m) => (
                <div className="list-group-item px-0 d-flex justify-content-between align-items-center" key={m._id}>
                  <div><b>{m.title}</b><small className="d-block text-muted">{m.fileType} · {fmtDate(m.createdAt)}</small></div>
                  <div className="d-flex gap-2">
                    {user.role === 'student' && (
                      m.isCompleted ? (
                        <button type="button" className="btn btn-sm btn-material-done" aria-pressed="true">Completed</button>
                      ) : (
                        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => complete(m._id)}>Complete</button>
                      )
                    )}
                    {isTeacher && <button className="btn btn-sm btn-outline-danger" onClick={async () => { await contentApi.removeMaterial(m._id); load() }}>Delete</button>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </Panel>
  )
}

/* Feature 11: Quiz & Exam */
export function QuizzesFeature({ user }) {
  const { courses, courseId, setCourseId, loading: coursesLoading } = useAccessibleCourses(user)
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(false)
  const [attempt, setAttempt] = useState(null)
  const [answers, setAnswers] = useState({})
  const [result, setResult] = useState(null)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({ title: '', durationMinutes: 30, questionText: '', options: ['', '', '', ''], correctIndex: 0 })

  const load = async () => {
    if (!courseId) return
    setLoading(true)
    try {
      setQuizzes(unwrap(await contentApi.quizzes(courseId)) || [])
    } catch {
      setQuizzes([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [courseId])

  const createQuiz = async (e) => {
    e.preventDefault()
    try {
      await contentApi.addQuiz(courseId, {
        title: form.title,
        durationMinutes: form.durationMinutes,
        questions: [{ questionText: form.questionText, options: form.options.filter(Boolean), correctIndex: Number(form.correctIndex), marks: 1 }],
      })
      setMessage('Quiz created.')
      load()
    } catch (err) {
      setMessage(apiError(err))
    }
  }

  const takeQuiz = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        answers: Object.entries(answers).map(([questionIndex, selectedIndex]) => ({
          questionIndex: Number(questionIndex),
          selectedIndex: Number(selectedIndex),
        })),
      }
      const res = unwrap(await contentApi.attemptQuiz(attempt._id, payload))
      setResult(res)
      setMessage(`Score: ${res.percentage}%`)
    } catch (err) {
      setMessage(apiError(err))
    }
  }

  const isTeacher = user.role === 'teacher' || user.role === 'admin'

  return (
    <Panel title="Quizzes & exams">
      {coursesLoading ? <Loading /> : (
        <>
          <CoursePicker courses={courses} courseId={courseId} setCourseId={setCourseId} />
          {message && <p className="small">{message}</p>}
          {isTeacher && courseId && (
            <form className="border rounded p-3 mb-3" onSubmit={createQuiz}>
              <input className="form-control mb-2" placeholder="Quiz title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <input className="form-control mb-2" placeholder="Question" required value={form.questionText} onChange={(e) => setForm({ ...form, questionText: e.target.value })} />
              {form.options.map((opt, i) => (
                <input key={i} className="form-control mb-1" placeholder={`Option ${i + 1}`} value={opt} onChange={(e) => { const o = [...form.options]; o[i] = e.target.value; setForm({ ...form, options: o }) }} />
              ))}
              <select className="form-select mb-2" value={form.correctIndex} onChange={(e) => setForm({ ...form, correctIndex: e.target.value })}>
                {form.options.map((_, i) => <option key={i} value={i}>Correct: Option {i + 1}</option>)}
              </select>
              <button className="btn btn-primary btn-sm">Create quiz</button>
            </form>
          )}
          {loading ? <Loading /> : !quizzes.length ? <Empty title="quizzes" role={user.role} /> : (
            <div className="list-group list-group-flush">
              {quizzes.map((q) => (
                <div className="list-group-item px-0 d-flex justify-content-between" key={q._id}>
                  <div><b>{q.title}</b><small className="d-block text-muted">{q.questions?.length || 0} questions · {q.durationMinutes} min</small></div>
                  {user.role === 'student' && <button className="btn btn-sm btn-primary" onClick={() => { setAttempt(q); setAnswers({}); setResult(null) }}>Take quiz</button>}
                </div>
              ))}
            </div>
          )}
          {attempt && user.role === 'student' && !result && (
            <form className="border rounded p-3 mt-3" onSubmit={takeQuiz}>
              <h6>{attempt.title}</h6>
              {(attempt.questions || []).map((q, qi) => (
                <div key={qi} className="mb-3">
                  <b>{q.questionText}</b>
                  {(q.options || []).map((opt, oi) => (
                    <label key={oi} className="d-block small">
                      <input type="radio" name={`q${qi}`} value={oi} onChange={() => setAnswers({ ...answers, [qi]: oi })} required /> {opt}
                    </label>
                  ))}
                </div>
              ))}
              <button className="btn btn-primary btn-sm">Submit answers</button>
            </form>
          )}
          {result && <div className="alert alert-success mt-3">You scored {result.score}/{result.totalMarks} ({result.percentage}%)</div>}
        </>
      )}
    </Panel>
  )
}
