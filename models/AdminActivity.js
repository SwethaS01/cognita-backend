const mongoose=require('mongoose');
const schema=new mongoose.Schema({
  admin:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
  action:{type:String,required:true},
  targetType:String,
  targetId:mongoose.Schema.Types.ObjectId,
  description:String
},{timestamps:true});
module.exports=mongoose.model('AdminActivity',schema);
