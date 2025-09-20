class ProjectProgressService {
  static calculateProgress(totalTasks, completedTasks) {
    if (totalTasks === 0) return 0;
    return Math.round((completedTasks / totalTasks) * 100);
  }

  static calculateTaskProgress(tasks) {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.completed).length;
    return this.calculateProgress(totalTasks, completedTasks);
  }

  static calculateSubtaskProgress(subtasks) {
    const totalSubtasks = subtasks.length;
    const completedSubtasks = subtasks.filter(subtask => subtask.completed).length;
    return this.calculateProgress(totalSubtasks, completedSubtasks);
  }

  static shouldAutoCompleteParentTask(subtasks) {
    if (subtasks.length === 0) return false;
    return subtasks.every(subtask => subtask.completed);
  }
}

module.exports = ProjectProgressService;
