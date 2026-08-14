const Submission = require('../models/Submission');
const Result = require('../models/Result');
const Progress = require('../models/Progress');
const Certificate = require('../models/Certificate');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/response');

function computePoints({ gradedSubmissions, quizResults, materialsCompleted, certificates }) {
  return (
    gradedSubmissions * 50 +
    quizResults * 30 +
    materialsCompleted * 10 +
    certificates * 100
  );
}

function computeBadges({ submissions, quizzes, certs, avgProgress }) {
  const badges = [];
  if (submissions >= 1) badges.push({ id: 'first-submit', name: 'First Submission', icon: '📝' });
  if (quizzes >= 1) badges.push({ id: 'quiz-starter', name: 'Quiz Starter', icon: '🎯' });
  if (certs >= 1) badges.push({ id: 'graduate', name: 'Course Graduate', icon: '🎓' });
  if (avgProgress >= 100) badges.push({ id: 'completionist', name: 'Completionist', icon: '⭐' });
  if (submissions >= 5) badges.push({ id: 'hard-worker', name: 'Hard Worker', icon: '💪' });
  if (quizzes >= 3) badges.push({ id: 'quiz-master', name: 'Quiz Master', icon: '🏆' });
  return badges;
}

async function profileForUser(userId) {
  const [submissions, results, progress, certs] = await Promise.all([
    Submission.countDocuments({ studentId: userId, status: 'graded' }),
    Result.countDocuments({ studentId: userId }),
    Progress.find({ studentId: userId }),
    Certificate.countDocuments({ studentId: userId }),
  ]);

  const materialsCompleted = progress.reduce(
    (sum, p) => sum + (p.completedMaterials?.length || 0),
    0
  );
  const avgProgress = progress.length
    ? Math.round(
        progress.reduce((sum, p) => sum + p.completionPercentage, 0) / progress.length
      )
    : 0;

  const points = computePoints({
    gradedSubmissions: submissions,
    quizResults: results,
    materialsCompleted,
    certificates: certs,
  });

  return {
    points,
    level: Math.floor(points / 200) + 1,
    badges: computeBadges({
      submissions,
      quizzes: results,
      certs,
      avgProgress,
    }),
    stats: {
      submissions,
      quizzes: results,
      certificates: certs,
      materialsCompleted,
      avgProgress,
    },
  };
}

// GET /api/gamification/me
const getMyProfile = asyncHandler(async (req, res) => {
  const data = await profileForUser(req.user._id);
  return ok(res, data);
});

// GET /api/gamification/leaderboard
const getLeaderboard = asyncHandler(async (req, res) => {
  const students = await User.find({ role: 'student' }).select('name profileImage').limit(50);
  const entries = await Promise.all(
    students.map(async (s) => {
      const profile = await profileForUser(s._id);
      return {
        userId: s._id,
        name: s.name,
        profileImage: s.profileImage,
        points: profile.points,
        level: profile.level,
      };
    })
  );

  entries.sort((a, b) => b.points - a.points);
  return ok(res, entries.slice(0, 20));
});

module.exports = { getMyProfile, getLeaderboard };
