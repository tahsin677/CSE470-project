const fs = require('fs');
const LearningMaterial = require('../models/LearningMaterial');
const Progress = require('../models/Progress');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, created } = require('../utils/response');
const { fileMeta } = require('../middleware/upload');
const {
  assertCourseAccess,
  assertCourseOwner,
  isCourseOwner,
  getEnrolledStudentIds,
} = require('../services/courseAccessService');
const { recalculateProgress } = require('../services/progressService');
const { logActivity } = require('../services/activityService');
const { notifyMany } = require('../services/notificationService');
const Course = require('../models/Course');

function inferFileType(mimeType = '', originalName = '') {
  const name = originalName.toLowerCase();
  if (mimeType.includes('pdf') || name.endsWith('.pdf')) return 'pdf';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('image/')) return 'image';
  if (/\.(ppt|pptx|key|odp)$/.test(name)) return 'slide';
  return 'other';
}

// GET /api/courses/:courseId/materials
const listMaterials = asyncHandler(async (req, res) => {
  await assertCourseAccess(req.params.courseId, req.user);

  const materials = await LearningMaterial.find({ courseId: req.params.courseId })
    .populate('uploadedBy', 'name role')
    .sort({ createdAt: -1 });

  let completed = new Set();
  if (req.user.role === 'student') {
    const progress = await Progress.findOne({
      courseId: req.params.courseId,
      studentId: req.user._id,
    });
    completed = new Set((progress?.completedMaterials || []).map((id) => String(id)));
  }

  const data = materials.map((m) => ({
    ...m.toObject(),
    isCompleted: completed.has(String(m._id)),
  }));

  return ok(res, data);
});

// POST /api/courses/:courseId/materials  (multipart: file + title, fileType)
const createMaterial = asyncHandler(async (req, res) => {
  const course = await assertCourseOwner(req.params.courseId, req.user);
  const { title, fileType, description, fileUrl } = req.body;

  if (!title) throw ApiError.badRequest('Title is required');
  if (!req.file && !fileUrl) {
    throw ApiError.badRequest('Attach a file or provide a link');
  }

  const meta = req.file ? fileMeta(req.file) : null;
  const material = await LearningMaterial.create({
    courseId: course._id,
    uploadedBy: req.user._id,
    title,
    description: description || '',
    fileType: fileType || (meta ? inferFileType(meta.mimeType, meta.originalName) : 'link'),
    ...(meta || { fileUrl }),
  });

  // Adding material changes the denominator for every student's completion percentage.
  const studentIds = await getEnrolledStudentIds(course._id);
  await Promise.all(
    studentIds.map((studentId) => recalculateProgress(course._id, studentId))
  );

  await logActivity({
    userId: req.user._id,
    action: 'material.uploaded',
    description: `Added "${material.title}" to ${course.courseName}`,
    courseId: course._id,
    entityType: 'LearningMaterial',
    entityId: material._id,
  });
  await notifyMany(studentIds, {
    title: 'New learning material',
    message: `"${material.title}" was added to ${course.courseName}`,
    type: 'announcement',
    courseId: course._id,
    link: `/courses/${course._id}/materials`,
  });

  return created(res, material);
});

// DELETE /api/materials/:id
const deleteMaterial = asyncHandler(async (req, res) => {
  const material = await LearningMaterial.findById(req.params.id);
  if (!material) throw ApiError.notFound('Material not found');

  const course = await Course.findById(material.courseId);
  if (!course || !isCourseOwner(course, req.user)) throw ApiError.forbidden();

  if (material.filePath && fs.existsSync(material.filePath)) {
    fs.promises.unlink(material.filePath).catch(() => {});
  }
  await material.deleteOne();

  await Progress.updateMany(
    { courseId: material.courseId },
    { $pull: { completedMaterials: material._id } }
  );
  const studentIds = await getEnrolledStudentIds(material.courseId);
  await Promise.all(
    studentIds.map((studentId) => recalculateProgress(material.courseId, studentId))
  );

  return ok(res, { message: 'Material deleted successfully' });
});

// GET /api/materials/:id/download
const downloadMaterial = asyncHandler(async (req, res) => {
  const material = await LearningMaterial.findById(req.params.id);
  if (!material) throw ApiError.notFound('Material not found');

  await assertCourseAccess(material.courseId, req.user);

  if (!material.filePath || !fs.existsSync(material.filePath)) {
    if (material.fileUrl && /^https?:\/\//.test(material.fileUrl)) {
      return res.redirect(material.fileUrl);
    }
    throw ApiError.notFound('The stored file is no longer available');
  }

  await LearningMaterial.updateOne({ _id: material._id }, { $inc: { downloadCount: 1 } });
  return res.download(material.filePath, material.originalName || material.fileName);
});

module.exports = { listMaterials, createMaterial, deleteMaterial, downloadMaterial };
