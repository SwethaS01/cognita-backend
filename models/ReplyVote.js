const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reply: { type: mongoose.Schema.Types.ObjectId, ref: 'Reply', required: true },
  voteType: { type: String, enum: ['upvote', 'downvote'], required: true }
}, { timestamps: true });

schema.index({ user: 1, reply: 1 }, { unique: true });

module.exports = mongoose.model('ReplyVote', schema);
