const mongoose = require('mongoose');

const mentorshipRequestSchema = new mongoose.Schema({
  sender: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  mentor: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  requestedSkill: String,
  message: String,
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'rejected'],
    default: 'pending'
  },
  requestType: {
    type: String,
    enum: ['student_request', 'mentor_offer'],
    default: 'student_request'
  }
}, { timestamps: true });

mentorshipRequestSchema.index({ sender: 1, mentor: 1, status: 1 });

module.exports = mongoose.model('MentorshipRequest', mentorshipRequestSchema);
