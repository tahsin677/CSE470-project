export const publicCourses = [
  {
    id: 'uiux-design',
    featured: true,
    category: 'UI/UX',
    title: 'Information About UI/UX Design Degree',
    image: '/images/course-uiux.jpg',
    price: 300,
    students: '5K+',
    time: '8hr 45min',
    description: 'Learn how to research, wireframe, and design interfaces people enjoy using.',
    youtubeId: 'wIuVvCuiGhI',
  },
  {
    id: 'graphics-design',
    featured: true,
    category: 'Graphics',
    title: 'Information About Graphics Design',
    image: '/images/course-graphics.jpg',
    price: 300,
    students: '4.5K+',
    time: '9hr 32min',
    description: 'Build a practical graphics toolkit for branding, layout, and visual storytelling.',
    youtubeId: 'YqQx75OPRa0',
  },
  {
    id: 'web-design',
    featured: true,
    category: 'Web',
    title: 'Information Web Design Degree',
    image: '/images/course-web.jpg',
    price: 300,
    students: '5K+',
    time: '8hr 45min',
    description: 'Design and ship modern websites with a clear, hands-on workflow.',
    youtubeId: 'G3e-cpL7ofc',
  },
  {
    id: 'graphics-studio',
    featured: true,
    category: 'Graphics',
    title: 'Creative Graphics Studio Practice',
    image: '/images/course-graphics-2.jpg',
    price: 300,
    students: '4.5K+',
    time: '9hr 32min',
    description: 'Practice campaign visuals, color systems, and presentation-ready design work.',
    youtubeId: 'dFSxcTq2lY8',
  },
  {
    id: 'web-lab',
    featured: true,
    category: 'Web',
    title: 'Responsive Web Lab',
    image: '/images/course-web-2.jpg',
    price: 300,
    students: '5K+',
    time: '8hr 45min',
    description: 'Build responsive pages, refine interactions, and publish a complete web project.',
    youtubeId: 'srvUrASNj0s',
  },
  {
    id: 'uiux-research',
    featured: true,
    category: 'UI/UX',
    title: 'UI/UX Research and Prototyping',
    image: '/images/course-uiux-2.jpg',
    price: 300,
    students: '5K+',
    time: '8hr 45min',
    description: 'Turn user research into prototypes and testable product flows.',
    youtubeId: 'bXcLS7JdwCY',
  },
  {
    id: 'fullstack-tech',
    featured: false,
    category: 'Technology',
    title: 'Full Stack Web Development',
    image: '/images/course-web.jpg',
    price: 280,
    students: '6K+',
    time: '12hr 10min',
    description: 'Learn the building blocks of full stack apps, from APIs to the interface.',
    youtubeId: 'nu_pCVPKzPk',
  },
  {
    id: 'python-data',
    featured: false,
    category: 'Technology',
    title: 'Python for Data Analysis',
    image: '/images/course-web-2.jpg',
    price: 260,
    students: '3.8K+',
    time: '10hr 20min',
    description: 'Analyze real datasets and present findings with Python.',
    youtubeId: 'r-uOLxNrNk8',
  },
  {
    id: 'brand-design',
    featured: false,
    category: 'Design',
    title: 'Brand Identity Design',
    image: '/images/course-graphics.jpg',
    price: 240,
    students: '2.9K+',
    time: '7hr 15min',
    description: 'Create logos, type pairings, and a simple brand system you can reuse.',
    youtubeId: '6N3P5knATSg',
  },
  {
    id: 'product-design',
    featured: false,
    category: 'Design',
    title: 'Product Design Foundations',
    image: '/images/course-uiux.jpg',
    price: 250,
    students: '3.2K+',
    time: '8hr 05min',
    description: 'Shape product ideas into clear screens and useful user journeys.',
    youtubeId: 's9s7C6NSiD4',
  },
]

export const featuredCourses = publicCourses.filter((course) => course.featured)

export const courseCategories = ['Technology', 'Design', 'UI/UX', 'Graphics', 'Web']

export const blogPosts = [
  {
    id: 'website-solution',
    category: 'Web',
    title: 'Make a better website solution for your product.',
    image: '/images/blog-website.jpg',
    excerpt: 'A practical look at structure, speed, and content that help a product site convert.',
  },
  {
    id: 'collaborative-learning',
    category: 'Learning',
    title: 'How collaborative learning helps you grow faster.',
    image: '/images/blog-learning.jpg',
    excerpt: 'Why studying with others improves motivation, feedback, and long-term memory.',
  },
  {
    id: 'career-confidence',
    category: 'Career',
    title: 'Build career confidence with practical skills.',
    image: '/images/blog-career.jpg',
    excerpt: 'Small weekly projects can turn course knowledge into work you can show.',
  },
  {
    id: 'study-rhythm',
    category: 'Learning',
    title: 'Find a study rhythm that actually sticks.',
    image: '/images/journey-learn.jpg',
    excerpt: 'Short, consistent sessions beat last-minute cramming for most learners.',
  },
  {
    id: 'portfolio-start',
    category: 'Career',
    title: 'Start a portfolio before you feel ready.',
    image: '/images/journey-certified.jpg',
    excerpt: 'Document the process, not just the finished file, and your work looks more real.',
  },
  {
    id: 'ask-better-questions',
    category: 'Learning',
    title: 'Ask better questions in every class.',
    image: '/images/journey-choose.jpg',
    excerpt: 'A good question turns a lesson into something you can use the same week.',
  },
  {
    id: 'teach-what-you-learn',
    category: 'Learning',
    title: 'Teach one idea to remember it.',
    image: '/images/hero-together.jpg',
    excerpt: 'Explaining a topic to a classmate is one of the fastest ways to lock it in.',
  },
  {
    id: 'finish-one-project',
    category: 'Career',
    title: 'Finish one small project this month.',
    image: '/images/course-web-2.jpg',
    excerpt: 'A complete project beats five half-started tutorials when you apply for work.',
  },
]

export const studentReviews = [
  { name: 'Maya Chen', role: 'Design student', image: '/images/review-1.jpg', stars: 4, quote: 'Clear lessons and a project I could actually show. A couple of videos felt long, but I still finished the course.' },
  { name: 'Omar Khalil', role: 'Junior developer', image: '/images/review-2.jpg', stars: 3, quote: 'Solid basics. I wanted more live help some weeks, but the assignments kept me moving.' },
  { name: 'Priya Sen', role: 'Product manager', image: '/images/review-3.jpg', stars: 4, quote: 'Fits a busy week. I applied one lesson at work the same day I watched it.' },
  { name: 'Elena Rossi', role: 'UX learner', image: '/images/review-4.jpg', stars: 4, quote: 'The projects helped me explain my process in interviews. Would like a few more critique sessions.' },
  { name: 'Kenji Sato', role: 'Frontend student', image: '/images/review-5.jpg', stars: 3, quote: 'I understood layout better, though a few quizzes were easier than the projects.' },
  { name: 'Sofia Mendes', role: 'Student', image: '/images/review-6.jpg', stars: 4, quote: 'Tutors replied when I got stuck. Not perfect, but I would take another course.' },
]

export const roleAvatars = {
  student: '/images/avatar-student.jpg',
  teacher: '/images/avatar-teacher.jpg',
  admin: '/images/avatar-admin.jpg',
}

export const roleWelcomeName = {
  student: 'Tahsin',
  teacher: 'Nadia',
  admin: 'Karim',
}

export function avatarFor(role) {
  return roleAvatars[role] || roleAvatars.student
}

export function welcomeNameFor(role) {
  return roleWelcomeName[role] || roleWelcomeName.student
}

export function findPublicCourse(id) {
  return publicCourses.find((course) => course.id === id) || null
}

export function courseWatchUrl(course) {
  const local = findPublicCourse(course?.id || course?._id)
  const youtubeId = course?.youtubeId || local?.youtubeId
  if (youtubeId) return 'https://www.youtube.com/watch?v=' + youtubeId
  const title = course?.title || course?.courseName || 'online course tutorial'
  return 'https://www.youtube.com/results?search_query=' + encodeURIComponent(title)
}

export function courseEmbedUrl(course) {
  const local = findPublicCourse(course?.id || course?._id)
  const youtubeId = course?.youtubeId || local?.youtubeId
  return youtubeId ? 'https://www.youtube.com/embed/' + youtubeId : ''
}

export function findBlogPost(id) {
  return blogPosts.find((post) => post.id === id) || null
}

export function rotateItems(items, start, count) {
  if (!items.length) return []
  const next = []
  for (let i = 0; i < Math.min(count, items.length); i += 1) {
    next.push(items[(start + i) % items.length])
  }
  return next
}
