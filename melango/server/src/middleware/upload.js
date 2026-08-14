const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const env = require('../config/env');

const SUBFOLDERS = ['materials', 'submissions', 'avatars', 'certificates', 'thumbnails'];

function ensureDirs() {
  fs.mkdirSync(env.uploadDir, { recursive: true });
  SUBFOLDERS.forEach((folder) => {
    fs.mkdirSync(path.join(env.uploadDir, folder), { recursive: true });
  });
}
ensureDirs();

function makeStorage(subfolder) {
  return multer.diskStorage({
    destination(req, file, cb) {
      const dir = path.join(env.uploadDir, subfolder);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename(req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase();
      const base = path
        .basename(file.originalname, ext)
        .replace(/[^a-zA-Z0-9-_]/g, '_')
        .slice(0, 40);
      const unique = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
      cb(null, `${base || 'file'}-${unique}${ext}`);
    },
  });
}

const BLOCKED_EXTENSIONS = new Set([
  '.exe', '.sh', '.bat', '.cmd', '.com', '.msi', '.dll', '.js', '.jar', '.app',
]);

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (BLOCKED_EXTENSIONS.has(ext)) {
    return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', `${ext} files are not allowed`));
  }
  return cb(null, true);
}

function imageFilter(req, file, cb) {
  if (!/^image\//.test(file.mimetype)) {
    return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Only image files are allowed'));
  }
  return cb(null, true);
}

const LIMITS = { fileSize: 25 * 1024 * 1024 };

const uploadMaterial = multer({
  storage: makeStorage('materials'),
  limits: LIMITS,
  fileFilter,
});

const uploadSubmission = multer({
  storage: makeStorage('submissions'),
  limits: LIMITS,
  fileFilter,
});

const uploadAvatar = multer({
  storage: makeStorage('avatars'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter,
});

const uploadThumbnail = multer({
  storage: makeStorage('thumbnails'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageFilter,
});

// Accepts a multipart body without a file part so text-only submissions still work.
function optionalSingle(uploader, field) {
  return (req, res, next) => uploader.single(field)(req, res, (err) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(err);
    }
    return next(err);
  });
}

function fileMeta(file) {
  if (!file) return null;
  const relative = path.relative(env.uploadDir, file.path).split(path.sep).join('/');
  return {
    fileName: file.filename,
    originalName: file.originalname,
    filePath: file.path,
    fileUrl: `/uploads/${relative}`,
    fileSize: file.size,
    mimeType: file.mimetype,
  };
}

module.exports = {
  uploadMaterial,
  uploadSubmission,
  uploadAvatar,
  uploadThumbnail,
  optionalSingle,
  fileMeta,
};
