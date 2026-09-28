const Post=require('../models/Post');
const {saveFile}=require('../middleware/upload');

exports.list=async(req,res,next)=>{try{
  const f={status:'active'};
  if(req.query.type)f.type=req.query.type;
  const rows=await Post.find(f).populate('author','name role year department profileImage').populate('comments.user','name role').sort('-createdAt').limit(200);
  res.json(rows);
}catch(e){next(e)}};

exports.create=async(req,res,next)=>{try{
  const {content,type='general',image}=req.body;
  if(!content||!content.trim())return res.status(400).json({message:'Post content is required'});
  const att=await saveFile(req);
  const p=await Post.create({author:req.user._id,content:content.trim(),type,image,...(att||{})});
  res.status(201).json(await p.populate('author','name role year department profileImage'));
}catch(e){next(e)}};

exports.remove=async(req,res,next)=>{try{
  const p=await Post.findById(req.params.id);
  if(!p)return res.status(404).json({message:'Post not found'});
  if(String(p.author)!==String(req.user._id)&&req.user.role!=='admin')return res.status(403).json({message:'Access denied'});
  p.status='removed';await p.save();
  res.json({message:'Post removed'});
}catch(e){next(e)}};

exports.toggleLike=async(req,res,next)=>{try{
  const p=await Post.findById(req.params.id);
  if(!p)return res.status(404).json({message:'Post not found'});
  const idx=p.likes.findIndex(u=>String(u)===String(req.user._id));
  if(idx>=0)p.likes.splice(idx,1);else p.likes.push(req.user._id);
  await p.save();
  res.json({likes:p.likes.length,liked:idx<0});
}catch(e){next(e)}};

exports.comment=async(req,res,next)=>{try{
  const {text}=req.body;
  if(!text||!text.trim())return res.status(400).json({message:'Comment text is required'});
  const p=await Post.findById(req.params.id);
  if(!p)return res.status(404).json({message:'Post not found'});
  p.comments.push({user:req.user._id,text:text.trim()});
  await p.save();
  await p.populate('comments.user','name role');
  res.status(201).json(p.comments[p.comments.length-1]);
}catch(e){next(e)}};
