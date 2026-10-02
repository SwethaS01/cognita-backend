const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doubt: { type: mongoose.Schema.Types.ObjectId, ref: 'Doubt', required: true },
  voteType: { type: String, enum: ['upvote', 'downvote'], required: true }
}, { timestamps: true });

schema.index({ user: 1, doubt: 1 }, { unique: true });

module.exports = mongoose.model('DoubtVote', schema);
