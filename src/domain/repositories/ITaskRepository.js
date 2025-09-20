class ITaskRepository {
  async findById(id) {
    throw new Error('Method must be implemented');
  }

  async findByProjectId(projectId) {
    throw new Error('Method must be implemented');
  }

  async findByUserId(userId) {
    throw new Error('Method must be implemented');
  }

  async findByUserIdAndId(userId, id) {
    throw new Error('Method must be implemented');
  }

  async findByParentTaskId(parentTaskId) {
    throw new Error('Method must be implemented');
  }

  async save(task) {
    throw new Error('Method must be implemented');
  }

  async delete(id) {
    throw new Error('Method must be implemented');
  }

  async findWithFilters(projectId, filters = {}) {
    throw new Error('Method must be implemented');
  }

  async findSubtasksByParentId(parentTaskId) {
    throw new Error('Method must be implemented');
  }

  async findTaskWithSubtasks(projectId) {
    throw new Error('Method must be implemented');
  }
}

module.exports = ITaskRepository;
