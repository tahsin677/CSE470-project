import React, { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import api, { apiError, contentApi, engagementApi, unwrap } from '../services/api'
import { CoursePicker, Empty, fmtDate, Loading, Panel, useAccessibleCourses } from './shared'

/* Feature 9: Announcements */
export function AnnouncementsFeature({ user }) {
  const { courses, courseId, setCourseId } = useAccessibleCourses(user)
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
    try {
      await contentApi.addAnnouncement({ ...form, courseId: courseId || undefined })
      setForm({ title: '', message: '' })
      setMessage('Announcement posted.')
      load()
    } catch (err) {
      setMessage(apiError(err))
    }
  }

  return (
    <Panel title="Announcement board">
      {isTeacher && (
        <>
          <CoursePicker courses={courses} courseId={courseId} setCourseId={setCourseId} />
          <form className="border rounded p-3 mb-3" onSubmit={post}>
            <input className="form-control mb-2" placeholder="Title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <textarea className="form-control mb-2" placeholder="Message" required rows="3" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            <button className="btn btn-primary btn-sm"><Plus size={14} /> Post announcement</button>
          </form>
        </>
      )}
      {message && <p className="small text-success">{message}</p>}
      {loading ? <Loading /> : !items.length ? <Empty title="announcements" role={user.role} /> : (
        <div className="list-group list-group-flush">
          {items.map((a) => (
            <div className="list-group-item px-0 py-3" key={a._id}>
              <b>{a.title}</b>
              <p className="small mb-1">{a.message}</p>
              <small className="text-muted">{a.courseId?.courseName || 'Platform-wide'} · {fmtDate(a.createdAt)}</small>
              {isTeacher && <button className="btn btn-sm btn-link text-danger" onClick={async () => { await contentApi.removeAnnouncement(a._id); load() }}>Delete</button>}
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
                <b>{t.topic}</b>
                <p className="small">{t.message}</p>
                <small className="text-muted">{t.authorId?.name || 'User'} · {fmtDate(t.createdAt)}</small>
                {(t.replies || []).map((r) => (
                  <div className="ms-3 mt-2 border-start ps-2" key={r._id || r.createdAt}>
                    <p className="small mb-0">{r.message}</p>
                    <small className="text-muted">{r.authorId?.name} · {fmtDate(r.createdAt)}</small>
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
  const [conversations, setConversations] = useState([])
  const [active, setActive] = useState(null)
  const [messages, setMessages] = useState([])
  const [contacts, setContacts] = useState([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)

  const loadInbox = async () => {
    setLoading(true)
    try {
      setConversations(unwrap(await engagementApi.messages()) || [])
      setContacts(unwrap(await api.get('/users/contacts')) || [])
    } catch {
      setConversations([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadInbox() }, [])

  const openChat = async (userId) => {
    setActive(userId)
    try {
      setMessages(unwrap(await engagementApi.conversation(userId)) || [])
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
      openChat(active)
      loadInbox()
    } catch (err) {
      alert(apiError(err))
    }
  }

  return (
    <Panel title="Messages">
      {loading ? <Loading /> : (
        <div className="row g-3">
          <div className="col-md-4">
            <h6>Contacts</h6>
            {!contacts.length ? <p className="small text-muted">No contacts yet.</p> : contacts.map((c) => (
              <button key={c._id} className={`list-group-item list-group-item-action ${active === c._id ? 'active' : ''}`} onClick={() => openChat(c._id)}>
                {c.name} <small>({c.role})</small>
              </button>
            ))}
          </div>
          <div className="col-md-8">
            {active ? (
              <>
                <div className="border rounded p-3 mb-2" style={{ minHeight: 200, maxHeight: 320, overflowY: 'auto' }}>
                  {messages.map((m) => (
                    <div key={m._id} className={`mb-2 ${String(m.senderId?._id || m.senderId) === String(user._id || user.id) ? 'text-end' : ''}`}>
                      <span className="badge bg-light text-dark">{m.content}</span>
                      <small className="d-block text-muted">{fmtDate(m.createdAt)}</small>
                    </div>
                  ))}
                </div>
                <form className="d-flex gap-2" onSubmit={send}>
                  <input className="form-control" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Type a message…" />
                  <button className="btn btn-primary">Send</button>
                </form>
              </>
            ) : <Empty title="conversation" hint="Select a contact to start messaging." />}
          </div>
        </div>
      )}
    </Panel>
  )
}

/* Feature 15: Notifications */
export function NotificationsFeature() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      setItems(unwrap(await engagementApi.notifications()) || [])
    } catch {
      setItems([])
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

  return (
    <Panel title="Notifications" action={<button className="btn btn-sm btn-outline-secondary" onClick={markAll}>Mark all read</button>}>
      {loading ? <Loading /> : !items.length ? <Empty title="notifications" /> : (
        <div className="list-group list-group-flush">
          {items.map((n) => (
            <div className={`list-group-item px-0 py-3 ${n.isRead ? '' : 'fw-semibold'}`} key={n._id}>
              <div className="d-flex justify-content-between">
                <div>
                  <b>{n.title}</b>
                  <p className="small mb-0">{n.message}</p>
                  <small className="text-muted">{fmtDate(n.createdAt)}</small>
                </div>
                {!n.isRead && <button className="btn btn-sm btn-link" onClick={() => markRead(n._id)}>Mark read</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  )
}
