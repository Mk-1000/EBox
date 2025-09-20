class Project {
  constructor(id, userId, title, description, quadrant, createdAt, updatedAt) {
    this._id = id;
    this._userId = userId;
    this._title = title;
    this._description = description;
    this._quadrant = quadrant;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
  }

  get id() {
    return this._id;
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

  get quadrant() {
    return this._quadrant;
  }

  get createdAt() {
    return this._createdAt;
  }

  get updatedAt() {
    return this._updatedAt;
  }

  // Business logic methods
  static create(userId, title, description = '', quadrant = 'not-urgent-not-important') {
    if (!title || title.trim().length === 0) {
      throw new Error('Project title is required');
    }

    const validQuadrants = ['urgent-important', 'not-urgent-important', 'urgent-not-important', 'not-urgent-not-important'];
    if (!validQuadrants.includes(quadrant)) {
      throw new Error('Invalid quadrant value');
    }

    const id = require('uuid').v4();
    const now = new Date();
    return new Project(id, userId, title.trim(), description.trim(), quadrant, now, now);
  }

  updateTitle(title) {
    if (!title || title.trim().length === 0) {
      throw new Error('Project title is required');
    }
    this._title = title.trim();
    this._updatedAt = new Date();
  }

  updateDescription(description) {
    this._description = description.trim();
    this._updatedAt = new Date();
  }

  updateQuadrant(quadrant) {
    const validQuadrants = ['urgent-important', 'not-urgent-important', 'urgent-not-important', 'not-urgent-not-important'];
    if (!validQuadrants.includes(quadrant)) {
      throw new Error('Invalid quadrant value');
    }
    this._quadrant = quadrant;
    this._updatedAt = new Date();
  }

  update(title, description, quadrant) {
    if (title !== undefined) this.updateTitle(title);
    if (description !== undefined) this.updateDescription(description);
    if (quadrant !== undefined) this.updateQuadrant(quadrant);
  }

  belongsTo(userId) {
    return this._userId === userId;
  }

  toJSON() {
    return {
      id: this._id,
      userId: this._userId,
      title: this._title,
      description: this._description,
      quadrant: this._quadrant,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt
    };
  }
}

module.exports = Project;
