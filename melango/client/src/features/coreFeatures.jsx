import React, { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { Search } from '../icons'
import api, { apiError, courseApi, unwrap, userApi } from '../services/api'
import { CoursePicker, Empty, fmtDate, instructorName, Loading, Panel, useAccessibleCourses } from './shared'

/* Feature 1: Role Management */
export function RoleManagement({ user }) {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const params = {}
      if (search) params.search = search
      if (roleFilter) params.role = roleFilter
      setUsers(unwrap(await userApi.list(params)) || [])
    } catch {
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [search, roleFilter])

  const changeRole = async (id, role) => {
    try {
      await userApi.updateRole(id, { role })
      setMessage('Role updated.')
      load()
    } catch (e) {
      setMessage(apiError(e))
    }
  }

  if (user.role !== 'admin') return <Empty title="access" hint="Admin access required." />

  return (
    <Panel title="User & role management">
      <div className="d-flex gap-2 mb-3 flex-wrap">
        <input className="form-control w-auto" placeholder="Search users…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="form-select w-auto" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All roles</option>
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      {message && <p className="small text-success">{message}</p>}
      {loading ? <Loading /> : !users.length ? <Empty title="users" /> : (
        <div className="table-responsive">
          <table className="table align-middle">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Actions</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td><span className="pill">{u.role}</span></td>
                  <td>
                    <select className="form-select form-select-sm w-auto" value={u.role} onChange={(e) => changeRole(u._id, e.target.value)}>
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}

/* Feature 2: Course Creation */
export function CourseCreation({ user }) {
  const [form, setForm] = useState({ courseName: '', description: '', category: 'Technology', price: 0, isPremium: false })
  const [message, setMessage] = useState('')
  const [created, setCreated] = useState(null)

  if (user?.role !== 'teacher' && user?.role !== 'admin') {
    return <Empty title="course creation" hint="Only teachers can create courses. Students enroll in existing courses." />
  }

  const submit = async (e) => {
    e.preventDefault()
    try {
      const course = unwrap(await courseApi.create(form))
      setCreated(course)
      setMessage(`Course created. Share this enrollment code with students: ${course.enrollmentCode}`)
    } catch (e) {
      setMessage(apiError(e))
    }
  }

  return (
    <form className="panel form-panel" onSubmit={submit}>
      <h5>Create a new course</h5>
      <p className="small text-muted">You will be the instructor. Students join with the enrollment code, subject, or your name.</p>
      <label>Course name<input className="form-control" required value={form.courseName} onChange={(e) => setForm({ ...form, courseName: e.target.value })} /></label>
      <label>Description<textarea className="form-control" required rows="4" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
      <div className="row">
        <label className="col-md-6">Subject / category<input className="form-control" required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></label>
        <label className="col-md-6">Price (USD)<input type="number" min="0" className="form-control" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>
      </div>
      <label className="form-check"><input type="checkbox" className="form-check-input" checked={form.isPremium} onChange={(e) => setForm({ ...form, isPremium: e.target.checked })} /> Premium course</label>
      <button className="btn btn-primary">Create course</button>
      {message && <p className="mt-3 mb-0">{message}</p>}
      {created && <NavLink to="/app/courses" className="small-link d-block mt-2">View my courses →</NavLink>}
    </form>
  )
}

/* Feature 3: Course Enrollment */
export function MyCourses({ user }) {
  const [items, setItems] = useState([])
  const [catalog, setCatalog] = useState([])
  const [code, setCode] = useState('')
  const [find, setFind] = useState('')
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')
  const [messageOk, setMessageOk] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      if (user.role === 'student') {
        const enrollments = unwrap(await courseApi.myEnrollments()) || []
        setItems(enrollments.map((e) => ({ ...e.courseId, enrolledAt: e.enrolledAt, status: e.status, isEnrolled: true })).filter((c) => c && c._id))
        setCatalog(unwrap(await courseApi.list()) || [])
      } else if (user.role === 'admin') {
        setItems(unwrap(await courseApi.list()) || [])
      } else {
        setItems(unwrap(await courseApi.list({ mine: 'true' })) || [])
      }
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [user.role])

  const join = async (payload) => {
    try {
      await courseApi.join(payload)
      setMessageOk(true)
      setMessage('Enrolled successfully. You are a student in this course — the teacher stays the instructor.')
      setCode('')
      load()
    } catch (err) {
      setMessageOk(false)
      setMessage(apiError(err))
    }
  }

  const matchesFind = (course) => {
    const q = find.trim().toLowerCase()
    if (!q) return true
    return [course.courseName, course.category, course.enrollmentCode, instructorName(course)]
      .join(' ')
      .toLowerCase()
      .includes(q)
  }

  const enrolledIds = new Set(items.map((c) => String(c._id)))
  const available = catalog.filter((c) => !enrolledIds.has(String(c._id)) && matchesFind(c))

  return (
    <Panel title={user.role === 'student' ? 'My enrolled courses' : 'My courses'}>
      {user.role === 'student' && (
        <>
          <form className="d-flex gap-2 mb-3" onSubmit={(e) => { e.preventDefault(); join({ enrollmentCode: code }) }}>
            <input className="form-control" placeholder="Enrollment code (e.g. CSE470)" value={code} onChange={(e) => setCode(e.target.value)} />
            <button className="btn btn-primary btn-join-course">Join with code</button>
          </form>
          <input className="form-control mb-3" placeholder="Find more courses by subject, instructor, or code…" value={find} onChange={(e) => setFind(e.target.value)} />
        </>
      )}
      {message && <p className={`small ${messageOk ? 'text-success' : 'text-danger'}`}>{message}</p>}
      {loading ? <Loading /> : (
        <>
          {!items.length ? <Empty title="courses" role={user.role} hint={user.role === 'student' ? 'Enroll with a code, subject, or instructor name below.' : 'Create your first course to get started.'} /> : (
            <div className="list-group list-group-flush mb-4">
              {items.map((c) => (
                <div className="list-group-item px-0 py-3 d-flex justify-content-between align-items-center gap-3" key={c._id}>
                  <div>
                    <b>{c.courseName}</b>
                    <small className="d-block text-muted">
                      {c.category}
                      {user.role === 'student' ? ` · Instructor: ${instructorName(c)}` : ` · You are the instructor`}
                    </small>
                    {user.role !== 'student' && c.enrollmentCode ? <small className="d-block">Student code: <strong>{c.enrollmentCode}</strong></small> : null}
                  </div>
                  <NavLink to={user.role === 'student' ? '/app/assignments' : '/app/assignments'} className="btn btn-sm btn-outline-primary">Open</NavLink>
                </div>
              ))}
            </div>
          )}
          {user.role === 'student' && (
            <>
              <h6>Find a course to enroll</h6>
              {!available.length ? <p className="text-muted small">No matching courses. Try another subject, instructor name, or code.</p> : available.map((c) => (
                <div className="list-group-item px-0 py-3 d-flex justify-content-between align-items-center gap-3" key={c._id}>
                  <div>
                    <b>{c.courseName}</b>
                    <small className="d-block text-muted">{c.category} · Instructor: {instructorName(c)} · Code: {c.enrollmentCode}</small>
                  </div>
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => join({ courseId: c._id })}>Enroll as student</button>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </Panel>
  )
}

/* Feature 18: Search & Filter */
export function SearchFilter({ user }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [courses, setCourses] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const search = async (e) => {
    e?.preventDefault()
    setLoading(true)
    try {
      const params = {}
      if (query) params.search = query
      if (category) params.category = category
      setCourses(unwrap(await courseApi.list(params)) || [])
      if (user.role === 'admin' && query) {
        setUsers(unwrap(await userApi.list({ search: query })) || [])
      } else {
        setUsers([])
      }
    } catch {
      setCourses([])
      setUsers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { search() }, [])

  const enroll = async (course) => {
    try {
      await courseApi.join({ courseId: course._id })
      setMessage(`Enrolled in ${course.courseName}. Instructor: ${instructorName(course)}.`)
      search()
    } catch (err) {
      setMessage(apiError(err))
    }
  }

  return (
    <Panel title="Search & filter">
      <form className="searchbox mb-4" onSubmit={search}>
        <Search />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by course, subject, instructor, or code…" />
        <select className="form-select w-auto" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All subjects</option>
          <option value="Technology">Technology</option>
          <option value="Databases">Databases</option>
          <option value="Software Engineering">Software Engineering</option>
          <option value="Design">Design</option>
          <option value="Business">Business</option>
        </select>
        <button type="submit" className="btn btn-primary">Search</button>
      </form>
      {message && <p className="small text-success">{message}</p>}
      {loading ? <Loading /> : (
        <>
          <h6>Courses ({courses.length})</h6>
          {!courses.length ? <p className="text-muted small">No courses found.</p> : (
            <div className="list-group list-group-flush mb-4">
              {courses.map((c) => (
                <div className="list-group-item px-0 d-flex justify-content-between align-items-center gap-3" key={c._id}>
                  <div>
                    <b>{c.courseName}</b>
                    <small className="d-block text-muted">{c.category} · Instructor: {instructorName(c)} · Code: {c.enrollmentCode}</small>
                  </div>
                  {user.role === 'student' && !c.isEnrolled ? (
                    <button type="button" className="btn btn-sm btn-primary" onClick={() => enroll(c)}>Enroll</button>
                  ) : user.role === 'student' ? (
                    <span className="pill">Enrolled as student</span>
                  ) : null}
                </div>
              ))}
            </div>
          )}
          {user.role === 'admin' && users.length > 0 && (
            <>
              <h6>Users ({users.length})</h6>
              <div className="list-group list-group-flush">
                {users.map((u) => (
                  <div className="list-group-item px-0" key={u._id}>
                    <b>{u.name}</b>
                    <small className="d-block text-muted">{u.email} · {u.role}</small>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </Panel>
  )
}

/* Feature 19: Admin Control Panel */
export function AdminPanel({ user }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard/stats')
      .then((r) => setStats(unwrap(r)))
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [])

  if (user.role !== 'admin') return <Empty title="admin panel" hint="Admin access required." />

  const kpis = stats?.kpis || {}

  return (
    <>
      <Panel title="Platform control panel">
        {loading ? <Loading /> : (
          <div className="row g-3">
            {[
              ['Users', kpis.totalUsers], ['Students', kpis.students], ['Teachers', kpis.teachers],
              ['Courses', kpis.totalCourses], ['Enrollments', kpis.totalEnrollments], ['Revenue', `$${kpis.totalRevenue || 0}`],
            ].map(([label, value]) => (
              <div className="col-md-4" key={label}>
                <div className="kpi"><div><small>{label}</small><strong>{value ?? 0}</strong></div></div>
              </div>
            ))}
          </div>
        )}
      </Panel>
      <div className="mt-4"><RoleManagement user={user} /></div>
    </>
  )
}

export { useAccessibleCourses, CoursePicker }
