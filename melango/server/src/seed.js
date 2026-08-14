/* eslint-disable no-console */
const mongoose = require('mongoose');
const { connectDB } = require('./config/db');
const { generateCertificateCode } = require('./utils/generateCode');
const { generateCertificatePDF } = require('./services/certificateService');
const {
  User,
  Course,
  Enrollment,
  LearningMaterial,
  Assignment,
  Submission,
  Feedback,
  Quiz,
  Result,
  Announcement,
  Discussion,
  Message,
  Notification,
  Attendance,
  Progress,
  Certificate,
  Review,
  CalendarEvent,
  Activity,
  Payment,
} = require('./models');

function daysFromNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(23, 59, 0, 0);
  return date;
}

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(10, 0, 0, 0);
  return date;
}

async function clearDatabase() {
  await Promise.all([
    User.deleteMany({}),
    Course.deleteMany({}),
    Enrollment.deleteMany({}),
    LearningMaterial.deleteMany({}),
    Assignment.deleteMany({}),
    Submission.deleteMany({}),
    Feedback.deleteMany({}),
    Quiz.deleteMany({}),
    Result.deleteMany({}),
    Announcement.deleteMany({}),
    Discussion.deleteMany({}),
    Message.deleteMany({}),
    Notification.deleteMany({}),
    Attendance.deleteMany({}),
    Progress.deleteMany({}),
    Certificate.deleteMany({}),
    Review.deleteMany({}),
    CalendarEvent.deleteMany({}),
    Activity.deleteMany({}),
    Payment.deleteMany({}),
  ]);
}

async function seed() {
  await connectDB();
  console.log('[seed] Connected to MongoDB');

  console.log('[seed] Clearing existing collections...');
  await clearDatabase();

  /* ---------- Users ---------- */
  console.log('[seed] Creating users...');
  const admin = await User.create({
    name: 'Melango Admin',
    email: 'admin@melango.com',
    password: 'Admin123!',
    role: 'admin',
    designation: 'System Administrator',
    department: 'Administration',
  });

  const teacher = await User.create({
    name: 'Dr. Ayesha Rahman',
    email: 'teacher@melango.com',
    password: 'Teacher123!',
    role: 'teacher',
    designation: 'Associate Professor',
    department: 'Computer Science and Engineering',
  });

  const teacher2 = await User.create({
    name: 'Mr. Tanvir Hasan',
    email: 'tanvir@melango.com',
    password: 'Teacher123!',
    role: 'teacher',
    designation: 'Lecturer',
    department: 'Computer Science and Engineering',
  });

  const student = await User.create({
    name: 'Tahsin Rahman',
    email: 'student@melango.com',
    password: 'Student123!',
    role: 'student',
    department: 'Computer Science and Engineering',
    semester: 'Summer 2026',
  });

  const student2 = await User.create({
    name: 'Nabila Karim',
    email: 'nabila@melango.com',
    password: 'Student123!',
    role: 'student',
    department: 'Computer Science and Engineering',
    semester: 'Summer 2026',
  });

  const student3 = await User.create({
    name: 'Rafid Chowdhury',
    email: 'rafid@melango.com',
    password: 'Student123!',
    role: 'student',
    department: 'Electrical and Electronic Engineering',
    semester: 'Fall 2026',
  });

  /* ---------- Courses ---------- */
  console.log('[seed] Creating courses...');
  const webCourse = await Course.create({
    courseName: 'CSE470 - Software Engineering',
    description:
      'Software development lifecycle, requirement engineering, design patterns, testing strategies and a full-semester MERN team project.',
    category: 'Software Engineering',
    enrollmentCode: 'CSE470',
    teacherId: teacher._id,
    price: 0,
    isPremium: false,
  });

  const dbCourse = await Course.create({
    courseName: 'CSE370 - Database Systems',
    description:
      'Relational modelling, normalization, SQL, transactions, indexing and an introduction to NoSQL document stores.',
    category: 'Databases',
    enrollmentCode: 'CSE370',
    teacherId: teacher._id,
    price: 0,
    isPremium: false,
  });

  const mernCourse = await Course.create({
    courseName: 'Full-Stack MERN Masterclass',
    description:
      'A premium project-based track covering MongoDB, Express, React and Node with authentication, payments and deployment.',
    category: 'Web Development',
    enrollmentCode: 'MERN01',
    teacherId: teacher2._id,
    price: 49.99,
    isPremium: true,
  });

  const aiCourse = await Course.create({
    courseName: 'CSE422 - Artificial Intelligence',
    description:
      'Search algorithms, constraint satisfaction, knowledge representation and an introduction to machine learning.',
    category: 'Artificial Intelligence',
    enrollmentCode: 'CSE422',
    teacherId: teacher2._id,
    price: 0,
    isPremium: false,
  });

  /* ---------- Enrollments ---------- */
  console.log('[seed] Enrolling students...');
  const enrollmentPairs = [
    [webCourse, student],
    [webCourse, student2],
    [webCourse, student3],
    [dbCourse, student],
    [dbCourse, student2],
    [aiCourse, student],
  ];

  for (const [course, learner] of enrollmentPairs) {
    // eslint-disable-next-line no-await-in-loop
    await Enrollment.create({ courseId: course._id, studentId: learner._id });
  }

  await Course.updateOne({ _id: webCourse._id }, { studentCount: 3 });
  await Course.updateOne({ _id: dbCourse._id }, { studentCount: 2 });
  await Course.updateOne({ _id: aiCourse._id }, { studentCount: 1 });

  /* ---------- Learning materials ---------- */
  console.log('[seed] Creating learning materials...');
  const materials = await LearningMaterial.insertMany([
    {
      courseId: webCourse._id,
      uploadedBy: teacher._id,
      title: 'Lecture 1 - Introduction to Software Engineering',
      description: 'Course outline, SDLC models and the semester project brief.',
      fileType: 'pdf',
      fileName: 'cse470-lecture-1.pdf',
      originalName: 'CSE470 Lecture 1.pdf',
      fileUrl: '/uploads/materials/cse470-lecture-1.pdf',
      fileSize: 482_000,
      mimeType: 'application/pdf',
    },
    {
      courseId: webCourse._id,
      uploadedBy: teacher._id,
      title: 'Lecture 2 - Requirement Engineering and SRS',
      description: 'Functional vs non-functional requirements, use cases and SRS structure.',
      fileType: 'slide',
      fileName: 'cse470-lecture-2.pptx',
      originalName: 'CSE470 Lecture 2.pptx',
      fileUrl: '/uploads/materials/cse470-lecture-2.pptx',
      fileSize: 1_240_000,
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    },
    {
      courseId: webCourse._id,
      uploadedBy: teacher._id,
      title: 'Design Patterns Walkthrough (video)',
      description: 'Recorded session on creational and structural patterns.',
      fileType: 'video',
      fileUrl: 'https://www.youtube.com/watch?v=v9ejT8FO-7I',
    },
    {
      courseId: webCourse._id,
      uploadedBy: teacher._id,
      title: 'MERN Project Starter Guide',
      description: 'Folder structure, environment setup and Git workflow for the team project.',
      fileType: 'pdf',
      fileName: 'mern-starter-guide.pdf',
      originalName: 'MERN Starter Guide.pdf',
      fileUrl: '/uploads/materials/mern-starter-guide.pdf',
      fileSize: 310_000,
      mimeType: 'application/pdf',
    },
    {
      courseId: dbCourse._id,
      uploadedBy: teacher._id,
      title: 'ER Modelling Basics',
      description: 'Entities, relationships, cardinality and participation constraints.',
      fileType: 'pdf',
      fileName: 'cse370-er-modelling.pdf',
      originalName: 'ER Modelling.pdf',
      fileUrl: '/uploads/materials/cse370-er-modelling.pdf',
      fileSize: 265_000,
      mimeType: 'application/pdf',
    },
    {
      courseId: dbCourse._id,
      uploadedBy: teacher._id,
      title: 'Normalization Cheat Sheet',
      description: '1NF through BCNF with worked examples.',
      fileType: 'pdf',
      fileName: 'cse370-normalization.pdf',
      originalName: 'Normalization.pdf',
      fileUrl: '/uploads/materials/cse370-normalization.pdf',
      fileSize: 198_000,
      mimeType: 'application/pdf',
    },
    {
      courseId: aiCourse._id,
      uploadedBy: teacher2._id,
      title: 'Uninformed and Informed Search',
      description: 'BFS, DFS, UCS, greedy best-first and A*.',
      fileType: 'slide',
      fileName: 'cse422-search.pptx',
      originalName: 'Search Algorithms.pptx',
      fileUrl: '/uploads/materials/cse422-search.pptx',
      fileSize: 890_000,
      mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    },
    {
      courseId: mernCourse._id,
      uploadedBy: teacher2._id,
      title: 'Module 1 - Node and Express Foundations',
      description: 'Routing, middleware and REST design.',
      fileType: 'video',
      fileUrl: 'https://www.youtube.com/watch?v=Oe421EPjeBE',
    },
  ]);

  /* ---------- Progress ---------- */
  console.log('[seed] Recording progress...');
  const webMaterials = materials.filter((m) => String(m.courseId) === String(webCourse._id));
  const dbMaterials = materials.filter((m) => String(m.courseId) === String(dbCourse._id));

  await Progress.create({
    courseId: webCourse._id,
    studentId: student._id,
    completedMaterials: webMaterials.slice(0, 2).map((m) => m._id),
    completionPercentage: Math.round((2 / webMaterials.length) * 100),
  });
  await Progress.create({
    courseId: webCourse._id,
    studentId: student2._id,
    completedMaterials: webMaterials.slice(0, 3).map((m) => m._id),
    completionPercentage: Math.round((3 / webMaterials.length) * 100),
  });
  await Progress.create({
    courseId: webCourse._id,
    studentId: student3._id,
    completedMaterials: [],
    completionPercentage: 0,
  });
  await Progress.create({
    courseId: dbCourse._id,
    studentId: student._id,
    completedMaterials: dbMaterials.map((m) => m._id),
    completionPercentage: 100,
  });
  await Progress.create({
    courseId: dbCourse._id,
    studentId: student2._id,
    completedMaterials: dbMaterials.slice(0, 1).map((m) => m._id),
    completionPercentage: 50,
  });
  await Progress.create({
    courseId: aiCourse._id,
    studentId: student._id,
    completedMaterials: [],
    completionPercentage: 0,
  });

  /* ---------- Assignments ---------- */
  console.log('[seed] Creating assignments...');
  const srsAssignment = await Assignment.create({
    courseId: webCourse._id,
    createdBy: teacher._id,
    title: 'Assignment 1 - Software Requirement Specification',
    description:
      'Submit the SRS document for your team project. Include functional requirements, non-functional requirements, use case diagrams and a class diagram.',
    dueDate: daysFromNow(5),
    totalMarks: 100,
  });

  const sprintAssignment = await Assignment.create({
    courseId: webCourse._id,
    createdBy: teacher._id,
    title: 'Assignment 2 - Sprint 1 Demo Report',
    description: 'Report on your first sprint: completed user stories, burndown chart and retrospective notes.',
    dueDate: daysFromNow(12),
    totalMarks: 50,
  });

  const pastAssignment = await Assignment.create({
    courseId: webCourse._id,
    createdBy: teacher._id,
    title: 'Assignment 0 - Team Formation and Proposal',
    description: 'One page project proposal with team member roles.',
    dueDate: daysAgo(6),
    totalMarks: 20,
  });

  const erAssignment = await Assignment.create({
    courseId: dbCourse._id,
    createdBy: teacher._id,
    title: 'Assignment 1 - ER Diagram for a Library System',
    description: 'Model a library management system and normalize the resulting schema to BCNF.',
    dueDate: daysFromNow(8),
    totalMarks: 100,
  });

  /* ---------- Submissions and feedback ---------- */
  console.log('[seed] Creating submissions and feedback...');
  const gradedSubmission = await Submission.create({
    assignmentId: pastAssignment._id,
    courseId: webCourse._id,
    studentId: student._id,
    text: 'Team Melango - members: Tahsin (backend), Nabila (frontend), Rafid (QA). Building an all-in-one LMS.',
    status: 'graded',
    submittedAt: daysAgo(7),
    marks: 18,
  });

  const feedback = await Feedback.create({
    submissionId: gradedSubmission._id,
    assignmentId: pastAssignment._id,
    studentId: student._id,
    teacherId: teacher._id,
    marks: 18,
    comments: 'Clear proposal and sensible role split. Add a short risk assessment next time.',
  });
  gradedSubmission.feedbackId = feedback._id;
  await gradedSubmission.save();

  await Submission.create({
    assignmentId: srsAssignment._id,
    courseId: webCourse._id,
    studentId: student2._id,
    text: 'Draft SRS attached as a shared link.',
    link: 'https://docs.google.com/document/d/example-srs',
    status: 'submitted',
    submittedAt: daysAgo(1),
  });

  /* ---------- Quizzes and results ---------- */
  console.log('[seed] Creating quizzes...');
  const sdlcQuiz = await Quiz.create({
    courseId: webCourse._id,
    createdBy: teacher._id,
    title: 'Quiz 1 - SDLC and Requirement Engineering',
    description: 'Ten minute multiple choice quiz covering lectures 1 and 2.',
    durationMinutes: 10,
    availableUntil: daysFromNow(3),
    questions: [
      {
        questionText: 'Which SDLC model is best suited to requirements that change frequently?',
        options: ['Waterfall', 'Agile', 'V-Model', 'Big Bang'],
        correctIndex: 1,
        marks: 2,
      },
      {
        questionText: 'What does SRS stand for?',
        options: [
          'System Requirement Sheet',
          'Software Requirement Specification',
          'Structured Review Summary',
          'Software Release Schedule',
        ],
        correctIndex: 1,
        marks: 2,
      },
      {
        questionText: 'Which of these is a non-functional requirement?',
        options: [
          'A student can enrol using a course code',
          'The system must respond within two seconds',
          'A teacher can upload course material',
          'An admin can delete a user account',
        ],
        correctIndex: 1,
        marks: 2,
      },
      {
        questionText: 'A use case diagram primarily shows which of the following?',
        options: [
          'Database tables and their relationships',
          'Actors and the system functions they interact with',
          'The order of method calls over time',
          'Deployment topology',
        ],
        correctIndex: 1,
        marks: 2,
      },
      {
        questionText: 'In MVC, which layer is responsible for business rules and data access?',
        options: ['View', 'Controller', 'Model', 'Router'],
        correctIndex: 2,
        marks: 2,
      },
    ],
  });

  const dbQuiz = await Quiz.create({
    courseId: dbCourse._id,
    createdBy: teacher._id,
    title: 'Quiz 1 - Normalization',
    durationMinutes: 15,
    availableUntil: daysFromNow(6),
    questions: [
      {
        questionText: 'A relation is in 1NF when...',
        options: [
          'It has no partial dependencies',
          'All attribute values are atomic',
          'It has no transitive dependencies',
          'Every determinant is a candidate key',
        ],
        correctIndex: 1,
        marks: 2,
      },
      {
        questionText: 'Which normal form removes transitive dependencies?',
        options: ['1NF', '2NF', '3NF', 'BCNF'],
        correctIndex: 2,
        marks: 2,
      },
      {
        questionText: 'A primary key must be...',
        options: ['Nullable', 'Unique and not null', 'A foreign key', 'An auto increment integer'],
        correctIndex: 1,
        marks: 2,
      },
    ],
  });

  const quizTotal = sdlcQuiz.questions.reduce((sum, q) => sum + q.marks, 0);
  await Result.create({
    quizId: sdlcQuiz._id,
    courseId: webCourse._id,
    studentId: student2._id,
    score: 8,
    totalMarks: quizTotal,
    percentage: Math.round((8 / quizTotal) * 100),
    answers: sdlcQuiz.questions.map((q, index) => ({
      questionIndex: index,
      selectedIndex: index === 4 ? 1 : q.correctIndex,
      correctIndex: q.correctIndex,
      isCorrect: index !== 4,
      marksAwarded: index !== 4 ? q.marks : 0,
    })),
    attemptedAt: daysAgo(2),
  });

  /* ---------- Announcements ---------- */
  console.log('[seed] Creating announcements...');
  await Announcement.create({
    title: 'Welcome to Melango',
    message:
      'Melango is now live. Use the enrollment code shared by your instructor to join a course, then explore materials, assignments and quizzes from your dashboard.',
    postedBy: admin._id,
    isGlobal: true,
  });
  await Announcement.create({
    title: 'CSE470 project groups are due this week',
    message:
      'Form groups of four and submit your proposal before the deadline. Groups without a submission will be assigned randomly.',
    courseId: webCourse._id,
    postedBy: teacher._id,
  });
  await Announcement.create({
    title: 'Lecture 3 rescheduled',
    message: 'Wednesday lecture moves to Thursday 11:00 AM in room 09C-15.',
    courseId: webCourse._id,
    postedBy: teacher._id,
  });
  await Announcement.create({
    title: 'Normalization practice set uploaded',
    message: 'Solve the practice set before the quiz on normalization.',
    courseId: dbCourse._id,
    postedBy: teacher._id,
  });

  /* ---------- Discussions ---------- */
  console.log('[seed] Creating discussions...');
  await Discussion.create({
    courseId: webCourse._id,
    userId: student._id,
    topic: 'Can we use Next.js instead of plain React for the project?',
    message:
      'Our team is comfortable with Next.js. Would that still satisfy the MERN requirement for the project?',
    replies: [
      {
        userId: teacher._id,
        message:
          'Plain React with Vite is expected so that the marking rubric applies uniformly. Stick with React for now.',
      },
      { userId: student2._id, message: 'Vite has been fast for us, happy to share our setup.' },
    ],
  });
  await Discussion.create({
    courseId: dbCourse._id,
    userId: student2._id,
    topic: 'Difference between BCNF and 3NF',
    message: 'I understand 3NF but I keep mixing up when a relation fails BCNF. Any simple rule?',
    replies: [
      {
        userId: teacher._id,
        message:
          'In BCNF every determinant must be a candidate key. A 3NF relation can still fail that when a non-key attribute determines part of a key.',
      },
    ],
  });

  /* ---------- Messages ---------- */
  console.log('[seed] Creating messages...');
  await Message.create({
    senderId: student._id,
    receiverId: teacher._id,
    content: 'Good morning ma\'am, could you review our SRS draft before the deadline?',
    isRead: true,
    readAt: daysAgo(1),
  });
  await Message.create({
    senderId: teacher._id,
    receiverId: student._id,
    content: 'Sure, share the document link and I will comment by Thursday.',
  });
  await Message.create({
    senderId: student2._id,
    receiverId: teacher._id,
    content: 'Ma\'am, is the quiz syllabus limited to lectures 1 and 2?',
  });

  /* ---------- Attendance ---------- */
  console.log('[seed] Creating attendance...');
  for (const offset of [7, 5, 3, 1]) {
    const date = daysAgo(offset);
    date.setHours(0, 0, 0, 0);
    // eslint-disable-next-line no-await-in-loop
    await Attendance.create({
      courseId: webCourse._id,
      takenBy: teacher._id,
      date,
      records: [
        { studentId: student._id, status: offset === 3 ? 'late' : 'present' },
        { studentId: student2._id, status: 'present' },
        { studentId: student3._id, status: offset === 5 ? 'absent' : 'present' },
      ],
    });
  }

  /* ---------- Reviews ---------- */
  console.log('[seed] Creating reviews...');
  await Review.create({
    courseId: webCourse._id,
    studentId: student._id,
    rating: 5,
    comment: 'Very practical course. The project work made the theory click.',
  });
  await Review.create({
    courseId: webCourse._id,
    studentId: student2._id,
    rating: 4,
    comment: 'Great lectures, though the sprint deadlines are tight.',
  });
  await Review.recalculateCourseRating(webCourse._id);

  await Review.create({
    courseId: dbCourse._id,
    studentId: student._id,
    rating: 5,
    comment: 'The normalization cheat sheet is gold.',
  });
  await Review.recalculateCourseRating(dbCourse._id);

  /* ---------- Calendar events ---------- */
  console.log('[seed] Creating calendar events...');
  await CalendarEvent.insertMany([
    {
      courseId: webCourse._id,
      createdBy: teacher._id,
      title: 'CSE470 Midterm Exam',
      description: 'Covers lectures 1 to 6. Closed book.',
      eventDate: daysFromNow(15),
      eventType: 'exam',
    },
    {
      courseId: webCourse._id,
      createdBy: teacher._id,
      title: 'Sprint 1 Demo Session',
      eventDate: daysFromNow(11),
      eventType: 'class',
    },
    {
      courseId: dbCourse._id,
      createdBy: teacher._id,
      title: 'CSE370 Lab Test',
      eventDate: daysFromNow(9),
      eventType: 'exam',
    },
    {
      courseId: null,
      createdBy: admin._id,
      title: 'University Holiday',
      eventDate: daysFromNow(20),
      eventType: 'holiday',
    },
  ]);

  /* ---------- Payment ---------- */
  console.log('[seed] Creating a sample premium payment...');
  const payment = await Payment.create({
    courseId: mernCourse._id,
    studentId: student2._id,
    amount: mernCourse.price,
    status: 'paid',
    provider: 'simulated',
    paidAt: daysAgo(4),
  });
  await Enrollment.create({
    courseId: mernCourse._id,
    studentId: student2._id,
    paymentId: payment._id,
  });
  await Progress.create({
    courseId: mernCourse._id,
    studentId: student2._id,
    completedMaterials: [],
    completionPercentage: 0,
  });
  await Course.updateOne({ _id: mernCourse._id }, { studentCount: 1 });

  /* ---------- Certificate ---------- */
  console.log('[seed] Issuing a sample certificate...');
  const certificateCode = generateCertificateCode();
  const issuedAt = new Date();
  const pdf = await generateCertificatePDF({
    certificateCode,
    studentName: student.name,
    courseName: dbCourse.courseName,
    teacherName: teacher.name,
    issuedAt,
  });
  await Certificate.create({
    courseId: dbCourse._id,
    studentId: student._id,
    certificateCode,
    studentName: student.name,
    courseName: dbCourse.courseName,
    issuedAt,
    completionPercentage: 100,
    ...pdf,
  });
  await Enrollment.updateOne(
    { courseId: dbCourse._id, studentId: student._id },
    { status: 'completed' }
  );

  /* ---------- Activity feed ---------- */
  console.log('[seed] Creating activity feed...');
  await Activity.insertMany([
    {
      userId: teacher._id,
      courseId: webCourse._id,
      action: 'course.created',
      description: `Created course "${webCourse.courseName}"`,
      entityType: 'Course',
      entityId: webCourse._id,
    },
    {
      userId: student._id,
      courseId: webCourse._id,
      action: 'course.joined',
      description: `Enrolled in "${webCourse.courseName}"`,
      entityType: 'Enrollment',
    },
    {
      userId: teacher._id,
      courseId: webCourse._id,
      action: 'assignment.created',
      description: `Posted assignment "${srsAssignment.title}"`,
      entityType: 'Assignment',
      entityId: srsAssignment._id,
    },
    {
      userId: student._id,
      courseId: webCourse._id,
      action: 'assignment.submitted',
      description: `Submitted "${pastAssignment.title}"`,
      entityType: 'Submission',
      entityId: gradedSubmission._id,
    },
    {
      userId: teacher._id,
      courseId: webCourse._id,
      action: 'submission.graded',
      description: `Graded ${student.name}'s submission`,
      entityType: 'Feedback',
      entityId: feedback._id,
    },
    {
      userId: student2._id,
      courseId: webCourse._id,
      action: 'quiz.attempted',
      description: `Scored 8/${quizTotal} on "${sdlcQuiz.title}"`,
      entityType: 'Quiz',
      entityId: sdlcQuiz._id,
    },
    {
      userId: student._id,
      courseId: dbCourse._id,
      action: 'certificate.issued',
      description: `Earned a certificate for "${dbCourse.courseName}"`,
      entityType: 'Certificate',
    },
  ]);

  /* ---------- Notifications ---------- */
  console.log('[seed] Creating notifications...');
  await Notification.insertMany([
    {
      userId: student._id,
      title: 'New assignment posted',
      message: `"${srsAssignment.title}" is due ${srsAssignment.dueDate.toDateString()}`,
      type: 'assignment',
      courseId: webCourse._id,
      link: `/assignments/${srsAssignment._id}`,
    },
    {
      userId: student._id,
      title: 'Assignment graded',
      message: `You scored 18/20 on "${pastAssignment.title}"`,
      type: 'feedback',
      courseId: webCourse._id,
    },
    {
      userId: student._id,
      title: 'Certificate ready',
      message: `Your certificate for "${dbCourse.courseName}" is available to download`,
      type: 'certificate',
      courseId: dbCourse._id,
      link: '/certificates',
    },
    {
      userId: teacher._id,
      title: 'New submission received',
      message: `${student2.name} submitted "${srsAssignment.title}"`,
      type: 'assignment',
      courseId: webCourse._id,
    },
    {
      userId: teacher._id,
      title: 'New student enrolled',
      message: `${student3.name} joined "${webCourse.courseName}"`,
      type: 'enrollment',
      courseId: webCourse._id,
    },
    {
      userId: admin._id,
      title: 'Platform seeded',
      message: 'Demo data has been loaded successfully.',
      type: 'system',
    },
  ]);

  console.log('\n[seed] Done. Demo accounts:');
  console.log('  admin    admin@melango.com    / Admin123!');
  console.log('  teacher  teacher@melango.com  / Teacher123!');
  console.log('  teacher  tanvir@melango.com   / Teacher123!');
  console.log('  student  student@melango.com  / Student123!');
  console.log('  student  nabila@melango.com   / Student123!');
  console.log('  student  rafid@melango.com    / Student123!');
  console.log('\n[seed] Enrollment codes: CSE470, CSE370, CSE422, MERN01 (premium $49.99)');
  console.log(`[seed] Sample quiz: "${sdlcQuiz.title}" (${sdlcQuiz.questions.length} questions)`);
  console.log(`[seed] Sample quiz: "${dbQuiz.title}" (${dbQuiz.questions.length} questions)`);
  console.log(`[seed] Sample certificate code: ${certificateCode}`);

  await mongoose.connection.close();
  process.exit(0);
}

seed().catch(async (err) => {
  console.error('[seed] Failed:', err);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
