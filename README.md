# EBox

A minimal task manager based on the Eisenhower Matrix. Username/password auth, SQLite storage, and drag-and-drop between quadrants. DarkTeal theme.

## Run

- Node 18+
- Install deps: `npm install`
- Dev server: `npm run dev`
- Open: `http://localhost:3000`

## Features

- Signup/Login/Logout (session cookie)
- CRUD tasks with quadrants: Do First, Schedule, Delegate, Eliminate
- Drag-and-drop between quadrants
- Completion checkbox and simple stats
- Responsive layout

## Notes

- Data stored in `data.sqlite` in project root
- Change session secret via `SESSION_SECRET`

