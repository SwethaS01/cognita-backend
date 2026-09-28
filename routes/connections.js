const r=require('express').Router(),c=require('../controllers/connectionController'),{protect}=require('../middleware/auth');
r.use(protect);
r.get('/',c.list);
r.get('/incoming',c.incoming);
r.post('/',c.create);
r.patch('/:id',c.respond);
r.delete('/:id',c.remove);
module.exports=r;
