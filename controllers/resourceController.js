const Resource = require('../models/Resource');
const ResourceBookmark = require('../models/ResourceBookmark');
const ResourceVote = require('../models/ResourceVote');
const { saveFile } = require('../middleware/upload');

// List resources with filters
exports.list = async (req, res, next) => {
  try {
    const { search, type, department, subject, category, bookmarked } = req.query;
    const filter = { status: 'approved' };
    
    if (department) filter.department = department;
    if (subject) filter.subject = subject;
    if (type) filter.type = type;
    if (category) filter.category = category;
    if (search) {
      filter.title = { $regex: String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    }
    
    let query = Resource.find(filter).populate('uploadedBy', 'name role department year profileImage').sort('-createdAt');
    
    // If bookmarked filter, join with bookmarks
    if (bookmarked === 'true') {
      const bookmarks = await ResourceBookmark.find({ user: req.user._id }).select('resource');
      const resourceIds = bookmarks.map(b => b.resource);
      filter._id = { $in: resourceIds };
      query = Resource.find(filter).populate('uploadedBy', 'name role department year profileImage').sort('-createdAt');
    }
    
    const resources = await query;
    
    // Add user's vote status and bookmark status
    const resourcesWithStatus = await Promise.all(resources.map(async (resource) => {
      const vote = await ResourceVote.findOne({ user: req.user._id, resource: resource._id });
      const bookmark = await ResourceBookmark.findOne({ user: req.user._id, resource: resource._id });
      
      return {
        ...resource.toObject(),
        userVote: vote ? vote.voteType : null,
        isBookmarked: !!bookmark
      };
    }));
    
    res.json(resourcesWithStatus);
  } catch (e) {
    next(e);
  }
};

// Create resource
exports.create = async (req, res, next) => {
  try {
    if (!req.body.title || !req.body.title.trim()) {
      return res.status(400).json({ message: 'Title is required' });
    }
    
    const att = await saveFile(req);
    const tags = Array.isArray(req.body.tags) 
      ? req.body.tags 
      : String(req.body.tags || '').split(',').map(t => t.trim()).filter(Boolean);
    
    const resource = await Resource.create({
      title: req.body.title,
      description: req.body.description,
      subject: req.body.subject,
      department: req.body.department,
      semester: req.body.semester,
      type: req.body.type,
      category: req.body.category,
      tags,
      uploadedBy: req.user._id,
      ...(att || {}),
      fileUrl: att ? `/api/files/${att.fileId}` : ''
    });
    
    res.status(201).json(await resource.populate('uploadedBy', 'name role department year profileImage'));
  } catch (e) {
    next(e);
  }
};

// Remove resource
exports.remove = async (req, res, next) => {
  try {
    const resource = await Resource.findById(req.params.id);
    
    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }
    
    // Only uploader or admin can remove
    if (String(resource.uploadedBy) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    await Resource.findByIdAndUpdate(req.params.id, { status: 'removed' });
    res.json({ message: 'Resource removed' });
  } catch (e) {
    next(e);
  }
};

// Vote on resource
exports.vote = async (req, res, next) => {
  try {
    const { voteType } = req.body; // 'upvote' or 'downvote'
    const resource = await Resource.findById(req.params.id);
    
    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }
    
    const existingVote = await ResourceVote.findOne({
      user: req.user._id,
      resource: resource._id
    });
    
    if (existingVote) {
      if (existingVote.voteType === voteType) {
        await ResourceVote.findByIdAndDelete(existingVote._id);
        if (voteType === 'upvote') resource.upvotes--;
        else resource.downvotes--;
      } else {
        existingVote.voteType = voteType;
        await existingVote.save();
        if (voteType === 'upvote') {
          resource.upvotes++;
          resource.downvotes--;
        } else {
          resource.downvotes++;
          resource.upvotes--;
        }
      }
    } else {
      await ResourceVote.create({
        user: req.user._id,
        resource: resource._id,
        voteType
      });
      if (voteType === 'upvote') resource.upvotes++;
      else resource.downvotes++;
    }
    
    await resource.save();
    res.json({ upvotes: resource.upvotes, downvotes: resource.downvotes });
  } catch (e) {
    next(e);
  }
};

// Bookmark resource
exports.bookmark = async (req, res, next) => {
  try {
    const resource = await Resource.findById(req.params.id);
    
    if (!resource) {
      return res.status(404).json({ message: 'Resource not found' });
    }
    
    const existingBookmark = await ResourceBookmark.findOne({
      user: req.user._id,
      resource: resource._id
    });
    
    if (existingBookmark) {
      await ResourceBookmark.findByIdAndDelete(existingBookmark._id);
      res.json({ bookmarked: false });
    } else {
      await ResourceBookmark.create({
        user: req.user._id,
        resource: resource._id
      });
      res.json({ bookmarked: true });
    }
  } catch (e) {
    next(e);
  }
};

// Get user's bookmarked resources
exports.getBookmarks = async (req, res, next) => {
  try {
    const bookmarks = await ResourceBookmark.find({ user: req.user._id })
      .populate('resource')
      .sort('-createdAt');
    
    const resources = bookmarks.map(b => b.resource).filter(Boolean);
    
    // Add vote status
    const resourcesWithStatus = await Promise.all(resources.map(async (resource) => {
      const vote = await ResourceVote.findOne({ user: req.user._id, resource: resource._id });
      return {
        ...resource.toObject(),
        userVote: vote ? vote.voteType : null,
        isBookmarked: true
      };
    }));
    
    res.json(resourcesWithStatus);
  } catch (e) {
    next(e);
  }
};
