import React, { useEffect, useState } from 'react'
import { Plus } from '../icons'
import api, { apiError, contentApi, unwrap } from '../services/api'
import { CoursePicker, Empty, downloadBlob, fmtDate, Loading, Panel, toLocalInput, useAccessibleCourses } from './shared'

const emptyAssignment = { title: '', description: '', dueDate: '', totalMarks: 100, allowResubmission: true }
const emptySubmit = { assignmentId: '', text: '', link: '', file: null }

/* Features 5–8: Assignments, Submission, Grading, Feedback */
export function AssignmentsFeature({ user }) {
  const { courses, courseId, setCourseId, loading: coursesLoading } = useAccessibleCourses(user)
  const [assignments, setAssignments] = useState([])
  const [teacherSubs, setTeacherSubs] = useState([])
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyAssignment)
  const [submitForm, setSubmitForm] = useState(emptySubmit)
  const [message, setMessage] = useState('')
  const [messageOk, setMessageOk] = useState(true)
  const [viewSubmissions, setViewSubmissions] = useState(null)
  const isTeacher = user.role === 'teacher' || user.role === 'admin'

  const load = async () => {
    if (!courseId) return
    setLoading(true)
    try {
      setAssignments(unwrap(await contentApi.assignments(courseId)) || [])
    } catch {
      setAssignments([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [courseId, user.role])

  const resetForm = () => {
    setShowForm(false)
    setEditingId(null)
    setForm(emptyAssignment)
  }

  const startCreate = () => {
    setEditingId(null)
    setForm(emptyAssignment)
    setShowForm((open) => !open || Boolean(editingId))
  }

  const startEdit = (assignment) => {
    setEditingId(assignment._id)
    setForm({
      title: assignment.title || '',
      description: assignment.description || '',
      dueDate: toLocalInput(assignment.dueDate),
      totalMarks: assignment.totalMarks || 100,
      allowResubmission: assignment.allowResubmission !== false,
    })
    setShowForm(true)
  }

  const saveAssignment = async (e) => {
    e.preventDefault()
    const payload = {
      title: form.title,
      description: form.description,
      dueDate: new Date(form.dueDate).toISOString(),
      totalMarks: Number(form.totalMarks) || 100,
      allowResubmission: Boolean(form.allowResubmission),
    }
    try {
      if (editingId) {
        await contentApi.updateAssignment(editingId, payload)
        setMessageOk(true)
        setMessage('Assignment updated.')
      } else {
        await contentApi.addAssignment(courseId, payload)
        setMessageOk(true)
        setMessage('Assignment created.')
      }
      resetForm()
      load()
    } catch (err) {
      setMessageOk(false)
      setMessage(apiError(err))
    }
  }

  const deleteAssignment = async (assignment) => {
    if (!window.confirm(`Delete "${assignment.title}"? This also removes submissions.`)) return
    try {
      await contentApi.removeAssignment(assignment._id)
      if (viewSubmissions === assignment._id) {
        setViewSubmissions(null)
        setTeacherSubs([])
      }
      setMessageOk(true)
      setMessage('Assignment deleted.')
      load()
    } catch (err) {
      setMessageOk(false)
      setMessage(apiError(err))
    }
  }

  const submitWork = async (e) => {
    e.preventDefault()
    if (!submitForm.text && !submitForm.link && !submitForm.file) {
      setMessageOk(false)
      setMessage('Add a file, written answer, or link before submitting.')
      return
    }
    const data = new FormData()
    if (submitForm.text) data.append('text', submitForm.text)
    if (submitForm.link) data.append('link', submitForm.link)
    if (submitForm.file) data.append('file', submitForm.file)
    try {
      await contentApi.submitAssignment(submitForm.assignmentId, data)
      setMessageOk(true)
      setMessage('Submission sent!')
      setSubmitForm(emptySubmit)
      load()
    } catch (err) {
      setMessageOk(false)
      setMessage(apiError(err))
    }
  }

  const loadSubmissions = async (assignmentId) => {
    setViewSubmissions(assignmentId)
    try {
      setTeacherSubs(unwrap(await contentApi.submissions(assignmentId)) || [])
    } catch {
      setTeacherSubs([])
    }
  }

  const downloadFile = async (submission) => {
    try {
      await downloadBlob(contentApi.downloadSubmission(submission._id), submission.originalName || submission.fileName || 'submission')
    } catch (err) {
      setMessageOk(false)
      setMessage(apiError(err))
    }
  }

  const studentWork = (assignment) => assignment.mySubmission || null
  const canStudentSubmit = (assignment) => {
    const mine = studentWork(assignment)
    if (!mine) return true
    if (mine.status === 'graded') return false
    const overdue = new Date(assignment.dueDate) < new Date()
    return !overdue || assignment.allowResubmission
  }

  return (
    <Panel
      title="Assignments"
      action={isTeacher && courseId ? (
        <button type="button" className="btn btn-primary btn-sm" onClick={startCreate}><Plus size={16} /> {showForm && !editingId ? 'Close' : 'Add'}</button>
      ) : null}
    >
      {coursesLoading ? <Loading /> : (
        <>
          <CoursePicker courses={courses} courseId={courseId} setCourseId={setCourseId} />
          {message && <p className={`small ${messageOk ? 'text-success' : 'text-danger'}`}>{message}</p>}

          {showForm && isTeacher && (
            <form className="border rounded p-3 mb-3" onSubmit={saveAssignment}>
              <h6 className="mb-2">{editingId ? 'Edit assignment' : 'Create assignment'}</h6>
              <label className="d-block mb-2">Title<input className="form-control" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
              <label className="d-block mb-2">Description<textarea className="form-control" rows="2" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
              <label className="d-block mb-2">Due date<input type="datetime-local" className="form-control" required value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></label>
              <label className="d-block mb-2">Total marks<input type="number" min="1" className="form-control" required value={form.totalMarks} onChange={(e) => setForm({ ...form, totalMarks: e.target.value })} /></label>
              <label className="form-check mb-3">
                <input className="form-check-input" type="checkbox" checked={form.allowResubmission} onChange={(e) => setForm({ ...form, allowResubmission: e.target.checked })} />
                <span className="form-check-label">Allow resubmission after the deadline</span>
              </label>
              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-primary btn-sm">{editingId ? 'Save changes' : 'Save assignment'}</button>
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={resetForm}>Cancel</button>
              </div>
            </form>
          )}

          {loading ? <Loading /> : !assignments.length ? <Empty title="assignments" role={user.role} /> : (
            <div className="list-group list-group-flush">
              {assignments.map((a) => {
                const mine = studentWork(a)
                const overdue = new Date(a.dueDate) < new Date()
                return (
                  <div className="list-group-item px-0 py-3" key={a._id}>
                    <div className="d-flex justify-content-between gap-3 flex-wrap">
                      <div>
                        <b>{a.title}</b>
                        <small className="d-block text-muted">
                          Due {fmtDate(a.dueDate)} · {a.totalMarks} marks
                          {overdue ? ' · overdue' : ''}
                          {isTeacher ? ` · ${a.submissionCount || 0} submissions` : ''}
                        </small>
                        {a.description ? <p className="small mb-1 mt-1">{a.description}</p> : null}
                        {mine && (
                          <div className="small mt-1">
                            <div>Status: {mine.status}{mine.marks != null ? ` · ${mine.marks}/${a.totalMarks} marks` : ''}</div>
                            {mine.fileName ? <div>File: {mine.originalName || mine.fileName}</div> : null}
                            {mine.link ? <div>Link: {mine.link}</div> : null}
                            {(mine.feedbackId?.comments || mine.feedback?.comments) ? (
                              <div className="mt-1 p-2 rounded" style={{ background: '#f4f0ff' }}>
                                <b>Teacher feedback:</b> {mine.feedbackId?.comments || mine.feedback?.comments}
                              </div>
                            ) : mine.status === 'graded' ? (
                              <div className="text-muted">Graded — no written comments yet.</div>
                            ) : null}
                          </div>
                        )}
                      </div>
                      <div className="d-flex gap-2 align-items-start flex-wrap">
                        {isTeacher && (
                          <>
                            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => startEdit(a)}>Edit</button>
                            <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => deleteAssignment(a)}>Delete</button>
                            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => loadSubmissions(a._id)}>Submissions</button>
                          </>
                        )}
                        {user.role === 'student' && canStudentSubmit(a) && (
                          <button type="button" className="btn btn-sm btn-primary" onClick={() => setSubmitForm({ ...emptySubmit, assignmentId: a._id, text: mine?.text || '', link: mine?.link || '' })}>
                            {mine ? 'Resubmit' : 'Submit'}
                          </button>
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
              <p className="small text-muted">Upload a file, write an answer, or add a link. At least one is required.</p>
              <textarea className="form-control mb-2" placeholder="Your answer or notes" value={submitForm.text} onChange={(e) => setSubmitForm({ ...submitForm, text: e.target.value })} />
              <input className="form-control mb-2" placeholder="Link (optional)" value={submitForm.link} onChange={(e) => setSubmitForm({ ...submitForm, link: e.target.value })} />
              <input type="file" className="form-control mb-2" onChange={(e) => setSubmitForm({ ...submitForm, file: e.target.files?.[0] || null })} />
              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-primary btn-sm">Send submission</button>
                <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setSubmitForm(emptySubmit)}>Cancel</button>
              </div>
            </form>
          )}

          {isTeacher && viewSubmissions && (
            <div className="mt-4">
              <h6>Submissions & grading</h6>
              {!teacherSubs.length ? <p className="text-muted small">No submissions yet.</p> : teacherSubs.map((s) => (
                <div className="border rounded p-3 mb-2" key={s._id}>
                  <b>{s.studentId?.name || 'Student'}</b>
                  {s.text ? <p className="small mb-1">{s.text}</p> : null}
                  {s.link ? <p className="small mb-1"><a href={s.link} target="_blank" rel="noreferrer">{s.link}</a></p> : null}
                  {s.fileName ? (
                    <button type="button" className="btn btn-link btn-sm px-0" onClick={() => downloadFile(s)}>
                      Download {s.originalName || s.fileName}
                    </button>
                  ) : null}
                  {!s.text && !s.link && !s.fileName ? <p className="small mb-1">File submission</p> : null}
                  <small className="d-block text-muted">Submitted {fmtDate(s.submittedAt)} · {s.status}</small>
                  {s.status !== 'graded' ? (
                    <form className="mt-2 d-flex gap-2 flex-wrap" onSubmit={async (e) => {
                      e.preventDefault()
                      const marks = e.target.marks.value
                      const comments = e.target.comments.value
                      try {
                        await contentApi.feedback(s._id, { marks: Number(marks), comments })
                        setMessageOk(true)
                        setMessage('Graded successfully.')
                        loadSubmissions(viewSubmissions)
                      } catch (err) {
                        setMessageOk(false)
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
