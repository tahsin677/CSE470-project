const LearningMaterial = require('../models/LearningMaterial');
const Progress = require('../models/Progress');

// Percentage is derived from completed materials over total course materials.
async function recalculateProgress(courseId, studentId) {
  const totalMaterials = await LearningMaterial.countDocuments({ courseId });

  let progress = await Progress.findOne({ courseId, studentId });
  if (!progress) {
    progress = await Progress.create({
      courseId,
      studentId,
      completedMaterials: [],
      completionPercentage: 0,
    });
  }

  // Drop references to materials that were deleted after being completed.
  if (progress.completedMaterials.length) {
    const existing = await LearningMaterial.find({
      _id: { $in: progress.completedMaterials },
      courseId,
    }).select('_id');
    const existingIds = new Set(existing.map((m) => String(m._id)));
    progress.completedMaterials = progress.completedMaterials.filter((id) =>
      existingIds.has(String(id))
    );
  }

  const completed = progress.completedMaterials.length;
  progress.completionPercentage =
    totalMaterials === 0 ? 0 : Math.round((completed / totalMaterials) * 100);
  progress.lastAccessedAt = new Date();
  await progress.save();

  return { progress, totalMaterials, completedCount: completed };
}

async function getOrCreateProgress(courseId, studentId) {
  const existing = await Progress.findOne({ courseId, studentId });
  if (existing) return existing;
  return Progress.create({ courseId, studentId });
}

module.exports = { recalculateProgress, getOrCreateProgress };
