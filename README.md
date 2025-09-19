# EBox - Project Management App

A comprehensive project management application with task tracking, subtasks, and analytics. Features a modern dark theme with Kanban-style task boards.

## Run

- Node 18+
- Install deps: `npm install`
- Dev server: `npm run dev`
- Open: `http://localhost:3000`

## Features

### Projects Dashboard
- **Project Overview**: View all projects with progress bars and completion percentages
- **Project Creation**: Create new projects with titles and descriptions
- **Project Management**: Edit and delete projects
- **Progress Tracking**: Visual progress bars showing task completion

### Project Pages
- **Kanban Board**: Drag-and-drop tasks between To Do, In Progress, and Done columns
- **Task Management**: Create, edit, and delete tasks with priorities and due dates
- **Subtask Support**: Add nested subtasks under main tasks
- **Filtering & Sorting**: Filter by status/priority and sort by various criteria
- **Analytics**: Real-time stats showing total tasks, completed tasks, and progress percentage

### Task Features
- **Priority Levels**: High, Medium, Low priority with color coding
- **Status Tracking**: To Do, In Progress, Done with visual indicators
- **Due Dates**: Optional due dates with overdue warnings
- **Subtasks**: Nested task lists with individual completion tracking
- **Drag & Drop**: Move tasks between status columns
- **Rich Editing**: Full task editing with descriptions and metadata

### User Experience
- **Dark Theme**: Modern dark theme with light mode support
- **Responsive Design**: Works on desktop and mobile devices
- **Smooth Navigation**: Seamless navigation between projects and tasks
- **Real-time Updates**: Live progress tracking and statistics
- **Intuitive UI**: Clean, modern interface with smooth animations

## Technical Features

- **Authentication**: Secure username/password authentication with sessions
- **Database**: MySQL backend with proper relationships and indexing
- **API**: RESTful API for all operations
- **Security**: Helmet.js security headers and CORS protection
- **Scalable**: Designed to handle many projects and tasks efficiently

## Database Schema

- **Projects**: User projects with titles, descriptions, and timestamps
- **Tasks**: Project tasks with priorities, status, due dates, and subtask support
- **Users**: Secure user authentication with bcrypt password hashing

## Notes

- Configure database connection via environment variables
- Change session secret via `SESSION_SECRET`
- Supports both development and production environments

