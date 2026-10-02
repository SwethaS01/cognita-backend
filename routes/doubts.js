const r = require('express').Router();
const c = require('../controllers/doubtController');
const { protect, roles } = require('../middleware/auth');

r.get('/', protect, c.list);
r.post('/', protect, roles('junior'), c.create);
r.get('/connections', protect, c.getConnections);
r.get('/:id', protect, c.get);
r.post('/:id/answers', protect, roles('senior', 'alumni', 'admin'), c.answer);
r.patch('/:id/accept', protect, roles('junior'), c.accept);
r.post('/:id/vote', protect, c.voteDoubt);
r.post('/:id/replies/:replyId/vote', protect, c.voteReply);

module.exports = r;
