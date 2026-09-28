const mongoose = require('mongoose');

const mentorshipRelationshipSchema = new mongoose.Schema({
  mentor: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  mentee: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  skill: String,
  status: { 
    type: String, 
    enum: ['active', 'completed', 'paused'],
    default: 'active'
  },
  startDate: { type: Date, default: Date.now },
  endDate: Date
}, { timestamps: true });

mentorshipRelationshipSchema.index({ mentor: 1, mentee: 1 }, { unique: true });

module.exports = mongoose.model('MentorshipRelationship', mentorshipRelationshipSchema);
