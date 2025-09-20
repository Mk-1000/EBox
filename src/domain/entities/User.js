class User {
  constructor(id, username, passwordHash, createdAt) {
    this._id = id;
    this._username = username;
    this._passwordHash = passwordHash;
    this._createdAt = createdAt;
  }

  get id() {
    return this._id;
  }

  get username() {
    return this._username;
  }

  get passwordHash() {
    return this._passwordHash;
  }

  get createdAt() {
    return this._createdAt;
  }

  // Business logic methods
  static create(username, passwordHash) {
    const id = require('uuid').v4();
    const createdAt = new Date();
    return new User(id, username, passwordHash, createdAt);
  }

  toJSON() {
    return {
      id: this._id,
      username: this._username,
      createdAt: this._createdAt
    };
  }
}

module.exports = User;
