const fs = require('fs');
const Certificate = require('../models/Certificate');
const Enrollment = require('../models/Enrollment');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const { generateCertificateCode } = require('../utils/generateCode');
const { getCourseOr404 } = require('../services/courseAccessService');
const { recalculateProgress } = require('../services/progressService');
const { generateCertificatePDF } = require('../services/certificateService');
const { logActivity } = require('../services/activityService');
const { notify } = require('../services/notificationService');
const emailService = require('../services/emailService');

// POST /api/certificates/generate/:courseId - requires 100% material completion.
const generateCertificate = asyncHandler(async (req, res) => {
  const course = await getCourseOr404(req.params.courseId);

  const enrollment = await Enrollment.findOne({
    courseId: course._id,
    studentId: req.user._id,
  });
  if (!enrollment) throw ApiError.forbidden('You are not enrolled in this course');

  const { progress, totalMaterials } = await recalculateProgress(course._id, req.user._id);
  if (totalMaterials === 0) {
    throw ApiError.badRequest('This course has no materials to complete yet');
  }
  if (progress.completionPercentage < 100) {
    throw ApiError.badRequest(
      `Complete the course first - you are at ${progress.completionPercentage}%`
    );
  }

  const existing = await Certificate.findOne({ courseId: course._id, studentId: req.user._id });
  if (existing && existing.filePath && fs.existsSync(existing.filePath)) {
    return ok(res, existing);
  }

  const teacher = await User.findById(course.teacherId).select('name designation');
  const certificateCode = existing ? existing.certificateCode : generateCertificateCode();
  const issuedAt = new Date();

  const pdf = await generateCertificatePDF({
    certificateCode,
    studentName: req.user.name,
    courseName: course.courseName,
    teacherName: teacher ? teacher.name : 'Course Instructor',
    issuedAt,
  });

  const certificate = await Certificate.findOneAndUpdate(
    { courseId: course._id, studentId: req.user._id },
    {
      courseId: course._id,
      studentId: req.user._id,
      certificateCode,
      studentName: req.user.name,
      courseName: course.courseName,
      issuedAt,
      completionPercentage: progress.completionPercentage,
      ...pdf,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  if (enrollment.status !== 'completed') {
    enrollment.status = 'completed';
    await enrollment.save();
  }

  await logActivity({
    userId: req.user._id,
    action: 'certificate.issued',
    description: `Earned a certificate for "${course.courseName}"`,
    courseId: course._id,
    entityType: 'Certificate',
    entityId: certificate._id,
  });
  await notify({
    userId: req.user._id,
    title: 'Certificate ready',
    message: `Your certificate for "${course.courseName}" is available to download`,
    type: 'certificate',
    courseId: course._id,
    link: '/certificates',
  });
  emailService.sendCertificateEmail(req.user, course, certificate);

  return created(res, certificate);
});

// GET /api/certificates/my
const myCertificates = asyncHandler(async (req, res) => {
  const certificates = await Certificate.find({ studentId: req.user._id })
    .populate('courseId', 'courseName category thumbnail')
    .sort({ issuedAt: -1 });
  return ok(res, certificates);
});

// GET /api/certificates/:id
const getCertificate = asyncHandler(async (req, res) => {
  const certificate = await Certificate.findById(req.params.id)
    .populate('courseId', 'courseName category')
    .populate('studentId', 'name email');
  if (!certificate) throw ApiError.notFound('Certificate not found');

  const isOwner = String(certificate.studentId?._id || certificate.studentId) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin' && req.user.role !== 'teacher') {
    throw ApiError.forbidden();
  }

  return ok(res, certificate);
});

// GET /api/certificates/:id/download
const downloadCertificate = asyncHandler(async (req, res) => {
  const certificate = await Certificate.findById(req.params.id);
  if (!certificate) throw ApiError.notFound('Certificate not found');

  const isOwner = String(certificate.studentId) === String(req.user._id);
  if (!isOwner && req.user.role !== 'admin') throw ApiError.forbidden();

  if (!certificate.filePath || !fs.existsSync(certificate.filePath)) {
    throw ApiError.notFound('Certificate file is missing - regenerate it');
  }

  return res.download(certificate.filePath, certificate.fileName);
});

// GET /api/certificates/verify/:code - public verification endpoint.
const verifyCertificate = asyncHandler(async (req, res) => {
  const certificate = await Certificate.findOne({
    certificateCode: req.params.code.toUpperCase(),
  }).populate('courseId', 'courseName');

  if (!certificate) return ok(res, { valid: false });

  return ok(res, {
    valid: true,
    studentName: certificate.studentName,
    courseName: certificate.courseName,
    issuedAt: certificate.issuedAt,
    certificateCode: certificate.certificateCode,
  });
});

module.exports = {
  generateCertificate,
  myCertificates,
  getCertificate,
  downloadCertificate,
  verifyCertificate,
};
