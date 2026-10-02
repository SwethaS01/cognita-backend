const Resource=require('../models/Resource');
const {saveFile}=require('../middleware/upload');
exports.list=async(req,res,next)=>{try{const f={status:'approved'};if(req.query.department)f.department=req.query.department;if(req.query.subject)f.subject=req.query.subject;if(req.query.search)f.title={$regex:String(req.query.search).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),$options:'i'};res.json(await Resource.find(f).populate('uploadedBy','name role').sort('-createdAt'))}catch(e){next(e)}};
exports.create=async(req,res,next)=>{try{
  if(!req.body.title||!req.body.title.trim())return res.status(400).json({message:'Title is required'});
  const att=await saveFile(req);
  const tags=Array.isArray(req.body.tags)?req.body.tags:String(req.body.tags||'').split(',').map(t=>t.trim()).filter(Boolean);
  const r=await Resource.create({title:req.body.title,description:req.body.description,subject:req.body.subject,department:req.body.department,semester:req.body.semester,type:req.body.type,tags,uploadedBy:req.user._id,...(att||{}),fileUrl:att?`/api/files/${att.fileId}`:''});
  res.status(201).json(await r.populate('uploadedBy','name role'))}catch(e){next(e)}};
exports.remove=async(req,res,next)=>{try{await Resource.findByIdAndUpdate(req.params.id,{status:'removed'});res.json({message:'Resource removed'})}catch(e){next(e)}};
