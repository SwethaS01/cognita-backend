const mongoose=require('mongoose');
const schema=new mongoose.Schema({participants:[{type:mongoose.Schema.Types.ObjectId,ref:'User'}],lastMessage:{type:String,default:''}},{timestamps:true});
module.exports=mongoose.model('Conversation',schema);