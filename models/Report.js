const mongoose=require('mongoose');
const schema=new mongoose.Schema({reportedBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'},targetType:String,targetId:mongoose.Schema.Types.ObjectId,reason:String,status:{type:String,enum:['open','resolved','dismissed'],default:'open'}},{timestamps:true});
module.exports=mongoose.model('Report',schema);