const r = require('express').Router();
const c = require('../controllers/resourceController');
const { protect, roles } = require('../middleware/auth');
const { single } = require('../middleware/upload');

r.get('/', protect, c.list);
r.get('/bookmarks', protect, c.getBookmarks);
r.post('/', protect, roles('junior', 'senior', 'alumni', 'admin'), single('file'), c.create);
r.delete('/:id', protect, roles('admin'), c.remove);
r.post('/:id/vote', protect, c.vote);
r.post('/:id/bookmark', protect, c.bookmark);

module.exports = r;
