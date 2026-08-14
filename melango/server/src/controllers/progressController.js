const LearningMaterial = require('../models/LearningMaterial');
const Progress = require('../models/Progress');
const Enrollment = require('../models/Enrollment');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/response');
const { assertCourseAccess, isCourseOwner } = require('../services/courseAccessService');
const { recalculateProgress } = require('../services/progressService');
const { logActivity } = require('../services/activityService');

// GET /api/progress/course/:courseId
const courseProgress = asyncHandler(async (req, res) => {
  const { course } = await assertCourseAccess(req.params.courseId, req.user);

  // Teachers and admins get the whole cohort; students get their own record.
  if (isCourseOwner(course, req.user)) {
    const [records, totalMaterials, enrollments] = await Promise.all([
      Progress.find({ courseId: course._id }).populate('studentId', 'name email profileImage'),
      LearningMaterial.countDocuments({ courseId: course._id }),
      Enrollment.find({ courseId: course._id }).populate(
        'studentId',
        'name email profileImage'
      ),
    ]);

    const byStudent = new Map(records.map((r) => [String(r.studentId?._id || r.studentId), r]));
    const students = enrollments
      .filter((e) => e.studentId)
      .map((e) => {
        const record = byStudent.get(String(e.studentId._id));
        return {
          student: e.studentId,
          completionPercentage: record ? record.completionPercentage : 0,
          completedCount: record ? record.completedMaterials.length : 0,
          lastAccessedAt: record ? record.lastAccessedAt : null,
        };
      });

    const average = students.length
      ? Math.round(
          students.reduce((sum, s) => sum + s.completionPercentage, 0) / students.length
        )
      : 0;

    return ok(res, { courseId: course._id, totalMaterials, averageProgress: average, students });
  }

  const { progress, totalMaterials, completedCount } = await recalculateProgress(
    course._id,
    req.user._id
  );

  return ok(res, {
    courseId: course._id,
    completionPercentage: progress.completionPercentage,
    completedMaterials: progress.completedMaterials,
    completedCount,
    totalMaterials,
    lastAccessedAt: progress.lastAccessedAt,
  });
});

// POST /api/progress/material/:materialId/complete
const completeMaterial = asyncHandler(async (req, res) => {
  const material = await LearningMaterial.findById(req.params.materialId);
  if (!material) throw ApiError.notFound('Material not found');

  const { course } = await assertCourseAccess(material.courseId, req.user);
  if (req.user.role !== 'student') {
    throw ApiError.badRequest('Only students track material completion');
  }

  await Progress.updateOne(
    { courseId: course._id, studentId: req.user._id },
    { $addToSet: { completedMaterials: material._id }, $set: { lastAccessedAt: new Date() } },
    { upsert: true }
  );

  const { progress, totalMaterials, completedCount } = await recalculateProgress(
    course._id,
    req.user._id
  );

  // Flip the enrollment to completed once every material is done.
  if (progress.completionPercentage === 100) {
    await Enrollment.updateOne(
      { courseId: course._id, studentId: req.user._id },
      { status: 'completed' }
    );
  }

  await logActivity({
    userId: req.user._id,
    action: 'material.completed',
    description: `Completed "${material.title}"`,
    courseId: course._id,
    entityType: 'LearningMaterial',
    entityId: material._id,
  });

  return ok(res, {
    courseId: course._id,
    completionPercentage: progress.completionPercentage,
    completedCount,
    totalMaterials,
  });
});

// DELETE /api/progress/material/:materialId/complete
const uncompleteMaterial = asyncHandler(async (req, res) => {
  const material = await LearningMaterial.findById(req.params.materialId);
  if (!material) throw ApiError.notFound('Material not found');

  await assertCourseAccess(material.courseId, req.user);
  await Progress.updateOne(
    { courseId: material.courseId, studentId: req.user._id },
    { $pull: { completedMaterials: material._id } }
  );

  const { progress } = await recalculateProgress(material.courseId, req.user._id);
  return ok(res, { completionPercentage: progress.completionPercentage });
});

// GET /api/progress/my
const myProgress = asyncHandler(async (req, res) => {
  const enrollments = await Enrollment.find({ studentId: req.user._id }).populate(
    'courseId',
    'courseName category thumbnail'
  );

  const data = [];
  for (const enrollment of enrollments) {
    if (!enrollment.courseId) continue;
    // eslint-disable-next-line no-await-in-loop
    const { progress, totalMaterials, completedCount } = await recalculateProgress(
      enrollment.courseId._id,
      req.user._id
    );
    data.push({
      course: enrollment.courseId,
      enrollmentStatus: enrollment.status,
      completionPercentage: progress.completionPercentage,
      completedCount,
      totalMaterials,
      lastAccessedAt: progress.lastAccessedAt,
    });
  }

  const overall = data.length
    ? Math.round(data.reduce((sum, d) => sum + d.completionPercentage, 0) / data.length)
    : 0;

  return ok(res, { overallProgress: overall, courses: data });
});

module.exports = { courseProgress, completeMaterial, uncompleteMaterial, myProgress };
