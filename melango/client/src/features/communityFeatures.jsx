import React, { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Bell, Plus } from '../icons'
import { apiError, asList, contentApi, courseApi, engagementApi, unwrap } from '../services/api'
import { CoursePicker, Empty, fmtDate, Loading, Panel, personName, useAccessibleCourses } from './shared'

/* Feature 9: Announcements */
export function AnnouncementsFeature({ user }) {
  const { courses, courseId, setCourseId } = useAccessibleCourses(user, { autoSelect: user.role === 'teacher' })
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title: '', message: '' })
  const [message, setMessage] = useState('')
  const isTeacher = user.role === 'teacher' || user.role === 'admin'

  const load = async () => {
    setLoading(true)
    try {
      const params = courseId ? { courseId } : {}
      setItems(unwrap(await contentApi.announcements(params)) || [])
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [courseId])

  const post = async (e) => {
    e.preventDefault()
    if (user.role === 'teacher' && !courseId) {
      setMessage('Select a course so your students can see the announcement.')
      return
    }
    try {
      await contentApi.addAnnouncement({ ...form, courseId: courseId || undefined })
      setForm({ title: '', message: '' })
      setMessage('Announcement posted.')
      load()
    } catch (err) {
      setMessage(apiError(err))
    }
  }

  const remove = async (id) => {
    try {
      await contentApi.removeAnnouncement(id)
      setItems((current) => current.filter((item) => (item._id || item.id) !== id))
      setMessage('Announcement deleted.')
    } catch (err) {
      setMessage(apiError(err))
    }
  }

  return (
    <Panel title="Announcement board">
      <CoursePicker
        courses={courses}
        courseId={courseId}
        setCourseId={setCourseId}
        allowAll
        allLabel={user.role === 'admin' ? 'Platform-wide (all students)' : 'All my courses'}
      />
      {isTeacher && (
        <form className="border rounded p-3 mb-3" onSubmit={post}>
          <p className="small text-muted mb-2">{courseId ? 'Students enrolled in this course will see this announcement and can comment.' : 'Select a course first. Only admins can post to every student.'}</p>
          <input className="form-control mb-2" placeholder="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea className="form-control mb-2" placeholder="Message" required rows="3" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
          <button className="btn btn-primary btn-sm"><Plus size={14} /> Post announcement</button>
        </form>
      )}
      {message && <p className="small text-success">{message}</p>}
      {loading ? <Loading /> : !items.length ? <Empty title="announcements" role={user.role} /> : (
        <div className="list-group list-group-flush">
          {items.map((a) => (
            <div className="list-group-item px-0 py-3" key={a._id}>
              <b>{a.title}</b>
              <small className="d-block text-muted mb-1">
                From {a.postedBy?.name || 'Teacher'}{a.postedBy?.role ? ` (${a.postedBy.role})` : ''}
                {a.courseId?.courseName ? ` · ${a.courseId.courseName}` : ' · All courses'}
              </small>
              <p className="small mb-1">{a.message}</p>
              <div className="d-flex align-items-center gap-3">
                <small className="text-muted">{fmtDate(a.createdAt)}</small>
                {isTeacher ? <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => remove(a._id || a.id)}>Delete</button> : null}
              </div>
              {(a.comments || []).map((c) => (
                <div className="ms-3 mt-2 border-start ps-2" key={c._id || c.createdAt}>
                  <p className="small mb-0">{c.message}</p>
                  <small className="text-muted">{personName(c.userId)} · {fmtDate(c.createdAt)}</small>
                </div>
              ))}
              <form className="mt-2 d-flex gap-2" onSubmit={async (e) => {
                e.preventDefault()
                const input = e.target.comment
                if (!input.value.trim()) return
                try {
                  await contentApi.commentAnnouncement(a._id, { message: input.value })
                  input.value = ''
                  setMessage('Comment posted.')
                  load()
                } catch (err) {
                  setMessage(apiError(err))
                }
              }}>
                <input name="comment" className="form-control form-control-sm" placeholder="Write a comment…" />
                <button type="submit" className="btn btn-sm btn-outline-primary">Comment</button>
              </form>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}

/* Feature 10: Discussions */
export function DiscussionsFeature({ user }) {
  const { courses, courseId, setCourseId, loading: coursesLoading } = useAccessibleCourses(user)
  const [threads, setThreads] = useState([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ topic: '', message: '' })
  const [reply, setReply] = useState({ id: '', message: '' })
  const [message, setMessage] = useState('')

  const load = async () => {
    if (!courseId) return
    setLoading(true)
    try {
      setThreads(unwrap(await contentApi.discussions(courseId)) || [])
    } catch {
      setThreads([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [courseId])

  const create = async (e) => {
    e.preventDefault()
    try {
      await contentApi.addDiscussion(courseId, form)
      setForm({ topic: '', message: '' })
      load()
    } catch (err) {
      setMessage(apiError(err))
    }
  }

  return (
    <Panel title="Discussion forum">
      {coursesLoading ? <Loading /> : (
        <>
          <CoursePicker courses={courses} courseId={courseId} setCourseId={setCourseId} />
          {message && <p className="small">{message}</p>}
          {courseId && (
            <form className="border rounded p-3 mb-3" onSubmit={create}>
              <input className="form-control mb-2" placeholder="Topic" required value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
              <textarea className="form-control mb-2" placeholder="Start the discussion" required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
              <button className="btn btn-primary btn-sm">New thread</button>
            </form>
          )}
          {loading ? <Loading /> : !threads.length ? <Empty title="discussions" role={user.role} /> : (
            threads.map((t) => (
              <div className="border rounded p-3 mb-3" key={t._id}>
                <div className="d-flex justify-content-between gap-2">
                  <b>{t.topic}</b>
                  {(String(t.userId?._id || t.userId) === String(user._id || user.id) || user.role === 'teacher' || user.role === 'admin') && (
                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={async () => {
                      try {
                        await contentApi.removeDiscussion(t._id)
                        setMessage('Thread deleted.')
                        load()
                      } catch (err) {
                        setMessage(apiError(err))
                      }
                    }}>Delete</button>
                  )}
                </div>
                <p className="small">{t.message}</p>
                <small className="text-muted">{personName(t.userId || t.authorId)} · {fmtDate(t.createdAt)}</small>
                {(t.replies || []).map((r) => (
                  <div className="ms-3 mt-2 border-start ps-2" key={r._id || r.createdAt}>
                    <p className="small mb-0">{r.message}</p>
                    <small className="text-muted">{personName(r.userId || r.authorId)} · {fmtDate(r.createdAt)}</small>
                  </div>
                ))}
                <form className="mt-2 d-flex gap-2" onSubmit={async (e) => {
                  e.preventDefault()
                  if (!reply.message.trim()) return
                  try {
                    await contentApi.reply(t._id, { message: reply.message })
                    setReply({ id: '', message: '' })
                    load()
                  } catch (err) {
                    setMessage(apiError(err))
                  }
                }}>
                  <input className="form-control form-control-sm" placeholder="Reply…" value={reply.id === t._id ? reply.message : ''} onFocus={() => setReply({ id: t._id, message: reply.message })} onChange={(e) => setReply({ id: t._id, message: e.target.value })} />
                  <button type="submit" className="btn btn-sm btn-outline-primary">Send</button>
                </form>
              </div>
            ))
          )}
        </>
      )}
    </Panel>
  )
}

/* Feature 16: Messaging */
export function MessagesFeature({ user }) {
  const [active, setActive] = useState(null)
  const [activeName, setActiveName] = useState('')
  const [messages, setMessages] = useState([])
  const [people, setPeople] = useState([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const myId = String(user._id || user.id)

  const loadInbox = async () => {
    setLoading(true)
    try {
      const [inbox, contacts] = await Promise.all([
        engagementApi.messages().then(unwrap).catch(() => []),
        engagementApi.contacts().then(unwrap).catch(() => []),
      ])
      const convos = Array.isArray(inbox) ? inbox : []
      const seen = new Set()
      const merged = []
      convos.forEach((c) => {
        if (!c.user?._id) return
        seen.add(String(c.user._id))
        merged.push({ ...c.user, unreadCount: c.unreadCount, lastMessage: c.lastMessage })
      })
      ;(contacts || []).forEach((c) => {
        if (!seen.has(String(c._id))) merged.push(c)
      })
      setPeople(merged)
      setError(merged.length ? '' : (user.role === 'student' ? 'Enroll in a course to message your teacher.' : 'Students appear here after they enroll in your course.'))
    } catch (err) {
      setPeople([])
      setError(apiError(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadInbox() }, [])

  const openChat = async (person) => {
    const userId = person._id || person
    setActive(userId)
    setActiveName(person.name || '')
    try {
      const data = unwrap(await engagementApi.conversation(userId))
      setMessages(asList(data, ['messages']))
    } catch {
      setMessages([])
    }
  }

  const send = async (e) => {
    e.preventDefault()
    if (!active || !draft.trim()) return
    try {
      await engagementApi.sendMessage({ receiverId: active, content: draft })
      setDraft('')
      openChat({ _id: active, name: activeName })
      loadInbox()
    } catch (err) {
      setError(apiError(err))
    }
  }

  return (
    <Panel title="Direct messages">
      <p className="small text-muted">Students and teachers who share a course can message each other directly.</p>
      {loading ? <Loading /> : (
        <div className="row g-3">
          <div className="col-md-4">
            <h6>{user.role === 'student' ? 'Teachers' : 'Students'}</h6>
            {!people.length ? <p className="small text-muted">{error || 'No contacts yet.'}</p> : people.map((c) => (
              <button type="button" key={c._id} className={`list-group-item list-group-item-action ${active === c._id ? 'active' : ''}`} onClick={() => openChat(c)}>
                <b>{c.name}</b> <small>({c.role})</small>
                {c.unreadCount ? <span className="badge bg-primary ms-1">{c.unreadCount}</span> : null}
                {c.lastMessage?.content ? <small className="d-block text-truncate">{c.lastMessage.content}</small> : null}
              </button>
            ))}
          </div>
          <div className="col-md-8">
            {active ? (
              <>
                <h6 className="mb-2">Chat with {activeName}</h6>
                <div className="border rounded p-3 mb-2" style={{ minHeight: 200, maxHeight: 320, overflowY: 'auto' }}>
                  {messages.map((m) => (
                    <div key={m._id} className={`mb-2 ${String(m.senderId?._id || m.senderId) === myId ? 'text-end' : ''}`}>
                      <span className="badge bg-light text-dark text-wrap">{m.content}</span>
                      <small className="d-block text-muted">{fmtDate(m.createdAt)}</small>
                    </div>
                  ))}
                </div>
                <form className="d-flex gap-2" onSubmit={send}>
                  <input className="form-control" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type a message…" />
                  <button className="btn btn-primary">Send</button>
                </form>
              </>
            ) : <Empty title="conversation" hint={user.role === 'student' ? 'Select your teacher to send a message.' : 'Select a student to start a conversation.'} />}
          </div>
        </div>
      )}
    </Panel>
  )
}

function notificationHref(link) {
  if (!link) return '/app/notifications'
  if (link.startsWith('/app')) return link
  if (link.includes('assignment')) return '/app/assignments'
  if (link.includes('discussion')) return '/app/discussions'
  if (link.includes('announcement')) return '/app/announcements'
  if (link.includes('calendar')) return '/app/calendar'
  return '/app' + link
}

/* Feature 15: Notifications */
export function NotificationsFeature() {
  const [items, setItems] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const data = unwrap(await engagementApi.notifications())
      const list = asList(data)
      setItems(list)
      setUnreadCount(data?.unreadCount ?? list.filter((n) => !n.isRead).length)
    } catch {
      setItems([])
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const markRead = async (id) => {
    await engagementApi.readNotification(id)
    load()
  }

  const markAll = async () => {
    await engagementApi.readAllNotifications()
    load()
  }

  const remove = async (id) => {
    await engagementApi.removeNotification(id)
    load()
  }

  return (
    <Panel title="Notifications" action={<button className="btn btn-sm btn-outline-secondary" onClick={markAll}>Mark all read</button>}>
      {unreadCount > 0 && <p className="small text-muted">{unreadCount} unread</p>}
      {loading ? <Loading /> : !items.length ? <Empty title="notifications" /> : (
        <div className="list-group list-group-flush">
          {items.map((n) => (
            <div className={`list-group-item px-0 py-3 ${n.isRead ? '' : 'fw-semibold'}`} key={n._id}>
              <div className="d-flex justify-content-between gap-3">
                <div>
                  <span className="badge text-bg-light text-capitalize me-2">{n.type || 'system'}</span>
                  <b>{n.title}</b>
                  <p className="small mb-0">{n.message}</p>
                  <small className="text-muted">{fmtDate(n.createdAt)}</small>
                  {n.link ? <NavLink className="d-block small" to={notificationHref(n.link)}>Open</NavLink> : null}
                </div>
                <div className="d-flex flex-column align-items-end">
                  {!n.isRead && <button type="button" className="btn btn-sm btn-link" onClick={() => markRead(n._id)}>Mark read</button>}
                  <button type="button" className="btn btn-sm btn-link text-danger" onClick={() => remove(n._id)}>Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}

export function NotificationBell() {
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const data = unwrap(await engagementApi.notifications())
        const count = data?.unreadCount ?? asList(data).filter((n) => !n.isRead).length
        if (active) setUnread(count)
      } catch {
        if (active) setUnread(0)
      }
    }
    load()
    const timer = setInterval(load, 20000)
    return () => { active = false; clearInterval(timer) }
  }, [])

  return (
    <NavLink to="/app/notifications" aria-label="Notifications" className="notif-bell">
      <Bell size={20} />
      {unread > 0 ? <span className="notif-badge">{unread > 9 ? '9+' : unread}</span> : null}
    </NavLink>
  )
}

function Stars({ value, onChange }) {
  return (
    <div className="d-flex gap-1 mb-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <button type="button" key={n} className="btn btn-sm btn-link p-0" onClick={() => onChange(n)} aria-label={`${n} stars`}>
          <span style={{ color: n <= value ? '#f4ad37' : '#d9d2e6', fontSize: 20 }}>★</span>
        </button>
      ))}
    </div>
  )
}

/* Reviews: students rate the app, teachers, and courses */
export function ReviewsFeature({ user }) {
  const { courses } = useAccessibleCourses(user, { autoSelect: false })
  const [tab, setTab] = useState('course')
  const [courseId, setCourseId] = useState('')
  const [teacherId, setTeacherId] = useState('')
  const [teachers, setTeachers] = useState([])
  const [bundle, setBundle] = useState({ reviews: [], averageRating: 0, myReview: null })
  const [form, setForm] = useState({ rating: 5, comment: '' })
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const isStudent = user.role === 'student'

  useEffect(() => {
    const unique = []
    const seen = new Set()
    courses.forEach((c) => {
      const teacher = c.teacherId
      const id = teacher?._id || teacher
      if (id && !seen.has(String(id))) {
        seen.add(String(id))
        unique.push({ _id: id, name: teacher?.name || 'Teacher' })
      }
    })
    setTeachers(unique)
    if (!courseId && courses[0]?._id) setCourseId(courses[0]._id)
    if (!teacherId && unique[0]?._id) setTeacherId(unique[0]._id)
  }, [courses])

  const load = async () => {
    setLoading(true)
    try {
      if (tab === 'course' && courseId) {
        setBundle(unwrap(await engagementApi.reviews(courseId)) || { reviews: [] })
      } else if (tab === 'teacher' && teacherId) {
        setBundle(unwrap(await engagementApi.platformReviews({ targetType: 'teacher', teacherId })) || { reviews: [] })
      } else if (tab === 'app') {
        setBundle(unwrap(await engagementApi.platformReviews({ targetType: 'app' })) || { reviews: [] })
      } else {
        setBundle({ reviews: [], averageRating: 0, myReview: null })
      }
    } catch {
      setBundle({ reviews: [], averageRating: 0, myReview: null })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [tab, courseId, teacherId])

  const submit = async (e) => {
    e.preventDefault()
    try {
      if (tab === 'course') await engagementApi.addReview(courseId, form)
      else if (tab === 'teacher') await engagementApi.addPlatformReview({ targetType: 'teacher', teacherId, ...form })
      else await engagementApi.addPlatformReview({ targetType: 'app', ...form })
      setMessage('Thanks — your review was saved.')
      setForm({ rating: 5, comment: '' })
      load()
    } catch (err) {
      setMessage(apiError(err))
    }
  }

  const reviews = bundle.reviews || []

  return (
    <Panel title="Reviews & ratings">
      <div className="d-flex gap-2 mb-3 flex-wrap">
        {['course', 'teacher', 'app'].map((item) => (
          <button type="button" key={item} className={`btn btn-sm ${tab === item ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setTab(item)}>
            {item === 'app' ? 'Melango app' : item === 'teacher' ? 'Teachers' : 'Courses'}
          </button>
        ))}
      </div>
      {tab === 'course' && <CoursePicker courses={courses} courseId={courseId} setCourseId={setCourseId} />}
      {tab === 'teacher' && (
        teachers.length ? (
          <select className="form-select w-auto mb-3" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
            {teachers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
        ) : <p className="text-muted small">Enroll in a course to review its teacher.</p>
      )}
      <p className="small text-muted">Average: {bundle.averageRating || 0}/5 · {reviews.length} review{reviews.length === 1 ? '' : 's'}</p>
      {isStudent && (tab !== 'course' || courseId) && (tab !== 'teacher' || teacherId) && (
        <form className="border rounded p-3 mb-3" onSubmit={submit}>
          <Stars value={form.rating} onChange={(rating) => setForm({ ...form, rating })} />
          <textarea className="form-control mb-2" rows="2" placeholder="Share your opinion…" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} />
          <button className="btn btn-primary btn-sm">Submit review</button>
        </form>
      )}
      {message && <p className="small text-success">{message}</p>}
      {loading ? <Loading /> : !reviews.length ? <Empty title="reviews" hint={isStudent ? 'Be the first to leave a rating.' : 'Student reviews will appear here.'} /> : (
        reviews.map((r) => (
          <div className="border-bottom py-2" key={r._id}>
            <b>{r.studentId?.name || 'Student'}</b>
            <small className="ms-2">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</small>
            {r.comment ? <p className="small mb-0">{r.comment}</p> : null}
          </div>
        ))
      )}
    </Panel>
  )
}
