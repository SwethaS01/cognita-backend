const r=require('express').Router(),c=require('../controllers/postController'),{protect}=require('../middleware/auth'),{single}=require('../middleware/upload');
r.use(protect);
r.get('/',c.list);
r.post('/',single('file'),c.create);
r.delete('/:id',c.remove);
r.post('/:id/like',c.toggleLike);
r.post('/:id/comments',c.comment);
module.exports=r;
