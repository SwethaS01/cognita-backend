const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  resource: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource', required: true },
  voteType: { type: String, enum: ['upvote', 'downvote'], required: true }
}, { timestamps: true });

schema.index({ user: 1, resource: 1 }, { unique: true });

module.exports = mongoose.model('ResourceVote', schema);
