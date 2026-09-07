import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
  timeout: 15000,
})
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('melango_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
export const unwrap = (response) => response.data?.data ?? response.data
export const asList = (value, keys = ['notifications', 'messages', 'records', 'courses', 'items']) => {
  if (Array.isArray(value)) return value
  if (value && typeof value === 'object') {
    for (const key of keys) {
      if (Array.isArray(value[key])) return value[key]
    }
  }
  return []
}
export const apiError = (error) => error.response?.data?.message || 'Something went wrong. Please try again.'

export const authApi = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  profile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
}
export const courseApi = {
  list: (params) => api.get('/courses', { params }), get: (id) => api.get(`/courses/${id}`),
  create: (data) => api.post('/courses', data), update: (id, data) => api.put(`/courses/${id}`, data),
  remove: (id) => api.delete(`/courses/${id}`), myEnrollments: () => api.get('/enrollments/my'),
  join: (data) => api.post('/enrollments/join', data), enrollments: (id) => api.get(`/enrollments/course/${id}`),
}
export const contentApi = {
  materials: (courseId) => api.get(`/courses/${courseId}/materials`), addMaterial: (courseId, data) => api.post(`/courses/${courseId}/materials`, data),
  removeMaterial: (id) => api.delete(`/materials/${id}`), materialDownload: (id) => api.get(`/materials/${id}/download`),
  assignments: (courseId) => api.get(`/courses/${courseId}/assignments`), addAssignment: (courseId, data) => api.post(`/courses/${courseId}/assignments`, data),
  updateAssignment: (id, data) => api.put(`/assignments/${id}`, data), removeAssignment: (id) => api.delete(`/assignments/${id}`),
  submitAssignment: (id, data) => api.post(`/assignments/${id}/submissions`, data), submissions: (id) => api.get(`/assignments/${id}/submissions`),
  mySubmissions: () => api.get('/submissions/my'), downloadSubmission: (id) => api.get(`/submissions/${id}/download`, { responseType: 'blob' }),
  feedback: (id, data) => api.post(`/submissions/${id}/feedback`, data),
  quizzes: (courseId) => api.get(`/courses/${courseId}/quizzes`), addQuiz: (courseId, data) => api.post(`/courses/${courseId}/quizzes`, data),
  updateQuiz: (id, data) => api.put(`/quizzes/${id}`, data), removeQuiz: (id) => api.delete(`/quizzes/${id}`),
  attemptQuiz: (id, data) => api.post(`/quizzes/${id}/attempt`, data), quizResults: (id) => api.get(`/quizzes/${id}/results`),
  announcements: (params) => api.get('/announcements', { params }), addAnnouncement: (data) => api.post('/announcements', data),
  commentAnnouncement: (id, data) => api.post(`/announcements/${id}/comments`, data), removeAnnouncement: (id) => api.delete(`/announcements/${id}`),
  discussions: (courseId) => api.get(`/courses/${courseId}/discussions`), addDiscussion: (courseId, data) => api.post(`/courses/${courseId}/discussions`, data),
  reply: (id, data) => api.post(`/discussions/${id}/reply`, data), removeDiscussion: (id) => api.delete(`/discussions/${id}`),
  attendance: (courseId) => api.get(`/courses/${courseId}/attendance`), takeAttendance: (courseId, data) => api.post(`/courses/${courseId}/attendance`, data),
}
export const userApi = { list: (params) => api.get('/users', { params }), updateRole: (id, data) => api.patch(`/users/${id}/role`, data), remove: (id) => api.delete(`/users/${id}`) }
export const engagementApi = {
  messages: () => api.get('/messages'), conversation: (id) => api.get(`/messages/${id}`), sendMessage: (data) => api.post('/messages', data),
  contacts: () => api.get('/users/contacts'),
  notifications: () => api.get('/notifications'), readNotification: (id) => api.patch(`/notifications/${id}/read`), readAllNotifications: () => api.patch('/notifications/read-all'),
  removeNotification: (id) => api.delete(`/notifications/${id}`),
  progress: () => api.get('/progress/my'), courseProgress: (id) => api.get(`/progress/course/${id}`), completeMaterial: (id) => api.post(`/progress/material/${id}/complete`),
  reviews: (id) => api.get(`/courses/${id}/reviews`), addReview: (id, data) => api.post(`/courses/${id}/reviews`, data),
  platformReviews: (params) => api.get('/reviews', { params }), addPlatformReview: (data) => api.post('/reviews', data),
  certificates: () => api.get('/certificates/my'), generateCertificate: (id) => api.post(`/certificates/generate/${id}`), certificate: (id) => api.get(`/certificates/${id}`),
  calendar: (params) => api.get('/calendar', { params }), addCalendarEvent: (data) => api.post('/calendar', data),
  updateCalendarEvent: (id, data) => api.put(`/calendar/${id}`, data), removeCalendarEvent: (id) => api.delete(`/calendar/${id}`),
  checkout: (data) => api.post('/payments/checkout', data), payments: () => api.get('/payments/my'),
}
export const dashboardApi = {
  stats: () => api.get('/dashboard/stats'),
  activity: () => api.get('/dashboard/activity'),
}
export const gamificationApi = {
  me: () => api.get('/gamification/me'),
  leaderboard: () => api.get('/gamification/leaderboard'),
}
export default api
