const r = require('express').Router();
const c = require('../controllers/mentorController');
const { protect } = require('../middleware/auth');

r.use(protect);

// Mentor profile management
r.get('/profile', c.getMyMentorProfile);
r.put('/profile', c.updateMentorProfile);
r.get('/profile/:id', c.getMentorProfile);

// Find mentors/students by skill
r.get('/search', c.findMentorsBySkill);
r.get('/students', c.findStudentsBySkill);
r.get('/all', c.getAllMentors);

// Mentorship requests
r.post('/request', c.sendMentorshipRequest);
r.post('/offer', c.offerMentorship);
r.get('/requests', c.getMyRequests);
r.patch('/requests/respond', c.respondToRequest);

// Mentorship relationships
r.get('/my-mentors', c.getMyMentors);
r.get('/my-mentees', c.getMyMentees);

module.exports = r;
