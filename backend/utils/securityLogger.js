const fs = require('fs');
const path = require('path');

const LOG_FILE = path.join(__dirname, '..', '..', 'logs', 'security.log');

function getIP(req) {
  return req.headers['x-real-ip'] || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'unknown';
}

function write(event, fields) {
  const entry = JSON.stringify({ ts: new Date().toISOString(), event, ...fields }) + '\n';
  try {
    fs.appendFileSync(LOG_FILE, entry);
  } catch (e) {
    console.error('[SECURITY-LOG] Error al escribir log:', e.message);
  }
}

module.exports = {
  getIP,
  loginOk:       (req, username, role) => write('LOGIN_OK',       { ip: getIP(req), username, role }),
  loginFail:     (req, username, reason) => write('LOGIN_FAIL',   { ip: getIP(req), username, reason }),
  logout:        (req, username) => write('LOGOUT',               { ip: getIP(req), username }),
  accessDenied:  (req, username, endpoint) => write('ACCESS_DENIED', { ip: getIP(req), username, endpoint }),
  adminAction:   (req, action, target) => write('ADMIN_ACTION',   { ip: getIP(req), user: req.user?.username, action, target }),
  backupCreated: (req, filename) => write('BACKUP_CREATED',       { user: req.user?.username, filename }),
  backupRestored:(req, filename) => write('BACKUP_RESTORED',      { user: req.user?.username, filename }),
  studentWrite:  (req, action, studentId) => write('STUDENT_WRITE', { user: req.user?.username, ip: getIP(req), action, studentId }),
  userWrite:     (req, action, targetId) => write('USER_WRITE',   { user: req.user?.username, ip: getIP(req), action, targetId }),
};
