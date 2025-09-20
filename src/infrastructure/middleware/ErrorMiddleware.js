function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (err.name === 'ForbiddenError') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (err.name === 'NotFoundError') {
    return res.status(404).json({ error: err.message });
  }

  if (err.name === 'ConflictError') {
    return res.status(409).json({ error: err.message });
  }

  // Handle custom application errors
  if (err.message === 'User already exists') {
    return res.status(409).json({ error: err.message });
  }

  if (err.message === 'Invalid credentials') {
    return res.status(401).json({ error: err.message });
  }

  if (err.message === 'Project not found' || err.message === 'Task not found' || err.message === 'User not found') {
    return res.status(404).json({ error: err.message });
  }

  if (err.message === 'Not authenticated') {
    return res.status(401).json({ error: err.message });
  }

  // Default to 500 server error
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Route not found' });
}

module.exports = {
  errorHandler,
  notFoundHandler
};
