const r=require('express').Router(),c=require('../controllers/reportController'),{protect}=require('../middleware/auth');
r.post('/',protect,c.create);
module.exports=r;
