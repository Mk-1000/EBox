function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  next();
}

function optionalAuth(req, res, next) {
  // This middleware doesn't require authentication but adds user info if available
  next();
}

module.exports = {
  requireAuth,
  optionalAuth
};
