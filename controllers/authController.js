const bcrypt=require('bcryptjs');const jwt=require('jsonwebtoken');const crypto=require('crypto');const User=require('../models/User');const {parseYear,roleForYear}=require('../utils/year');
const token=u=>jwt.sign({id:u._id},process.env.JWT_SECRET,{expiresIn:'7d'});
const safe=u=>{const o=u.toObject();delete o.password;delete o.resetPasswordToken;delete o.resetPasswordExpires;return o};
exports.signup=async(req,res,next)=>{try{const {name,email:rawEmail,password,role='junior',department,year,college,collegeId}=req.body;
  const email=String(rawEmail||'').trim().toLowerCase();
  if(!name||!email||!password)return res.status(400).json({message:'Name, email and password are required'});
  if(password.length<6)return res.status(400).json({message:'Password must be at least 6 characters'});
  // Student-only. Role comes from the year: 1-2 => junior, 3-4 => senior. Alumni is chosen explicitly.
  let safeRole,safeYear;
  if(role==='alumni'){safeRole='alumni';safeYear='Alumni'}
  else{const y=parseYear(year);if(y===null)return res.status(400).json({message:'Please select your year (1, 2, 3 or 4)'});safeYear=String(y);safeRole=roleForYear(y,'junior')}
  if(await User.findOne({email}))return res.status(409).json({message:'Email already registered'});
  if(collegeId&&await User.findOne({collegeId:String(collegeId).trim().toUpperCase()}))return res.status(409).json({message:'College ID already registered'});
  const passwordHash=await bcrypt.hash(password,10);
  const u=await User.create({name,email,password:passwordHash,role:safeRole,department,year:safeYear,college:college||'SA Engineering College',collegeId});
  res.status(201).json({token:token(u),user:safe(u)})}catch(e){
    if(e&&e.code===11000)return res.status(409).json({message:'Email or College ID already registered'});
    next(e)}};
exports.login=async(req,res,next)=>{try{const {password}=req.body;const email=String(req.body.email||'').trim().toLowerCase();const u=await User.findOne({email});if(!u||!await bcrypt.compare(password||'',u.password)||!u.isActive)return res.status(401).json({message:'Invalid credentials'});res.json({token:token(u),user:safe(u)})}catch(e){next(e)}};
exports.me=async(req,res)=>res.json(req.user);
exports.forgot=async(req,res,next)=>{try{const {email}=req.body;const u=await User.findOne({email});if(!u)return res.json({message:'If the account exists, reset instructions have been sent.'});const raw=crypto.randomBytes(32).toString('hex');u.resetPasswordToken=crypto.createHash('sha256').update(raw).digest('hex');u.resetPasswordExpires=Date.now()+15*60*1000;await u.save();const resetUrl=`${process.env.CLIENT_URL||'http://localhost:5173'}/reset-password/${raw}`;console.log(`[Cognito Nexus] Password reset URL for ${email}: ${resetUrl}`);res.json({message:'Reset instructions generated. For local development, check the backend console.',developmentResetUrl:process.env.NODE_ENV==='production'?undefined:resetUrl})}catch(e){next(e)}};
exports.reset=async(req,res,next)=>{try{const hash=crypto.createHash('sha256').update(req.params.token).digest('hex');const u=await User.findOne({resetPasswordToken:hash,resetPasswordExpires:{$gt:Date.now()}});if(!u)return res.status(400).json({message:'Reset link is invalid or expired'});if(!req.body.password||req.body.password.length<6)return res.status(400).json({message:'Password must be at least 6 characters'});u.password=await bcrypt.hash(req.body.password,10);u.resetPasswordToken=undefined;u.resetPasswordExpires=undefined;await u.save();res.json({message:'Password reset successful'})}catch(e){next(e)}};
