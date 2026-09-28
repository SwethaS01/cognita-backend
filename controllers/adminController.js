const User=require('../models/User');
const Doubt=require('../models/Doubt');
const Resource=require('../models/Resource');
const Experience=require('../models/Experience');
const Post=require('../models/Post');
const Report=require('../models/Report');
const AdminActivity=require('../models/AdminActivity');

const log=async(req,action,description,targetType,targetId)=>{
  try{await AdminActivity.create({admin:req.user._id,action,description,targetType,targetId});}catch(e){console.error('Admin activity log failed:',e.message)}
};

exports.stats=async(req,res,next)=>{try{
  const [users,junior,senior,alumni,activeUsers,doubts,resources,experiences,posts,reports,unreadReports]=await Promise.all([
    User.countDocuments(),User.countDocuments({role:'junior'}),User.countDocuments({role:'senior'}),User.countDocuments({role:'alumni'}),
    User.countDocuments({isActive:true}),Doubt.countDocuments({status:{$ne:'removed'}}),Resource.countDocuments({status:{$ne:'removed'}}),
    Experience.countDocuments({status:{$ne:'removed'}}),Post.countDocuments({status:'active'}),Report.countDocuments({}),Report.countDocuments({status:'open'})
  ]);
  const recent=await AdminActivity.find().populate('admin','name role').sort('-createdAt').limit(8);
  res.json({users,junior,senior,alumni,activeUsers,doubts,resources,experiences,posts,reports,openReports:unreadReports,recent});
}catch(e){next(e)}};

exports.users=async(req,res,next)=>{try{
  const {search='',role,status}=req.query;
  const f={};
  if(role&&role!=='all')f.role=role;
  if(status==='active')f.isActive=true;
  if(status==='inactive')f.isActive=false;
  if(search.trim())f.$or=[{name:{$regex:search.trim(),$options:'i'}},{email:{$regex:search.trim(),$options:'i'}},{department:{$regex:search.trim(),$options:'i'}}];
  res.json(await User.find(f).select('-password -resetPasswordToken -resetPasswordExpires').sort('-createdAt'));
}catch(e){next(e)}};

exports.toggleUser=async(req,res,next)=>{try{
  const u=await User.findById(req.params.id);
  if(!u)return res.status(404).json({message:'User not found'});
  if(String(u._id)===String(req.user._id))return res.status(400).json({message:'You cannot deactivate yourself'});
  u.isActive=!u.isActive;await u.save();
  await log(req,u.isActive?'ACTIVATE_USER':'DEACTIVATE_USER',`${u.isActive?'Activated':'Deactivated'} ${u.name}`, 'user',u._id);
  res.json({message:`User ${u.isActive?'activated':'deactivated'}`,user:u});
}catch(e){next(e)}};

exports.reports=async(req,res,next)=>{try{res.json(await Report.find().populate('reportedBy','name email role').sort('-createdAt'))}catch(e){next(e)}};

exports.resolveReport=async(req,res,next)=>{try{
  const {status='resolved'}=req.body;
  if(!['resolved','dismissed','open'].includes(status))return res.status(400).json({message:'Invalid status'});
  const r=await Report.findByIdAndUpdate(req.params.id,{status},{new:true}).populate('reportedBy','name email role');
  if(!r)return res.status(404).json({message:'Report not found'});
  await log(req,'UPDATE_REPORT',`${status} report ${r._id}`,'report',r._id);
  res.json(r);
}catch(e){next(e)}};

const contentMap={doubt:Doubt,resource:Resource,experience:Experience,post:Post};
const activeStatus={doubt:'open',resource:'approved',experience:'approved',post:'active'};

exports.content=async(req,res,next)=>{try{
  const type=req.query.type||'all';
  const search=(req.query.search||'').trim();
  const types=type==='all'?Object.keys(contentMap):[type];
  if(!types.every(t=>contentMap[t]))return res.status(400).json({message:'Invalid content type'});
  const result=[];
  for(const t of types){
    const Model=contentMap[t];let f={};
    if(search){
      const fields=t==='doubt'?['title','description','subject']:t==='resource'?['title','description','subject']:t==='experience'?['company','role','experience']:['content'];
      f={$or:fields.map(k=>({[k]:{$regex:search,$options:'i'}}))};
    }
    let q=Model.find(f).sort('-createdAt').limit(100);
    if(t==='doubt')q=q.populate('askedBy','name role');
    if(t==='resource')q=q.populate('uploadedBy','name role');
    if(t==='experience')q=q.populate('postedBy','name role');
    if(t==='post')q=q.populate('author','name role');
    const rows=await q;
    rows.forEach(x=>result.push({type:t,item:x}));
  }
  result.sort((a,b)=>new Date(b.item.createdAt)-new Date(a.item.createdAt));
  res.json(result.slice(0,250));
}catch(e){next(e)}};

exports.moderate=async(req,res,next)=>{try{
  const Model=contentMap[req.params.type];
  if(!Model)return res.status(400).json({message:'Invalid content type'});
  const item=await Model.findById(req.params.id);
  if(!item)return res.status(404).json({message:'Content not found'});
  const action=req.body.action||'remove';
  item.status=action==='restore'?activeStatus[req.params.type]:'removed';
  await item.save();
  await log(req,action==='restore'?'RESTORE_CONTENT':'REMOVE_CONTENT',`${action==='restore'?'Restored':'Removed'} ${req.params.type} ${req.params.id}`,req.params.type,item._id);
  res.json({message:'Content updated',item});
}catch(e){next(e)}};

exports.activity=async(req,res,next)=>{try{
  res.json(await AdminActivity.find().populate('admin','name email role').sort('-createdAt').limit(100));
}catch(e){next(e)}};

exports.profile=async(req,res,next)=>{try{
  const u=await User.findById(req.user._id).select('-password -resetPasswordToken -resetPasswordExpires');
  res.json(u);
}catch(e){next(e)}};

exports.log=log;
