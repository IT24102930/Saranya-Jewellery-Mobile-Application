import StaffAuditLog from '../models/StaffAuditLog.js';

const SENSITIVE_KEYS = new Set(['password', 'token', 'otp', 'secret', 'authorization', 'cookie']);

function sanitizeValue(value) {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(sanitizeValue).slice(0, 50);

  if (typeof value === 'object') {
    const output = {};
    for (const [key, child] of Object.entries(value)) {
      const lowerKey = String(key).toLowerCase();
      output[key] = SENSITIVE_KEYS.has(lowerKey) ? '[REDACTED]' : sanitizeValue(child);
    }
    return output;
  }

  if (typeof value === 'string' && value.length > 300) {
    return `${value.slice(0, 300)}...[TRUNCATED]`;
  }

  return value;
}

function isAuditEligiblePath(path) {
  if (!path.startsWith('/api/')) return false;
  if (path.startsWith('/api/admin/audit-logs')) return false;
  return true;
}

export default function staffAuditLogger(req, res, next) {
  const startedAt = new Date();

  res.on('finish', () => {
    if (!req.session?.staffId) return;
    if (!isAuditEligiblePath(req.path)) return;

    const logEntry = {
      staffId: req.session.staffId,
      staffName: req.session.fullName || 'Unknown',
      staffRole: req.session.role || 'Unknown',
      method: req.method,
      path: req.originalUrl || req.path,
      statusCode: res.statusCode,
      ipAddress: req.ip || req.socket?.remoteAddress || '',
      userAgent: String(req.headers['user-agent'] || '').slice(0, 400),
      query: sanitizeValue(req.query || {}),
      body: sanitizeValue(req.body || {}),
      createdAt: startedAt
    };

    StaffAuditLog.create(logEntry).catch((error) => {
      console.error('Failed to write staff audit log:', error.message);
    });
  });

  next();
}
