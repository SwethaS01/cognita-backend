const Report=require('../models/Report');

// POST /api/reports {targetType, targetId, reason}
exports.create=async(req,res,next)=>{try{
  const {targetType,targetId,reason}=req.body;
  if(!targetType||!targetId||!reason)return res.status(400).json({message:'targetType, targetId and reason are required'});
  const allowed=['doubt','resource','experience','post','user'];
  if(!allowed.includes(targetType))return res.status(400).json({message:'Invalid targetType'});
  const r=await Report.create({reportedBy:req.user._id,targetType,targetId,reason:String(reason).trim()});
  res.status(201).json(r);
}catch(e){next(e)}};
