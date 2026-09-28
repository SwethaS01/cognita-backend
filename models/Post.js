const mongoose=require('mongoose');
const commentSchema=new mongoose.Schema({user:{type:mongoose.Schema.Types.ObjectId,ref:'User'},text:{type:String,required:true}},{timestamps:true});
const schema=new mongoose.Schema({author:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},content:{type:String,required:true},type:{type:String,enum:['experience','placement','achievement','general'],default:'general'},image:String,fileId:{type:mongoose.Schema.Types.ObjectId,ref:'File'},fileName:String,fileSize:Number,mimeType:String,likes:[{type:mongoose.Schema.Types.ObjectId,ref:'User'}],comments:[commentSchema],status:{type:String,enum:['active','removed'],default:'active'}},{timestamps:true});
module.exports=mongoose.model('Post',schema);
