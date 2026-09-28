const mongoose=require('mongoose');
const schema=new mongoose.Schema({conversation:{type:mongoose.Schema.Types.ObjectId,ref:'Conversation'},sender:{type:mongoose.Schema.Types.ObjectId,ref:'User'},text:{type:String,required:true},read:{type:Boolean,default:false}},{timestamps:true});
module.exports=mongoose.model('Message',schema);