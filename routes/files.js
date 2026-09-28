const r = require('express').Router();
const File = require('../models/File');
const { protect } = require('../middleware/auth');

// GET /api/files/:id  -> any logged-in student can download any shared file
r.get('/:id', protect, async (req, res, next) => {
  try {
    const f = await File.findById(req.params.id).select('+data');
    if (!f) return res.status(404).json({ message: 'File not found' });
    res.set({
      'Content-Type': f.mimetype || 'application/octet-stream',
      'Content-Length': f.data.length,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(f.filename)}`,
      'X-Content-Type-Options': 'nosniff'
    });
    res.send(f.data);
  } catch (e) { next(e); }
});
module.exports = r;
