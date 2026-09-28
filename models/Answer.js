const mongoose=require('mongoose');
const schema=new mongoose.Schema({doubt:{type:mongoose.Schema.Types.ObjectId,ref:'Doubt'},answer:{type:String,required:true},answeredBy:{type:mongoose.Schema.Types.ObjectId,ref:'User'}},{timestamps:true});
module.exports=mongoose.model('Answer',schema);