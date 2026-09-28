const mongoose = require('mongoose');
// Uploaded files are stored in MongoDB so they survive redeploys on hosts with ephemeral disks.
const schema = new mongoose.Schema({
  filename: { type: String, required: true },
  mimetype: String,
  size: Number,
  data: { type: Buffer, required: true, select: false },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });
module.exports = mongoose.model('File', schema);
