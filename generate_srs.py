"""Generate the Melango CSE470 Software Requirements Specification PDF."""

import re
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
)
from reportlab.lib import colors
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.pdfmetrics import registerFontFamily
from pathlib import Path

FONT_DIR = Path(r"c:\Users\Tahsin\Downloads\CSE470 Project\CSE470-project\srs-fonts")
pdfmetrics.registerFont(TTFont("Bricolage", str(FONT_DIR / "BricolageGrotesque-Regular.ttf")))
pdfmetrics.registerFont(TTFont("Bricolage-Bold", str(FONT_DIR / "BricolageGrotesque-Bold.ttf")))
pdfmetrics.registerFont(TTFont("Bricolage-SemiBold", str(FONT_DIR / "BricolageGrotesque-SemiBold.ttf")))
pdfmetrics.registerFont(TTFont("Poppins", str(FONT_DIR / "Poppins-Regular.ttf")))
pdfmetrics.registerFont(TTFont("Poppins-Bold", str(FONT_DIR / "Poppins-Bold.ttf")))
pdfmetrics.registerFont(TTFont("Poppins-Italic", str(FONT_DIR / "Poppins-Italic.ttf")))
pdfmetrics.registerFont(TTFont("Poppins-SemiBold", str(FONT_DIR / "Poppins-SemiBold.ttf")))
registerFontFamily("Bricolage", normal="Bricolage", bold="Bricolage-Bold", italic="Bricolage", boldItalic="Bricolage-Bold")
registerFontFamily("Poppins", normal="Poppins", bold="Poppins-Bold", italic="Poppins-Italic", boldItalic="Poppins-Bold")

OUT = r"c:\Users\Tahsin\Downloads\CSE470 Project\CSE470-project\Melango - CSE470 Project SRS.pdf"

PAGE_W, PAGE_H = A4
LEFT = 0.9 * inch
RIGHT = 0.9 * inch
TOP = 0.75 * inch
BOTTOM = 0.7 * inch


def styles():
    base = getSampleStyleSheet()
    s = {}
    s["cover_title"] = ParagraphStyle(
        "cover_title",
        parent=base["Title"],
        fontName="Bricolage-Bold",
        fontSize=28,
        leading=34,
        alignment=TA_CENTER,
        spaceAfter=8,
        textColor=colors.HexColor("#2a1354"),
    )
    s["cover_sub"] = ParagraphStyle(
        "cover_sub",
        parent=base["Normal"],
        fontName="Poppins-Italic",
        fontSize=14,
        leading=18,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#4b3a72"),
        spaceAfter=22,
    )
    s["cover_doc"] = ParagraphStyle(
        "cover_doc",
        parent=base["Normal"],
        fontName="Bricolage-Bold",
        fontSize=16,
        leading=20,
        alignment=TA_CENTER,
        spaceAfter=28,
    )
    s["cover_meta"] = ParagraphStyle(
        "cover_meta",
        parent=base["Normal"],
        fontName="Poppins",
        fontSize=12,
        leading=16,
        alignment=TA_CENTER,
        spaceAfter=6,
    )
    s["h1"] = ParagraphStyle(
        "h1",
        parent=base["Heading1"],
        fontName="Bricolage-Bold",
        fontSize=14,
        leading=18,
        spaceBefore=14,
        spaceAfter=8,
        textColor=colors.HexColor("#211b2f"),
    )
    s["h2"] = ParagraphStyle(
        "h2",
        parent=base["Heading2"],
        fontName="Bricolage-Bold",
        fontSize=12.5,
        leading=16,
        spaceBefore=11,
        spaceAfter=6,
        textColor=colors.HexColor("#211b2f"),
    )
    s["h3"] = ParagraphStyle(
        "h3",
        parent=base["Heading3"],
        fontName="Bricolage-Bold",
        fontSize=11.5,
        leading=15,
        spaceBefore=9,
        spaceAfter=4,
        textColor=colors.HexColor("#321d61"),
    )
    s["body"] = ParagraphStyle(
        "body",
        parent=base["Normal"],
        fontName="Poppins",
        fontSize=11,
        leading=15,
        alignment=TA_JUSTIFY,
        spaceAfter=8,
    )
    s["toc"] = ParagraphStyle(
        "toc",
        parent=base["Normal"],
        fontName="Poppins",
        fontSize=11.5,
        leading=16,
        leftIndent=0,
        spaceAfter=3,
    )
    s["toc_sub"] = ParagraphStyle(
        "toc_sub",
        parent=base["Normal"],
        fontName="Poppins",
        fontSize=11,
        leading=15,
        leftIndent=18,
        spaceAfter=2,
    )
    s["toc_sub2"] = ParagraphStyle(
        "toc_sub2",
        parent=base["Normal"],
        fontName="Poppins",
        fontSize=10.5,
        leading=14,
        leftIndent=36,
        spaceAfter=1,
    )
    s["bullet"] = ParagraphStyle(
        "bullet",
        parent=base["Normal"],
        fontName="Poppins",
        fontSize=11,
        leading=15,
        leftIndent=16,
        spaceAfter=3,
        alignment=TA_JUSTIFY,
    )
    s["fr"] = ParagraphStyle(
        "fr",
        parent=base["Normal"],
        fontName="Poppins",
        fontSize=11,
        leading=15,
        leftIndent=22,
        spaceAfter=4,
        alignment=TA_JUSTIFY,
    )
    s["center"] = ParagraphStyle(
        "center",
        parent=base["Normal"],
        fontName="Poppins",
        fontSize=11,
        leading=15,
        alignment=TA_CENTER,
        spaceAfter=8,
    )
    s["caption"] = ParagraphStyle(
        "caption",
        parent=base["Normal"],
        fontName="Poppins-Italic",
        fontSize=10,
        leading=13,
        alignment=TA_CENTER,
        textColor=colors.HexColor("#555"),
        spaceAfter=10,
    )
    return s


def dest_key(text):
    plain = text.replace("&amp;", "and").replace("&", "and")
    key = re.sub(r"[^A-Za-z0-9]+", "-", plain).strip("-").lower()
    return key[:90] or "section"


def heading(text, style):
    return Paragraph(f'<a name="{dest_key(text)}"/>{text}', style)


def toc_entry(text, style):
    return Paragraph(
        f'<link href="#{dest_key(text)}" color="#211b2f">{text}</link>',
        style,
    )


class SrsDoc(SimpleDocTemplate):
    def afterFlowable(self, flowable):
        if not isinstance(flowable, Paragraph):
            return
        if flowable.style.name not in ("h1", "h2", "h3"):
            return
        text = flowable.getPlainText()
        key = dest_key(text)
        level = {"h1": 0, "h2": 1, "h3": 2}[flowable.style.name]
        try:
            self.canv.addOutlineEntry(text[:80], key, level=level, closed=0)
        except Exception:
            pass


def bullets(items, st):
    return [Paragraph(f"•  {item}", st["bullet"]) for item in items]


def fr(items, st):
    return [Paragraph(item, st["fr"]) for item in items]


def add_page_number(canvas, doc):
    canvas.saveState()
    page = canvas.getPageNumber()
    canvas.setFont("Poppins", 9)
    canvas.setFillColor(colors.HexColor("#555"))
    canvas.drawCentredString(PAGE_W / 2, 0.4 * inch, f"-- {page} --")
    canvas.setStrokeColor(colors.HexColor("#c8bdd8"))
    canvas.setLineWidth(0.4)
    canvas.line(LEFT, PAGE_H - 0.48 * inch, PAGE_W - RIGHT, PAGE_H - 0.48 * inch)
    canvas.line(LEFT, 0.52 * inch, PAGE_W - RIGHT, 0.52 * inch)
    canvas.setFont("Poppins-Italic", 8)
    canvas.drawString(LEFT, PAGE_H - 0.42 * inch, "Melango LMS  |  CSE470 Software Requirements Specification")
    canvas.restoreState()


def build():
    st = styles()
    story = []

    # Cover
    story.append(Spacer(1, 1.15 * inch))
    story.append(Paragraph("“Melango”", st["cover_title"]))
    story.append(Paragraph("an all-in-one learning management web application", st["cover_sub"]))
    story.append(Paragraph("Software Requirements Specification", st["cover_doc"]))
    story.append(Paragraph("Course: CSE470 - Software Engineering", st["cover_meta"]))
    story.append(Paragraph("Department of Computer Science and Engineering", st["cover_meta"]))
    story.append(Paragraph("BRAC University", st["cover_meta"]))
    story.append(Spacer(1, 0.35 * inch))
    story.append(Paragraph("Prepared by", st["cover_doc"]))

    header = [
        Paragraph("<b>Student ID</b>", st["center"]),
        Paragraph("<b>Name</b>", st["center"]),
    ]
    rows = [
        header,
        [Paragraph("23301489", st["center"]), Paragraph("Tahsin Pathan", st["center"])],
        [Paragraph("23301334", st["center"]), Paragraph("Shakeel", st["center"])],
        [Paragraph("22299386", st["center"]), Paragraph("Tabassum Islam", st["center"])],
        [Paragraph("23101108", st["center"]), Paragraph("Ashrafi Tahmid", st["center"])],
    ]
    table = Table(rows, colWidths=[2.4 * inch, 3.2 * inch])
    table.setStyle(
        TableStyle(
            [
                ("FONTNAME", (0, 0), (-1, 0), "Bricolage-Bold"),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#efe7fb")),
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#211b2f")),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("GRID", (0, 0), (-1, -1), 0.6, colors.HexColor("#c8bdd8")),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    story.append(table)
    story.append(Spacer(1, 0.45 * inch))
    story.append(Paragraph("Version 1.0", st["cover_meta"]))
    story.append(Paragraph("September 2026", st["cover_meta"]))
    story.append(PageBreak())

    # TOC
    story.append(heading("Table of Contents", st["h1"]))
    toc = [
        ("1. Introduction", st["toc"]),
        ("1.1 Purpose", st["toc_sub"]),
        ("1.2 Scope", st["toc_sub"]),
        ("1.3 Definitions, Acronyms, and Abbreviations", st["toc_sub"]),
        ("1.4 References", st["toc_sub"]),
        ("1.5 Overview", st["toc_sub"]),
        ("2. Overall Description", st["toc"]),
        ("2.1 Product Perspective", st["toc_sub"]),
        ("2.2 Product Features", st["toc_sub"]),
        ("2.3 User Classes and Characteristics", st["toc_sub"]),
        ("2.4 Operating Environment", st["toc_sub"]),
        ("2.5 Constraints", st["toc_sub"]),
        ("2.6 Assumptions and Dependencies", st["toc_sub"]),
        ("3. System Requirements", st["toc"]),
        ("3.1 Functional Requirements", st["toc_sub"]),
        ("3.1.1 Authentication &amp; Authorization", st["toc_sub2"]),
        ("3.1.2 Course &amp; Enrollment Management", st["toc_sub2"]),
        ("3.1.3 Academic Content &amp; Assessment", st["toc_sub2"]),
        ("3.1.4 Communication, Tracking &amp; Additional Services", st["toc_sub2"]),
        ("3.2 Non-Functional Requirements", st["toc_sub"]),
        ("3.2.1 Performance Requirements", st["toc_sub2"]),
        ("3.2.2 Security Requirements", st["toc_sub2"]),
        ("3.2.3 Reliability &amp; Availability", st["toc_sub2"]),
        ("3.2.4 Maintainability", st["toc_sub2"]),
        ("3.2.5 Scalability", st["toc_sub2"]),
        ("3.3 External Interface Requirements", st["toc_sub"]),
        ("3.3.1 User Interfaces", st["toc_sub2"]),
        ("3.3.2 Hardware Interfaces", st["toc_sub2"]),
        ("3.3.3 Software Interfaces", st["toc_sub2"]),
        ("3.3.4 Communication Interfaces", st["toc_sub2"]),
        ("4. Technology Stack &amp; Architectural Overview", st["toc"]),
        ("4.1 MERN Stack Components", st["toc_sub"]),
        ("5. Tentative Development Plan (Agile Methodology)", st["toc"]),
        ("6. Acceptance Criteria", st["toc"]),
        ("7. Conclusion", st["toc"]),
        ("8. Sprint Feature Descriptions", st["toc"]),
    ]
    for text, style in toc:
        story.append(toc_entry(text, style))
    story.append(PageBreak())

    # 1
    story.append(heading("1. Introduction", st["h1"]))
    story.append(heading("1.1 Purpose", st["h2"]))
    story.append(
        Paragraph(
            "This Software Requirement Specification (SRS) document outlines the requirements for developing "
            "“Melango” - an all-in-one Learning Management System (LMS) web application using the MERN stack "
            "(MongoDB, Express.js, React.js, Node.js). The primary goal of this application is to provide a secure "
            "and efficient academic ecosystem in which students can join courses, complete assignments and quizzes, "
            "track progress, and earn achievements, while teachers manage content, grading, attendance, and "
            "communication, and administrators oversee users, courses, and platform reports.",
            st["body"],
        )
    )

    story.append(heading("1.2 Scope", st["h2"]))
    story.append(
        Paragraph(
            "The scope of this project includes the design, development, testing, and demonstration of the Melango "
            "LMS web application, catering to:",
            st["body"],
        )
    )
    story.extend(
        bullets(
            [
                "Students who can register, enroll in courses by enrollment code, access materials, submit assignments, attempt quizzes, view progress, and receive certificates.",
                "Teachers who can create courses, upload materials, post assignments and quizzes, grade submissions, take attendance, post announcements, and moderate discussions.",
                "Administrators who oversee user roles, courses, announcements, search, messaging, notifications, and high-level reports.",
                "Public visitors who can browse the marketing site, course catalog, course previews, blog, and contact pages before signing up.",
            ],
            st,
        )
    )
    story.append(
        Paragraph(
            "This SRS covers the functional and non-functional requirements for the project, the constraints, "
            "assumptions, high-level design, and the development plan following Agile methodology. Feature "
            "screenshots are omitted from this version; the implemented product itself is the visual reference.",
            st["body"],
        )
    )

    story.append(heading("1.3 Definitions, Acronyms, and Abbreviations", st["h2"]))
    story.extend(
        bullets(
            [
                "MERN: MongoDB, Express.js, React.js, Node.js.",
                "LMS: Learning Management System.",
                "JWT: JSON Web Token used for session authentication.",
                "RBAC: Role-Based Access Control.",
                "API: Application Programming Interface.",
                "REST: Representational State Transfer.",
                "SMTP: Simple Mail Transfer Protocol for outgoing email.",
                "KPI: Key Performance Indicator shown on role dashboards.",
            ],
            st,
        )
    )

    story.append(heading("1.4 References", st["h2"]))
    story.extend(
        bullets(
            [
                "MongoDB documentation - https://www.mongodb.com/docs/",
                "Express.js documentation - https://expressjs.com/",
                "React.js documentation - https://react.dev/",
                "Node.js documentation - https://nodejs.org/docs/",
                "Vite documentation - https://vitejs.dev/",
                "Stripe API documentation - https://stripe.com/docs/api",
                "IEEE 830-1998 Recommended Practice for Software Requirements Specifications (structural reference).",
                "WeHeal CSE470 Project SRS (template followed for document organization).",
            ],
            st,
        )
    )

    story.append(heading("1.5 Overview", st["h2"]))
    story.append(
        Paragraph(
            "Section 2 provides an overall description of the product, including its user classes and environment. "
            "Section 3 details the functional and non-functional requirements. Section 4 outlines the technology stack "
            "and architectural overview. Section 5 presents the development plan, including sprint-wise breakdown "
            "and deliverables. Section 6 states acceptance criteria. Section 7 concludes the document. Section 8 "
            "describes implemented features in sprint order.",
            st["body"],
        )
    )

    # 2
    story.append(heading("2. Overall Description", st["h1"]))
    story.append(heading("2.1 Product Perspective", st["h2"]))
    story.append(
        Paragraph(
            "Melango is a standalone LMS built on the MERN stack. The React client (Vite) communicates with an "
            "Express.js REST API. Persistent data is stored in MongoDB. If a local MongoDB instance is unavailable, "
            "the server can fall back to an in-memory MongoDB instance for demonstration. Optional external services "
            "include Stripe (payments; simulation mode when no secret key is configured) and SMTP email (console "
            "logging when SMTP is not configured). The product includes a public marketing website and authenticated "
            "role-based dashboards.",
            st["body"],
        )
    )

    story.append(heading("2.2 Product Features", st["h2"]))
    story.append(
        Paragraph(
            "Melango implements the following 20 core LMS features:",
            st["body"],
        )
    )
    story.extend(
        bullets(
            [
                "1. Role Management - Supports Student, Teacher, and Admin roles with role-based permissions.",
                "2. Course Creation - Allows instructors to create and manage courses.",
                "3. Course Enrollment - Students can join courses using enrollment codes.",
                "4. Dashboard - Provides an overview of courses, activities, and deadlines.",
                "5. Assignment Management - Create, schedule, and manage assignments.",
                "6. Assignment Submission - Students can submit files, links, or text responses.",
                "7. Online Grading System - Teachers can grade submissions digitally.",
                "8. Feedback &amp; Comments - Enables personalized feedback and communication.",
                "9. Announcement Board - Share important notices and course updates.",
                "10. Discussion Forum - Supports academic discussions and Q&amp;A.",
                "11. Quiz &amp; Exam Module - Create and manage quizzes and examinations.",
                "12. Attendance Tracking - Record and monitor student attendance.",
                "13. Learning Materials Repository - Store notes, PDFs, videos, and learning resources.",
                "14. Calendar &amp; Deadline Tracker - Track academic events and deadlines.",
                "15. Notification System - Send reminders and important alerts.",
                "16. Messaging System - Direct communication between students and instructors.",
                "17. Progress Analytics - Monitor academic performance and engagement.",
                "18. Search &amp; Filter System - Quickly locate courses, materials, and assignments.",
                "19. Admin Control Panel - Manage users, permissions, courses, and platform reports.",
                "20. Gamification System - Uses badges, achievements, points, and leaderboards to increase engagement.",
            ],
            st,
        )
    )

    story.append(heading("2.3 User Classes and Characteristics", st["h2"]))
    story.extend(
        bullets(
            [
                "Students: learners who enroll in courses and complete academic work. They need a simple workspace for courses, assignments, quizzes, materials, calendar, messages, notifications, progress, attendance, and achievements.",
                "Teachers: instructors who own courses. They need tools to create courses, publish materials, manage assignments and quizzes, grade work, post announcements, host discussions, take attendance, and communicate with students.",
                "Administrators: platform operators who manage users and roles, review courses, post system announcements, search records, and monitor reports. They have broader access than teachers or students.",
                "Public visitors: unauthenticated users exploring Melango before creating an account. They use the marketing site and catalog only.",
            ],
            st,
        )
    )

    story.append(heading("2.4 Operating Environment", st["h2"]))
    story.extend(
        bullets(
            [
                "Web application: accessible on modern browsers (Chrome, Firefox, Edge, Safari).",
                "Mobile compatibility: responsive layout for tablets and smartphones.",
                "Client: React 19 application bundled with Vite, typically served on http://localhost:5173 during development.",
                "Server: Node.js and Express.js API, configured for port 5001 in the project environment (default 5000 if unset).",
                "Database: MongoDB (local or cloud). In-memory MongoDB is used automatically when local MongoDB is unavailable.",
                "Hosting: suitable for deployment on Render, Railway, Vercel (client), AWS, or an equivalent Node-capable host.",
            ],
            st,
        )
    )

    story.append(heading("2.5 Constraints", st["h2"]))
    story.extend(
        bullets(
            [
                "Academic timeline: the project is delivered within a CSE470 semester by a team of four students.",
                "Security: passwords are hashed with bcrypt; API routes that mutate or read private data require JWT authentication; role checks restrict teacher/admin actions.",
                "Payment: full Stripe live processing is optional; the system may run in simulation mode without STRIPE_SECRET_KEY.",
                "Email: SMTP is optional; without credentials, emails are written to the server console.",
                "In-memory database: demo data created in memory is lost when the API process restarts.",
                "Browser-only client: no native mobile application is in scope.",
            ],
            st,
        )
    )

    story.append(heading("2.6 Assumptions and Dependencies", st["h2"]))
    story.extend(
        bullets(
            [
                "Users have a working internet connection and a modern browser.",
                "Node.js and npm are available on developer machines.",
                "If MongoDB is not installed locally, mongodb-memory-server can start a temporary database.",
                "Teachers will share enrollment codes with students so they can join courses.",
                "Third-party payment and email services are used only when keys are supplied.",
                "Demo accounts (student@melango.com, teacher@melango.com, admin@melango.com) may be seeded for evaluation.",
            ],
            st,
        )
    )

    # 3
    story.append(heading("3. System Requirements", st["h1"]))
    story.append(heading("3.1 Functional Requirements", st["h2"]))

    story.append(heading("3.1.1 Authentication &amp; Authorization", st["h3"]))
    story.append(Paragraph("<b>1. Registration and Login</b>", st["body"]))
    story.extend(
        fr(
            [
                "FR-1: The system shall allow a visitor to create an account with name, email, password, and role (student or teacher). Admin accounts are provisioned by seed data or an existing admin.",
                "FR-2: The system shall reject registration when the email is already in use or required fields are invalid.",
                "FR-3: The system shall authenticate users with email and password and return a JWT for subsequent API calls.",
                "FR-4: The system shall deny login when credentials are incorrect or the account is inactive.",
            ],
            st,
        )
    )
    story.append(Paragraph("<b>2. Role-Based Access Control (RBAC)</b>", st["body"]))
    story.extend(
        fr(
            [
                "FR-5: The system shall provide different dashboards and navigation for students, teachers, and administrators.",
                "FR-6: The system shall restrict course creation, assignment creation, grading, and user administration to authorized roles.",
                "FR-7: The client shall redirect unauthenticated users away from /app routes to the login page.",
            ],
            st,
        )
    )

    story.append(heading("3.1.2 Course &amp; Enrollment Management", st["h3"]))
    story.append(Paragraph("<b>1. Course Management</b>", st["body"]))
    story.extend(
        fr(
            [
                "FR-8: Teachers shall be able to create a course with a name, description, and generated enrollment code.",
                "FR-9: Students and teachers shall be able to view courses they own or are enrolled in.",
                "FR-10: Public visitors shall be able to browse a catalog of featured courses and open a course preview page.",
                "FR-11: Administrators shall be able to view courses on the platform for oversight.",
            ],
            st,
        )
    )
    story.append(Paragraph("<b>2. Enrollment</b>", st["body"]))
    story.extend(
        fr(
            [
                "FR-12: Students shall be able to join a course by entering a valid enrollment code.",
                "FR-13: The system shall prevent duplicate enrollment in the same course.",
                "FR-14: Premium courses shall require a successful checkout (Stripe or simulation) before full access is granted, where configured.",
            ],
            st,
        )
    )

    story.append(heading("3.1.3 Academic Content &amp; Assessment", st["h3"]))
    story.append(Paragraph("<b>1. Learning Materials</b>", st["body"]))
    story.extend(
        fr(
            [
                "FR-15: Teachers shall be able to add learning materials to a course they own.",
                "FR-16: Enrolled students shall be able to view materials and mark a material as completed.",
            ],
            st,
        )
    )
    story.append(Paragraph("<b>2. Assignment Management</b>", st["body"]))
    story.extend(
        fr(
            [
                "FR-17: Teachers and admins shall be able to create an assignment with title, description, due date, and total marks for a course they own.",
                "FR-18: Teachers shall be able to update or delete an assignment they own (API).",
                "FR-19: Enrolled students shall be able to list assignments for a selected course, including due date and their submission status.",
            ],
            st,
        )
    )
    story.append(Paragraph("<b>3. Assignment Submission</b>", st["body"]))
    story.extend(
        fr(
            [
                "FR-20: Students shall be able to submit assignment work as text and an optional link.",
                "FR-21: The API shall accept an optional file upload with a submission.",
                "FR-22: Teachers shall be able to list submissions for an assignment and assign marks and comments.",
                "FR-23: Students shall be able to see submission status and awarded marks after grading.",
            ],
            st,
        )
    )
    story.append(Paragraph("<b>4. Quizzes</b>", st["body"]))
    story.extend(
        fr(
            [
                "FR-24: Teachers shall be able to create quizzes for a course.",
                "FR-25: Students shall be able to attempt an available quiz and receive a recorded result.",
            ],
            st,
        )
    )

    story.append(heading("3.1.4 Communication, Tracking &amp; Additional Services", st["h3"]))
    story.append(Paragraph("<b>1. Announcements and Discussions</b>", st["body"]))
    story.extend(
        fr(
            [
                "FR-26: Teachers and admins shall be able to post announcements to a course or the platform.",
                "FR-27: Enrolled users shall be able to create discussion threads and reply to threads in a course.",
            ],
            st,
        )
    )
    story.append(Paragraph("<b>2. Messaging and Notifications</b>", st["body"]))
    story.extend(
        fr(
            [
                "FR-28: Authenticated users shall be able to send and receive private messages with their contacts.",
                "FR-29: The system shall create in-app notifications for relevant events (for example, a new assignment posted to enrolled students).",
                "FR-30: Users shall be able to list notifications, mark one as read, and mark all as read.",
            ],
            st,
        )
    )
    story.append(Paragraph("<b>3. Calendar and Deadline Tracker</b>", st["body"]))
    story.extend(
        fr(
            [
                "FR-31: The system shall list calendar events for the current user, including stored events.",
                "FR-32: The calendar shall include derived deadlines from assignments (due date) and quizzes (available-until date).",
                "FR-33: Students, teachers, and admins shall be able to create a personal calendar event. Course-linked events may be created only by the course owner.",
            ],
            st,
        )
    )
    story.append(Paragraph("<b>4. Attendance, Progress, Search, Reviews</b>", st["body"]))
    story.extend(
        fr(
            [
                "FR-34: Teachers shall be able to record attendance for students in a course they own.",
                "FR-35: Students shall be able to view progress information for enrolled courses (completed material counts and related status).",
                "FR-36: Authenticated users shall be able to search courses and related records from the search page.",
                "FR-37: Users shall be able to submit a course review with a rating.",
            ],
            st,
        )
    )
    story.append(Paragraph("<b>5. Payments, Certificates, and Gamification</b>", st["body"]))
    story.extend(
        fr(
            [
                "FR-38: The system shall support checkout for premium courses using Stripe when configured, or a simulation path when no secret key is set.",
                "FR-39: The system shall be able to issue a completion certificate that a student can view or download.",
                "FR-40: The system shall track gamification points or achievements based on completed academic activity.",
            ],
            st,
        )
    )
    story.append(Paragraph("<b>6. Administration</b>", st["body"]))
    story.extend(
        fr(
            [
                "FR-41: Administrators shall be able to view users and manage roles or account status according to implemented admin APIs.",
                "FR-42: Administrators shall have access to a reports/overview workspace summarizing platform activity.",
            ],
            st,
        )
    )

    story.append(heading("3.2 Non-Functional Requirements", st["h2"]))
    story.append(heading("3.2.1 Performance Requirements", st["h3"]))
    story.extend(
        bullets(
            [
                "NFR-1: Typical dashboard list pages (assignments, notifications, calendar) shall load under normal campus network conditions without blocking the rest of the shell.",
                "NFR-2: Average public page load on a development machine shall remain interactive after the Vite client is compiled.",
            ],
            st,
        )
    )
    story.append(heading("3.2.2 Security Requirements", st["h3"]))
    story.extend(
        bullets(
            [
                "NFR-3: Passwords shall be stored using bcrypt hashing and shall never be returned in API responses.",
                "NFR-4: Protected API routes shall require a valid JWT.",
                "NFR-5: Role-restricted actions (create assignment, grade submission, manage users) shall be enforced on the server, not only in the user interface.",
                "NFR-6: Production deployments shall serve the client and API over HTTPS.",
            ],
            st,
        )
    )
    story.append(heading("3.2.3 Reliability &amp; Availability", st["h3"]))
    story.extend(
        bullets(
            [
                "NFR-7: The API shall handle invalid input with structured error responses rather than crashing the process.",
                "NFR-8: When local MongoDB is down, the server shall attempt an in-memory fallback so the demo can continue.",
                "NFR-9: For a persistent deployment, MongoDB backups are recommended; in-memory mode is for demonstration only.",
            ],
            st,
        )
    )
    story.append(heading("3.2.4 Maintainability", st["h3"]))
    story.extend(
        bullets(
            [
                "NFR-10: Server code shall be organized by routes, controllers, models, middleware, and services.",
                "NFR-11: Client feature screens shall be split by domain (academic, community, tracking, core) to keep the dashboard maintainable.",
            ],
            st,
        )
    )
    story.append(heading("3.2.5 Scalability", st["h3"]))
    story.extend(
        bullets(
            [
                "NFR-12: The architecture shall allow the API and MongoDB to be hosted separately so each can scale independently.",
                "NFR-13: Stateless JWT authentication shall allow more than one API instance behind a load balancer.",
            ],
            st,
        )
    )

    story.append(heading("3.3 External Interface Requirements", st["h2"]))
    story.append(heading("3.3.1 User Interfaces", st["h3"]))
    story.extend(
        bullets(
            [
                "UI-1: A responsive React interface for the public site (home, catalog, preview, about, contact, blog, login, register).",
                "UI-2: Role-specific dashboards under /app with a sidebar, header, and feature pages.",
                "UI-3: Forms for login, registration, course join, assignment create/submit, discussions, calendar events, and messaging.",
            ],
            st,
        )
    )
    story.append(heading("3.3.2 Hardware Interfaces", st["h3"]))
    story.extend(
        bullets(
            [
                "HI-1: None specific. The system runs on standard PCs, laptops, or cloud virtual machines. End users need a device with a modern browser.",
            ],
            st,
        )
    )
    story.append(heading("3.3.3 Software Interfaces", st["h3"]))
    story.extend(
        bullets(
            [
                "SI-1: MongoDB (or mongodb-memory-server) for persistence.",
                "SI-2: Stripe API for premium checkout when STRIPE_SECRET_KEY is present.",
                "SI-3: SMTP / Nodemailer for outbound mail when email environment variables are set.",
                "SI-4: Vite development server and a static host for the built React client.",
            ],
            st,
        )
    )
    story.append(heading("3.3.4 Communication Interfaces", st["h3"]))
    story.extend(
        bullets(
            [
                "CI-1: RESTful JSON APIs under /api for communication between the React client and Express server.",
                "CI-2: Authorization header carrying the JWT on authenticated requests.",
                "CI-3: CORS configured for the frontend origin (for example http://localhost:5173).",
            ],
            st,
        )
    )

    # 4
    story.append(heading("4. Technology Stack &amp; Architectural Overview", st["h1"]))
    story.append(heading("4.1 MERN Stack Components", st["h2"]))
    story.extend(
        bullets(
            [
                "MongoDB: document database for users, courses, enrollments, assignments, submissions, quizzes, announcements, discussions, messages, notifications, attendance, progress, reviews, calendar events, payments, certificates, and activity records.",
                "Express.js: Node.js framework that exposes REST routes, validation, file upload, and error handling.",
                "React.js: frontend library (React 19 with React Router) for the public site and dashboards, styled with a project stylesheet and Bootstrap utilities.",
                "Node.js: runtime that executes the API (server.js) and seed script.",
            ],
            st,
        )
    )
    story.append(
        Paragraph(
            "Supporting libraries include Mongoose, JSON Web Token, bcryptjs, Axios, Vite, Recharts, Multer, PDFKit (certificates), and optional Stripe and Nodemailer.",
            st["body"],
        )
    )

    # 5
    story.append(heading("5. Tentative Development Plan (Agile Methodology)", st["h1"]))
    story.append(
        Paragraph(
            "Development followed an Agile approach with short sprints. Each sprint delivered a usable increment of Melango, from the public site and authentication through academic features, communication, and polish.",
            st["body"],
        )
    )

    story.append(heading("Sprint 1 (Weeks 1-2): Core Setup &amp; Authentication", st["h3"]))
    story.extend(
        bullets(
            [
                "Initialize the MERN project structure (melango/client and melango/server).",
                "Configure Express, MongoDB connection, environment variables, and CORS.",
                "Implement registration, login, JWT auth, and password hashing.",
                "Build the public homepage, navigation, about, and contact shells.",
                "Create student, teacher, and admin role routing for /app.",
            ],
            st,
        )
    )

    story.append(heading("Sprint 2 (Weeks 3-4): Courses, Enrollment &amp; Dashboards", st["h3"]))
    story.extend(
        bullets(
            [
                "Teacher course creation with enrollment codes.",
                "Student join-by-code and My Courses views.",
                "Public catalog and course preview.",
                "Role dashboards with KPIs and welcome header.",
                "Admin user and course overview.",
            ],
            st,
        )
    )

    story.append(heading("Sprint 3 (Weeks 5-6): Academic Work &amp; Assessment", st["h3"]))
    story.extend(
        bullets(
            [
                "Learning materials with completion state.",
                "Assignment create, list, submit, and grade/feedback.",
                "Quizzes and results.",
                "Attendance recording.",
                "Progress analytics for students.",
            ],
            st,
        )
    )

    story.append(heading("Sprint 4 (Week 7): Communication &amp; Tracking", st["h3"]))
    story.extend(
        bullets(
            [
                "Announcements and discussion forum.",
                "Private messaging.",
                "Notification create/list/read-all.",
                "Calendar with personal events and derived assignment/quiz deadlines.",
                "Search.",
            ],
            st,
        )
    )

    story.append(heading("Sprint 5 (Weeks 8-9): Payments, Quality &amp; Final Touches", st["h3"]))
    story.extend(
        bullets(
            [
                "Reviews, certificates, gamification, and payment/checkout (including simulation mode).",
                "Public site visual polish (hero, journey, catalog, typography, solid purple buttons).",
                "Responsive dashboard shell and remaining UI fixes.",
                "Seed data and demo accounts for evaluation.",
                "SRS documentation.",
            ],
            st,
        )
    )

    # 6
    story.append(heading("6. Acceptance Criteria", st["h1"]))
    story.append(
        Paragraph(
            "The product is accepted for CSE470 demonstration when the following are true:",
            st["body"],
        )
    )
    story.extend(
        bullets(
            [
                "A visitor can open the public site and navigate Home, All Courses, About, Contact, Blog, Login, and Sign Up.",
                "A new student or teacher can register and log in; an admin can log in with a seeded account.",
                "A teacher can create a course and share an enrollment code; a student can join that course.",
                "A teacher can create an assignment; a student can submit it; the teacher can grade it.",
                "A student can open Notifications and Calendar after academic activity and see relevant items when data exists.",
                "Discussion threads and replies work for a selected course for users who can open the Discussions page.",
                "Unauthorized users cannot call teacher/admin APIs successfully.",
                "The API starts with MongoDB or the in-memory fallback and reports the listening port.",
            ],
            st,
        )
    )

    # 7
    story.append(heading("7. Conclusion", st["h1"]))
    story.append(
        Paragraph(
            "This SRS provides a detailed outline for the design and development of “Melango” - a comprehensive "
            "learning management web application using the MERN stack. It supports a learner-centered approach through "
            "20 core features: role management, course creation and enrollment, dashboards, assignments, submission, "
            "grading, feedback, announcements, discussions, quizzes, attendance, materials, calendar, notifications, "
            "messaging, progress analytics, search, admin control, and gamification. By following the outlined Agile "
            "sprints, the team delivered a usable, role-based LMS that can be run locally for demonstration.",
            st["body"],
        )
    )

    # 8 sprint features - the official 20 Melango features
    story.append(heading("8. Sprint Feature Descriptions", st["h1"]))
    story.append(
        Paragraph(
            "The following write-ups cover the 20 implemented Melango features, grouped by sprint in the WeHeal SRS style. "
            "Screenshots are not included. Evaluators can verify each feature in the running application.",
            st["body"],
        )
    )

    story.append(heading("SPRINT 1", st["h2"]))
    story.append(heading("Feature 1: Role Management", st["h3"]))
    story.append(
        Paragraph(
            "Supports Student, Teacher, and Admin roles with role-based permissions. Registration stores a chosen role (student or teacher). Admin accounts are seeded or promoted by an existing admin. After login, each role receives a different sidebar and is blocked from unauthorized API actions (for example, students cannot create courses or grade submissions).",
            st["body"],
        )
    )
    story.append(heading("Feature 2: Course Creation", st["h3"]))
    story.append(
        Paragraph(
            "Allows instructors to create and manage courses. A teacher opens Create course, enters the course details, and the server stores the course with an enrollment code. The teacher can later view and manage that course from My courses.",
            st["body"],
        )
    )
    story.append(heading("Feature 3: Course Enrollment", st["h3"]))
    story.append(
        Paragraph(
            "Students join courses using enrollment codes. The student enters a valid code from My courses. If the code matches and the student is not already enrolled, an enrollment record is created. Invalid or duplicate enrollments are rejected.",
            st["body"],
        )
    )
    story.append(heading("Feature 4: Dashboard", st["h3"]))
    story.append(
        Paragraph(
            "Provides an overview of courses, activities, and deadlines. After login, the role dashboard shows a welcome header, KPI-style counts (such as pending assignments), and shortcuts into courses, calendar, and other workspace tools.",
            st["body"],
        )
    )

    story.append(heading("SPRINT 2", st["h2"]))
    story.append(heading("Feature 5: Assignment Management", st["h3"]))
    story.append(
        Paragraph(
            "Teachers create, schedule, and manage assignments. For a selected course they add a title, description, due date, and total marks. Students see the assignment list for courses they joined, including due dates and status.",
            st["body"],
        )
    )
    story.append(heading("Feature 6: Assignment Submission", st["h3"]))
    story.append(
        Paragraph(
            "Students submit files, links, or text responses. In the dashboard they enter notes and an optional link. The API also accepts an optional file upload with the submission.",
            st["body"],
        )
    )
    story.append(heading("Feature 7: Online Grading System", st["h3"]))
    story.append(
        Paragraph(
            "Teachers grade submissions digitally. From Assignments they open Submissions, read the work, enter marks, and save. Students later see the graded status and awarded marks.",
            st["body"],
        )
    )
    story.append(heading("Feature 8: Feedback &amp; Comments", st["h3"]))
    story.append(
        Paragraph(
            "Enables personalized feedback and communication on submitted work. Teachers add comments when grading. Students can see those comments with their marks.",
            st["body"],
        )
    )

    story.append(heading("SPRINT 3", st["h2"]))
    story.append(heading("Feature 9: Announcement Board", st["h3"]))
    story.append(
        Paragraph(
            "Share important notices and course updates. Teachers or admins post announcements. Students and other enrolled users read them from the Announcements page.",
            st["body"],
        )
    )
    story.append(heading("Feature 10: Discussion Forum", st["h3"]))
    story.append(
        Paragraph(
            "Supports academic discussions and Q&amp;A. Users pick a course, start a thread with a topic and message, and reply to existing threads. The page is listed in the teacher sidebar; the same /app/discussions route is available to other roles.",
            st["body"],
        )
    )
    story.append(heading("Feature 11: Quiz &amp; Exam Module", st["h3"]))
    story.append(
        Paragraph(
            "Create and manage quizzes and examinations. Teachers create quizzes on a course. Students attempt an available quiz and receive a recorded result.",
            st["body"],
        )
    )
    story.append(heading("Feature 12: Attendance Tracking", st["h3"]))
    story.append(
        Paragraph(
            "Record and monitor student attendance. Teachers record attendance against a course roster. Records are stored per student and date for later review.",
            st["body"],
        )
    )

    story.append(heading("SPRINT 4", st["h2"]))
    story.append(heading("Feature 13: Learning Materials Repository", st["h3"]))
    story.append(
        Paragraph(
            "Store notes, PDFs, videos, and learning resources. Teachers add materials to a selected course. Students open Materials, view the list, and can mark an item completed.",
            st["body"],
        )
    )
    story.append(heading("Feature 14: Calendar &amp; Deadline Tracker", st["h3"]))
    story.append(
        Paragraph(
            "Track academic events and deadlines. Calendar lists stored events plus derived assignment due dates and quiz close dates. Students can add a personal event. Course-linked events may be added only by the course owner.",
            st["body"],
        )
    )
    story.append(heading("Feature 15: Notification System", st["h3"]))
    story.append(
        Paragraph(
            "Send reminders and important alerts. Creating an assignment notifies enrolled students (for example, “New assignment posted”). Users open Notifications to read items, mark one read, or mark all read. A header bell opens this page.",
            st["body"],
        )
    )
    story.append(heading("Feature 16: Messaging System", st["h3"]))
    story.append(
        Paragraph(
            "Direct communication between students and instructors. The Messages page lists contacts. Selecting a contact loads the conversation. Sending a message stores it and refreshes the thread.",
            st["body"],
        )
    )

    story.append(heading("SPRINT 5", st["h2"]))
    story.append(heading("Feature 17: Progress Analytics", st["h3"]))
    story.append(
        Paragraph(
            "Monitor academic performance and engagement. Students open Progress to see completion information for enrolled courses, including completed material counts from their activity.",
            st["body"],
        )
    )
    story.append(heading("Feature 18: Search &amp; Filter System", st["h3"]))
    story.append(
        Paragraph(
            "Quickly locate courses, materials, and assignments. Authenticated users search from the Search page and can filter results instead of walking every sidebar item.",
            st["body"],
        )
    )
    story.append(heading("Feature 19: Admin Control Panel", st["h3"]))
    story.append(
        Paragraph(
            "Manage users, permissions, courses, and platform reports. An admin can open Users to change roles, inspect Courses, post announcements, and use Reports for a high-level view of platform activity.",
            st["body"],
        )
    )
    story.append(heading("Feature 20: Gamification System", st["h3"]))
    story.append(
        Paragraph(
            "Uses badges, achievements, points, and leaderboards to increase engagement. Completing assignments, quizzes, and related work awards points and badges. Students open Achievements to see level, badge list, and a leaderboard.",
            st["body"],
        )
    )

    story.append(heading("Appendix A - How to Run the Application", st["h2"]))
    story.append(Paragraph("API (terminal 1):", st["body"]))
    story.append(
        Paragraph(
            "cd melango/server &nbsp;&nbsp; then &nbsp;&nbsp; npm install &nbsp;&nbsp; then &nbsp;&nbsp; npm start",
            st["center"],
        )
    )
    story.append(Paragraph("Client (terminal 2):", st["body"]))
    story.append(
        Paragraph(
            "cd melango/client &nbsp;&nbsp; then &nbsp;&nbsp; npm install &nbsp;&nbsp; then &nbsp;&nbsp; npm run dev",
            st["center"],
        )
    )
    story.append(
        Paragraph(
            "Open the Vite URL (http://localhost:5173 or the next free port). The client environment points at http://localhost:5001/api.",
            st["body"],
        )
    )

    story.append(heading("Appendix B - Demo Accounts", st["h2"]))
    demo = [
        [
            Paragraph("<b>Role</b>", st["center"]),
            Paragraph("<b>Email</b>", st["center"]),
            Paragraph("<b>Password</b>", st["center"]),
        ],
        [Paragraph("Student", st["center"]), Paragraph("student@melango.com", st["center"]), Paragraph("Student123!", st["center"])],
        [Paragraph("Teacher", st["center"]), Paragraph("teacher@melango.com", st["center"]), Paragraph("Teacher123!", st["center"])],
        [Paragraph("Admin", st["center"]), Paragraph("admin@melango.com", st["center"]), Paragraph("Admin123!", st["center"])],
    ]
    dt = Table(demo, colWidths=[1.5 * inch, 2.6 * inch, 2.0 * inch])
    dt.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#efe7fb")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#c8bdd8")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(dt)
    story.append(Spacer(1, 10))
    story.append(
        Paragraph(
            "If the API uses in-memory MongoDB, restarting the server clears data. Log in again with the seeded demo users. Optional: npm run seed in the server folder loads a richer dataset when a persistent MongoDB is available.",
            st["body"],
        )
    )

    story.append(heading("Appendix C - Team", st["h2"]))
    team = [
        [
            Paragraph("<b>Student ID</b>", st["center"]),
            Paragraph("<b>Name</b>", st["center"]),
            Paragraph("<b>Contribution focus</b>", st["center"]),
        ],
        [Paragraph("23301489", st["center"]), Paragraph("Tahsin Pathan", st["center"]), Paragraph("LMS product, client UX, integration", st["center"])],
        [Paragraph("23301334", st["center"]), Paragraph("Shakeel", st["center"]), Paragraph("Features and documentation", st["center"])],
        [Paragraph("22299386", st["center"]), Paragraph("Tabassum Islam", st["center"]), Paragraph("Features and documentation", st["center"])],
        [Paragraph("23101108", st["center"]), Paragraph("Ashrafi Tahmid", st["center"]), Paragraph("Features and documentation", st["center"])],
    ]
    tt = Table(team, colWidths=[1.4 * inch, 2.0 * inch, 2.7 * inch])
    tt.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#efe7fb")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#c8bdd8")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(tt)

    doc = SrsDoc(
        OUT,
        pagesize=A4,
        leftMargin=LEFT,
        rightMargin=RIGHT,
        topMargin=TOP,
        bottomMargin=BOTTOM,
        title="Melango - Software Requirements Specification",
        author="Tahsin Pathan, Shakeel, Tabassum Islam, Ashrafi Tahmid",
        subject="CSE470 Project SRS",
    )
    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
    print(OUT)


if __name__ == "__main__":
    build()
