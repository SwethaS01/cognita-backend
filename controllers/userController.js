const User=require('../models/User'),Notification=require('../models/Notification');const {parseYear,roleForYear}=require('../utils/year');
exports.list=async(req,res,next)=>{try{const f={role:{$ne:'admin'}};if(req.query.search)f.$or=[{name:{$regex:req.query.search,$options:'i'}},{email:{$regex:req.query.search,$options:'i'}}];if(req.query.role)f.role=req.query.role;res.json(await User.find(f).select('-password').sort('-createdAt'))}catch(e){next(e)}};
exports.update=async(req,res,next)=>{try{
  const target=await User.findById(req.params.id);
  if(!target)return res.status(404).json({message:'User not found'});
  // only the owner (or an admin) may edit a profile
  if(String(target._id)!==String(req.user._id)&&req.user.role!=='admin')return res.status(403).json({message:'Access denied'});
  const allowed=['name','department','year','college','bio','skills','interests','profileImage'];const data={};allowed.forEach(k=>{if(req.body[k]!==undefined)data[k]=req.body[k]});
  const oldRole=target.role;
  if(data.year!==undefined){
    if(['alumni','admin'].includes(target.role))delete data.year;
    else{const y=parseYear(data.year);if(y===null)return res.status(400).json({message:'Year must be 1, 2, 3 or 4'});data.year=String(y);data.role=roleForYear(y,target.role)}
  }
  const u=await User.findByIdAndUpdate(target._id,data,{new:true}).select('-password -resetPasswordToken -resetPasswordExpires');
  if(u.role!==oldRole&&['junior','senior'].includes(u.role)){
    await Notification.create({user:u._id,title:u.role==='senior'?'You are now a Senior 🎓':'Your role changed to Junior',message:u.role==='senior'?'Since you moved to year '+u.year+', you can now answer doubts and share experiences.':'Your role now matches year '+u.year+'.',type:'system'});
  }
  res.json(u)}catch(e){next(e)}};
exports.toggle=async(req,res,next)=>{try{const u=await User.findById(req.params.id);u.isActive=!u.isActive;await u.save();res.json({isActive:u.isActive})}catch(e){next(e)}};
exports.mentors=async(req,res,next)=>{try{res.json(await User.find({role:{$in:['senior','alumni']},isActive:true}).select('-password').sort('-createdAt'))}catch(e){next(e)}};

// GET /api/users/directory - search all students (junior/senior/alumni), never admin/staff
exports.directory=async(req,res,next)=>{try{
  const f={role:{$in:['junior','senior','alumni']},isActive:true};
  if(req.query.search){
    const q=req.query.search;
    f.$or=[{name:{$regex:q,$options:'i'}},{collegeId:{$regex:q,$options:'i'}},{department:{$regex:q,$options:'i'}},{bio:{$regex:q,$options:'i'}},{skills:{$regex:q,$options:'i'}}];
  }
  if(req.query.role)f.role=req.query.role;
  if(req.query.department)f.department=req.query.department;
  res.json(await User.find(f).select('-password -resetPasswordToken -resetPasswordExpires').sort('name'));
}catch(e){next(e)}};

// GET /api/users/:id - public profile of a student (never exposes admin/staff accounts)
exports.getOne=async(req,res,next)=>{try{
  const u=await User.findOne({_id:req.params.id,role:{$in:['junior','senior','alumni']}}).select('-password -resetPasswordToken -resetPasswordExpires');
  if(!u)return res.status(404).json({message:'Student not found'});
  res.json(u);
}catch(e){next(e)}};