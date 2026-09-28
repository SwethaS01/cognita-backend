const Connection=require('../models/Connection');
const Notification=require('../models/Notification');

// GET /api/connections?status=accepted|pending
exports.list=async(req,res,next)=>{try{
  const me=req.user._id;
  const filter={$or:[{requester:me},{recipient:me}]};
  if(req.query.status)filter.status=req.query.status;
  const rows=await Connection.find(filter).populate('requester','name role department profileImage').populate('recipient','name role department profileImage').sort('-updatedAt');
  res.json(rows);
}catch(e){next(e)}};

// GET /api/connections/incoming - pending requests sent TO me
exports.incoming=async(req,res,next)=>{try{
  const rows=await Connection.find({recipient:req.user._id,status:'pending'}).populate('requester','name role department profileImage').sort('-createdAt');
  res.json(rows);
}catch(e){next(e)}};

// POST /api/connections {recipientId}
exports.create=async(req,res,next)=>{try{
  const {recipientId}=req.body;
  if(!recipientId)return res.status(400).json({message:'recipientId is required'});
  if(String(recipientId)===String(req.user._id))return res.status(400).json({message:'You cannot connect with yourself'});
  const existing=await Connection.findOne({$or:[{requester:req.user._id,recipient:recipientId},{requester:recipientId,recipient:req.user._id}]});
  if(existing)return res.status(409).json({message:`Connection already ${existing.status}`,connection:existing});
  const c=await Connection.create({requester:req.user._id,recipient:recipientId,status:'pending'});
  await Notification.create({user:recipientId,title:'New connection request',message:`${req.user.name} wants to connect with you`,type:'connection'});
  res.status(201).json(await c.populate('requester recipient','name role department profileImage'));
}catch(e){next(e)}};

// PATCH /api/connections/:id {status: accepted|declined}
exports.respond=async(req,res,next)=>{try{
  const {status}=req.body;
  if(!['accepted','declined'].includes(status))return res.status(400).json({message:'Invalid status'});
  const c=await Connection.findById(req.params.id);
  if(!c)return res.status(404).json({message:'Connection request not found'});
  if(String(c.recipient)!==String(req.user._id))return res.status(403).json({message:'Only the recipient can respond to this request'});
  c.status=status;await c.save();
  if(status==='accepted')await Notification.create({user:c.requester,title:'Connection accepted',message:`${req.user.name} accepted your connection request`,type:'connection'});
  res.json(await c.populate('requester recipient','name role department profileImage'));
}catch(e){next(e)}};

// DELETE /api/connections/:id - remove/cancel a connection
exports.remove=async(req,res,next)=>{try{
  const c=await Connection.findById(req.params.id);
  if(!c)return res.status(404).json({message:'Connection not found'});
  if(![String(c.requester),String(c.recipient)].includes(String(req.user._id)))return res.status(403).json({message:'Access denied'});
  await c.deleteOne();
  res.json({message:'Connection removed'});
}catch(e){next(e)}};
