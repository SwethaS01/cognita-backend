const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  doubt: { type: mongoose.Schema.Types.ObjectId, ref: 'Doubt', required: true },
  answer: { type: String, required: true },
  answeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    fileSize: Number
  }],
  codeSnippet: String,
  isAccepted: { type: Boolean, default: false },
  upvotes: { type: Number, default: 0 },
  downvotes: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Reply', schema);
