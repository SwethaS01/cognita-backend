const MentorProfile = require('../models/MentorProfile');
const MentorshipRequest = require('../models/MentorshipRequest');
const MentorshipRelationship = require('../models/MentorshipRelationship');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Get or create mentor profile for current user
exports.getMyMentorProfile = async (req, res, next) => {
  try {
    let profile = await MentorProfile.findOne({ user: req.user._id })
      .populate('user', 'name email department year role profileImage bio skills interests');
    
    if (!profile) {
      profile = new MentorProfile({ user: req.user._id });
      await profile.save();
      await profile.populate('user', 'name email department year role profileImage bio skills interests');
    }
    
    res.json(profile);
  } catch (e) {
    next(e);
  }
};

// Create or update mentor profile
exports.updateMentorProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!['senior', 'alumni'].includes(user.role)) {
      return res.status(403).json({ message: 'Only seniors and alumni can become mentors' });
    }

    const allowed = ['skills', 'placementSkills', 'subjects', 'guidanceAreas', 'about', 'preferredTopics', 'isActive', 'mentorshipStatus'];
    const data = {};
    allowed.forEach(k => {
      if (req.body[k] !== undefined) data[k] = req.body[k];
    });

    let profile = await MentorProfile.findOneAndUpdate(
      { user: req.user._id },
      data,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    ).populate('user', 'name email department year role profileImage bio skills interests');

    res.json(profile);
  } catch (e) {
    next(e);
  }
};

// Find mentors by skill
exports.findMentorsBySkill = async (req, res, next) => {
  try {
    const { skill } = req.query;
    if (!skill) {
      return res.status(400).json({ message: 'Skill parameter is required' });
    }

    const profiles = await MentorProfile.find({
      isActive: true,
      mentorshipStatus: 'available',
      $or: [
        { skills: { $regex: skill, $options: 'i' } },
        { placementSkills: { $regex: skill, $options: 'i' } },
        { subjects: { $regex: skill, $options: 'i' } },
        { guidanceAreas: { $regex: skill, $options: 'i' } }
      ]
    }).populate('user', 'name department year role profileImage bio skills interests');

    res.json(profiles);
  } catch (e) {
    next(e);
  }
};

// Get all active mentors
exports.getAllMentors = async (req, res, next) => {
  try {
    const profiles = await MentorProfile.find({
      isActive: true
    }).populate('user', 'name department year role profileImage bio skills interests');

    res.json(profiles);
  } catch (e) {
    next(e);
  }
};

// Get mentor profile by ID
exports.getMentorProfile = async (req, res, next) => {
  try {
    const profile = await MentorProfile.findOne({ user: req.params.id })
      .populate('user', 'name department year role profileImage bio skills interests collegeId projects certifications placementExperience');
    
    if (!profile) {
      return res.status(404).json({ message: 'Mentor profile not found' });
    }

    res.json(profile);
  } catch (e) {
    next(e);
  }
};

// Send mentorship request (from student to mentor)
exports.sendMentorshipRequest = async (req, res, next) => {
  try {
    const { mentorId, requestedSkill, message } = req.body;

    if (!mentorId) {
      return res.status(400).json({ message: 'Mentor ID is required' });
    }

    // Check if user is junior
    if (req.user.role !== 'junior') {
      return res.status(403).json({ message: 'Only juniors can send mentorship requests' });
    }

    // Check for duplicate pending request
    const existingRequest = await MentorshipRequest.findOne({
      sender: req.user._id,
      mentor: mentorId,
      status: 'pending'
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'You already have a pending request to this mentor' });
    }

    // Check if already in active mentorship
    const existingRelationship = await MentorshipRelationship.findOne({
      mentor: mentorId,
      mentee: req.user._id,
      status: 'active'
    });

    if (existingRelationship) {
      return res.status(400).json({ message: 'You already have an active mentorship with this mentor' });
    }

    const request = await MentorshipRequest.create({
      sender: req.user._id,
      mentor: mentorId,
      requestedSkill,
      message,
      requestType: 'student_request'
    });

    // Notify mentor
    await Notification.create({
      user: mentorId,
      title: 'New Mentorship Request',
      message: `${req.user.name} wants you to mentor them in ${requestedSkill || 'general guidance'}`,
      type: 'mentorship'
    });

    res.status(201).json(request);
  } catch (e) {
    next(e);
  }
};

// Offer mentorship (from mentor to student)
exports.offerMentorship = async (req, res, next) => {
  try {
    const { studentId, skill, message } = req.body;

    if (!studentId) {
      return res.status(400).json({ message: 'Student ID is required' });
    }

    // Check if user is senior/alumni
    if (!['senior', 'alumni'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only seniors and alumni can offer mentorship' });
    }

    // Check for duplicate pending request
    const existingRequest = await MentorshipRequest.findOne({
      sender: req.user._id,
      mentor: studentId,
      status: 'pending',
      requestType: 'mentor_offer'
    });

    if (existingRequest) {
      return res.status(400).json({ message: 'You already have a pending offer to this student' });
    }

    const request = await MentorshipRequest.create({
      sender: req.user._id,
      mentor: studentId,
      requestedSkill: skill,
      message,
      requestType: 'mentor_offer'
    });

    // Notify student
    await Notification.create({
      user: studentId,
      title: 'Mentorship Offer',
      message: `${req.user.name} has offered to mentor you in ${skill || 'general guidance'}`,
      type: 'mentorship'
    });

    res.status(201).json(request);
  } catch (e) {
    next(e);
  }
};

// Get mentorship requests for current user
exports.getMyRequests = async (req, res, next) => {
  try {
    const requests = await MentorshipRequest.find({
      $or: [
        { sender: req.user._id },
        { mentor: req.user._id }
      ]
    })
    .populate('sender', 'name department year role profileImage')
    .populate('mentor', 'name department year role profileImage')
    .sort('-createdAt');

    res.json(requests);
  } catch (e) {
    next(e);
  }
};

// Respond to mentorship request
exports.respondToRequest = async (req, res, next) => {
  try {
    const { requestId, status } = req.body;

    if (!['accepted', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const request = await MentorshipRequest.findById(requestId)
      .populate('sender', 'name')
      .populate('mentor', 'name');

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    // Check if user is authorized to respond
    const isMentor = String(request.mentor._id) === String(req.user._id);
    const isStudent = String(request.sender._id) === String(req.user._id);

    if (request.requestType === 'student_request' && !isMentor) {
      return res.status(403).json({ message: 'Only mentor can respond to student requests' });
    }

    if (request.requestType === 'mentor_offer' && !isStudent) {
      return res.status(403).json({ message: 'Only student can respond to mentor offers' });
    }

    request.status = status;
    await request.save();

    if (status === 'accepted') {
      // Create mentorship relationship
      const mentorId = request.requestType === 'student_request' ? request.mentor._id : request.sender._id;
      const menteeId = request.requestType === 'student_request' ? request.sender._id : request.mentor._id;

      const relationship = await MentorshipRelationship.create({
        mentor: mentorId,
        mentee: menteeId,
        skill: request.requestedSkill
      });

      // Notify the other party
      const notifyUserId = isMentor ? request.sender._id : request.mentor._id;
      await Notification.create({
        user: notifyUserId,
        title: 'Mentorship Accepted',
        message: `Your mentorship request has been accepted`,
        type: 'mentorship'
      });

      res.json({ request, relationship });
    } else {
      // Notify rejection
      const notifyUserId = isMentor ? request.sender._id : request.mentor._id;
      await Notification.create({
        user: notifyUserId,
        title: 'Mentorship Request Declined',
        message: `Your mentorship request was declined`,
        type: 'mentorship'
      });

      res.json(request);
    }
  } catch (e) {
    next(e);
  }
};

// Get my mentors (for juniors)
exports.getMyMentors = async (req, res, next) => {
  try {
    const relationships = await MentorshipRelationship.find({
      mentee: req.user._id,
      status: 'active'
    })
    .populate('mentor', 'name department year role profileImage bio skills interests')
    .sort('-createdAt');

    res.json(relationships);
  } catch (e) {
    next(e);
  }
};

// Get my mentees (for mentors)
exports.getMyMentees = async (req, res, next) => {
  try {
    const relationships = await MentorshipRelationship.find({
      mentor: req.user._id,
      status: 'active'
    })
    .populate('mentee', 'name department year role profileImage bio skills interests')
    .sort('-createdAt');

    res.json(relationships);
  } catch (e) {
    next(e);
  }
};

// Find students looking for help with a skill (for mentors)
exports.findStudentsBySkill = async (req, res, next) => {
  try {
    const { skill } = req.query;
    if (!skill) {
      return res.status(400).json({ message: 'Skill parameter is required' });
    }

    // Find students who have this skill in their interests or skills
    const students = await User.find({
      role: 'junior',
      isActive: true,
      $or: [
        { skills: { $regex: skill, $options: 'i' } },
        { interests: { $regex: skill, $options: 'i' } }
      ]
    }).select('name department year role profileImage bio skills interests');

    res.json(students);
  } catch (e) {
    next(e);
  }
};

// Get all available mentors (for listing)
exports.getAllMentors = async (req, res, next) => {
  try {
    const profiles = await MentorProfile.find({
      isActive: true,
      mentorshipStatus: 'available'
    })
    .populate('user', 'name department year role profileImage bio skills interests')
    .sort('-createdAt');

    res.json(profiles);
  } catch (e) {
    next(e);
  }
};
