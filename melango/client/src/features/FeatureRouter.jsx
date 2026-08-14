import React from 'react'
import { useLocation } from 'react-router-dom'
import { AssignmentsFeature, MaterialsFeature, QuizzesFeature } from './academicFeatures'
import { AnnouncementsFeature, DiscussionsFeature, MessagesFeature, NotificationsFeature } from './communityFeatures'
import { AdminPanel, CourseCreation, MyCourses, RoleManagement, SearchFilter } from './coreFeatures'
import { AttendanceFeature, CalendarFeature, ProgressFeature } from './trackingFeatures'
import { GamificationFeature } from './gamificationFeature'

function PageShell({ user, eyebrow, title, children }) {
  return (
    <section className="dashboard">
      <div className="page-title">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
        </div>
      </div>
      {children}
    </section>
  )
}

const FEATURE_MAP = {
  users: { title: 'User management', Component: RoleManagement },
  'create-course': { title: 'Create course', Component: CourseCreation },
  courses: { title: 'Courses', Component: MyCourses },
  search: { title: 'Search', Component: SearchFilter },
  assignments: { title: 'Assignments', Component: AssignmentsFeature },
  materials: { title: 'Materials', Component: MaterialsFeature },
  quizzes: { title: 'Quizzes', Component: QuizzesFeature },
  announcements: { title: 'Announcements', Component: AnnouncementsFeature },
  discussions: { title: 'Discussions', Component: DiscussionsFeature },
  messages: { title: 'Messages', Component: MessagesFeature },
  notifications: { title: 'Notifications', Component: NotificationsFeature },
  attendance: { title: 'Attendance', Component: AttendanceFeature },
  calendar: { title: 'Calendar', Component: CalendarFeature },
  progress: { title: 'Progress', Component: ProgressFeature },
  gamification: { title: 'Achievements', Component: GamificationFeature },
  reports: { title: 'Admin panel', Component: AdminPanel },
  categories: { title: 'Admin panel', Component: AdminPanel },
  students: { title: 'Students', Component: MyCourses },
  certificates: { title: 'Certificates', Component: ProgressFeature },
  reviews: { title: 'Reviews', Component: ProgressFeature },
  profile: { title: 'Settings', Component: null },
}

export function FeatureRouter({ user }) {
  const path = useLocation().pathname.split('/').pop()
  const feature = FEATURE_MAP[path]

  if (!feature) {
    return (
      <PageShell user={user} eyebrow={`${user.role.toUpperCase()} WORKSPACE`} title="Page not found">
        <p className="text-muted">This section is not available.</p>
      </PageShell>
    )
  }

  const { title, Component } = feature
  if (!Component) {
    return (
      <PageShell user={user} eyebrow={`${user.role.toUpperCase()} WORKSPACE`} title={title}>
        <p className="text-muted">Profile settings coming soon.</p>
      </PageShell>
    )
  }

  return (
    <PageShell user={user} eyebrow={`${user.role.toUpperCase()} WORKSPACE`} title={title}>
      <Component user={user} />
    </PageShell>
  )
}

export default FeatureRouter
