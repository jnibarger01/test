import jwt from 'jsonwebtoken';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    req.user = user;
    next();
  });
}

export function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role
      });
    }

    next();
  };
}

// Advisors can only access their own data
export function authorizeAdvisorData(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Admins and managers can access all data
  if (req.user.role === 'admin' || req.user.role === 'manager') {
    return next();
  }

  // Advisors can only access their own data
  if (req.user.role === 'advisor') {
    const requestedAdvisorId = req.params.id || req.params.advisorId || req.query.advisorId;
    
    if (requestedAdvisorId && requestedAdvisorId !== req.user.advisorId) {
      return res.status(403).json({ error: 'Cannot access other advisor data' });
    }
  }

  next();
}

export default {
  authenticateToken,
  authorizeRoles,
  authorizeAdvisorData
};
