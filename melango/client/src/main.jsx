import React, { createContext, useContext, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Link, Navigate, NavLink, Route, Routes, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Award, Bell, BookOpen, CalendarDays, CheckCircle2, ChevronDown, Chip, ClipboardList, Facebook, FileText, FolderOpen, Github, Heart, Instagram, LayoutDashboard, LogOut, Mail, Menu, MessageSquare, NotificationInbox, PenTool, Play, Progress, Search, Settings, Tools, Trophy, Twitter, UserCheck, Users, X, ArrowLeft, ArrowRight } from './icons'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import './styles.css'
import api, { apiError, authApi, courseApi, unwrap } from './services/api'
import { AppDashboard } from './features/Dashboard'
import { FeatureRouter } from './features/FeatureRouter'
import { avatarFor, blogPosts, courseCategories, courseEmbedUrl, courseWatchUrl, findBlogPost, findPublicCourse, publicCourses, rotateItems, studentReviews, welcomeNameFor } from './publicData'

const Auth = createContext()
const useAuth = () => useContext(Auth)
const navByRole = {
  student: [['Dashboard','/app'],['My courses','/app/courses'],['Announcements','/app/announcements'],['Assignments','/app/assignments'],['Quizzes','/app/quizzes'],['Materials','/app/materials'],['Calendar','/app/calendar'],['Search','/app/search'],['Messages','/app/messages'],['Notifications','/app/notifications'],['Progress','/app/progress'],['Attendance','/app/attendance'],['Achievements','/app/gamification']],
  teacher: [['Dashboard','/app'],['My courses','/app/courses'],['Create course','/app/create-course'],['Materials','/app/materials'],['Assignments','/app/assignments'],['Quizzes','/app/quizzes'],['Announcements','/app/announcements'],['Discussions','/app/discussions'],['Attendance','/app/attendance'],['Calendar','/app/calendar'],['Search','/app/search'],['Messages','/app/messages'],['Notifications','/app/notifications']],
  admin: [['Overview','/app'],['Users','/app/users'],['Courses','/app/courses'],['Announcements','/app/announcements'],['Reports','/app/reports'],['Search','/app/search'],['Messages','/app/messages'],['Notifications','/app/notifications']]
}
const iconFor = (name) => name.includes('Dashboard') || name === 'Overview' ? LayoutDashboard : name.includes('course') || name === 'Courses' ? BookOpen : name === 'Users' || name === 'Students' ? Users : name === 'Calendar' ? CalendarDays : name === 'Messages' ? MessageSquare : name === 'Announcements' ? Bell : name === 'Assignments' ? ClipboardList : name === 'Notifications' ? NotificationInbox : name === 'Progress' ? Progress : name === 'Attendance' ? UserCheck : name === 'Achievements' ? Trophy : name === 'Search' ? Search : name === 'Materials' ? FolderOpen : FileText

function AuthProvider({children}) {
 const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('melango_user') || 'null'))
 const login = (payload) => { const data = unwrap(payload); localStorage.setItem('melango_token', data.token); localStorage.setItem('melango_user', JSON.stringify(data.user)); setUser(data.user) }
 const logout = () => { localStorage.removeItem('melango_token'); localStorage.removeItem('melango_user'); setUser(null) }
 return <Auth.Provider value={{user, login, logout}}>{children}</Auth.Provider>
}
function Protected({children, roles}) { const {user}=useAuth(); return !user ? <Navigate to="/login" replace/> : roles && !roles.includes(user.role) ? <Navigate to="/app" replace/> : children }

function BrandMark({ className = '' }) {
  return (
    <NavLink className={'navbar-brand brand ' + className} to="/">
      <img src="/favicon.png" alt="" className="brand-logo"/>
      <div className="brand-text">
        <span className="brand-title">Melango</span>
      </div>
    </NavLink>
  )
}

function PublicNav() {
  const {user} = useAuth();
  return (
    <nav className="navbar navbar-expand-lg public-nav">
      <div className="container">
        <BrandMark />
        <button className="navbar-toggler" data-bs-toggle="collapse" data-bs-target="#nav"><Menu/></button>
        <div id="nav" className="collapse navbar-collapse">
          <div className="navbar-nav mx-auto">
            <div className="nav-item dropdown nav-courses">
              <NavLink className="nav-link dropdown-toggle" to="/courses">
                All Courses <ChevronDown size={14} className="nav-caret"/>
              </NavLink>
              <ul className="dropdown-menu">
                <li><Link className="dropdown-item" to="/courses?category=Technology"><Chip size={15}/> Technology</Link></li>
                <li><Link className="dropdown-item" to="/courses?category=Design"><PenTool size={15}/> Design</Link></li>
                <li><Link className="dropdown-item" to={'/courses?category=' + encodeURIComponent('UI/UX')}><Heart size={15}/> UI/UX</Link></li>
                <li><Link className="dropdown-item" to="/courses?category=Graphics"><Award size={15}/> Graphics</Link></li>
                <li><Link className="dropdown-item" to="/courses?category=Web"><Play size={15}/> Web</Link></li>
                <li><hr className="dropdown-divider"/></li>
                <li><Link className="dropdown-item dropdown-item-all" to="/courses"><BookOpen size={15}/> See all courses</Link></li>
              </ul>
            </div>
            <NavLink to="/about">About Us</NavLink>
            <NavLink to="/blog">Blog</NavLink>
            <NavLink to="/contact">Contact Us</NavLink>
          </div>
          <div className="d-flex gap-3 align-items-center">
            <NavLink className="btn btn-login" to="/login">Log in</NavLink>
            <NavLink className="btn btn-signup" to={user?'/app':'/register'}>{user?'Dashboard':'Sign Up'}</NavLink>
          </div>
        </div>
      </div>
    </nav>
  )
}

const courseImages=['https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=700&q=80','https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=700&q=80','https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=700&q=80']

function Home() {
  const [courseQuery, setCourseQuery] = useState('')
  const [courseCategory, setCourseCategory] = useState('')
  const [blogStart, setBlogStart] = useState(0)
  const [reviewStart, setReviewStart] = useState(0)
  const visibleBlogs = rotateItems(blogPosts, blogStart, 3)
  const visibleReviews = rotateItems(studentReviews, reviewStart, 3)
  const visibleCourses = publicCourses.filter((course) => {
    const matchesCategory = !courseCategory || course.category === courseCategory
    const query = courseQuery.trim().toLowerCase()
    const matchesSearch = !query || course.title.toLowerCase().includes(query) || course.category.toLowerCase().includes(query) || course.description.toLowerCase().includes(query)
    return matchesCategory && matchesSearch
  }).slice(0, 6)

  const applyCourseSearch = (event) => {
    event?.preventDefault()
    setCourseQuery(courseQuery.trim())
  }

  return (
    <>
      <PublicNav/>
      <main>
        {/* HERO SECTION */}
        <section className="hero-section">
          <img className="hero-bg" src="/images/hero-bg.jpg?v=warm" alt=""/>
          <div className="hero-shade" aria-hidden="true"></div>
          <div className="hero-inner">
            <div className="hero-copy">
              <h1 className="hero-title">
                Learn anytime, anywhere<br/>
                <span className="highlight-text">Unlock your potential</span>
              </h1>
              <p className="hero-desc">Practical courses, expert tutors, and a pace that fits real life.<br/>Start a skill today and keep growing at your own speed.</p>
              <div className="hero-actions">
                <NavLink className="btn btn-browse" to="/courses">Browse Courses</NavLink>
                <NavLink className="btn btn-hero-ghost" to="/about">See how it works</NavLink>
              </div>
              <div className="hero-proof">
                <div className="hero-avatars">
                  <img src="/images/journey-signup.jpg" alt=""/>
                  <img src="/images/journey-learn.jpg" alt=""/>
                  <img src="/images/course-uiux.jpg" alt=""/>
                  <img src="/images/hero-together.jpg" alt=""/>
                </div>
                <div className="hero-proof-copy">
                  <strong>50K+ learners</strong>
                  <span>4.9 average course rating</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="growth-section">
          <div className="growth-inner">
            <div className="growth-copy">
              <h2 className="growth-title">Build skills that shape your next chapter</h2>
              <p className="growth-desc">Skip the fluff. Learn through short lessons, guided projects, and tutors who help you apply each skill the same week.</p>
              <ul className="growth-points">
                <li>
                  <span><Tools size={18}/></span>
                  <div>
                    <b>Learn by making</b>
                    <small>Finish a real project you can show, not just watch videos.</small>
                  </div>
                </li>
                <li>
                  <span><Users size={18}/></span>
                  <div>
                    <b>Stay supported</b>
                    <small>Tutors and classmates reply when you get stuck.</small>
                  </div>
                </li>
                <li>
                  <span><Award size={18}/></span>
                  <div>
                    <b>Leave with proof</b>
                    <small>Earn a certificate when you complete the course.</small>
                  </div>
                </li>
              </ul>
              <div className="growth-actions">
                <NavLink className="btn btn-browse" to="/courses">Browse courses</NavLink>
                <NavLink className="btn btn-growth-ghost" to="/about">See how it works</NavLink>
              </div>
            </div>
            <div className="growth-media">
              <img className="growth-photo-main" src="/images/growth-student-cut.png" alt="Student with course materials"/>
            </div>
          </div>
        </section>

        {/* COURSES SECTION */}
        <section className="courses-section container">
          <div className="courses-header">
            <div>
              <h2 className="section-title">Explore Our Course</h2>
            </div>
            <form className="courses-search" onSubmit={applyCourseSearch}>
              <label className="search-input">
                <button type="submit" className="courses-search-btn" aria-label="Search courses"><Search size={18}/></button>
                <input type="search" value={courseQuery} onChange={(e) => setCourseQuery(e.target.value)} placeholder="Search Courses"/>
              </label>
              <div className="search-cats">
                <button type="button" className="search-cats-btn">
                  {courseCategory || 'All Categories'}
                  <ChevronDown size={16} className="search-select-caret"/>
                </button>
                <ul className="search-cats-menu">
                  <li>
                    <button type="button" className={!courseCategory ? 'is-on' : ''} onClick={() => setCourseCategory('')}>All Categories</button>
                  </li>
                  {courseCategories.map((category) => (
                    <li key={category}>
                      <button type="button" className={courseCategory === category ? 'is-on' : ''} onClick={() => setCourseCategory(category)}>{category}</button>
                    </li>
                  ))}
                </ul>
              </div>
            </form>
          </div>
          <div className="row g-4 mt-4">
            {visibleCourses.length ? visibleCourses.map((course) => <CourseCard2 key={course.id} course={course} />) : (
              <p className="text-muted">No courses match this search. Try another category or word.</p>
            )}
          </div>
          <div className="text-center mt-5">
            <NavLink className="btn btn-light-purple" to="/courses">See All Course</NavLink>
          </div>
        </section>

        <section className="journey-section">
          <div className="journey-inner">
            <div className="journey-head">
              <h2 className="section-title">Your Journey in <span className="text-purple">4 Easy Steps</span></h2>
              <p className="section-desc">Create an account, pick a course, learn by doing, and leave with a certificate</p>
            </div>
            <ol className="journey-path">
              <li>
                <Link to="/register" className="journey-step">
                  <div className="journey-step-media">
                    <img src="/images/journey-signup.jpg" alt=""/>
                    <span className="journey-step-icon"><Users size={18}/></span>
                  </div>
                  <div className="journey-step-copy">
                    <h4>Sign Up</h4>
                    <p>Create a free account and set up your learning profile</p>
                  </div>
                </Link>
              </li>
              <li>
                <Link to="/courses" className="journey-step">
                  <div className="journey-step-media">
                    <img src="/images/journey-choose.jpg" alt=""/>
                    <span className="journey-step-icon"><BookOpen size={18}/></span>
                  </div>
                  <div className="journey-step-copy">
                    <h4>Choose a Course</h4>
                    <p>Browse topics and pick the skill you want to build next</p>
                  </div>
                </Link>
              </li>
              <li>
                <Link to="/courses" className="journey-step">
                  <div className="journey-step-media">
                    <img src="/images/journey-learn.jpg" alt=""/>
                    <span className="journey-step-icon"><Play size={18}/></span>
                  </div>
                  <div className="journey-step-copy">
                    <h4>Learn & Practice</h4>
                    <p>Watch short lessons, take quizzes, and finish real projects</p>
                  </div>
                </Link>
              </li>
              <li>
                <Link to="/register" className="journey-step">
                  <div className="journey-step-media">
                    <img src="/images/journey-certified.jpg" alt=""/>
                    <span className="journey-step-icon"><Award size={18}/></span>
                  </div>
                  <div className="journey-step-copy">
                    <h4>Get Certified</h4>
                    <p>Complete the course and earn proof you can share</p>
                  </div>
                </Link>
              </li>
            </ol>
          </div>
        </section>

        {/* BLOG SECTION */}
        <section className="blog-section container">
          <div className="d-flex justify-content-between align-items-end mb-4">
            <div>
              <h2 className="section-title">Our Latest <span className="text-purple">Blog</span></h2>
              <p className="section-desc">Discover a world of knowledge and opportunities<br/>with our online education platform pursue a new career.</p>
            </div>
            <div className="carousel-arrows">
              <button type="button" className="btn-arrow" onClick={() => setBlogStart((n) => (n - 1 + blogPosts.length) % blogPosts.length)}><ArrowLeft size={20}/></button>
              <button type="button" className="btn-arrow" onClick={() => setBlogStart((n) => (n + 1) % blogPosts.length)}><ArrowRight size={20}/></button>
            </div>
          </div>
          <div className="row g-4">
            {visibleBlogs.map((post) => <BlogCard key={post.id} post={post} />)}
          </div>
          <div className="text-center mt-4">
            <div className="carousel-dots">
              <span className="dot"></span><span className="dot active"></span><span className="dot"></span><span className="dot"></span>
            </div>
            <NavLink className="btn btn-light-purple mt-4" to="/blog">See All</NavLink>
          </div>
        </section>

        {/* FAQ & FEEDBACK SECTION */}
        <section className="faq-feedback-section container">
          <div className="row g-5">
            <div className="col-lg-6">
              <h2 className="section-title">Frequently <span className="text-purple">Asked</span><br/>Questions</h2>
              <p className="section-desc mb-4">Discover a world of knowledge and opportunities<br/>with our online education platform pursue a new career.</p>
            </div>
            <div className="col-lg-6">
              <div className="accordion custom-accordion" id="faqAccordion">
                <div className="accordion-item">
                  <h2 className="accordion-header"><button className="accordion-button" type="button" data-bs-toggle="collapse" data-bs-target="#faq1">1. How do I get started with the academy?</button></h2>
                  <div id="faq1" className="accordion-collapse collapse show" data-bs-parent="#faqAccordion">
                    <div className="accordion-body">Simply sign up, choose your preferred course, and start learning instantly with access to all lessons and resources.</div>
                  </div>
                </div>
                <div className="accordion-item">
                  <h2 className="accordion-header"><button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq2">2. Are the courses suitable for beginners?</button></h2>
                  <div id="faq2" className="accordion-collapse collapse" data-bs-parent="#faqAccordion"><div className="accordion-body">Yes, we have courses for all levels.</div></div>
                </div>
                <div className="accordion-item">
                  <h2 className="accordion-header"><button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq3">3. Can I learn at my own pace?</button></h2>
                  <div id="faq3" className="accordion-collapse collapse" data-bs-parent="#faqAccordion"><div className="accordion-body">Yes, our courses are self-paced.</div></div>
                </div>
                <div className="accordion-item">
                  <h2 className="accordion-header"><button className="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#faq4">4. Do I receive a certificate after completion?</button></h2>
                  <div id="faq4" className="accordion-collapse collapse" data-bs-parent="#faqAccordion"><div className="accordion-body">Yes, you will receive a verifiable certificate.</div></div>
                </div>
              </div>
            </div>
          </div>

          <div className="feedback-section mt-5 pt-5">
            <div className="d-flex justify-content-between align-items-end mb-4">
              <div>
                <h2 className="section-title">What Our <span className="text-purple">Students</span><br/>Feedback</h2>
                <p className="section-desc">Real feedback from real learners who have transformed their skills with us.</p>
              </div>
              <div className="carousel-arrows">
                <button type="button" className="btn-arrow" onClick={() => setReviewStart((n) => (n - 1 + studentReviews.length) % studentReviews.length)}><ArrowLeft size={20}/></button>
                <button type="button" className="btn-arrow" onClick={() => setReviewStart((n) => (n + 1) % studentReviews.length)}><ArrowRight size={20}/></button>
              </div>
            </div>
            <div className="row g-4">
              {visibleReviews.map((review) => <FeedbackCard key={review.name} {...review} />)}
            </div>
            <div className="text-center mt-5">
              <NavLink className="btn btn-light-purple" to="/reviews">See All</NavLink>
            </div>
          </div>
        </section>

      </main>
      <Footer/>
    </>
  )
}

function CourseCard2({course}) {
  const [saved, setSaved] = useState(false)
  return (
    <div className="col-md-4">
      <div className="course-card2">
        <div className="course-img-wrapper">
          <img src={course.image} alt={course.title}/>
          <div className="course-price">${course.price}</div>
          <a href={courseWatchUrl(course)} className="btn-play" target="_blank" rel="noreferrer" aria-label={'Watch ' + course.title}><Play size={24} fill="currentColor"/></a>
        </div>
        <div className="course-card2-body">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="pill-light">{course.category}</span>
            <button type="button" className={'btn-heart' + (saved ? ' is-saved' : '')} onClick={() => setSaved((value) => !value)} aria-label={saved ? 'Remove from saved' : 'Save course'}><Heart size={16} fill="currentColor"/></button>
          </div>
          <h5 className="course-title">{course.title}</h5>
          <div className="course-stats">
            <span><Users size={16}/> {course.students} Students</span>
            <span><CalendarDays size={16}/> {course.time}</span>
          </div>
          <NavLink to={'/courses/' + course.id} className="btn btn-primary btn-preview-course w-100">Preview This Course</NavLink>
        </div>
      </div>
    </div>
  )
}

function BlogCard({post}) {
  return (
    <div className="col-md-4">
      <div className="blog-card">
        <img src={post.image} alt={post.title}/>
        <div className="blog-card-body">
          <span className="blog-category">{post.category}</span>
          <h5 className="blog-title">{post.title}</h5>
          <NavLink to={'/blog/' + post.id} className="blog-link">Read Blog <ArrowRight size={16}/></NavLink>
        </div>
      </div>
    </div>
  )
}

function FeedbackCard({name, role, image, quote, stars = 4}) {
  return (
    <div className="col-md-4">
      <div className="feedback-card">
        <div className="stars" aria-label={stars + ' out of 5 stars'}>
          {[1, 2, 3, 4, 5].map((n) => (
            <svg key={n} width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path fill={n <= stars ? '#f4ad37' : '#e6ddd0'} d="M12 2.2l2.75 6.2 6.75.74-5.05 4.62 1.4 6.64L12 16.9 6.15 20.4l1.4-6.64L2.5 9.14l6.75-.74L12 2.2z"/>
            </svg>
          ))}
        </div>
        <p>{quote}</p>
        <div className="feedback-user">
          <img src={image} alt={name}/>
          <div>
            <h6>{name}</h6>
            <small>{role}</small>
          </div>
        </div>
      </div>
    </div>
  )
}

function Footer() {
  const [email, setEmail] = useState('')
  const [joined, setJoined] = useState(false)
  return (
    <footer className="footer-section">
      <div className="container">
        <div className="cta-box text-center">
          <h2>Ready to Get Started?</h2>
          <p>The purpose of a FAQ is generally to provide information on frequent questions or concerns.</p>
          <NavLink to="/contact" className="btn btn-white">Contact us</NavLink>
        </div>
      </div>
      <div className="footer-main">
        <div className="container">
          <div className="row g-4">
            <div className="col-lg-4">
              <h3 className="footer-brand">Melango</h3>
              <p className="footer-desc">The purpose of a FAQ is generally to provide information on frequent questions or concerns.</p>
              <div className="social-links">
                <NavLink to="/contact" aria-label="Twitter"><Twitter size={18}/></NavLink>
                <NavLink to="/contact" aria-label="Facebook"><Facebook size={18}/></NavLink>
                <NavLink to="/contact" aria-label="Instagram"><Instagram size={18}/></NavLink>
                <NavLink to="/contact" aria-label="Github"><Github size={18}/></NavLink>
              </div>
            </div>
            <div className="col-lg-2 col-6">
              <h5>Company</h5>
              <ul className="footer-links">
                <li><NavLink to="/courses">Service</NavLink></li>
                <li><NavLink to="/blog">Resources</NavLink></li>
                <li><NavLink to="/about">About us</NavLink></li>
              </ul>
            </div>
            <div className="col-lg-2 col-6">
              <h5>Help</h5>
              <ul className="footer-links">
                <li><NavLink to="/contact">Support</NavLink></li>
                <li><NavLink to="/terms">Terms & Conditions</NavLink></li>
                <li><NavLink to="/privacy">Privacy Policy</NavLink></li>
              </ul>
            </div>
            <div className="col-lg-4">
              <h5>Subscribe to Newsletter</h5>
              <form className="newsletter-form" onSubmit={(e) => { e.preventDefault(); if (email.trim()) setJoined(true) }}>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter email address" aria-label="Email address" disabled={joined}/>
                <button type="submit" className="btn btn-primary" disabled={joined}>{joined ? 'Joined' : 'Join'}</button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

function Stat({n,t}) { return <div className="col-6 col-md-3"><strong>{n}</strong><span>{t}</span></div> }
function CourseCard({name,image,course}) {
  const watchUrl = courseWatchUrl(course)
  return (
    <div className="col-md-4">
      <div className="course-card">
        <div className="course-img-wrapper">
          <img src={course?.thumbnail || course?.image || image || courseImages[0]} alt="Course cover"/>
          <a href={watchUrl} className="btn-play" target="_blank" rel="noreferrer" aria-label={'Watch ' + (course?.title || course?.courseName || name)}><Play size={24} fill="currentColor"/></a>
        </div>
        <div className="course-card-body">
          <span className="pill">{course?.category || 'Technology'}</span>
          <h5>{course?.courseName || course?.title || name}</h5>
          <p>{course?.description || 'Build useful skills through friendly, practical learning.'}</p>
          <div className="d-flex justify-content-between align-items-center">
            <small>By {course?.instructor?.name || 'Melango Team'}</small>
            <NavLink to={`/courses/${course?._id || course?.id || 'demo'}`} className="round-arrow">→</NavLink>
          </div>
        </div>
      </div>
    </div>
  )
}

function Catalog() {
  const [params, setParams] = useSearchParams()
  const category = params.get('category') || ''
  const [search, setSearch] = useState(params.get('search') || '')

  useEffect(() => {
    setSearch(params.get('search') || '')
  }, [params])

  const applySearch = (event) => {
    event.preventDefault()
    const next = new URLSearchParams(params)
    if (search.trim()) next.set('search', search.trim())
    else next.delete('search')
    setParams(next)
  }

  const changeCategory = (value) => {
    const next = new URLSearchParams(params)
    if (value) next.set('category', value)
    else next.delete('category')
    setParams(next)
  }

  const query = (params.get('search') || '').toLowerCase()
  const courses = publicCourses.filter((course) => {
    const matchesCategory = !category || course.category === category
    const matchesSearch = !query || course.title.toLowerCase().includes(query) || course.category.toLowerCase().includes(query)
    return matchesCategory && matchesSearch
  })

  return (
    <>
      <PublicNav/>
      <section className="catalog-hero">
        <div className="container">
          <h1>Explore courses that<br/><em>move you forward.</em></h1>
          <form className="searchbox" onSubmit={applySearch}>
            <Search/>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="What do you want to learn?"/>
            <button type="submit" className="btn btn-primary">Search</button>
          </form>
        </div>
      </section>
      <section className="section container">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h3>{category || 'Featured courses'}</h3>
          <select className="form-select w-auto" value={category} onChange={(e) => changeCategory(e.target.value)}>
            <option value="">All categories</option>
            {courseCategories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <div className="row g-4">
          {courses.length ? courses.map((c, i) => (
            <CourseCard key={c._id || c.id} course={c} image={c.image || courseImages[i % 3]}/>
          )) : <p className="text-muted">No courses found in this category.</p>}
        </div>
      </section>
      <Footer/>
    </>
  )
}

function courseOutcomes(course) {
  const byCategory = {
    'UI/UX': 'Research users, sketch flows, and prototype interfaces people enjoy',
    Graphics: 'Build layouts, color systems, and campaign-ready visuals',
    Web: 'Design and ship responsive pages with a clear workflow',
    Technology: 'Connect the tools and patterns used in modern apps',
    Design: 'Turn ideas into a simple, consistent visual system',
  }
  return [
    byCategory[course.category] || course.description,
    'Finish a project you can show in a portfolio',
    'Stay consistent with a supportive learning community',
    'Earn a certificate when you complete the journey',
  ]
}

function CourseDetail() {
  const {id} = useParams()
  const {user} = useAuth()
  const navigate = useNavigate()
  const course = findPublicCourse(id)
  const [code, setCode] = useState('')
  const [showCode, setShowCode] = useState(false)
  const [message, setMessage] = useState('')
  const [saved, setSaved] = useState(false)
  const [playing, setPlaying] = useState(false)

  const enroll = async () => {
    if (!user) {
      navigate('/login')
      return
    }
    try {
      await courseApi.join({enrollmentCode: code || undefined})
      setMessage('You are enrolled. Open your dashboard to start learning.')
    } catch (e) {
      setMessage(apiError(e))
    }
  }

  if (!course) {
    return (
      <>
        <PublicNav/>
        <main className="course-preview-page">
          <section className="course-preview">
            <div className="container">
              <div className="course-preview-empty">
                <h1>This course is unavailable</h1>
                <p>The preview you opened could not be found. Browse the catalog and pick another course.</p>
                <NavLink to="/courses" className="btn btn-primary">Back to courses</NavLink>
              </div>
            </div>
          </section>
        </main>
        <Footer/>
      </>
    )
  }

  const watchUrl = courseWatchUrl(course)
  const embedUrl = courseEmbedUrl(course)
  const related = publicCourses.filter((item) => item.id !== course.id && item.category === course.category)
  const extras = publicCourses.filter((item) => item.id !== course.id && item.category !== course.category)
  const relatedCourses = [...related, ...extras].slice(0, 3)

  return (
    <>
      <PublicNav/>
      <main className="course-preview-page">
        <section className="course-preview">
          <div className="container">
            <nav className="course-crumb" aria-label="Breadcrumb">
              <NavLink to="/">Home</NavLink>
              <span>/</span>
              <NavLink to="/courses">All Courses</NavLink>
              <span>/</span>
              <span>{course.category}</span>
            </nav>

            <div className="course-preview-grid">
              <div className="course-preview-main">
                <div className="course-video">
                  {playing && embedUrl ? (
                    <iframe src={embedUrl + '?autoplay=1'} title={course.title} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                  ) : (
                    <>
                      <img src={course.image} alt={course.title}/>
                      {embedUrl ? (
                        <button type="button" className="course-video-play" onClick={() => setPlaying(true)} aria-label={'Play preview of ' + course.title}>
                          <Play size={28} fill="currentColor"/>
                        </button>
                      ) : (
                        <a className="course-video-play" href={watchUrl} target="_blank" rel="noreferrer" aria-label={'Watch ' + course.title}>
                          <Play size={28} fill="currentColor"/>
                        </a>
                      )}
                    </>
                  )}
                </div>

                <div className="course-preview-copy">
                  <span className="pill-light">{course.category}</span>
                  <h1>{course.title}</h1>
                  <p>{course.description}</p>
                  <div className="course-preview-meta">
                    <span><Users size={16}/> {course.students} students</span>
                    <span><CalendarDays size={16}/> {course.time}</span>
                    <span>By Melango educator</span>
                  </div>
                </div>

                <div className="course-learn">
                  <h2>What you’ll learn</h2>
                  <ul>
                    {courseOutcomes(course).map((item) => (
                      <li key={item}>
                        <CheckCircle2 size={18}/>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <aside className="course-enroll">
                <img src={course.image} alt="" className="course-enroll-thumb"/>
                <div className="course-enroll-body">
                  <div className="course-enroll-top">
                    <strong>${course.price}</strong>
                    <button type="button" className={'btn-heart' + (saved ? ' is-saved' : '')} onClick={() => setSaved((value) => !value)} aria-label={saved ? 'Remove from saved' : 'Save course'}>
                      <Heart size={16} fill="currentColor"/>
                    </button>
                  </div>
                  <p>Join this course and start your next chapter at a flexible pace.</p>
                  <button type="button" onClick={enroll} className="btn btn-primary w-100">{user ? 'Enroll now' : 'Log in to enroll'}</button>
                  <button type="button" className="course-code-toggle" onClick={() => setShowCode((value) => !value)}>
                    {showCode ? 'Hide enrollment code' : 'Have an enrollment code?'}
                  </button>
                  {showCode ? (
                    <input className="form-control" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Enter enrollment code"/>
                  ) : null}
                  {message ? <p className="course-enroll-msg">{message}</p> : null}
                  <ul className="course-enroll-perks">
                    <li>Lifetime access to lessons</li>
                    <li>Learn at your own pace</li>
                    <li>Certificate on completion</li>
                  </ul>
                </div>
              </aside>
            </div>

            {relatedCourses.length ? (
              <div className="course-related">
                <div className="d-flex justify-content-between align-items-end mb-4">
                  <h2 className="section-title">Related courses</h2>
                  <NavLink to="/courses" className="small-link">See all</NavLink>
                </div>
                <div className="row g-4">
                  {relatedCourses.map((item) => <CourseCard2 key={item.id} course={item}/>)}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </main>
      <Footer/>
    </>
  )
}
function Login({ register = false }) {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const demos = [
    { label: 'Student', email: 'student@melango.com', password: 'Student123!' },
    { label: 'Teacher', email: 'teacher@melango.com', password: 'Teacher123!' },
    { label: 'Admin', email: 'admin@melango.com', password: 'Admin123!' },
  ]

  const submit = async (event) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const res = register ? await authApi.register(form) : await authApi.login(form)
      login(res)
      navigate('/app')
    } catch (err) {
      setError(apiError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <div className="auth-visual" aria-hidden="true">
          <img src={register ? '/images/journey-signup.jpg' : '/images/hero-learner.jpg'} alt=""/>
          <div className="auth-visual-copy">
            <p>Learn without limits</p>
            <small>Practical courses, real tutors, your own pace</small>
          </div>
        </div>
        <div className="auth-card">
          <BrandMark className="auth-brand"/>
          <h1>{register ? 'Create account' : 'Welcome back'}</h1>
          <p className="auth-lead">{register ? 'Join Melango in a minute.' : 'Sign in to continue learning.'}</p>
          <form onSubmit={submit}>
            {register && (
              <label>
                Full name
                <input required className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name"/>
              </label>
            )}
            <label>
              Email
              <input required type="email" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@email.com"/>
            </label>
            <label>
              Password
              <input required minLength="6" type="password" className="form-control" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={register ? 'At least 6 characters' : 'Your password'}/>
            </label>
            {register && (
              <div className="auth-roles">
                <span>I am a</span>
                <div>
                  <button type="button" className={form.role === 'student' ? 'is-on' : ''} onClick={() => setForm({ ...form, role: 'student' })}>Student</button>
                  <button type="button" className={form.role === 'teacher' ? 'is-on' : ''} onClick={() => setForm({ ...form, role: 'teacher' })}>Teacher</button>
                </div>
              </div>
            )}
            {error && <div className="auth-error">{error}</div>}
            <button disabled={busy} className="btn btn-primary auth-submit" type="submit">
              {busy ? 'Please wait…' : register ? 'Create account' : 'Sign in'}
            </button>
          </form>
          {!register && (
            <div className="auth-demos">
              <small>Try a demo</small>
              <div>
                {demos.map((demo) => (
                  <button type="button" key={demo.label} onClick={() => setForm((prev) => ({ ...prev, email: demo.email, password: demo.password }))}>{demo.label}</button>
                ))}
              </div>
            </div>
          )}
          <p className="auth-switch">
            {register ? 'Already have an account?' : 'New to Melango?'}{' '}
            <NavLink to={register ? '/login' : '/register'}>{register ? 'Log in' : 'Create account'}</NavLink>
          </p>
        </div>
      </div>
    </div>
  )
}
function AppShell(){const {user,logout}=useAuth();const [open,setOpen]=useState(false);const nav=navByRole[user.role]||navByRole.student;return <div className="app-layout"><aside className={'app-side '+(open?'open':'')}><div className="side-user"><img className="avatar" src={avatarFor(user.role)} alt=""/><div><b>{user.name}</b><small>{user.role}</small></div><button className="mobile-close" onClick={()=>setOpen(false)}><X/></button></div><nav>{nav.map(([label,path])=>{const Icon=iconFor(label);return <NavLink end={path==='/app'} to={path} key={label} onClick={()=>setOpen(false)}><Icon size={18}/>{label}</NavLink>})}</nav><div className="side-footer"><NavLink to="/app/profile"><Settings size={18}/> Settings</NavLink><button className="btn-logout" onClick={logout}><LogOut size={18}/> Log out</button></div></aside><main className="app-main"><header className="app-header"><button className="mobile-menu" onClick={()=>setOpen(true)}><Menu/></button><div><small>Welcome back,</small><h5>{welcomeNameFor(user.role)} 👋</h5></div><div className="ms-auto d-flex gap-3 align-items-center"><NavLink to="/app/notifications" aria-label="Notifications"><Bell size={20}/></NavLink></div></header><PageFade scope="app"><Routes><Route index element={<AppDashboard user={user}/>}/><Route path="*" element={<FeatureRouter user={user}/>}/></Routes></PageFade></main></div>}
function Empty({title,role}){return <div className="empty"><FileText size={40}/><h5>No {title.toLowerCase()} yet</h5><p>{role==='teacher'?'Create your first item to get this space moving.':'You’re all caught up. New items will appear here when available.'}</p></div>}
function Loading(){return <div className="loading"><span></span> Loading…</div>}
function About() {
  return (
    <>
      <PublicNav/>
      <main className="about-page">
        <section className="about-hero">
          <img className="about-hero-bg" src="/images/about-hero.jpg" alt=""/>
          <div className="about-hero-shade" aria-hidden="true"></div>
          <div className="about-hero-inner">
            <div className="about-hero-copy">
              <h1>Learning should feel<br/><span>possible for everyone</span></h1>
              <p>Melango is an all-in-one learning space for students, teachers, and the communities that help them thrive</p>
              <div className="about-hero-actions">
                <NavLink className="btn btn-browse" to="/courses">Browse courses</NavLink>
                <NavLink className="btn btn-hero-ghost" to="/register">Join Melango</NavLink>
              </div>
            </div>
          </div>
        </section>

        <section className="about-story">
          <div className="about-story-copy">
            <h2>Built around human progress</h2>
            <p>We bring courses, materials, conversations, feedback, and milestones into one calm experience so learning can stay at the center.</p>
          </div>
          <ul className="about-points">
            <li>
              <span><BookOpen size={18}/></span>
              <div>
                <b>Learn with purpose</b>
                <small>Short lessons and real projects, not endless video piles.</small>
              </div>
            </li>
            <li>
              <span><Users size={18}/></span>
              <div>
                <b>Stay close to people</b>
                <small>Teachers and classmates reply when you get stuck.</small>
              </div>
            </li>
            <li>
              <span><Award size={18}/></span>
              <div>
                <b>Leave with proof</b>
                <small>Certificates and work you can actually show.</small>
              </div>
            </li>
          </ul>
        </section>

        <section className="about-gallery">
          <img src="/images/journey-learn.jpg" alt="A student practicing a lesson"/>
          <img src="/images/journey-choose.jpg" alt="Choosing a course"/>
          <img src="/images/journey-certified.jpg" alt="Getting certified"/>
        </section>
      </main>
      <Footer/>
    </>
  )
}

function Blog() {
  const [visibleCount, setVisibleCount] = useState(6)
  const visiblePosts = blogPosts.slice(0, visibleCount)
  const hasMore = visibleCount < blogPosts.length
  return (
    <>
      <PublicNav/>
      <section className="catalog-hero">
        <div className="container">
          <h1>Our latest<br/><em>learning notes.</em></h1>
          <p className="lead mt-4">Short reads on courses, careers, and how people actually learn.</p>
        </div>
      </section>
      <section className="section container">
        <div className="row g-4">
          {visiblePosts.map((post) => <BlogCard key={post.id} post={post} />)}
        </div>
        {hasMore && (
          <div className="text-center blog-more">
            <button type="button" className="btn btn-primary" onClick={() => setVisibleCount((n) => Math.min(n + 3, blogPosts.length))}>See more</button>
          </div>
        )}
      </section>
      <Footer/>
    </>
  )
}

function BlogPost() {
  const {id} = useParams()
  const post = findBlogPost(id)
  if (!post) return <Navigate to="/blog" replace/>
  return (
    <>
      <PublicNav/>
      <section className="catalog-hero">
        <div className="container">
          <h1>{post.title}</h1>
          <p className="lead mt-4">{post.excerpt}</p>
        </div>
      </section>
      <section className="section container">
        <img src={post.image} alt={post.title} className="article-cover"/>
        <p className="col-lg-8 mt-4">{post.excerpt} Use this as a starting point, then try one idea from a Melango course the same day so the advice turns into practice.</p>
        <NavLink to="/blog" className="btn btn-light-purple mt-3">Back to blog</NavLink>
      </section>
      <Footer/>
    </>
  )
}

function Reviews() {
  return (
    <>
      <PublicNav/>
      <section className="catalog-hero">
        <div className="container">
          <h1>What learners<br/><em>say about Melango.</em></h1>
        </div>
      </section>
      <section className="section container">
        <div className="row g-4">
          {studentReviews.map((review) => <FeedbackCard key={review.name} {...review} />)}
        </div>
      </section>
      <Footer/>
    </>
  )
}

function Contact() {
  const [sent, setSent] = useState(false)
  return (
    <>
      <PublicNav/>
      <main className="contact-page">
        <section className="contact-shell">
          <div className="contact-copy">
            <h1>We would love to<br/><span className="text-purple">hear from you</span></h1>
            <p>Ask about a course, teaching on Melango, or your account. We usually reply within one working day.</p>
            <ul className="contact-meta">
              <li>
                <span><Mail size={18}/></span>
                <div>
                  <b>Email</b>
                  <small>hello@melango.com</small>
                </div>
              </li>
              <li>
                <span><CalendarDays size={18}/></span>
                <div>
                  <b>Hours</b>
                  <small>Sun–Thu, 10am–6pm</small>
                </div>
              </li>
              <li>
                <span><BookOpen size={18}/></span>
                <div>
                  <b>Help</b>
                  <small>Courses, accounts, certificates</small>
                </div>
              </li>
            </ul>
          </div>
          <div className="contact-card">
            {sent ? (
              <div className="contact-thanks">
                <h2>Message sent</h2>
                <p>Thanks. We received your note and will reply soon.</p>
                <NavLink className="btn btn-browse" to="/courses">Browse courses</NavLink>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); setSent(true) }}>
                <h2>Send a message</h2>
                <label>Name<input className="form-control" required placeholder="Your name"/></label>
                <label>Email<input className="form-control" type="email" required placeholder="you@email.com"/></label>
                <label>Message<textarea className="form-control" rows="5" required placeholder="How can we help?"/></label>
                <button type="submit" className="btn btn-primary">Send message</button>
              </form>
            )}
          </div>
        </section>
      </main>
      <Footer/>
    </>
  )
}

function LegalPage({title, text}) {
  return (
    <>
      <PublicNav/>
      <section className="catalog-hero">
        <div className="container">
          <h1>{title}</h1>
        </div>
      </section>
      <section className="section container">
        <p className="col-lg-8">{text}</p>
        <NavLink to="/contact" className="btn btn-light-purple">Contact support</NavLink>
      </section>
      <Footer/>
    </>
  )
}

function ScrollToTop() {
  const { pathname, search } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }, [pathname, search])
  return null
}

function PageFade({ children, scope = 'page' }) {
  const { pathname } = useLocation()
  const animKey = scope === 'app' ? pathname : (pathname.startsWith('/app') ? 'app' : pathname)
  return <div key={animKey} className="page-fade">{children}</div>
}

function Root() {
  return (
    <AuthProvider>
      <ScrollToTop/>
      <PageFade>
      <Routes>
        <Route path="/" element={<Home/>}/>
        <Route path="/courses" element={<Catalog/>}/>
        <Route path="/courses/:id" element={<CourseDetail/>}/>
        <Route path="/about" element={<About/>}/>
        <Route path="/blog" element={<Blog/>}/>
        <Route path="/blog/:id" element={<BlogPost/>}/>
        <Route path="/reviews" element={<Reviews/>}/>
        <Route path="/contact" element={<Contact/>}/>
        <Route path="/terms" element={<LegalPage title="Terms & Conditions" text="By using Melango you agree to learn respectfully, keep your account details private, and use course materials for your own study."/>}/>
        <Route path="/privacy" element={<LegalPage title="Privacy Policy" text="Melango stores the account details you share so we can run your courses, progress, and messages. We do not sell your personal data."/>}/>
        <Route path="/login" element={<Login/>}/>
        <Route path="/register" element={<Login register/>}/>
        <Route path="/app/*" element={<Protected><AppShell/></Protected>}/>
        <Route path="*" element={<Navigate to="/"/>}/>
      </Routes>
      </PageFade>
    </AuthProvider>
  )
}
createRoot(document.getElementById('root')).render(<BrowserRouter><Root/></BrowserRouter>)
