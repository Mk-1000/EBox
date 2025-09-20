function validateSignup(req, res, next) {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  if (username.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters long' });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }
  
  next();
}

function validateLogin(req, res, next) {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  next();
}

function validateProject(req, res, next) {
  const { title, description, quadrant } = req.body;
  
  if (req.method === 'POST' && !title) {
    return res.status(400).json({ error: 'Title is required' });
  }
  
  if (title !== undefined && (!title || title.trim().length === 0)) {
    return res.status(400).json({ error: 'Title cannot be empty' });
  }
  
  const validQuadrants = ['urgent-important', 'not-urgent-important', 'urgent-not-important', 'not-urgent-not-important'];
  if (quadrant !== undefined && !validQuadrants.includes(quadrant)) {
    return res.status(400).json({ error: 'Invalid quadrant value' });
  }
  
  next();
}

function validateTask(req, res, next) {
  const { title, description, priority, status, dueDate, projectId, parentTaskId } = req.body;
  
  if (req.method === 'POST') {
    if (!projectId || !title) {
      return res.status(400).json({ error: 'Project ID and title are required' });
    }
  }
  
  if (title !== undefined && (!title || title.trim().length === 0)) {
    return res.status(400).json({ error: 'Title cannot be empty' });
  }
  
  const validPriorities = ['High', 'Medium', 'Low'];
  if (priority !== undefined && !validPriorities.includes(priority)) {
    return res.status(400).json({ error: 'Invalid priority value' });
  }
  
  const validStatuses = ['To Do', 'In Progress', 'Done'];
  if (status !== undefined && !validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }
  
  next();
}

function validateTaskToggle(req, res, next) {
  const { completed } = req.body;
  
  if (typeof completed !== 'boolean') {
    return res.status(400).json({ error: 'Completed must be a boolean value' });
  }
  
  next();
}

function validateTaskStatus(req, res, next) {
  const { status } = req.body;
  
  const validStatuses = ['To Do', 'In Progress', 'Done'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid status value' });
  }
  
  next();
}

module.exports = {
  validateSignup,
  validateLogin,
  validateProject,
  validateTask,
  validateTaskToggle,
  validateTaskStatus
};
