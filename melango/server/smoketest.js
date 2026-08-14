/* Temporary verification harness - boots an in-memory MongoDB, runs the seed
   script against it and exercises every route group. Not part of the deliverable. */
/* eslint-disable no-console */
const { MongoMemoryServer } = require('mongodb-memory-server');
const { execFileSync } = require('child_process');
const path = require('path');

let pass = 0;
let fail = 0;
const failures = [];

async function main() {
  const mongo = await MongoMemoryServer.create();
  const uri = `${mongo.getUri()}melango_test`;
  process.env.MONGO_URI = uri;
  process.env.PORT = '5099';
  console.log(`[test] Mongo at ${uri}\n`);

  console.log('--- Running npm run seed ---');
  execFileSync(process.execPath, [path.join(__dirname, 'src/seed.js')], {
    env: { ...process.env, MONGO_URI: uri },
    stdio: 'inherit',
  });

  const app = require('./src/app');
  const { connectDB } = require('./src/config/db');
  await connectDB();
  const server = app.listen(5099);
  const base = 'http://127.0.0.1:5099/api';

  async function call(method, url, { token, body, form } = {}) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    let payload;
    if (form) {
      payload = form;
    } else if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
    const res = await fetch(base + url, { method, headers, body: payload });
    let json = null;
    const text = await res.text();
    try {
      json = JSON.parse(text);
    } catch (e) {
      json = { raw: text.slice(0, 100) };
    }
    return { status: res.status, json };
  }

  function check(label, cond, extra) {
    if (cond) {
      pass += 1;
      console.log(`  ok   ${label}`);
    } else {
      fail += 1;
      failures.push(label);
      console.log(`  FAIL ${label} ${extra ? JSON.stringify(extra).slice(0, 300) : ''}`);
    }
  }

  const section = (name) => console.log(`\n--- ${name} ---`);

  /* ---------- Auth ---------- */
  section('Auth');
  const health = await call('GET', '/health');
  check('GET /health', health.status === 200 && health.json.data.database === 'connected', health.json);

  const adminLogin = await call('POST', '/auth/login', {
    body: { email: 'admin@melango.com', password: 'Admin123!' },
  });
  check('POST /auth/login admin', adminLogin.status === 200 && !!adminLogin.json.data.token, adminLogin.json);
  const adminToken = adminLogin.json.data?.token;

  const teacherLogin = await call('POST', '/auth/login', {
    body: { email: 'teacher@melango.com', password: 'Teacher123!' },
  });
  check('POST /auth/login teacher', teacherLogin.status === 200, teacherLogin.json);
  const teacherToken = teacherLogin.json.data?.token;

  const studentLogin = await call('POST', '/auth/login', {
    body: { email: 'student@melango.com', password: 'Student123!' },
  });
  check('POST /auth/login student', studentLogin.status === 200, studentLogin.json);
  const studentToken = studentLogin.json.data?.token;
  const studentId = studentLogin.json.data?.user?._id;

  const badLogin = await call('POST', '/auth/login', {
    body: { email: 'admin@melango.com', password: 'wrong' },
  });
  check('POST /auth/login rejects bad password (401)', badLogin.status === 401, badLogin.json);

  const reg = await call('POST', '/auth/register', {
    body: { name: 'Test Student', email: 'newstudent@melango.com', password: 'Test123!', role: 'student', semester: 'Fall 2026' },
  });
  check('POST /auth/register', reg.status === 201 && !!reg.json.data.token, reg.json);
  const newStudentToken = reg.json.data?.token;

  const dupe = await call('POST', '/auth/register', {
    body: { name: 'Dupe', email: 'admin@melango.com', password: 'Test123!' },
  });
  check('POST /auth/register duplicate email (409)', dupe.status === 409, dupe.json);

  const badReg = await call('POST', '/auth/register', { body: { name: '', email: 'nope', password: '1' } });
  check('POST /auth/register validation (400)', badReg.status === 400, badReg.json);

  const meRes = await call('GET', '/auth/me', { token: studentToken });
  check('GET /auth/me', meRes.status === 200 && meRes.json.data.email === 'student@melango.com', meRes.json);
  check('GET /auth/me hides password', meRes.json.data && meRes.json.data.password === undefined);

  const noAuth = await call('GET', '/auth/me');
  check('GET /auth/me without token (401)', noAuth.status === 401, noAuth.json);

  const prof = await call('PUT', '/auth/profile', {
    token: studentToken,
    body: { name: 'Tahsin Rahman', department: 'CSE', semester: 'Summer 2026' },
  });
  check('PUT /auth/profile', prof.status === 200 && prof.json.data.semester === 'Summer 2026', prof.json);

  const pw = await call('PUT', '/auth/change-password', {
    token: newStudentToken,
    body: { currentPassword: 'Test123!', newPassword: 'Test456!' },
  });
  check('PUT /auth/change-password', pw.status === 200, pw.json);
  const reLogin = await call('POST', '/auth/login', {
    body: { email: 'newstudent@melango.com', password: 'Test456!' },
  });
  check('login with new password', reLogin.status === 200, reLogin.json);

  const wrongPw = await call('PUT', '/auth/change-password', {
    token: studentToken,
    body: { currentPassword: 'nope', newPassword: 'Whatever1!' },
  });
  check('PUT /auth/change-password wrong current (400)', wrongPw.status === 400, wrongPw.json);

  /* ---------- Users ---------- */
  section('Users');
  const users = await call('GET', '/users', { token: adminToken });
  check('GET /users (admin)', users.status === 200 && users.json.data.length >= 6, { n: users.json.data?.length });

  const usersForbidden = await call('GET', '/users', { token: studentToken });
  check('GET /users as student (403)', usersForbidden.status === 403, usersForbidden.json);

  const newUserId = reg.json.data?.user?._id;
  const roleChange = await call('PATCH', `/users/${newUserId}/role`, {
    token: adminToken,
    body: { role: 'teacher' },
  });
  check('PATCH /users/:id/role', roleChange.status === 200 && roleChange.json.data.role === 'teacher', roleChange.json);

  const contacts = await call('GET', '/users/contacts', { token: studentToken });
  check('GET /users/contacts', contacts.status === 200 && Array.isArray(contacts.json.data), contacts.json);

  /* ---------- Courses ---------- */
  section('Courses');
  const courses = await call('GET', '/courses');
  check('GET /courses (public)', courses.status === 200 && courses.json.data.length === 4, { n: courses.json.data?.length });

  const searched = await call('GET', '/courses?search=Database');
  check('GET /courses?search=', searched.status === 200 && searched.json.data.length === 1, searched.json.data?.map(c => c.courseName));

  const byCat = await call('GET', '/courses?category=Databases');
  check('GET /courses?category=', byCat.status === 200 && byCat.json.data.length === 1, { n: byCat.json.data?.length });

  const cse470 = courses.json.data.find((c) => c.enrollmentCode === 'CSE470');
  const mern = courses.json.data.find((c) => c.enrollmentCode === 'MERN01');
  const one = await call('GET', `/courses/${cse470._id}`, { token: studentToken });
  check('GET /courses/:id', one.status === 200 && one.json.data.stats.materialCount === 4, one.json.data?.stats);
  check('GET /courses/:id isEnrolled', one.json.data?.isEnrolled === true);

  const createCourse = await call('POST', '/courses', {
    token: teacherToken,
    body: { courseName: 'CSE331 - Compilers', description: 'Lexing and parsing', category: 'Systems' },
  });
  check('POST /courses (teacher)', createCourse.status === 201 && /^[A-Z0-9]{6}$/.test(createCourse.json.data.enrollmentCode), createCourse.json.data?.enrollmentCode);
  const newCourseId = createCourse.json.data?._id;
  const newCourseCode = createCourse.json.data?.enrollmentCode;

  const studentCreate = await call('POST', '/courses', {
    token: studentToken,
    body: { courseName: 'Hack', category: 'x' },
  });
  check('POST /courses as student (403)', studentCreate.status === 403, studentCreate.json);

  const upd = await call('PUT', `/courses/${newCourseId}`, {
    token: teacherToken,
    body: { description: 'Updated description', isPremium: true, price: 20 },
  });
  check('PUT /courses/:id', upd.status === 200 && upd.json.data.price === 20, upd.json.data);

  const otherTeacherLogin = await call('POST', '/auth/login', {
    body: { email: 'tanvir@melango.com', password: 'Teacher123!' },
  });
  const otherTeacherToken = otherTeacherLogin.json.data?.token;
  const crossEdit = await call('PUT', `/courses/${newCourseId}`, {
    token: otherTeacherToken,
    body: { courseName: 'Hijacked' },
  });
  check('PUT /courses/:id other teacher (403)', crossEdit.status === 403, crossEdit.json);

  const roster = await call('GET', `/courses/${cse470._id}/students`, { token: teacherToken });
  check('GET /courses/:id/students', roster.status === 200 && roster.json.data.length === 3, { n: roster.json.data?.length });

  /* ---------- Enrollments ---------- */
  section('Enrollments');
  const join = await call('POST', '/enrollments/join', {
    token: newStudentToken,
    body: { enrollmentCode: newCourseCode },
  });
  check('POST /enrollments/join (paid course blocked)', join.status === 400, join.json);

  await call('PUT', `/courses/${newCourseId}`, { token: teacherToken, body: { isPremium: false, price: 0 } });
  const join2 = await call('POST', '/enrollments/join', {
    token: newStudentToken,
    body: { enrollmentCode: newCourseCode.toLowerCase() },
  });
  check('POST /enrollments/join (case-insensitive code)', join2.status === 201, join2.json);

  const joinDupe = await call('POST', '/enrollments/join', {
    token: newStudentToken,
    body: { enrollmentCode: newCourseCode },
  });
  check('POST /enrollments/join duplicate (409)', joinDupe.status === 409, joinDupe.json);

  const joinBad = await call('POST', '/enrollments/join', {
    token: newStudentToken,
    body: { enrollmentCode: 'ZZZZZZ' },
  });
  check('POST /enrollments/join bad code (404)', joinBad.status === 404, joinBad.json);

  const myEnr = await call('GET', '/enrollments/my', { token: studentToken });
  check('GET /enrollments/my', myEnr.status === 200 && myEnr.json.data.length === 3, { n: myEnr.json.data?.length });
  check('GET /enrollments/my has progress', typeof myEnr.json.data?.[0]?.completionPercentage === 'number');

  const courseEnr = await call('GET', `/enrollments/course/${cse470._id}`, { token: teacherToken });
  check('GET /enrollments/course/:courseId', courseEnr.status === 200 && courseEnr.json.data.length === 3, { n: courseEnr.json.data?.length });

  const courseEnrStudent = await call('GET', `/enrollments/course/${cse470._id}`, { token: studentToken });
  check('GET /enrollments/course as student (403)', courseEnrStudent.status === 403, courseEnrStudent.json);

  /* ---------- Materials ---------- */
  section('Materials');
  const mats = await call('GET', `/courses/${cse470._id}/materials`, { token: studentToken });
  check('GET /courses/:courseId/materials', mats.status === 200 && mats.json.data.length === 4, { n: mats.json.data?.length });
  check('materials include isCompleted flag', mats.json.data?.some((m) => m.isCompleted === true));

  const matsUnenrolled = await call('GET', `/courses/${mern._id}/materials`, { token: studentToken });
  check('GET materials for unenrolled course (403)', matsUnenrolled.status === 403, matsUnenrolled.json);

  const fd = new FormData();
  fd.append('title', 'Uploaded Test Note');
  fd.append('fileType', 'pdf');
  fd.append('file', new Blob(['%PDF-1.4 test content'], { type: 'application/pdf' }), 'test-note.pdf');
  const upload = await call('POST', `/courses/${cse470._id}/materials`, { token: teacherToken, form: fd });
  check('POST materials (multipart upload)', upload.status === 201 && !!upload.json.data.fileUrl, upload.json);
  const uploadedId = upload.json.data?._id;

  const dl = await fetch(`${base}/materials/${uploadedId}/download`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const dlText = await dl.text();
  check('GET /materials/:id/download', dl.status === 200 && dlText.includes('%PDF'), { status: dl.status });

  const delMatStudent = await call('DELETE', `/materials/${uploadedId}`, { token: studentToken });
  check('DELETE /materials/:id as student (403)', delMatStudent.status === 403, delMatStudent.json);

  /* ---------- Assignments + submissions + feedback ---------- */
  section('Assignments');
  const asgs = await call('GET', `/courses/${cse470._id}/assignments`, { token: studentToken });
  check('GET /courses/:courseId/assignments (student)', asgs.status === 200 && asgs.json.data.length === 3, { n: asgs.json.data?.length });
  check('student sees mySubmission field', asgs.json.data?.some((a) => a.mySubmission !== null));

  const asgsT = await call('GET', `/courses/${cse470._id}/assignments`, { token: teacherToken });
  check('teacher sees submissionCount', asgsT.status === 200 && typeof asgsT.json.data[0].submissionCount === 'number');

  const createAsg = await call('POST', `/courses/${cse470._id}/assignments`, {
    token: teacherToken,
    body: { title: 'Assignment 3 - Testing Report', description: 'Unit and integration tests', dueDate: new Date(Date.now() + 6 * 864e5).toISOString(), totalMarks: 40 },
  });
  check('POST /courses/:courseId/assignments', createAsg.status === 201, createAsg.json);
  const asgId = createAsg.json.data?._id;

  const badAsg = await call('POST', `/courses/${cse470._id}/assignments`, {
    token: teacherToken,
    body: { title: '' },
  });
  check('POST assignments validation (400)', badAsg.status === 400, badAsg.json);

  const updAsg = await call('PUT', `/assignments/${asgId}`, { token: teacherToken, body: { totalMarks: 50 } });
  check('PUT /assignments/:id', updAsg.status === 200 && updAsg.json.data.totalMarks === 50, updAsg.json);

  const sub = await call('POST', `/assignments/${asgId}/submissions`, {
    token: studentToken,
    body: { text: 'My testing report', link: 'https://github.com/example/tests' },
  });
  check('POST /assignments/:id/submissions (JSON)', sub.status === 201 && sub.json.data.status === 'submitted', sub.json);
  const subId = sub.json.data?._id;

  const resub = await call('POST', `/assignments/${asgId}/submissions`, {
    token: studentToken,
    body: { text: 'Revised testing report' },
  });
  check('resubmit before deadline increments attempt', resub.status === 200 && resub.json.data.attemptCount === 2, resub.json.data);

  const sfd = new FormData();
  sfd.append('text', 'With attachment');
  sfd.append('file', new Blob(['report body'], { type: 'text/plain' }), 'report.txt');
  const subFile = await call('POST', `/assignments/${asgId}/submissions`, { token: studentToken, form: sfd });
  check('POST submissions (multipart)', subFile.status === 200 && !!subFile.json.data.fileUrl, subFile.json);

  const emptySub = await call('POST', `/assignments/${asgId}/submissions`, { token: newStudentToken, body: {} });
  check('POST submissions with no content (400/403)', emptySub.status === 400 || emptySub.status === 403, emptySub.json);

  const subs = await call('GET', `/assignments/${asgId}/submissions`, { token: teacherToken });
  check('GET /assignments/:id/submissions', subs.status === 200 && subs.json.data.length === 1, { n: subs.json.data?.length });

  const subsStudent = await call('GET', `/assignments/${asgId}/submissions`, { token: studentToken });
  check('GET /assignments/:id/submissions as student (403)', subsStudent.status === 403, subsStudent.json);

  const mySubs = await call('GET', '/submissions/my', { token: studentToken });
  check('GET /submissions/my', mySubs.status === 200 && mySubs.json.data.length === 2, { n: mySubs.json.data?.length });

  const grade = await call('POST', `/submissions/${subId}/feedback`, {
    token: teacherToken,
    body: { marks: 45, comments: 'Solid coverage, add edge cases.' },
  });
  check('POST /submissions/:id/feedback', grade.status === 201 && grade.json.data.marks === 45, grade.json);

  const overMarks = await call('POST', `/submissions/${subId}/feedback`, {
    token: teacherToken,
    body: { marks: 999 },
  });
  check('feedback rejects marks over total (400)', overMarks.status === 400, overMarks.json);

  const gradedList = await call('GET', '/submissions/my', { token: studentToken });
  const gradedOne = gradedList.json.data?.find((s) => String(s._id) === String(subId));
  check('graded submission shows status + feedback', gradedOne?.status === 'graded' && gradedOne?.feedbackId?.marks === 45, gradedOne?.status);

  const lateSubmit = await call('POST', `/assignments/${asgs.json.data.find(a => a.title.includes('Assignment 0'))._id}/submissions`, {
    token: newStudentToken,
    body: { text: 'late attempt' },
  });
  check('submitting to past-due assignment marked late or blocked', [201, 400, 403].includes(lateSubmit.status), lateSubmit.json);

  /* ---------- Quizzes ---------- */
  section('Quizzes');
  const quizzes = await call('GET', `/courses/${cse470._id}/quizzes`, { token: studentToken });
  check('GET /courses/:courseId/quizzes', quizzes.status === 200 && quizzes.json.data.length === 1, { n: quizzes.json.data?.length });
  const quizId = quizzes.json.data?.[0]?._id;
  check('student quiz list hides correctIndex', quizzes.json.data?.[0]?.questions?.every((q) => q.correctIndex === undefined), quizzes.json.data?.[0]?.questions?.[0]);

  const quizT = await call('GET', `/quizzes/${quizId}`, { token: teacherToken });
  check('teacher quiz view includes correctIndex', quizT.json.data?.questions?.[0]?.correctIndex !== undefined);

  const createQuiz = await call('POST', `/courses/${cse470._id}/quizzes`, {
    token: teacherToken,
    body: {
      title: 'Quiz 2 - Design Patterns',
      durationMinutes: 12,
      questions: [
        { questionText: 'Singleton guarantees?', options: ['One instance', 'Many instances', 'No instance'], correctIndex: 0, marks: 3 },
        { questionText: 'Observer is used for?', options: ['Cloning', 'Event notification', 'Parsing'], correctIndex: 1, marks: 2 },
      ],
    },
  });
  check('POST /courses/:courseId/quizzes', createQuiz.status === 201 && createQuiz.json.data.totalMarks === 5, createQuiz.json.data?.totalMarks);
  const newQuizId = createQuiz.json.data?._id;

  const badQuiz = await call('POST', `/courses/${cse470._id}/quizzes`, {
    token: teacherToken,
    body: { title: 'Broken', questions: [{ questionText: 'x', options: ['only one'], correctIndex: 0 }] },
  });
  check('quiz rejects question with <2 options (400)', badQuiz.status === 400, badQuiz.json);

  const badIndex = await call('POST', `/courses/${cse470._id}/quizzes`, {
    token: teacherToken,
    body: { title: 'Broken2', questions: [{ questionText: 'x', options: ['a', 'b'], correctIndex: 9 }] },
  });
  check('quiz rejects out-of-range correctIndex (400)', badIndex.status === 400, badIndex.json);

  const attempt = await call('POST', `/quizzes/${newQuizId}/attempt`, {
    token: studentToken,
    body: { answers: [{ questionIndex: 0, selectedIndex: 0 }, { questionIndex: 1, selectedIndex: 2 }] },
  });
  check('POST /quizzes/:id/attempt scores correctly', attempt.status === 201 && attempt.json.data.score === 3 && attempt.json.data.totalMarks === 5, attempt.json.data);
  check('attempt returns percentage', attempt.json.data?.percentage === 60, attempt.json.data?.percentage);

  const reattempt = await call('POST', `/quizzes/${newQuizId}/attempt`, {
    token: studentToken,
    body: { answers: [] },
  });
  check('second attempt blocked (400)', reattempt.status === 400, reattempt.json);

  const qResults = await call('GET', `/quizzes/${newQuizId}/results`, { token: teacherToken });
  check('GET /quizzes/:id/results (teacher sees all)', qResults.status === 200 && qResults.json.data.length === 1, { n: qResults.json.data?.length });

  const qResultsStudent = await call('GET', `/quizzes/${newQuizId}/results`, { token: studentToken });
  check('GET /quizzes/:id/results (student sees own only)', qResultsStudent.status === 200 && qResultsStudent.json.data.length === 1);

  const updQuiz = await call('PUT', `/quizzes/${newQuizId}`, { token: teacherToken, body: { durationMinutes: 20 } });
  check('PUT /quizzes/:id', updQuiz.status === 200 && updQuiz.json.data.durationMinutes === 20, updQuiz.json);

  const myQuizResults = await call('GET', '/quizzes/results/my', { token: studentToken });
  check('GET /quizzes/results/my', myQuizResults.status === 200 && myQuizResults.json.data.length === 1, { n: myQuizResults.json.data?.length });

  /* ---------- Announcements ---------- */
  section('Announcements');
  const anns = await call('GET', '/announcements', { token: studentToken });
  check('GET /announcements', anns.status === 200 && anns.json.data.length >= 4, { n: anns.json.data?.length });

  const annsCourse = await call('GET', `/announcements?courseId=${cse470._id}`, { token: studentToken });
  check('GET /announcements?courseId=', annsCourse.status === 200 && annsCourse.json.data.length === 2, { n: annsCourse.json.data?.length });

  const createAnn = await call('POST', '/announcements', {
    token: teacherToken,
    body: { title: 'Extra lab session', message: 'Friday 3pm in lab 2', courseId: cse470._id },
  });
  check('POST /announcements (course)', createAnn.status === 201, createAnn.json);
  const annId = createAnn.json.data?._id;

  const globalAnnTeacher = await call('POST', '/announcements', {
    token: teacherToken,
    body: { title: 'Global attempt', message: 'should fail' },
  });
  check('teacher cannot post global announcement (403)', globalAnnTeacher.status === 403, globalAnnTeacher.json);

  const globalAnnAdmin = await call('POST', '/announcements', {
    token: adminToken,
    body: { title: 'Maintenance window', message: 'Saturday 2am-4am' },
  });
  check('POST /announcements (admin global)', globalAnnAdmin.status === 201 && globalAnnAdmin.json.data.isGlobal === true, globalAnnAdmin.json);

  const delAnn = await call('DELETE', `/announcements/${annId}`, { token: teacherToken });
  check('DELETE /announcements/:id', delAnn.status === 200, delAnn.json);

  /* ---------- Discussions ---------- */
  section('Discussions');
  const discs = await call('GET', `/courses/${cse470._id}/discussions`, { token: studentToken });
  check('GET /courses/:courseId/discussions', discs.status === 200 && discs.json.data.length === 1, { n: discs.json.data?.length });
  check('discussion replies populated', discs.json.data?.[0]?.replies?.[0]?.userId?.name !== undefined);

  const createDisc = await call('POST', `/courses/${cse470._id}/discussions`, {
    token: studentToken,
    body: { topic: 'Which testing library?', message: 'Jest or Vitest for the project?' },
  });
  check('POST /courses/:courseId/discussions', createDisc.status === 201, createDisc.json);
  const discId = createDisc.json.data?._id;

  const reply = await call('POST', `/discussions/${discId}/reply`, {
    token: teacherToken,
    body: { message: 'Either is fine, Vitest pairs nicely with Vite.' },
  });
  check('POST /discussions/:id/reply', reply.status === 201 && reply.json.data.replies.length === 1, reply.json);

  const emptyReply = await call('POST', `/discussions/${discId}/reply`, { token: teacherToken, body: {} });
  check('reply validation (400)', emptyReply.status === 400, emptyReply.json);

  /* ---------- Messages ---------- */
  section('Messages');
  const teacherId = teacherLogin.json.data?.user?._id;
  const sendMsg = await call('POST', '/messages', {
    token: studentToken,
    body: { receiverId: teacherId, content: 'Thank you for the feedback!' },
  });
  check('POST /messages', sendMsg.status === 201, sendMsg.json);

  const selfMsg = await call('POST', '/messages', {
    token: studentToken,
    body: { receiverId: studentId, content: 'hi me' },
  });
  check('POST /messages to self (400)', selfMsg.status === 400, selfMsg.json);

  const convos = await call('GET', '/messages', { token: teacherToken });
  check('GET /messages (conversations)', convos.status === 200 && convos.json.data.length >= 2, { n: convos.json.data?.length });
  check('conversation has unreadCount', typeof convos.json.data?.[0]?.unreadCount === 'number');

  const thread = await call('GET', `/messages/${teacherId}`, { token: studentToken });
  check('GET /messages/:userId', thread.status === 200 && thread.json.data.messages.length === 3, { n: thread.json.data?.messages?.length });

  const unread = await call('GET', '/messages/unread/count', { token: teacherToken });
  check('GET /messages/unread/count', unread.status === 200 && typeof unread.json.data.count === 'number', unread.json);

  /* ---------- Notifications ---------- */
  section('Notifications');
  const notifs = await call('GET', '/notifications', { token: studentToken });
  check('GET /notifications', notifs.status === 200 && notifs.json.data.notifications.length >= 3, { n: notifs.json.data?.notifications?.length });
  check('notifications include unreadCount', typeof notifs.json.data?.unreadCount === 'number');
  const notifId = notifs.json.data?.notifications?.[0]?._id;

  const markOne = await call('PATCH', `/notifications/${notifId}/read`, { token: studentToken });
  check('PATCH /notifications/:id/read', markOne.status === 200 && markOne.json.data.isRead === true, markOne.json);

  const markAll = await call('PATCH', '/notifications/read-all', { token: studentToken });
  check('PATCH /notifications/read-all', markAll.status === 200, markAll.json);
  const afterAll = await call('GET', '/notifications?unread=true', { token: studentToken });
  check('no unread notifications remain', afterAll.json.data?.notifications?.length === 0, afterAll.json.data?.notifications?.length);

  const foreignNotif = await call('PATCH', `/notifications/${notifId}/read`, { token: teacherToken });
  check("cannot read another user's notification (404)", foreignNotif.status === 404, foreignNotif.json);

  /* ---------- Attendance ---------- */
  section('Attendance');
  const attList = await call('GET', `/courses/${cse470._id}/attendance`, { token: teacherToken });
  check('GET /courses/:courseId/attendance (teacher)', attList.status === 200 && attList.json.data.length === 4, { n: attList.json.data?.length });

  const attStudent = await call('GET', `/courses/${cse470._id}/attendance`, { token: studentToken });
  check('student sees only own attendance rows', attStudent.status === 200 && attStudent.json.data.every((r) => 'status' in r), attStudent.json.data?.[0]);

  const takeAtt = await call('POST', `/courses/${cse470._id}/attendance`, {
    token: teacherToken,
    body: { date: new Date().toISOString(), records: [{ studentId, status: 'present' }] },
  });
  check('POST /courses/:courseId/attendance', takeAtt.status === 201, takeAtt.json);

  const attNonEnrolled = await call('POST', `/courses/${cse470._id}/attendance`, {
    token: teacherToken,
    body: { date: new Date().toISOString(), records: [{ studentId: teacherId, status: 'present' }] },
  });
  check('attendance rejects non-enrolled student (400)', attNonEnrolled.status === 400, attNonEnrolled.json);

  const myAtt = await call('GET', '/attendance/my', { token: studentToken });
  check('GET /attendance/my', myAtt.status === 200 && myAtt.json.data.summary.length >= 1, myAtt.json.data?.summary);
  check('attendance summary has percentage', typeof myAtt.json.data?.summary?.[0]?.attendancePercentage === 'number');

  /* ---------- Progress ---------- */
  section('Progress');
  const prog = await call('GET', `/progress/course/${cse470._id}`, { token: studentToken });
  check('GET /progress/course/:courseId (student)', prog.status === 200 && typeof prog.json.data.completionPercentage === 'number', prog.json.data);

  const progT = await call('GET', `/progress/course/${cse470._id}`, { token: teacherToken });
  check('GET /progress/course/:courseId (teacher cohort)', progT.status === 200 && progT.json.data.students.length === 3, { n: progT.json.data?.students?.length });

  const remainingMat = mats.json.data.find((m) => !m.isCompleted);
  const complete = await call('POST', `/progress/material/${remainingMat._id}/complete`, { token: studentToken });
  check('POST /progress/material/:id/complete', complete.status === 200 && complete.json.data.completionPercentage > prog.json.data.completionPercentage, complete.json.data);

  const uncomplete = await call('DELETE', `/progress/material/${remainingMat._id}/complete`, { token: studentToken });
  check('DELETE /progress/material/:id/complete', uncomplete.status === 200, uncomplete.json);

  const myProg = await call('GET', '/progress/my', { token: studentToken });
  check('GET /progress/my', myProg.status === 200 && myProg.json.data.courses.length === 3, { n: myProg.json.data?.courses?.length });
  check('GET /progress/my overall', typeof myProg.json.data?.overallProgress === 'number');

  /* ---------- Reviews ---------- */
  section('Reviews');
  const revs = await call('GET', `/courses/${cse470._id}/reviews`);
  check('GET /courses/:courseId/reviews', revs.status === 200 && revs.json.data.reviews.length === 2, { n: revs.json.data?.reviews?.length });
  check('reviews include average + distribution', revs.json.data?.averageRating === 4.5 && !!revs.json.data?.distribution, revs.json.data?.averageRating);

  const postRev = await call('POST', `/courses/${cse470._id}/reviews`, {
    token: studentToken,
    body: { rating: 4, comment: 'Updated my rating after midterm.' },
  });
  check('POST /courses/:courseId/reviews (upsert)', postRev.status === 201 && postRev.json.data.rating === 4, postRev.json);

  const revsAfter = await call('GET', `/courses/${cse470._id}/reviews`);
  check('course rating recalculated', revsAfter.json.data?.averageRating === 4, revsAfter.json.data?.averageRating);

  const badRating = await call('POST', `/courses/${cse470._id}/reviews`, { token: studentToken, body: { rating: 9 } });
  check('review rejects rating > 5 (400)', badRating.status === 400, badRating.json);

  const revNotEnrolled = await call('POST', `/courses/${mern._id}/reviews`, { token: studentToken, body: { rating: 5 } });
  check('review requires enrollment (403)', revNotEnrolled.status === 403, revNotEnrolled.json);

  /* ---------- Certificates ---------- */
  section('Certificates');
  const myCerts = await call('GET', '/certificates/my', { token: studentToken });
  check('GET /certificates/my (seeded)', myCerts.status === 200 && myCerts.json.data.length === 1, { n: myCerts.json.data?.length });
  const certId = myCerts.json.data?.[0]?._id;
  const certCode = myCerts.json.data?.[0]?.certificateCode;

  const getCert = await call('GET', `/certificates/${certId}`, { token: studentToken });
  check('GET /certificates/:id', getCert.status === 200, getCert.json);

  const certDl = await fetch(`${base}/certificates/${certId}/download`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  const certBuf = Buffer.from(await certDl.arrayBuffer());
  check('GET /certificates/:id/download returns PDF', certDl.status === 200 && certBuf.slice(0, 4).toString() === '%PDF', { status: certDl.status, head: certBuf.slice(0, 8).toString() });

  const verify = await call('GET', `/certificates/verify/${certCode}`);
  check('GET /certificates/verify/:code', verify.status === 200 && verify.json.data.valid === true, verify.json);

  const verifyBad = await call('GET', '/certificates/verify/NOPE-0000-0000');
  check('verify unknown code returns valid:false', verifyBad.status === 200 && verifyBad.json.data.valid === false, verifyBad.json);

  const genIncomplete = await call('POST', `/certificates/generate/${cse470._id}`, { token: studentToken });
  check('certificate blocked when incomplete (400)', genIncomplete.status === 400, genIncomplete.json);

  // Complete every material in the new course, then generate.
  const newCourseMats = await call('GET', `/courses/${newCourseId}/materials`, { token: newStudentToken });
  check('new course has no materials yet', newCourseMats.json.data?.length === 0);
  const noMatCert = await call('POST', `/certificates/generate/${newCourseId}`, { token: newStudentToken });
  check('certificate blocked with zero materials (400)', noMatCert.status === 400, noMatCert.json);

  const dbCourseId = courses.json.data.find((c) => c.enrollmentCode === 'CSE370')._id;
  const genComplete = await call('POST', `/certificates/generate/${dbCourseId}`, { token: studentToken });
  check('POST /certificates/generate/:courseId at 100%', [200, 201].includes(genComplete.status), genComplete.json);

  /* ---------- Calendar ---------- */
  section('Calendar');
  const cal = await call('GET', '/calendar', { token: studentToken });
  check('GET /calendar', cal.status === 200 && cal.json.data.length > 4, { n: cal.json.data?.length });
  check('calendar merges derived assignment events', cal.json.data?.some((e) => e.source === 'assignment'), cal.json.data?.map((e) => e.source).slice(0, 8));
  check('calendar merges derived quiz events', cal.json.data?.some((e) => e.source === 'quiz'));
  check('calendar includes stored events', cal.json.data?.some((e) => e.source === 'event'));
  check('calendar sorted ascending', cal.json.data?.every((e, i, a) => i === 0 || new Date(a[i - 1].eventDate) <= new Date(e.eventDate)));

  const calCourse = await call('GET', `/calendar?courseId=${cse470._id}`, { token: studentToken });
  check('GET /calendar?courseId=', calCourse.status === 200 && calCourse.json.data.every((e) => !e.courseId || String(e.courseId?._id || e.courseId) === String(cse470._id)));

  const createEvt = await call('POST', '/calendar', {
    token: teacherToken,
    body: { courseId: cse470._id, title: 'Final Presentation', eventDate: new Date(Date.now() + 18 * 864e5).toISOString(), eventType: 'exam' },
  });
  check('POST /calendar', createEvt.status === 201, createEvt.json);
  const evtId = createEvt.json.data?._id;

  const evtStudent = await call('POST', '/calendar', {
    token: studentToken,
    body: { courseId: cse470._id, title: 'x', eventDate: new Date().toISOString() },
  });
  check('POST /calendar as student (403)', evtStudent.status === 403, evtStudent.json);

  const delEvt = await call('DELETE', `/calendar/${evtId}`, { token: teacherToken });
  check('DELETE /calendar/:id', delEvt.status === 200, delEvt.json);

  /* ---------- Dashboard ---------- */
  section('Dashboard');
  const dashS = await call('GET', '/dashboard/stats', { token: studentToken });
  check('GET /dashboard/stats (student)', dashS.status === 200 && dashS.json.data.role === 'student', dashS.json);
  check('student KPIs present', dashS.json.data?.kpis?.enrolledCourses === 3 && 'averageGrade' in dashS.json.data.kpis, dashS.json.data?.kpis);
  check('student upcomingDeadlines present', Array.isArray(dashS.json.data?.upcomingDeadlines) && dashS.json.data.upcomingDeadlines.length > 0, dashS.json.data?.upcomingDeadlines?.length);
  check('student recentActivity present', Array.isArray(dashS.json.data?.recentActivity) && dashS.json.data.recentActivity.length > 0);
  check('deadlines sorted ascending', dashS.json.data?.upcomingDeadlines?.every((d, i, a) => i === 0 || new Date(a[i - 1].dueDate) <= new Date(d.dueDate)));

  const dashT = await call('GET', '/dashboard/stats', { token: teacherToken });
  check('GET /dashboard/stats (teacher)', dashT.status === 200 && dashT.json.data.role === 'teacher', dashT.json);
  check('teacher KPIs present', dashT.json.data?.kpis?.totalCourses >= 3 && 'pendingGrading' in dashT.json.data.kpis, dashT.json.data?.kpis);

  const dashA = await call('GET', '/dashboard/stats', { token: adminToken });
  check('GET /dashboard/stats (admin)', dashA.status === 200 && dashA.json.data.role === 'admin', dashA.json);
  check('admin KPIs present', dashA.json.data?.kpis?.totalUsers >= 7 && 'totalRevenue' in dashA.json.data.kpis, dashA.json.data?.kpis);
  check('admin topCourses present', Array.isArray(dashA.json.data?.topCourses) && dashA.json.data.topCourses.length > 0);

  const dashAct = await call('GET', '/dashboard/activity', { token: adminToken });
  check('GET /dashboard/activity', dashAct.status === 200 && dashAct.json.data.length > 0, { n: dashAct.json.data?.length });

  /* ---------- Payments ---------- */
  section('Payments');
  const checkout = await call('POST', '/payments/checkout', { token: studentToken, body: { courseId: mern._id } });
  check('POST /payments/checkout (simulated)', checkout.status === 201 && !!checkout.json.data.url, checkout.json);

  const freeCheckout = await call('POST', '/payments/checkout', { token: studentToken, body: { courseId: cse470._id } });
  check('checkout rejects free course (400)', freeCheckout.status === 400, freeCheckout.json);

  const dupeCheckout = await call('POST', '/payments/checkout', { token: studentToken, body: { courseId: mern._id } });
  check('checkout rejects duplicate purchase (409)', dupeCheckout.status === 409, dupeCheckout.json);

  const myPay = await call('GET', '/payments/my', { token: studentToken });
  check('GET /payments/my', myPay.status === 200 && myPay.json.data.payments.length === 1, myPay.json.data?.payments?.length);
  check('payment granted enrollment', (await call('GET', '/enrollments/my', { token: studentToken })).json.data.length === 4);

  const webhook = await fetch(`${base}/payments/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'checkout.session.completed', data: { object: { id: 'cs_test_x', metadata: {} } } }),
  });
  check('POST /payments/webhook accepts events', webhook.status === 200, { status: webhook.status });

  /* ---------- Error handling ---------- */
  section('Error handling');
  const notFoundRoute = await call('GET', '/does-not-exist');
  check('unknown route returns 404 JSON', notFoundRoute.status === 404 && notFoundRoute.json.success === false, notFoundRoute.json);

  const badId = await call('GET', '/courses/not-an-id', { token: studentToken });
  check('invalid ObjectId returns 400', badId.status === 400, badId.json);

  const missingCourse = await call('GET', '/courses/64b7f9c2e1a2b3c4d5e6f7a8', { token: studentToken });
  check('missing course returns 404', missingCourse.status === 404, missingCourse.json);

  const badToken = await call('GET', '/auth/me', { token: 'garbage.token.here' });
  check('malformed token returns 401', badToken.status === 401, badToken.json);

  const shapeOk = notFoundRoute.json.success === false && typeof notFoundRoute.json.message === 'string'
    && dashS.json.success === true && 'data' in dashS.json;
  check('response envelope matches contract', shapeOk);

  /* ---------- Cascade delete ---------- */
  section('Cascade delete');
  const delCourse = await call('DELETE', `/courses/${newCourseId}`, { token: teacherToken });
  check('DELETE /courses/:id', delCourse.status === 200, delCourse.json);
  const afterDel = await call('GET', `/courses/${newCourseId}`, { token: teacherToken });
  check('deleted course returns 404', afterDel.status === 404);
  const enrAfter = await call('GET', '/enrollments/my', { token: newStudentToken });
  check('enrollments cascade-deleted with course', enrAfter.json.data.length === 0, enrAfter.json.data?.length);

  const delUser = await call('DELETE', `/users/${newUserId}`, { token: adminToken });
  check('DELETE /users/:id', delUser.status === 200, delUser.json);
  const selfDel = await call('DELETE', `/users/${studentId}`, { token: studentToken });
  check('DELETE /users/:id as student (403)', selfDel.status === 403, selfDel.json);

  console.log(`\n================ ${pass} passed, ${fail} failed ================`);
  if (failures.length) {
    console.log('Failures:');
    failures.forEach((f) => console.log(`  - ${f}`));
  }

  server.close();
  await require('mongoose').connection.close();
  await mongo.stop();
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('[test] harness error:', err);
  process.exit(1);
});
