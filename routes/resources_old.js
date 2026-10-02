const r=require('express').Router(),c=require('../controllers/resourceController'),{protect,roles}=require('../middleware/auth'),{single}=require('../middleware/upload');
r.get('/',protect,c.list);
// every logged-in student (junior, senior, alumni) can share files
r.post('/',protect,roles('junior','senior','alumni','admin'),single('file'),c.create);
r.delete('/:id',protect,roles('admin'),c.remove);
module.exports=r;
