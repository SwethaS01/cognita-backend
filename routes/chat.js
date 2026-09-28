const r=require('express').Router();const c=require('../controllers/chatController');const {protect}=require('../middleware/auth');
r.use(protect);r.get('/conversations',c.conversations);r.post('/conversations',c.create);r.get('/conversations/:id/messages',c.messages);module.exports=r;
