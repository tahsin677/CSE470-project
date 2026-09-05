import React, { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { BarChart3, BookOpen, ClipboardList, GraduationCap, Plus, Sparkles, Users } from '../icons'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import api, { unwrap } from '../services/api'
import { avatarFor, welcomeNameFor } from '../publicData'
import { fmtDate, Loading } from './shared'

function kpiCards(role, kpis) {
  if (!kpis) return []
  if (role === 'student') {
    return [
      { label: 'Enrolled courses', value: kpis.enrolledCourses ?? 0, icon: BookOpen },
      { label: 'Pending assignments', value: kpis.pendingAssignments ?? 0, icon: ClipboardList },
      { label: 'Overall progress', value: `${kpis.overallProgress ?? 0}%`, icon: BarChart3 },
    ]
  }
  if (role === 'teacher') {
    return [
      { label: 'Active courses', value: kpis.totalCourses ?? 0, icon: BookOpen },
      { label: 'Total students', value: kpis.totalStudents ?? 0, icon: Users },
      { label: 'Pending grading', value: kpis.pendingGrading ?? 0, icon: ClipboardList },
    ]
  }
  return [
    { label: 'Total users', value: kpis.totalUsers ?? 0, icon: Users },
    { label: 'Total courses', value: kpis.totalCourses ?? 0, icon: BookOpen },
    { label: 'Certificates issued', value: kpis.certificatesIssued ?? 0, icon: GraduationCap },
  ]
}

function activityChart(recentActivity) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const counts = days.map((name) => ({ name, hours: 0 }))
  ;(recentActivity || []).forEach((item, i) => {
    counts[i % 7].hours += 1
  })
  if (counts.every((d) => d.hours === 0)) {
    return days.map((name, i) => ({ name, hours: [2, 4, 3, 6, 5, 7, 4][i] }))
  }
  return counts
}

export function AppDashboard({ user }) {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard/stats')
      .then((r) => setStats(unwrap(r)))
      .catch(() => setStats(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Loading />

  const kpis = kpiCards(user.role, stats?.kpis)
  const chart = activityChart(stats?.recentActivity)
  const deadlines = stats?.upcomingDeadlines || []
  const announcements = stats?.announcements || []

  return (
    <section className="dashboard">
      <div className="page-title">
        <div className="dash-welcome">
          <img className="dash-welcome-photo" src={avatarFor(user.role)} alt=""/>
          <div>
            <span className="eyebrow">YOUR LEARNING SPACE</span>
            <h2>
              {user.role === 'admin' ? 'Platform overview' : user.role === 'teacher' ? 'Teaching dashboard' : 'Keep moving forward.'}
            </h2>
            <p className="dash-welcome-name">{welcomeNameFor(user.role)} · {user.role}</p>
          </div>
        </div>
        <NavLink to={user.role === 'teacher' ? '/app/create-course' : '/app/courses'} className="btn btn-primary">
          <Plus size={17} />
          {user.role === 'teacher' ? 'Create course' : 'My courses'}
        </NavLink>
      </div>

      <div className="row g-3">
        {kpis.map((x) => {
          const Icon = x.icon
          return (
            <div className="col-md-4" key={x.label}>
              <div className="kpi">
                <div>
                  <small>{x.label}</small>
                  <strong>{x.value}</strong>
                </div>
                <span><Icon /></span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="row g-4 mt-1">
        <div className="col-lg-8">
          <div className="panel chart-panel">
            <div className="d-flex justify-content-between">
              <div>
                <h5>Learning activity</h5>
                <small>Recent platform activity</small>
              </div>
              <span className="pill">This week</span>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chart}>
                <CartesianGrid vertical={false} stroke="#eeeaf7" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip />
                <Bar dataKey="hours" fill="#7954d9" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="panel">
            <h5>Coming up</h5>
            {deadlines.length ? deadlines.slice(0, 5).map((x) => {
              const d = new Date(x.dueDate)
              return (
                <div className="deadline" key={x._id}>
                  <div className="date">
                    <b>{d.getDate()}</b>
                    <small>{d.toLocaleString('en', { month: 'short' }).toUpperCase()}</small>
                  </div>
                  <div>
                    <b>{x.title}</b>
                    <small>{x.courseName} · {fmtDate(x.dueDate)}</small>
                  </div>
                </div>
              )
            }) : <p className="text-muted small">No upcoming deadlines.</p>}
            <NavLink to="/app/calendar" className="small-link">Open calendar →</NavLink>
          </div>
        </div>
      </div>

      <div className="row g-4 mt-1">
        <div className="col-lg-8">
          {user.role === 'student' ? (
            <div className="panel mb-4">
              <h5>Announcements</h5>
              {announcements.length ? announcements.slice(0, 5).map((item) => (
                <div className="activity" key={item._id}>
                  <span>•</span>
                  <div>
                    <b>{item.title}</b>
                    <small>{fmtDate(item.createdAt)}</small>
                  </div>
                </div>
              )) : <p className="text-muted small">No announcements yet.</p>}
              <NavLink to="/app/announcements" className="small-link">See all announcements →</NavLink>
            </div>
          ) : null}
          <div className="panel">
            <h5>Recent activity</h5>
            {(stats?.recentActivity || []).length ? stats.recentActivity.slice(0, 6).map((x) => (
              <div className="activity" key={x._id}>
                <span>•</span>
                <div>
                  {x.description || x.action}
                  <small>{fmtDate(x.createdAt)}</small>
                </div>
              </div>
            )) : <p className="text-muted small">No recent activity yet.</p>}
          </div>
        </div>
        <div className="col-lg-4">
          <div className="panel purple-panel">
            <Sparkles />
            <h5>Keep your streak alive</h5>
            <p>Small steps today become big wins tomorrow.</p>
            <NavLink to="/app/gamification" className="btn btn-light btn-sm">View achievements</NavLink>
          </div>
        </div>
      </div>
    </section>
  )
}
