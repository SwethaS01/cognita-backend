const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');

// Creates the admin account ONLY if it does not exist yet. It never overwrites an existing
// admin password (the old version reset it on every start, which is unsafe on a public host).
module.exports = async function ensureAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@cognita.test').toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== 'admin') { existing.role = 'admin'; existing.isActive = true; await existing.save(); }
    return false;
  }
  const isProd = process.env.NODE_ENV === 'production';
  let password = process.env.ADMIN_PASSWORD;
  let generated = false;
  if (!password) {
    password = isProd ? crypto.randomBytes(9).toString('base64url') : 'Admin@12345';
    generated = isProd;
  }
  await User.create({
    name: 'Cognita Administrator', email, password: await bcrypt.hash(password, 10),
    role: 'admin', department: 'CSE', year: 'Administrator',
    college: 'SA Engineering College', isActive: true
  });
  console.log('Admin account created:', email);
  if (!process.env.ADMIN_PASSWORD) console.log(generated ? `Generated admin password (save it now): ${password}` : `Admin password: ${password}`);
  return true;
};
