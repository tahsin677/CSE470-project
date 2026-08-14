const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;
let smtpEnabled = false;

if (env.email.host && env.email.user && env.email.pass) {
  transporter = nodemailer.createTransport({
    host: env.email.host,
    port: env.email.port,
    secure: env.email.port === 465,
    auth: { user: env.email.user, pass: env.email.pass },
  });
  smtpEnabled = true;
} else {
  // eslint-disable-next-line no-console
  console.log('[email] SMTP not configured - emails will be logged to the console.');
}

// Never throws: a failed notification must not fail the request that triggered it.
async function sendEmail({ to, subject, text, html }) {
  if (!smtpEnabled) {
    // eslint-disable-next-line no-console
    console.log(`[email:dev] To: ${to} | Subject: ${subject}\n${text || html || ''}`);
    return { delivered: false, reason: 'smtp-not-configured' };
  }

  try {
    const info = await transporter.sendMail({
      from: env.email.from,
      to,
      subject,
      text,
      html,
    });
    return { delivered: true, messageId: info.messageId };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[email] Failed to send:', err.message);
    return { delivered: false, reason: err.message };
  }
}

function sendWelcomeEmail(user) {
  return sendEmail({
    to: user.email,
    subject: 'Welcome to Melango',
    text: `Hi ${user.name},\n\nYour Melango account has been created as a ${user.role}.\n\nStart learning: ${env.clientUrl}\n\n- The Melango Team`,
  });
}

function sendEnrollmentEmail(user, course) {
  return sendEmail({
    to: user.email,
    subject: `Enrolled in ${course.courseName}`,
    text: `Hi ${user.name},\n\nYou are now enrolled in "${course.courseName}".\n\nOpen the course: ${env.clientUrl}/courses/${course._id}`,
  });
}

function sendFeedbackEmail(user, assignment, marks) {
  return sendEmail({
    to: user.email,
    subject: `Your submission for "${assignment.title}" was graded`,
    text: `Hi ${user.name},\n\nYou scored ${marks} on "${assignment.title}".\n\nView details: ${env.clientUrl}/assignments/${assignment._id}`,
  });
}

function sendCertificateEmail(user, course, certificate) {
  return sendEmail({
    to: user.email,
    subject: `Your certificate for ${course.courseName}`,
    text: `Congratulations ${user.name}!\n\nYour certificate (${certificate.certificateCode}) for "${course.courseName}" is ready.\n\nDownload it: ${env.clientUrl}/certificates`,
  });
}

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendEnrollmentEmail,
  sendFeedbackEmail,
  sendCertificateEmail,
  isSmtpEnabled: () => smtpEnabled,
};
