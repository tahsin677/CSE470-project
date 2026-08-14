import React, { createContext, useContext, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, NavLink, Route, Routes, useNavigate, useParams } from 'react-router-dom'
import { BarChart3, Bell, BookOpen, CalendarDays, CheckCircle2, ChevronRight, ChevronDown, ChevronUp, ClipboardList, FileText, GraduationCap, LayoutDashboard, LogOut, Mail, Menu, MessageSquare, Plus, Search, Settings, Sparkles, Users, X, Send, Star, PenTool, Award, Play, Heart, ArrowLeft, ArrowRight, Twitter, Facebook, Instagram, Github } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import './styles.css'
import api, { apiError, authApi, courseApi, unwrap } from './services/api'
import { AppDashboard } from './features/Dashboard'
import { FeatureRouter } from './features/FeatureRouter'

const Auth = createContext()
const useAuth = () => useContext(Auth)
const navByRole = {
  student: [['Dashboard','/app'],['My courses','/app/courses'],['Assignments','/app/assignments'],['Quizzes','/app/quizzes'],['Materials','/app/materials'],['Calendar','/app/calendar'],['Search','/app/search'],['Messages','/app/messages'],['Notifications','/app/notifications'],['Progress','/app/progress'],['Attendance','/app/attendance'],['Achievements','/app/gamification']],
  teacher: [['Dashboard','/app'],['My courses','/app/courses'],['Create course','/app/create-course'],['Materials','/app/materials'],['Assignments','/app/assignments'],['Quizzes','/app/quizzes'],['Announcements','/app/announcements'],['Discussions','/app/discussions'],['Attendance','/app/attendance'],['Calendar','/app/calendar'],['Search','/app/search'],['Messages','/app/messages'],['Notifications','/app/notifications']],
  admin: [['Overview','/app'],['Users','/app/users'],['Courses','/app/courses'],['Announcements','/app/announcements'],['Reports','/app/reports'],['Search','/app/search'],['Messages','/app/messages'],['Notifications','/app/notifications']]
}
const iconFor = (name) => name.includes('Dashboard') || name === 'Overview' ? LayoutDashboard : name.includes('course') || name === 'Courses' ? BookOpen : name === 'Users' || name === 'Students' ? Users : name === 'Calendar' ? CalendarDays : name === 'Messages' ? MessageSquare : name === 'Announcements' ? Bell : name === 'Assignments' ? ClipboardList : FileText

function AuthProvider({children}) {
 const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('melango_user') || 'null'))
 const login = (payload) => { const data = unwrap(payload); localStorage.setItem('melango_token', data.token); localStorage.setItem('melango_user', JSON.stringify(data.user)); setUser(data.user) }
 const logout = () => { localStorage.removeItem('melango_token'); localStorage.removeItem('melango_user'); setUser(null) }
 return <Auth.Provider value={{user, login, logout}}>{children}</Auth.Provider>
}
function Protected({children, roles}) { const {user}=useAuth(); return !user ? <Navigate to="/login" replace/> : roles && !roles.includes(user.role) ? <Navigate to="/app" replace/> : children }

function PublicNav() {
  const {user} = useAuth();
  return (
    <nav className="navbar navbar-expand-lg public-nav">
      <div className="container">
        <NavLink className="navbar-brand brand" to="/">
          <div className="brand-icon">
            <BookOpen size={24} className="book-icon" />
            <GraduationCap size={16} className="cap-icon" />
          </div>
          <div className="brand-text">
            <span className="brand-title">Melango</span>
          </div>
        </NavLink>
        <button className="navbar-toggler" data-bs-toggle="collapse" data-bs-target="#nav"><Menu/></button>
        <div id="nav" className="collapse navbar-collapse">
          <div className="navbar-nav mx-auto">
            <NavLink to="/">Home</NavLink>
            <div className="nav-item dropdown">
              <a className="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">All Courses <ChevronDown size={14}/></a>
              <ul className="dropdown-menu">
                <li><NavLink className="dropdown-item" to="/courses">Technology</NavLink></li>
                <li><NavLink className="dropdown-item" to="/courses">Design</NavLink></li>
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
  return (
    <>
      <PublicNav/>
      <main>
        {/* HERO SECTION */}
        <section className="hero-section">
          <div className="container text-center position-relative">
            <div className="hero-grid" aria-hidden="true"></div>
            <div className="hero-content">
              <h1 className="hero-title">
                Learn Anytime, Anywhere<br/>
                <span className="highlight-text">Unlock<svg className="highlight-underline" viewBox="0 0 200 20" xmlns="http://www.w3.org/2000/svg"><path d="M5,15 Q100,0 195,15" fill="none" stroke="#7450d4" strokeWidth="4" strokeLinecap="round"/></svg></span> Your Potential
              </h1>
              <p className="hero-desc">Upgrade your skills and achieve your goals with expert instructors and flexible learning options.</p>
              <NavLink className="btn btn-browse" to="/courses"><Send size={18}/> Browse Courses</NavLink>
            </div>
            
            {/* Floating Elements */}
          </div>
        </section>

        {/* STATS SECTION */}
        <section className="stats-section">
          <div className="container">
            <div className="stats-row">
              <div className="stat-box">
                <div className="stat-icon"><PenTool size={24}/></div>
                <div className="stat-info"><strong>500+</strong><span>Online Courses</span></div>
              </div>
              <div className="stat-box">
                <div className="stat-icon"><Users size={24}/></div>
                <div className="stat-info"><strong>2k+</strong><span>Expert Tutors</span></div>
              </div>
              <div className="stat-box">
                <div className="stat-icon"><Award size={24}/></div>
                <div className="stat-info"><strong>400+</strong><span>Certified Courses</span></div>
              </div>
              <div className="stat-box">
                <div className="stat-icon"><GraduationCap size={24}/></div>
                <div className="stat-info"><strong>50K+</strong><span>Online Students</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* GROWTH SECTION */}
        <section className="growth-section container">
          <div className="row align-items-center">
            <div className="col-lg-6">
              <div className="growth-icon"><GraduationCap size={32}/></div>
              <h2 className="growth-title">Build Skills,<br/>Shape Your Future</h2>
              <p className="growth-desc">Learn practical skills for your next step.</p>
              <NavLink className="btn btn-light-purple mt-3 mb-4" to="/about">See more</NavLink>
            </div>
            <div className="col-lg-6 position-relative">
              <div className="growth-bg-icons">
                <BookOpen className="bg-icon-1"/>
                <PenTool className="bg-icon-2"/>
                <GraduationCap className="bg-icon-3"/>
              </div>
              <img src="/images/growth-student.jpg" alt="Student holding course materials" className="growth-img"/>
            </div>
          </div>
        </section>

        {/* COURSES SECTION */}
        <section className="courses-section container">
          <div className="courses-header">
            <div>
              <h2 className="section-title">Explore Our Course</h2>
            </div>
            <div className="courses-search">
              <div className="search-input">
                <Search size={18}/>
                <input type="text" placeholder="Search Courses"/>
              </div>
              <select className="form-select search-select">
                <option>All Categories</option>
              </select>
            </div>
          </div>
          <div className="row g-4 mt-4">
            <CourseCard2 image="https://images.unsplash.com/photo-1561736778-92e52a7769ef?w=600&h=400&fit=crop" price="$300" category="UI/UX" title="Information About UI/UX Design Degree" students="5K+" time="8hr 45min" />
            <CourseCard2 image="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop" price="$300" category="Graphics" title="Information About Graphics Design" students="4.5K+" time="9hr 32min" />
            <CourseCard2 image="https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&h=400&fit=crop" price="$300" category="Web" title="Information Web Design Degree" students="5K+" time="8hr 45min" />
            <CourseCard2 image="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop" price="$300" category="Graphics" title="Information About Graphics Design" students="4.5K+" time="9hr 32min" />
            <CourseCard2 image="https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&h=400&fit=crop" price="$300" category="Web" title="Information Web Design Degree" students="5K+" time="8hr 45min" />
            <CourseCard2 image="https://images.unsplash.com/photo-1561736778-92e52a7769ef?w=600&h=400&fit=crop" price="$300" category="UI/UX" title="Information About UI/UX Design Degree" students="5K+" time="8hr 45min" />
          </div>
          <div className="text-center mt-5">
            <NavLink className="btn btn-light-purple" to="/courses">See All Course</NavLink>
          </div>
        </section>

        {/* JOURNEY SECTION */}
        <section className="journey-section container">
          <h2 className="section-title">Your Journey in <span className="text-purple">4 Easy Step</span></h2>
          <div className="journey-map">
            <svg className="journey-map-lines" viewBox="0 0 1000 440" preserveAspectRatio="none" aria-hidden="true">
              <path d="M 240 100 C 280 100, 225 294, 255 294" />
              <path d="M 495 294 C 520 185, 455 120, 510 100" />
              <path d="M 750 100 C 810 145, 810 294, 760 294" />
            </svg>
            <article className="journey-map-card step-one">
              <img src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&h=400&fit=crop" alt="Sign up"/>
              <div className="journey-map-copy"><h4>1. Sign Up</h4></div>
            </article>
            <article className="journey-map-card step-two">
              <img src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=600&h=400&fit=crop" alt="Choose a course"/>
              <div className="journey-map-copy"><h4>2. Choose a Course</h4><p>Explore topics that fit your goals.</p></div>
            </article>
            <article className="journey-map-card step-three">
              <img src="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&h=400&fit=crop" alt="Learn and practice"/>
              <div className="journey-map-copy"><h4>3. Learn & Practice</h4><p>Watch lessons, take quizzes, and work on projects.</p></div>
            </article>
            <article className="journey-map-card step-four">
              <img src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=600&h=400&fit=crop" alt="Get certified"/>
              <div className="journey-map-copy"><h4>4. Get Certified</h4><p>Earn proof of your skills.</p></div>
            </article>
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
              <button className="btn-arrow"><ArrowLeft size={20}/></button>
              <button className="btn-arrow"><ArrowRight size={20}/></button>
            </div>
          </div>
          <div className="row g-4">
            <BlogCard image="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&h=400&fit=crop" category="Graphics" title="Make a better website solution for your product." />
            <BlogCard image="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&h=400&fit=crop" category="Graphics" title="Make a better website solution for your product." />
            <BlogCard image="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&h=400&fit=crop" category="Graphics" title="Make a better website solution for your product." />
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
                <button className="btn-arrow"><ArrowLeft size={20}/></button>
                <button className="btn-arrow"><ArrowRight size={20}/></button>
              </div>
            </div>
            <div className="row g-4">
              <FeedbackCard name="John Doe" role="CEO" image="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop" />
              <FeedbackCard name="Ln loe" role="CTO" image="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop" />
              <FeedbackCard name="Delx sto" role="General Manager" image="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop" />
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

function CourseCard2({image, price, category, title, students, time}) {
  return (
    <div className="col-md-4">
      <div className="course-card2">
        <div className="course-img-wrapper">
          <img src={image} alt={title}/>
          <div className="course-price">{price}</div>
          <button className="btn-play"><Play size={24} fill="currentColor"/></button>
        </div>
        <div className="course-card2-body">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <span className="pill-light">{category}</span>
            <button className="btn-heart"><Heart size={16} fill="currentColor"/></button>
          </div>
          <h5 className="course-title">{title}</h5>
          <div className="course-stats">
            <span><Users size={16}/> {students} Students</span>
            <span><CalendarDays size={16}/> {time}</span>
          </div>
          <NavLink to="#" className="btn btn-primary w-100 mt-3">Preview This Course</NavLink>
        </div>
      </div>
    </div>
  )
}

function BlogCard({image, category, title}) {
  return (
    <div className="col-md-4">
      <div className="blog-card">
        <img src={image} alt={title}/>
        <div className="blog-card-body">
          <span className="blog-category">{category}</span>
          <h5 className="blog-title">{title}</h5>
          <NavLink to="#" className="blog-link">Read Blog <ArrowRight size={16}/></NavLink>
        </div>
      </div>
    </div>
  )
}

function FeedbackCard({name, role, image}) {
  return (
    <div className="col-md-4">
      <div className="feedback-card">
        <div className="stars"><Star size={16} fill="#f4ad37" color="#f4ad37"/><Star size={16} fill="#f4ad37" color="#f4ad37"/><Star size={16} fill="#f4ad37" color="#f4ad37"/><Star size={16} fill="#f4ad37" color="#f4ad37"/><Star size={16} fill="#f4ad37" color="#f4ad37"/></div>
        <p>Amazing Course! It completely transformed the way I work. Highly recommended.</p>
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
                <a href="#"><Twitter size={18}/></a>
                <a href="#"><Facebook size={18}/></a>
                <a href="#"><Instagram size={18}/></a>
                <a href="#"><Github size={18}/></a>
              </div>
            </div>
            <div className="col-lg-2 col-6">
              <h5>Company</h5>
              <ul className="footer-links">
                <li><a href="#">Service</a></li>
                <li><a href="#">Resources</a></li>
                <li><a href="#">About us</a></li>
              </ul>
            </div>
            <div className="col-lg-2 col-6">
              <h5>Help</h5>
              <ul className="footer-links">
                <li><a href="#">Support</a></li>
                <li><a href="#">Terms & Conditions</a></li>
                <li><a href="#">Privacy Policy</a></li>
              </ul>
            </div>
            <div className="col-lg-4">
              <h5>Subscribe to Newsletter</h5>
              <div className="newsletter-form">
                <input type="email" placeholder="Enter email address"/>
                <button className="btn btn-primary">Join</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

function Stat({n,t}) { return <div className="col-6 col-md-3"><strong>{n}</strong><span>{t}</span></div> }
function CourseCard({name,image,course}) { return <div className="col-md-4"><div className="course-card"><img src={course?.thumbnail || image || courseImages[0]} alt="Course cover"/><div className="course-card-body"><span className="pill">{course?.category || 'Technology'}</span><h5>{course?.courseName || name}</h5><p>{course?.description || 'Build useful skills through friendly, practical learning.'}</p><div className="d-flex justify-content-between align-items-center"><small>By {course?.instructor?.name || 'Melango Team'}</small><NavLink to={`/courses/${course?._id || 'demo'}`} className="round-arrow">→</NavLink></div></div></div></div> }
function Catalog(){const [courses,setCourses]=useState([]),[search,setSearch]=useState(''),[loading,setLoading]=useState(true); useEffect(()=>{courseApi.list({search}).then(r=>setCourses(unwrap(r)||[])).catch(()=>setCourses([])).finally(()=>setLoading(false))},[search]); const demos=['Full Stack Web Development','Python for Data Analysis','Introduction to Cyber Security']; return <><PublicNav/><section className="catalog-hero"><div className="container"><span className="eyebrow">LEARN SOMETHING NEW</span><h1>Explore courses that<br/><em>move you forward.</em></h1><div className="searchbox"><Search/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="What do you want to learn?"/><button className="btn btn-primary">Search</button></div></div></section><section className="section container"><div className="d-flex justify-content-between align-items-center mb-4"><h3>Featured courses</h3><select className="form-select w-auto"><option>All categories</option><option>Technology</option><option>Design</option></select></div><div className="row g-4">{loading?<Loading/>:(courses.length?courses:demos.map((name,i)=>({courseName:name,_id:'demo'+i,category:'Technology'}))).map((c,i)=><CourseCard key={c._id} course={c} image={courseImages[i%3]}/>)}</div></section><Footer/></>}
function CourseDetail(){const {id}=useParams(),{user}=useAuth(); const [course,setCourse]=useState(null),[code,setCode]=useState(''),[message,setMessage]=useState(''); useEffect(()=>{courseApi.get(id).then(r=>setCourse(unwrap(r))).catch(()=>setCourse({courseName:'Course preview',description:'Explore a focused, hands-on learning experience with Melango.',category:'Technology'}))},[id]); const enroll=async()=>{try{await courseApi.join({enrollmentCode:code||course.enrollmentCode});setMessage('You are enrolled! Open your dashboard to start learning.')}catch(e){setMessage(apiError(e))}}; if(!course)return <Loading/>; return <><PublicNav/><section className="detail-hero"><div className="container row g-5"><div className="col-lg-7"><span className="pill">{course.category}</span><h1>{course.courseName}</h1><p>{course.description}</p><div className="d-flex gap-3 text-muted"><span>By {course.instructor?.name || 'Melango educator'}</span><span>•</span><span>Flexible pace</span></div></div><div className="col-lg-5"><div className="enroll-card"><h4>Ready to learn?</h4><p>Join this course and start your next chapter.</p>{course.isPremium&&<strong className="d-block mb-3">${course.price}</strong>}<input className="form-control mb-2" value={code} onChange={e=>setCode(e.target.value)} placeholder="Enrollment code (if required)"/><button onClick={enroll} className="btn btn-primary w-100">{user?'Enroll now':'Log in to enroll'}</button>{message&&<p className="small mt-3 mb-0">{message}</p>}</div></div></div></section><section className="section container"><h3>What you’ll learn</h3><div className="row mt-3">{['Practical foundations you can use immediately','Confidence through guided projects','A community to support your progress','A certificate when you complete the journey'].map(t=><div className="col-md-6 mb-3" key={t}><CheckCircle2 className="text-primary me-2" size={18}/>{t}</div>)}</div></section><Footer/></>}
function Login({register=false}){const {login}=useAuth(),navigate=useNavigate();const [form,setForm]=useState({name:'',email:'',password:'',role:'student'}),[error,setError]=useState(''),[busy,setBusy]=useState(false);const submit=async e=>{e.preventDefault();setBusy(true);setError('');try{const res=register?await authApi.register(form):await authApi.login(form);login(res);navigate('/app')}catch(err){setError(apiError(err))}finally{setBusy(false)}};return <div className="auth-page"><NavLink to="/" className="brand auth-brand"><span>m</span> Melango</NavLink><div className="auth-card"><span className="eyebrow">{register?'JOIN MELANGO':'WELCOME BACK'}</span><h2>{register?'Create your account':'Learn. Grow. Belong.'}</h2><p>{register?'Start your learning journey in a minute.':'Sign in to continue your learning journey.'}</p><form onSubmit={submit}>{register&&<label>Full name<input required className="form-control" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>}<label>Email<input required type="email" className="form-control" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>Password<input required minLength="6" type="password" className="form-control" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label>{register&&<label>I am a<select className="form-select" value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option value="student">Student</option><option value="teacher">Teacher</option></select></label>}{error&&<div className="alert alert-danger py-2">{error}</div>}<button disabled={busy} className="btn btn-primary w-100">{busy?'Please wait…':register?'Create account':'Sign in'}</button></form>{!register&&<div className="seed-hints"><b>Demo accounts</b><br/>admin@melango.com / Admin123!<br/>teacher@melango.com / Teacher123!<br/>student@melango.com / Student123!</div>}<p className="text-center mt-3">{register?'Already a member?':'New to Melango?'} <NavLink to={register?'/login':'/register'}>{register?'Log in':'Create account'}</NavLink></p></div></div>}
function AppShell(){const {user,logout}=useAuth();const [open,setOpen]=useState(false);const nav=navByRole[user.role]||navByRole.student;return <div className="app-layout"><aside className="icon-rail"><NavLink to="/" className="rail-logo">m</NavLink><NavLink to="/app"><LayoutDashboard/></NavLink><NavLink to="/app/notifications"><Bell/></NavLink><NavLink to="/app/messages"><Mail/></NavLink><button onClick={logout}><LogOut/></button></aside><aside className={'app-side '+(open?'open':'')}><div className="side-user"><div className="avatar">{user.name?.[0]||'M'}</div><div><b>{user.name}</b><small>{user.role}</small></div><button className="mobile-close" onClick={()=>setOpen(false)}><X/></button></div><nav>{nav.map(([label,path])=>{const Icon=iconFor(label);return <NavLink end={path==='/app'} to={path} key={label} onClick={()=>setOpen(false)}><Icon size={18}/>{label}</NavLink>})}</nav><div className="side-footer"><NavLink to="/app/profile"><Settings size={18}/> Settings</NavLink><button onClick={logout}><LogOut size={18}/> Log out</button></div></aside><main className="app-main"><header className="app-header"><button className="mobile-menu" onClick={()=>setOpen(true)}><Menu/></button><div><small>Welcome back,</small><h5>{user.name?.split(' ')[0]||'Learner'} 👋</h5></div><div className="ms-auto d-flex gap-3 align-items-center"><NavLink to="/app/notifications"><Bell size={20}/></NavLink><div className="avatar">{user.name?.[0]||'M'}</div></div></header><Routes><Route index element={<AppDashboard user={user}/>}/><Route path="*" element={<FeatureRouter user={user}/>}/></Routes></main></div>}
function Empty({title,role}){return <div className="empty"><FileText size={40}/><h5>No {title.toLowerCase()} yet</h5><p>{role==='teacher'?'Create your first item to get this space moving.':'You’re all caught up. New items will appear here when available.'}</p></div>}
function Loading(){return <div className="loading"><span></span> Loading…</div>}
function About(){return <><PublicNav/><section className="catalog-hero"><div className="container"><span className="eyebrow">OUR PURPOSE</span><h1>Learning should feel<br/><em>possible for everyone.</em></h1><p className="lead mt-4">Melango is an all-in-one learning space for students, teachers, and the communities that help them thrive.</p></div></section><section className="section container"><h2>Built around human progress.</h2><p className="col-lg-7">We bring courses, materials, conversations, feedback, and milestones into one calm, thoughtful experience so learning can stay at the center.</p></section><Footer/></>}
function Root(){return <AuthProvider><Routes><Route path="/" element={<Home/>}/><Route path="/courses" element={<Catalog/>}/><Route path="/courses/:id" element={<CourseDetail/>}/><Route path="/about" element={<About/>}/><Route path="/contact" element={<About/>}/><Route path="/login" element={<Login/>}/><Route path="/register" element={<Login register/>}/><Route path="/app/*" element={<Protected><AppShell/></Protected>}/><Route path="*" element={<Navigate to="/"/>}/></Routes></AuthProvider>}
createRoot(document.getElementById('root')).render(<BrowserRouter><Root/></BrowserRouter>)
