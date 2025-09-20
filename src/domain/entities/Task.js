class Task {
  constructor(id, projectId, userId, title, description, priority, status, dueDate, parentTaskId, completed, createdAt, updatedAt) {
    this._id = id;
    this._projectId = projectId;
    this._userId = userId;
    this._title = title;
    this._description = description;
    this._priority = priority;
    this._status = status;
    this._dueDate = dueDate;
    this._parentTaskId = parentTaskId;
    this._completed = completed;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  get id() {
    return this._id;
  }

  get projectId() {
    return this._projectId;
  }

  get userId() {
    return this._userId;
  }

  get title() {
    return this._title;
  }

  get description() {
    return this._description;
  }

  get priority() {
    return this._priority;
  }

  get status() {
    return this._status;
  }

  get dueDate() {
    return this._dueDate;
  }

  get parentTaskId() {
    return this._parentTaskId;
  }

  get completed() {
    return this._completed;
  }

  get createdAt() {
    return this._createdAt;
  }

  get updatedAt() {
    return this._updatedAt;
  }

  get isSubtask() {
    return this._parentTaskId !== null;
  }

  get isParentTask() {
    return this._parentTaskId === null;
  }

  // Business logic methods
  static create(projectId, userId, title, description = '', priority = 'Medium', status = 'To Do', dueDate = null, parentTaskId = null) {
    if (!title || title.trim().length === 0) {
      throw new Error('Task title is required');
    }

    const validPriorities = ['High', 'Medium', 'Low'];
    if (!validPriorities.includes(priority)) {
      throw new Error('Invalid priority value');
    }

    const validStatuses = ['To Do', 'In Progress', 'Done'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status value');
    }

    const id = require('uuid').v4();
    const now = new Date();
    return new Task(id, projectId, userId, title.trim(), description.trim(), priority, status, dueDate, parentTaskId, false, now, now);
  }

  updateTitle(title) {
    if (!title || title.trim().length === 0) {
      throw new Error('Task title is required');
    }
    this._title = title.trim();
    this._updatedAt = new Date();
  }

  updateDescription(description) {
    this._description = description.trim();
    this._updatedAt = new Date();
  }

  updatePriority(priority) {
    const validPriorities = ['High', 'Medium', 'Low'];
    if (!validPriorities.includes(priority)) {
      throw new Error('Invalid priority value');
    }
    this._priority = priority;
    this._updatedAt = new Date();
  }

  updateStatus(status) {
    const validStatuses = ['To Do', 'In Progress', 'Done'];
    if (!validStatuses.includes(status)) {
      throw new Error('Invalid status value');
    }
    this._status = status;
    this._updatedAt = new Date();
  }

  updateDueDate(dueDate) {
    console.log('Task.updateDueDate called with:', dueDate, 'Type:', typeof dueDate);
    this._dueDate = dueDate;
    this._updatedAt = new Date();
    console.log('Task._dueDate set to:', this._dueDate);
  }

  toggleCompletion() {
    this._completed = !this._completed;
    if (this._completed) {
      this._status = 'Done';
    }
    this._updatedAt = new Date();
  }

  setCompleted(completed) {
    this._completed = completed;
    if (completed) {
      this._status = 'Done';
    }
    this._updatedAt = new Date();
  }

  update(title, description, priority, status, dueDate) {
    if (title !== undefined) this.updateTitle(title);
    if (description !== undefined) this.updateDescription(description);
    if (priority !== undefined) this.updatePriority(priority);
    if (status !== undefined) this.updateStatus(status);
    if (dueDate !== undefined) this.updateDueDate(dueDate);
  }

  belongsTo(userId) {
    return this._userId === userId;
  }

  belongsToProject(projectId) {
    return this._projectId === projectId;
  }

  toJSON() {
    return {
      id: this._id,
      projectId: this._projectId,
      userId: this._userId,
      title: this._title,
      description: this._description,
      priority: this._priority,
      status: this._status,
      dueDate: this._dueDate,
      parentTaskId: this._parentTaskId,
      completed: this._completed,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt
    };
  }
}

module.exports = Task;
