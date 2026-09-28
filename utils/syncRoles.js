// On every start, make sure each student's role matches their year (1-2 junior, 3-4 senior).
const User = require('../models/User');
const { parseYear, roleForYear } = require('./year');
module.exports = async function syncRoles() {
  const students = await User.find({ role: { $in: ['junior', 'senior'] } });
  let changed = 0;
  for (const u of students) {
    const y = parseYear(u.year);
    if (y === null) continue;
    const role = roleForYear(y, u.role);
    const year = String(y);
    if (role !== u.role || year !== u.year) { u.role = role; u.year = year; await u.save(); changed++; }
  }
  if (changed) console.log(`Synced role/year for ${changed} student(s)`);
};
