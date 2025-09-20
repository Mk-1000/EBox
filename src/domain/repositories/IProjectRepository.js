class IProjectRepository {
  async findById(id) {
    throw new Error('Method must be implemented');
  }

  async findByUserId(userId) {
    throw new Error('Method must be implemented');
  }

  async findByUserIdAndId(userId, id) {
    throw new Error('Method must be implemented');
  }

  async save(project) {
    throw new Error('Method must be implemented');
  }

  async delete(id) {
    throw new Error('Method must be implemented');
  }

  async findWithTaskCounts(userId) {
    throw new Error('Method must be implemented');
  }

  async findWithTasks(userId, projectId) {
    throw new Error('Method must be implemented');
  }
}

module.exports = IProjectRepository;
