const Doubt = require('../models/Doubt');
const Reply = require('../models/Reply');
const DoubtVote = require('../models/DoubtVote');
const ReplyVote = require('../models/ReplyVote');
const Notification = require('../models/Notification');
const User = require('../models/User');

// List doubts with filters
exports.list = async (req, res, next) => {
  try {
    const { search, category, isPrivate, status } = req.query;
    const filter = {};
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) {
      filter.category = category;
    }
    
    if (status) {
      filter.status = status;
    }
    
    // Only show public doubts or private doubts addressed to current user
    if (isPrivate === 'true') {
      filter.isPrivate = true;
      filter.targetUser = req.user._id;
    } else {
      filter.$or = [
        { isPrivate: false },
        { isPrivate: true, targetUser: req.user._id }
      ];
    }
    
    const docs = await Doubt.find(filter)
      .populate('askedBy', 'name role department year profileImage')
      .populate('acceptedAnswer')
      .sort('-createdAt');
      
    res.json(docs);
  } catch (e) {
    next(e);
  }
};

// Create doubt
exports.create = async (req, res, next) => {
  try {
    const { title, description, subject, category, tags, isPrivate, targetUser, attachments } = req.body;
    
    // Validate private doubt
    if (isPrivate && !targetUser) {
      return res.status(400).json({ message: 'Target user is required for private doubts' });
    }
    
    const doubt = await Doubt.create({
      title,
      description,
      subject,
      category: category || 'General',
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : []),
      isPrivate: isPrivate || false,
      targetUser: isPrivate ? targetUser : null,
      attachments: attachments || [],
      askedBy: req.user._id
    });
    
    // Notify relevant users
    if (isPrivate && targetUser) {
      await Notification.create({
        user: targetUser,
        title: 'New Private Doubt',
        message: `${req.user.name} sent you a private doubt: ${title}`,
        type: 'doubt'
      });
    } else {
      // Public doubt: notify all seniors/alumni
      const recipients = await User.find({ 
        role: { $in: ['senior', 'alumni'] }, 
        isActive: true 
      }).select('_id');
      
      if (recipients.length) {
        const notifs = recipients.map(u => ({
          user: u._id,
          title: 'New Public Doubt',
          message: `${req.user.name} asked: ${title}`.slice(0, 140),
          type: 'doubt'
        }));
        await Notification.insertMany(notifs);
      }
    }
    
    res.status(201).json(await doubt.populate('askedBy', 'name role department year profileImage'));
  } catch (e) {
    next(e);
  }
};

// Get single doubt with replies
exports.get = async (req, res, next) => {
  try {
    const doubt = await Doubt.findById(req.params.id)
      .populate('askedBy', 'name role department year profileImage')
      .populate('acceptedAnswer');
    
    if (!doubt) {
      return res.status(404).json({ message: 'Doubt not found' });
    }
    
    // Check access for private doubts
    if (doubt.isPrivate && String(doubt.targetUser) !== String(req.user._id) && String(doubt.askedBy._id) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const replies = await Reply.find({ doubt: doubt._id })
      .populate('answeredBy', 'name role department year profileImage skills')
      .sort('-createdAt');
      
    res.json({ doubt, replies });
  } catch (e) {
    next(e);
  }
};

// Add reply to doubt
exports.answer = async (req, res, next) => {
  try {
    const { answer, attachments, codeSnippet } = req.body;
    const doubt = await Doubt.findById(req.params.id);
    
    if (!doubt) {
      return res.status(404).json({ message: 'Doubt not found' });
    }
    
    // Check access for private doubts
    if (doubt.isPrivate && String(doubt.targetUser) !== String(req.user._id) && String(doubt.askedBy) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const reply = await Reply.create({
      doubt: doubt._id,
      answer,
      answeredBy: req.user._id,
      attachments: attachments || [],
      codeSnippet
    });
    
    // Notify doubt owner
    if (String(doubt.askedBy) !== String(req.user._id)) {
      await Notification.create({
        user: doubt.askedBy,
        title: 'New Answer to Your Doubt',
        message: `${req.user.name} answered your doubt: ${doubt.title}`,
        type: 'doubt'
      });
    }
    
    res.status(201).json(await reply.populate('answeredBy', 'name role department year profileImage'));
  } catch (e) {
    next(e);
  }
};

// Accept answer
exports.accept = async (req, res, next) => {
  try {
    const { replyId } = req.body;
    const doubt = await Doubt.findById(req.params.id);
    
    if (!doubt) {
      return res.status(404).json({ message: 'Doubt not found' });
    }
    
    if (String(doubt.askedBy) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Only the author can accept an answer' });
    }
    
    // Update reply
    await Reply.findByIdAndUpdate(replyId, { isAccepted: true });
    
    // Update doubt
    doubt.acceptedAnswer = replyId;
    doubt.status = 'resolved';
    await doubt.save();
    
    res.json(doubt);
  } catch (e) {
    next(e);
  }
};

// Vote on doubt
exports.voteDoubt = async (req, res, next) => {
  try {
    const { voteType } = req.body; // 'upvote' or 'downvote'
    const doubt = await Doubt.findById(req.params.id);
    
    if (!doubt) {
      return res.status(404).json({ message: 'Doubt not found' });
    }
    
    // Check for existing vote
    const existingVote = await DoubtVote.findOne({
      user: req.user._id,
      doubt: doubt._id
    });
    
    if (existingVote) {
      // Update existing vote
      if (existingVote.voteType === voteType) {
        // Remove vote if same type
        await DoubtVote.findByIdAndDelete(existingVote._id);
        if (voteType === 'upvote') doubt.upvotes--;
        else doubt.downvotes--;
      } else {
        // Change vote type
        existingVote.voteType = voteType;
        await existingVote.save();
        if (voteType === 'upvote') {
          doubt.upvotes++;
          doubt.downvotes--;
        } else {
          doubt.downvotes++;
          doubt.upvotes--;
        }
      }
    } else {
      // New vote
      await DoubtVote.create({
        user: req.user._id,
        doubt: doubt._id,
        voteType
      });
      if (voteType === 'upvote') doubt.upvotes++;
      else doubt.downvotes++;
    }
    
    await doubt.save();
    res.json({ upvotes: doubt.upvotes, downvotes: doubt.downvotes });
  } catch (e) {
    next(e);
  }
};

// Vote on reply
exports.voteReply = async (req, res, next) => {
  try {
    const { replyId, voteType } = req.body; // 'upvote' or 'downvote'
    const reply = await Reply.findById(replyId);
    
    if (!reply) {
      return res.status(404).json({ message: 'Reply not found' });
    }
    
    // Check for existing vote
    const existingVote = await ReplyVote.findOne({
      user: req.user._id,
      reply: reply._id
    });
    
    if (existingVote) {
      if (existingVote.voteType === voteType) {
        await ReplyVote.findByIdAndDelete(existingVote._id);
        if (voteType === 'upvote') reply.upvotes--;
        else reply.downvotes--;
      } else {
        existingVote.voteType = voteType;
        await existingVote.save();
        if (voteType === 'upvote') {
          reply.upvotes++;
          reply.downvotes--;
        } else {
          reply.downvotes++;
          reply.upvotes--;
        }
      }
    } else {
      await ReplyVote.create({
        user: req.user._id,
        reply: reply._id,
        voteType
      });
      if (voteType === 'upvote') reply.upvotes++;
      else reply.downvotes++;
    }
    
    await reply.save();
    res.json({ upvotes: reply.upvotes, downvotes: reply.downvotes });
  } catch (e) {
    next(e);
  }
};

// Get user's connections for private doubt targeting
exports.getConnections = async (req, res, next) => {
  try {
    const connections = await User.find({
      _id: { $ne: req.user._id },
      isActive: true
    }).select('name department year role profileImage').limit(50);
    
    res.json(connections);
  } catch (e) {
    next(e);
  }
};
