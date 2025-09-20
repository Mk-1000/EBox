class TaskHierarchyService {
  static organizeTasksWithSubtasks(tasks) {
    const parentTasks = tasks.filter(task => !task.parentTaskId);
    const subtasks = tasks.filter(task => task.parentTaskId);

    // Group subtasks by parent task ID
    const subtasksByParent = {};
    subtasks.forEach(subtask => {
      if (!subtasksByParent[subtask.parentTaskId]) {
        subtasksByParent[subtask.parentTaskId] = [];
      }
      subtasksByParent[subtask.parentTaskId].push(subtask);
    });

    // Add subtasks to their parent tasks
    return parentTasks.map(parentTask => ({
      ...parentTask,
      subtasks: subtasksByParent[parentTask.id] || []
    }));
  }

  static validateTaskHierarchy(parentTask, subtask) {
    if (!parentTask || !subtask) return false;
    return parentTask.projectId === subtask.projectId && parentTask.userId === subtask.userId;
  }

  static canCreateSubtask(parentTask, subtaskData) {
    if (!parentTask) return false;
    if (parentTask.parentTaskId) return false; // Can't create subtask of a subtask
    return parentTask.projectId === subtaskData.projectId && parentTask.userId === subtaskData.userId;
  }
}

module.exports = TaskHierarchyService;
