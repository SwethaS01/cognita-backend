// Year handling: students pick year 1-4. Years 1-2 => junior, years 3-4 => senior.
// Alumni and admin roles are never changed automatically.
const parseYear = (v) => {
  const s = String(v ?? '').trim();
  if (/final/i.test(s)) return 4;
  const m = s.match(/^\D*([1-4])(?!\d)/);
  return m ? Number(m[1]) : null;
};
const roleForYear = (year, currentRole) => {
  if (currentRole === 'alumni' || currentRole === 'admin') return currentRole;
  const y = parseYear(year);
  if (y === null) return currentRole || 'junior';
  return y >= 3 ? 'senior' : 'junior';
};
module.exports = { parseYear, roleForYear };
