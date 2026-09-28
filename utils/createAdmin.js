require('dotenv').config();
const mongoose=require('mongoose');
const ensureAdmin=require('./ensureAdmin');
const connectDB=require('../config/db');

(async()=>{
  try{
    await connectDB();
    await ensureAdmin();
    await mongoose.disconnect();
    console.log('Admin setup complete.');
  }catch(error){
    console.error('Admin setup failed:',error.message);
    process.exit(1);
  }
})();
