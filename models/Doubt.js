const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  subject: String,
  category: { 
    type: String, 
    enum: ['Subject', 'Coding', 'Placement', 'Project', 'General'],
    default: 'General'
  },
  tags: [String],
  isPrivate: { type: Boolean, default: false },
  targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  attachments: [{
    fileName: String,
    fileUrl: String,
    fileType: String,
    fileSize: Number
  }],
  askedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  acceptedAnswer: { type: mongoose.Schema.Types.ObjectId, ref: 'Reply' },
  status: { type: String, enum: ['open', 'resolved', 'removed'], default: 'open' },
  upvotes: { type: Number, default: 0 },
  downvotes: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Doubt', schema);
