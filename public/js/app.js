const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

// Theme & i18n
const STORAGE_KEYS = { theme: 'ebox:theme', lang: 'ebox:lang' };
const THEMES = { dark: 'dark', light: 'light' };
const RTL_LANGS = new Set(['ar']);

const TRANSLATIONS = {
  en: { 
    app_name:'EBox', 
    logout:'Logout', 
    sign_in:'Sign in', 
    username_placeholder:'Username', 
    password_placeholder:'Password', 
    login:'Login', 
    create_account:'Create account', 
    new_task_placeholder:'New task title', 
    add:'Add', 
    delete_confirm:'Delete task?',
    new_project:'New Project',
    my_projects:'My Projects',
    back_to_projects:'← Back to Projects',
    edit_project:'Edit Project',
    delete_project:'Delete Project',
    total_tasks:'Total Tasks',
    completed:'Completed',
    progress:'Progress',
    high_priority:'High Priority',
    medium_priority:'Medium Priority',
    low_priority:'Low Priority',
    to_do:'To Do',
    in_progress:'In Progress',
    done:'Done',
    all_status:'All Status',
    all_priority:'All Priority',
    sort_by_priority:'Sort by Priority',
    sort_by_status:'Sort by Status',
    sort_by_due_date:'Sort by Due Date',
    sort_by_created:'Sort by Created',
    create_new_project:'Create New Project',
    project_title:'Project title',
    project_description:'Project description (optional)',
    cancel:'Cancel',
    create_project:'Create Project',
    edit_task:'Edit Task',
    task_title:'Task title',
    task_description:'Task description (optional)',
    save_task:'Save Task',
    add_subtask:'Add Subtask',
    due_date:'Due Date',
    priority:'Priority',
    status:'Status'
  },
  ar: { 
    app_name:'صندوق أيزنهاور', 
    logout:'تسجيل الخروج', 
    sign_in:'تسجيل الدخول', 
    username_placeholder:'اسم المستخدم', 
    password_placeholder:'كلمة المرور', 
    login:'دخول', 
    create_account:'إنشاء حساب', 
    new_task_placeholder:'عنوان مهمة جديدة', 
    add:'إضافة', 
    delete_confirm:'حذف المهمة؟',
    new_project:'مشروع جديد',
    my_projects:'مشاريعي',
    back_to_projects:'← العودة للمشاريع',
    edit_project:'تعديل المشروع',
    delete_project:'حذف المشروع',
    total_tasks:'إجمالي المهام',
    completed:'مكتمل',
    progress:'التقدم',
    high_priority:'أولوية عالية',
    medium_priority:'أولوية متوسطة',
    low_priority:'أولوية منخفضة',
    to_do:'مطلوب',
    in_progress:'قيد التنفيذ',
    done:'مكتمل',
    all_status:'جميع الحالات',
    all_priority:'جميع الأولويات',
    sort_by_priority:'ترتيب حسب الأولوية',
    sort_by_status:'ترتيب حسب الحالة',
    sort_by_due_date:'ترتيب حسب تاريخ الاستحقاق',
    sort_by_created:'ترتيب حسب تاريخ الإنشاء',
    create_new_project:'إنشاء مشروع جديد',
    project_title:'عنوان المشروع',
    project_description:'وصف المشروع (اختياري)',
    cancel:'إلغاء',
    create_project:'إنشاء المشروع',
    edit_task:'تعديل المهمة',
    task_title:'عنوان المهمة',
    task_description:'وصف المهمة (اختياري)',
    save_task:'حفظ المهمة',
    add_subtask:'إضافة مهمة فرعية',
    due_date:'تاريخ الاستحقاق',
    priority:'الأولوية',
    status:'الحالة'
  }
};

function setTheme(theme){
  const next = theme === THEMES.light ? THEMES.light : THEMES.dark;
  document.body.setAttribute('data-theme', next);
  const btn = $('#themeToggle');
  if (btn) btn.textContent = next === THEMES.light ? '🌞' : '🌙';
  localStorage.setItem(STORAGE_KEYS.theme, next);
}

function applyLang(lang){
  const locale = TRANSLATIONS[lang] ? lang : 'en';
  document.documentElement.lang = locale;
  document.body.dir = RTL_LANGS.has(locale) ? 'rtl' : 'ltr';
  const dict = TRANSLATIONS[locale];
  // text nodes
  $$('[data-i18n]').forEach(n=>{ const k=n.getAttribute('data-i18n'); if (dict[k]) n.textContent = dict[k]; });
  // placeholders
  $$('[data-i18n-placeholder]').forEach(n=>{ const k=n.getAttribute('data-i18n-placeholder'); if (dict[k]) n.setAttribute('placeholder', dict[k]); });
  const sel = $('#languageSelect'); if (sel) sel.value = locale;
  localStorage.setItem(STORAGE_KEYS.lang, locale);
}

const API_BASE = window.API_BASE || (window.location.origin.includes('localhost') ? '' : (window.API_BASE_URL || ''));

async function api(path, opts={}){
  const url = API_BASE ? (API_BASE + path) : path;
  const res = await fetch(url, { credentials: 'include', headers: { 'Content-Type':'application/json' }, ...opts });
  const raw = await res.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch {}
  if (!res.ok) {
    const message = (data && (data.error || data.message)) || (raw && raw.slice(0,200)) || `HTTP ${res.status}`;
    throw new Error(message);
  }
  return data ?? {};
}

// Global state
let currentProject = null;
let projects = [];
let tasks = [];

// Utility functions
function el(tag, attrs={}, children=[]) {
  const e = document.createElement(tag);
  Object.entries(attrs).forEach(([k,v])=>{
    if (k === 'class') {
      e.className = v;
    } else if (k.startsWith('on')) {
      e.addEventListener(k.slice(2), v);
    } else if (k === 'text') {
      e.textContent = v;
    } else if (k === 'value' && 'value' in e) {
      e.value = v;
    } else if (k === 'checked' && 'checked' in e) {
      e.checked = !!v;
    } else if (k === 'dataset') {
      // Handle dataset properties correctly
      Object.entries(v).forEach(([dataKey, dataValue]) => {
        e.dataset[dataKey] = dataValue;
      });
    } else {
      e.setAttribute(k,v);
    }
  });
  children.forEach(c=> e.append(c));
  return e;
}

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = date - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return { text: 'Overdue', class: 'overdue' };
  if (diffDays === 0) return { text: 'Today', class: 'due-soon' };
  if (diffDays === 1) return { text: 'Tomorrow', class: 'due-soon' };
  if (diffDays <= 7) return { text: `In ${diffDays} days`, class: 'due-soon' };
  
  return { text: date.toLocaleDateString(), class: '' };
}

// Project Management Functions
async function loadProjects() {
  try {
    const response = await api('/api/projects');
    projects = response.projects || [];
    renderProjects();
  } catch (err) {
    console.error('Failed to load projects:', err);
    alert('Failed to load projects: ' + err.message);
  }
}

function renderProjects() {
  // Clear all quadrants
  const quadrants = [
    'urgent-important-projects',
    'not-urgent-important-projects', 
    'urgent-not-important-projects',
    'not-urgent-not-important-projects'
  ];
  
  quadrants.forEach(quadrantId => {
    const container = $(`#${quadrantId}`);
    if (container) {
      container.innerHTML = '';
    }
  });
  
  if (projects.length === 0) {
    return;
  }
  
  // Render projects in their respective quadrants
  projects.forEach(project => {
    const quadrant = project.quadrant || 'not-urgent-not-important'; // Default to eliminate
    const container = $(`#${quadrant}-projects`);
    if (!container) return;
    
    // Truncate description if too long (shorter for better layout)
    const maxDescriptionLength = 60;
    const description = project.description || 'No description';
    const truncatedDescription = description.length > maxDescriptionLength 
      ? description.substring(0, maxDescriptionLength) + '...' 
      : description;
    
    // Ensure progress is a valid number and debug
    const progress = Math.max(0, Math.min(100, project.progress || 0));
    console.log(`Project ${project.title}: progress=${progress}%, total_tasks=${project.total_tasks}, completed_tasks=${project.completed_tasks}`);
    
    const card = el('div', { 
      class: 'project-card', 
      draggable: true,
      dataset: { id: project.id },
      onclick: () => openProject(project.id)
    }, [
      el('h4', { text: project.title }),
      el('p', { text: truncatedDescription }),
      el('div', { class: 'project-progress' }, [
        el('div', { class: 'progress-bar' }, [
          el('div', { class: 'progress-fill', style: `width: ${progress}%` }),
          el('span', { class: 'progress-text', text: `${progress}%` })
        ])
      ])
    ]);
    
    // Add drag and drop handlers
    card.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', project.id);
      card.classList.add('dragging');
    });
    
    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
    });
    
    container.appendChild(card);
  });
}

async function openProject(projectId) {
  try {
    const { project } = await api(`/api/projects/${projectId}`);
    currentProject = project;
    tasks = project.tasks || [];
    
    // Show project page, hide dashboard
    $('#projectsDashboard').hidden = true;
    $('#projectPage').hidden = false;
    
    // Update project info
    $('#projectTitle').textContent = project.title;
    $('#projectTitle').dataset.projectId = project.id;
    
    // Update stats
    updateProjectStats();
    
    // Render tasks
    renderTasks();
  } catch (err) {
    console.error('Failed to load project:', err);
    alert('Failed to load project: ' + err.message);
  }
}

function updateProjectStats() {
  if (!currentProject) return;
  
  // Only count parent tasks for progress calculation (exclude subtasks)
  const parentTasks = tasks.filter(task => !task.parent_task_id);
  const totalTasks = parentTasks.length;
  const completedTasks = parentTasks.filter(t => t.status === 'Done').length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  $('#totalTasks').textContent = totalTasks;
  $('#completedTasks').textContent = completedTasks;
  $('#progressFill').style.width = `${progress}%`;
  $('#progressText').textContent = `${progress}%`;
}

function renderTasks() {
  if (!currentProject) return;
  
  // Clear all task lists
  ['todo', 'progress', 'done'].forEach(status => {
    const list = $(`#list-${status === 'todo' ? 'todo' : status === 'progress' ? 'progress' : 'done'}`);
    if (list) list.innerHTML = '';
  });
  
  // Filter tasks based on current filters
  const statusFilter = $('#statusFilter')?.value || '';
  const priorityFilter = $('#priorityFilter')?.value || '';
  
  // Only show parent tasks in the Kanban board
  let filteredTasks = tasks.filter(task => {
    if (statusFilter && task.status !== statusFilter) return false;
    if (priorityFilter && task.priority !== priorityFilter) return false;
    return true;
  });
  
  // Sort tasks
  const sortBy = $('#sortBy')?.value || 'priority';
  filteredTasks.sort((a, b) => {
    switch (sortBy) {
      case 'priority':
        const priorityOrder = { 'High': 1, 'Medium': 2, 'Low': 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      case 'status':
        const statusOrder = { 'To Do': 1, 'In Progress': 2, 'Done': 3 };
        return statusOrder[a.status] - statusOrder[b.status];
      case 'due_date':
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date) - new Date(b.due_date);
      default:
        return new Date(b.created_at) - new Date(a.created_at);
    }
  });
  
  // Render tasks in appropriate columns
  filteredTasks.forEach(task => {
    const listId = task.status === 'To Do' ? 'list-todo' : 
                   task.status === 'In Progress' ? 'list-progress' : 'list-done';
    const list = $(`#${listId}`);
    if (list) {
      list.appendChild(createTaskElement(task));
    }
  });
}

function createTaskElement(task) {
  const dueDate = formatDate(task.due_date);
  
  const taskEl = el('div', { class: 'task', draggable: true, dataset: { id: task.id } }, [
    el('div', { class: 'task-header' }, [
      el('div', { class: 'task-title', text: task.title }),
      el('span', { class: `task-priority priority-${task.priority.toLowerCase()}`, text: task.priority })
    ]),
    el('div', { class: 'task-meta' }, [
      task.due_date ? el('div', { class: `task-due-date ${dueDate.class}`, text: dueDate.text }) : null,
      el('span', { text: `Created ${new Date(task.created_at).toLocaleDateString()}` })
    ].filter(Boolean)),
    task.description ? el('div', { class: 'task-description', text: task.description }) : null,
    // Display subtasks as nested items
    task.subtasks && task.subtasks.length > 0 ? el('div', { class: 'task-subtasks' }, 
      task.subtasks.map(subtask => 
        el('div', { class: `subtask ${subtask.completed ? 'completed' : ''}` }, [
          el('input', { type: 'checkbox', checked: subtask.completed, onchange: () => toggleSubtask(subtask.id) }),
          el('span', { text: subtask.title }),
          el('div', { class: 'subtask-actions' }, [
            el('button', { class: 'btn small', text: 'Edit', onclick: () => editTask(subtask) }),
            el('button', { class: 'btn small danger', text: 'Delete', onclick: () => deleteTask(subtask.id) })
          ])
        ])
      )
    ) : null,
    el('div', { class: 'task-actions' }, [
      el('button', { class: 'btn', text: 'Edit', onclick: () => editTask(task) }),
      el('button', { class: 'btn', text: 'Add Subtask', onclick: () => addSubtask(task.id) }),
      el('button', { class: 'btn danger', text: 'Delete', onclick: () => deleteTask(task.id) })
    ])
  ].filter(Boolean));
  
  // Add drag and drop handlers
  taskEl.addEventListener('dragstart', () => taskEl.classList.add('dragging'));
  taskEl.addEventListener('dragend', () => taskEl.classList.remove('dragging'));
  
  return taskEl;
}

// Task Management Functions
async function createTask(projectId, taskData) {
  try {
    const { task } = await api('/api/tasks', {
      method: 'POST',
      body: JSON.stringify({
        projectId,
        ...taskData
      })
    });
    
    // If this is a subtask, add it to the parent task's subtasks array
    if (taskData.parentTaskId) {
      const parentTask = tasks.find(t => t.id === taskData.parentTaskId);
      if (parentTask) {
        if (!parentTask.subtasks) {
          parentTask.subtasks = [];
        }
        parentTask.subtasks.push(task);
      }
    } else {
      // If it's a parent task, add it to the main tasks array
      tasks.push(task);
    }
    
    updateProjectStats();
    renderTasks();
  } catch (err) {
    console.error('Failed to create task:', err);
    alert('Failed to create task: ' + err.message);
  }
}

async function updateTask(taskId, taskData) {
  try {
    const { task } = await api(`/api/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(taskData)
    });
    
    const index = tasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
      tasks[index] = task;
    }
    
    updateProjectStats();
    renderTasks();
  } catch (err) {
    console.error('Failed to update task:', err);
    alert('Failed to update task: ' + err.message);
  }
}

async function deleteTask(taskId) {
  if (!confirm('Are you sure you want to delete this task?')) return;
  
  try {
    await api(`/api/tasks/${taskId}`, { method: 'DELETE' });
    tasks = tasks.filter(t => t.id !== taskId);
    updateProjectStats();
    renderTasks();
  } catch (err) {
    console.error('Failed to delete task:', err);
    alert('Failed to delete task: ' + err.message);
  }
}

async function toggleTaskStatus(taskId, status) {
  try {
    const { task } = await api(`/api/tasks/${taskId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status })
    });
    
    const index = tasks.findIndex(t => t.id === taskId);
    if (index !== -1) {
      tasks[index] = task;
      
      // If the parent task is marked as "Done", mark all subtasks as completed
      if (status === 'Done' && tasks[index].subtasks && tasks[index].subtasks.length > 0) {
        // Mark all subtasks as completed
        for (let subtask of tasks[index].subtasks) {
          if (!subtask.completed) {
            try {
              await api(`/api/tasks/${subtask.id}/toggle`, {
                method: 'POST',
                body: JSON.stringify({ completed: true })
              });
              subtask.completed = true;
            } catch (err) {
              console.error('Failed to mark subtask as completed:', err);
            }
          }
        }
      }
    }
    
    updateProjectStats();
    renderTasks();
  } catch (err) {
    console.error('Failed to update task status:', err);
    alert('Failed to update task status: ' + err.message);
  }
}

function editTask(task) {
  // Populate modal with task data
  $('#taskTitle').value = task.title;
  $('#taskDescription').value = task.description || '';
  $('#taskPriority').value = task.priority;
  $('#taskStatus').value = task.status;
  $('#taskDueDate').value = task.due_date ? task.due_date.split('T')[0] : '';
  
  // Store current task ID for update
  $('#taskModal').dataset.taskId = task.id;
  
  // Show modal
  $('#taskModal').hidden = false;
  $('#taskModal').style.display = 'flex';
}

function addSubtask(parentTaskId) {
  const title = prompt('Enter subtask title:');
  if (!title) return;
  
  createTask(currentProject.id, {
    title,
    parentTaskId,
    priority: 'Low',
    status: 'To Do'
  });
}

async function toggleSubtask(subtaskId) {
  try {
    // Find the subtask in the tasks array
    let subtask = null;
    let parentTask = null;
    
    for (let task of tasks) {
      if (task.subtasks) {
        const foundSubtask = task.subtasks.find(st => st.id === subtaskId);
        if (foundSubtask) {
          subtask = foundSubtask;
          parentTask = task;
          break;
        }
      }
    }
    
    if (!subtask) {
      console.error('Subtask not found');
      return;
    }
    
    const { task: updatedSubtask } = await api(`/api/tasks/${subtaskId}/toggle`, {
      method: 'POST',
      body: JSON.stringify({ completed: !subtask.completed })
    });
    
    // Update the subtask
    Object.assign(subtask, updatedSubtask);
    
    // Check if all subtasks are completed and update parent task if needed
    const allSubtasksCompleted = parentTask.subtasks.every(st => st.completed);
    if (allSubtasksCompleted && parentTask.subtasks.length > 0) {
      // Update parent task status to Done
      await toggleTaskStatus(parentTask.id, 'Done');
    }
    
    updateProjectStats();
    renderTasks();
  } catch (err) {
    console.error('Failed to toggle subtask:', err);
    alert('Failed to toggle subtask: ' + err.message);
  }
}

// Project Management Functions
async function createProject(projectData) {
  try {
    const { project } = await api('/api/projects', {
      method: 'POST',
      body: JSON.stringify(projectData)
    });
    
    projects.push(project);
    renderProjects();
  } catch (err) {
    console.error('Failed to create project:', err);
    alert('Failed to create project: ' + err.message);
  }
}

async function updateProject(projectId, projectData) {
  try {
    const { project } = await api(`/api/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(projectData)
    });
    
    const index = projects.findIndex(p => p.id === projectId);
    if (index !== -1) {
      projects[index] = project;
    }
    
    if (currentProject && currentProject.id === projectId) {
      currentProject = project;
      $('#projectTitle').textContent = project.title;
    }
    
    renderProjects();
  } catch (err) {
    console.error('Failed to update project:', err);
    alert('Failed to update project: ' + err.message);
  }
}

async function deleteProject(projectId) {
  if (!confirm('Are you sure you want to delete this project? This will delete all tasks in the project.')) return;
  
  try {
    await api(`/api/projects/${projectId}`, { method: 'DELETE' });
    projects = projects.filter(p => p.id !== projectId);
    
    if (currentProject && currentProject.id === projectId) {
      // Go back to projects dashboard
      $('#projectsDashboard').hidden = false;
      $('#projectPage').hidden = true;
      currentProject = null;
      tasks = [];
    }
    
    renderProjects();
  } catch (err) {
    console.error('Failed to delete project:', err);
    alert('Failed to delete project: ' + err.message);
  }
}

async function updateProjectQuadrant(projectId, quadrant) {
  try {
    const { project } = await api(`/api/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify({ quadrant })
    });
    
    const index = projects.findIndex(p => p.id === projectId);
    if (index !== -1) {
      projects[index] = project;
    }
    
    renderProjects();
  } catch (err) {
    console.error('Failed to update project quadrant:', err);
    alert('Failed to update project quadrant: ' + err.message);
  }
}

// Event Handlers
function setupEventHandlers() {
  // Project creation
  $('#newProjectBtn')?.addEventListener('click', () => {
    $('#projectModal').hidden = false;
    
    // Reset modal title and button text for new project
    const modalTitle = $('#projectModal').querySelector('h3');
    if (modalTitle) modalTitle.textContent = 'Create New Project';
    
    const submitBtn = $('#projectForm').querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Create Project';
    
    // Clear any existing project ID
    delete $('#projectForm').dataset.projectId;
  });
  
  $('#projectForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = $('#projectFormTitle').value.trim();
    const description = $('#projectFormDescription').value.trim();
    const projectId = $('#projectForm').dataset.projectId;
    
    if (!title) return;
    
    if (projectId) {
      // Editing existing project
      await updateProject(projectId, { title, description });
    } else {
      // Creating new project
      await createProject({ title, description });
    }
    
    $('#projectModal').hidden = true;
    $('#projectForm').reset();
    delete $('#projectForm').dataset.projectId;
    
    // Reset modal title and button text
    const modalTitle = $('#projectModal').querySelector('h3');
    if (modalTitle) modalTitle.textContent = 'Create New Project';
    
    const submitBtn = $('#projectForm').querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Create Project';
  });
  
  // Task creation
  $('#newTaskForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentProject) return;
    
    const title = $('#newTaskTitle').value.trim();
    const priority = $('#newTaskPriority').value;
    const dueDate = $('#newTaskDueDate').value;
    
    if (!title) return;
    
    await createTask(currentProject.id, {
      title,
      priority,
      dueDate: dueDate || null,
      status: 'To Do'
    });
    
    $('#newTaskForm').reset();
  });
  
  // Task editing
  $('#taskForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const taskId = $('#taskModal').dataset.taskId;
    
    if (!taskId) {
      alert('No task selected for editing');
      return;
    }
    
    const title = $('#taskTitle').value.trim();
    const description = $('#taskDescription').value.trim();
    const priority = $('#taskPriority').value;
    const status = $('#taskStatus').value;
    const dueDate = $('#taskDueDate').value;
    
    if (!title) return;
    
    try {
      await updateTask(taskId, {
        title,
        description,
        priority,
        status,
        dueDate: dueDate || null
      });
      
      $('#taskModal').hidden = true;
      $('#taskModal').style.display = 'none';
      $('#taskForm').reset();
      delete $('#taskModal').dataset.taskId;
    } catch (err) {
      console.error('Failed to update task:', err);
      alert('Failed to update task: ' + err.message);
    }
  });
  
  // Navigation
  $('#backToProjects')?.addEventListener('click', () => {
    $('#projectsDashboard').hidden = false;
    $('#projectPage').hidden = true;
    currentProject = null;
    tasks = [];
  });
  
  // Filters
  $('#statusFilter')?.addEventListener('change', renderTasks);
  $('#priorityFilter')?.addEventListener('change', renderTasks);
  $('#sortBy')?.addEventListener('change', renderTasks);
  
  // Modals
  $('#closeProjectModal')?.addEventListener('click', () => {
    $('#projectModal').hidden = true;
    $('#projectForm').reset();
    delete $('#projectForm').dataset.projectId;
    
    // Reset modal title and button text
    const modalTitle = $('#projectModal').querySelector('h3');
    if (modalTitle) modalTitle.textContent = 'Create New Project';
    
    const submitBtn = $('#projectForm').querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Create Project';
  });
  
  $('#closeTaskModal')?.addEventListener('click', () => {
    $('#taskModal').hidden = true;
    $('#taskModal').style.display = 'none';
    $('#taskForm').reset();
    delete $('#taskModal').dataset.taskId;
  });
  
  $('#cancelProject')?.addEventListener('click', () => {
    $('#projectModal').hidden = true;
    $('#projectForm').reset();
    delete $('#projectForm').dataset.projectId;
    
    // Reset modal title and button text
    const modalTitle = $('#projectModal').querySelector('h3');
    if (modalTitle) modalTitle.textContent = 'Create New Project';
    
    const submitBtn = $('#projectForm').querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Create Project';
  });
  
  $('#cancelTask')?.addEventListener('click', () => {
    $('#taskModal').hidden = true;
    $('#taskModal').style.display = 'none';
    $('#taskForm').reset();
    delete $('#taskModal').dataset.taskId;
  });
  
  // Project actions
  $('#editProjectBtn')?.addEventListener('click', () => {
    if (!currentProject) return;
    $('#projectFormTitle').value = currentProject.title;
    $('#projectFormDescription').value = currentProject.description || '';
    $('#projectModal').hidden = false;
    $('#projectForm').dataset.projectId = currentProject.id;
    
    // Update modal title
    const modalTitle = $('#projectModal').querySelector('h3');
    if (modalTitle) modalTitle.textContent = 'Edit Project';
    
    // Update submit button text
    const submitBtn = $('#projectForm').querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.textContent = 'Update Project';
  });
  
  $('#deleteProjectBtn')?.addEventListener('click', () => {
    if (!currentProject) return;
    deleteProject(currentProject.id);
  });
  
  // Drag and drop for Kanban
  setupKanbanDragDrop();
  
  // Drag and drop for Eisenhower Box
  setupEisenhowerDragDrop();
}

function setupKanbanDragDrop() {
  const columns = $$('.kanban-column');
  
  columns.forEach(column => {
    column.addEventListener('dragover', (e) => {
      e.preventDefault();
      column.classList.add('dragover');
    });
    
    column.addEventListener('dragleave', () => {
      column.classList.remove('dragover');
    });
    
    column.addEventListener('drop', async (e) => {
      e.preventDefault();
      column.classList.remove('dragover');
      
      const draggedTask = document.querySelector('.task.dragging');
      if (!draggedTask) {
        console.error('No dragged task found');
        return;
      }
      
      const taskId = draggedTask.dataset.id;
      const newStatus = column.dataset.status;
      
      console.log('Dragging task:', taskId, 'to status:', newStatus);
      
      if (!taskId) {
        console.error('Task ID is undefined');
        return;
      }
      
      // Update task status
      await toggleTaskStatus(taskId, newStatus);
    });
  });
}

function setupEisenhowerDragDrop() {
  const quadrants = $$('.eisenhower-quadrant');
  
  quadrants.forEach(quadrant => {
    quadrant.addEventListener('dragover', (e) => {
      e.preventDefault();
      quadrant.classList.add('dragover');
    });
    
    quadrant.addEventListener('dragleave', () => {
      quadrant.classList.remove('dragover');
    });
    
    quadrant.addEventListener('drop', async (e) => {
      e.preventDefault();
      quadrant.classList.remove('dragover');
      
      const projectId = e.dataTransfer.getData('text/plain');
      const newQuadrant = quadrant.dataset.quadrant;
      
      if (!projectId || !newQuadrant) return;
      
      // Update project quadrant
      await updateProjectQuadrant(projectId, newQuadrant);
    });
  });
}

// Authentication
async function checkSession(){
  try{
    const { user } = await api('/api/auth/me');
    const shortName = (user.username || '').slice(0, 10);
    $('#usernameDisplay').textContent = shortName;
    $('#authSection').hidden = true;
    $('#appSection').hidden = false;
    $('#logoutBtn').hidden = false;
    await loadProjects();
  }catch{
    $('#authSection').hidden = false;
    $('#appSection').hidden = true;
    $('#logoutBtn').hidden = true;
  }
}

function setupAuth(){
  $('#authForm').addEventListener('submit', async (e)=>{
    e.preventDefault();
    $('#authError').textContent = '';
    const username = $('#username').value.trim();
    const password = $('#password').value;
    try{ await api('/api/auth/login', { method:'POST', body: JSON.stringify({ username, password })}); await checkSession(); }catch(err){ $('#authError').textContent = err.message; }
  });
  $('#signupBtn').addEventListener('click', async ()=>{
    $('#authError').textContent = '';
    const username = $('#username').value.trim();
    const password = $('#password').value;
    try{ await api('/api/auth/signup', { method:'POST', body: JSON.stringify({ username, password })}); await checkSession(); }catch(err){ $('#authError').textContent = err.message; }
  });
  $('#logoutBtn').addEventListener('click', async ()=>{
    await api('/api/auth/logout', { method:'POST' });
    $('#usernameDisplay').textContent = '';
    $('#authSection').hidden = false;
    $('#appSection').hidden = true;
    $('#logoutBtn').hidden = true;
  });
}

function setupThemeAndLang(){
  const storedTheme = localStorage.getItem(STORAGE_KEYS.theme) || THEMES.dark;
  setTheme(storedTheme);
  const themeBtn = $('#themeToggle');
  if (themeBtn) themeBtn.addEventListener('click', ()=>{
    const next = (localStorage.getItem(STORAGE_KEYS.theme) || THEMES.dark) === THEMES.dark ? THEMES.light : THEMES.dark;
    setTheme(next);
  });
  const storedLang = localStorage.getItem(STORAGE_KEYS.lang) || 'en';
  applyLang(storedLang);
  const langSel = $('#languageSelect');
  if (langSel) langSel.addEventListener('change', (e)=>{
    applyLang(e.target.value);
  });
}

window.addEventListener('DOMContentLoaded', async ()=>{
  setupAuth();
  setupEventHandlers();
  setupThemeAndLang();
  
  // Menu toggle
  const menuBtn = document.querySelector('#menuToggle');
  const menu = document.querySelector('#menuDropdown');
  if (menuBtn && menu){
    const closeMenu = ()=>{ menu.classList.remove('open'); menuBtn.setAttribute('aria-expanded','false'); menu.setAttribute('aria-hidden','true'); };
    const openMenu = ()=>{ menu.classList.add('open'); menuBtn.setAttribute('aria-expanded','true'); menu.setAttribute('aria-hidden','false'); };
    menuBtn.addEventListener('click', (e)=>{
      e.stopPropagation();
      if (menu.classList.contains('open')) closeMenu(); else openMenu();
    });
    document.addEventListener('click', (e)=>{
      if (!menu.classList.contains('open')) return;
      if (menu.contains(e.target) || menuBtn.contains(e.target)) return;
      closeMenu();
    });
    document.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') closeMenu(); });
  }
  
  await checkSession();
});
