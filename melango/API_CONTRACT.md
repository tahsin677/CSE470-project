# Melango API Contract (Frontend ↔ Backend)

Base URL: `http://localhost:5000/api`  
Auth: `Authorization: Bearer <JWT>`  
Roles: `student` | `teacher` | `admin`

## Auth
- `POST /auth/register` `{ name, email, password, role?, department?, semester?, designation? }`
- `POST /auth/login` `{ email, password }` → `{ token, user }`
- `GET /auth/me` → current user
- `PUT /auth/profile` `{ name, department, semester, designation, profileImage }`
- `PUT /auth/change-password` `{ currentPassword, newPassword }`

## Users (admin)
- `GET /users`
- `PATCH /users/:id/role`
- `DELETE /users/:id`

## Courses
- `GET /courses?search=&category=&instructor=`
- `GET /courses/:id`
- `POST /courses` (teacher/admin) `{ courseName, description, category, price?, isPremium?, thumbnail? }` → auto `enrollmentCode`
- `PUT /courses/:id`
- `DELETE /courses/:id`

## Enrollments
- `POST /enrollments/join` `{ enrollmentCode }`
- `GET /enrollments/my`
- `GET /enrollments/course/:courseId` (teacher/admin)

## Materials
- `GET /courses/:courseId/materials`
- `POST /courses/:courseId/materials` multipart: `file`, fields: `title`, `fileType`
- `DELETE /materials/:id`
- `GET /materials/:id/download`

## Assignments
- `GET /courses/:courseId/assignments`
- `POST /courses/:courseId/assignments` `{ title, description, dueDate }`
- `PUT /assignments/:id`
- `DELETE /assignments/:id`
- `POST /assignments/:id/submissions` multipart optional + `{ text?, link? }`
- `GET /assignments/:id/submissions`
- `GET /submissions/my`
- `POST /submissions/:id/feedback` `{ marks, comments }`

## Quizzes
- `GET /courses/:courseId/quizzes`
- `POST /courses/:courseId/quizzes` `{ title, durationMinutes?, questions: [{ questionText, options[], correctIndex, marks }] }`
- `PUT /quizzes/:id`
- `DELETE /quizzes/:id`
- `POST /quizzes/:id/attempt` `{ answers: [{ questionIndex, selectedIndex }] }` → score/result
- `GET /quizzes/:id/results`

## Announcements
- `GET /announcements?courseId=`
- `POST /announcements` `{ title, message, courseId? }`
- `DELETE /announcements/:id`

## Discussions
- `GET /courses/:courseId/discussions`
- `POST /courses/:courseId/discussions` `{ topic, message }`
- `POST /discussions/:id/reply` `{ message }`

## Messages
- `GET /messages`
- `GET /messages/:userId`
- `POST /messages` `{ receiverId, content }`

## Notifications
- `GET /notifications`
- `PATCH /notifications/:id/read`
- `PATCH /notifications/read-all`

## Attendance
- `POST /courses/:courseId/attendance` `{ date, records: [{ studentId, status }] }`
- `GET /courses/:courseId/attendance`
- `GET /attendance/my`

## Progress
- `GET /progress/course/:courseId`
- `POST /progress/material/:materialId/complete`
- `GET /progress/my`

## Reviews
- `POST /courses/:courseId/reviews` `{ rating, comment }`
- `GET /courses/:courseId/reviews`

## Certificates
- `POST /certificates/generate/:courseId` (when progress complete)
- `GET /certificates/my`
- `GET /certificates/:id`

## Calendar
- `GET /calendar?courseId=`
- events derived from assignments/quizzes + stored events
- `POST /calendar` `{ courseId, title, eventDate, eventType }`

## Dashboard
- `GET /dashboard/stats` → role-aware KPIs, deadlines, recentActivity

## Payments (Stripe test mode)
- `POST /payments/checkout` `{ courseId }` → `{ url }` or `{ clientSecret }`
- `POST /payments/webhook` (server)
- `GET /payments/my`

## Standard response
Success: `{ success: true, data }`  
Error: `{ success: false, message }`
