const Doubt=require('../models/Doubt'),Answer=require('../models/Answer'),Notification=require('../models/Notification'),User=require('../models/User');
exports.list=async(req,res,next)=>{try{const q=req.query.search||'';const docs=await Doubt.find(q?{$or:[{title:{$regex:q,$options:'i'}},{subject:{$regex:q,$options:'i'}},{tags:{$regex:q,$options:'i'}}]}:{}).populate('askedBy','name role').populate('acceptedAnswer').sort('-createdAt');res.json(docs)}catch(e){next(e)}};
exports.create=async(req,res,next)=>{try{const d=await Doubt.create({...req.body,askedBy:req.user._id});
  // Public doubt: notify every active senior/alumni so anyone can answer
  const recipients=await User.find({role:{$in:['senior','alumni']},isActive:true}).select('_id');
  if(recipients.length){
    const notifs=recipients.map(u=>({user:u._id,title:'New public doubt posted',message:`${req.user.name} asked: ${d.title}`.slice(0,140),type:'doubt'}));
    await Notification.insertMany(notifs);
  }
  res.status(201).json(await d.populate('askedBy','name role'))}catch(e){next(e)}};
exports.get=async(req,res,next)=>{try{const d=await Doubt.findById(req.params.id).populate('askedBy','name role');const answers=await Answer.find({doubt:d._id}).populate('answeredBy','name role skills').sort('createdAt');res.json({doubt:d,answers})}catch(e){next(e)}};
exports.answer=async(req,res,next)=>{try{const a=await Answer.create({doubt:req.params.id,answer:req.body.answer,answeredBy:req.user._id});const d=await Doubt.findById(req.params.id);if(d&&String(d.askedBy)!==String(req.user._id))await Notification.create({user:d.askedBy,title:'Your doubt has a new answer',message:req.body.answer.slice(0,100),type:'doubt'});res.status(201).json(await a.populate('answeredBy','name role'))}catch(e){next(e)}};
exports.accept=async(req,res,next)=>{try{const d=await Doubt.findById(req.params.id);if(String(d.askedBy)!==String(req.user._id))return res.status(403).json({message:'Only the author can accept an answer'});d.acceptedAnswer=req.body.answerId;d.status='resolved';await d.save();res.json(d)}catch(e){next(e)}};