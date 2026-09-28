const multer = require('multer');
const path = require('path');
const File = require('../models/File');

const MAX_MB = Number(process.env.MAX_UPLOAD_MB || 15);
const ALLOWED = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx', '.csv', '.txt', '.md', '.zip', '.png', '.jpg', '.jpeg', '.gif', '.webp'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED.includes(ext)) {
      const e = new Error(`File type ${ext || '(none)'} is not allowed. Allowed: ${ALLOWED.join(', ')}`); e.status = 400; return cb(e);
    }
    cb(null, true);
  }
});

// Wraps upload.single so multer errors become clean JSON errors
const single = (field) => (req, res, next) => upload.single(field)(req, res, (err) => {
  if (!err) return next();
  if (err.code === 'LIMIT_FILE_SIZE') { err.status = 413; err.message = `File too large (max ${MAX_MB} MB)`; }
  else if (!err.status) err.status = 400;
  next(err);
});

// Saves the uploaded file (if any) in MongoDB and returns the attachment info
async function saveFile(req) {
  if (!req.file) return null;
  const f = await File.create({
    filename: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size,
    data: req.file.buffer, uploadedBy: req.user._id
  });
  return { fileId: f._id, fileName: f.filename, fileSize: f.size, mimeType: f.mimetype };
}
module.exports = { single, saveFile, MAX_MB };
