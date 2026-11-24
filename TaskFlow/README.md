# TaskFlow

A real-time project and task manager. Users create projects, invite teammates, manage tasks on a Kanban board, discuss them in comments and get live notifications.

**Stack:** Node.js, Express, MongoDB (Mongoose), JWT auth, Socket.IO, and a plain HTML/CSS/JavaScript client served by the same Express server.

## Run it (VS Code)

You need [Node.js 18+](https://nodejs.org) and a MongoDB database (either [MongoDB Community](https://www.mongodb.com/try/download/community) running locally, or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster).

1. Open the `TaskFlow` folder in VS Code (File > Open Folder).
2. Open a terminal (Ctrl+`) and install dependencies:
   ```
   npm install
   ```
3. Check `.env`. It's preconfigured for a local MongoDB (`mongodb://127.0.0.1:27017/taskflow`). For Atlas, paste your connection string into `MONGO_URI`. Before deploying, replace `JWT_SECRET` with your own long random value. `.env.example` shows the expected variables.
4. Start the server:
   ```
   npm run dev      # auto-restart with nodemon
   npm start        # plain node
   ```
5. Open http://localhost:5000, register, and create a project. Register a second user (in a private window) and add them by email to see real-time updates, comments and notifications.

Press F5 in VS Code to run the server with the included debug configuration.

## Features

- Register / login with JWT, profile editing, password change
- Projects with an owner and members (owner adds/removes members by email)
- Kanban board (To Do / In Progress / Done) with drag & drop, priorities, due dates, assignees, search and filters
- Task comments
- Notifications for project invites, task assignments and comments
- Live updates over Socket.IO: tasks, comments, members and notifications sync instantly between users

## Project layout

```
client/   static front-end (HTML, css/, js/, assets/)
server/   Express API
  config/       db.js (MongoDB), socket.js (Socket.IO)
  models/       User, Project, Task, Comment, Notification
  controllers/  business logic
  routes/       URL routing
  middleware/   authMiddleware, errorMiddleware
  utils/        generateToken, access (project membership checks)
```

## API overview

All routes except register/login need `Authorization: Bearer <token>`.

| Method | Route | Description |
| --- | --- | --- |
| POST | `/api/auth/register`, `/api/auth/login` | Create account / sign in |
| GET, PUT | `/api/auth/me`, `/api/auth/profile` | Current user / update profile |
| GET, POST | `/api/projects` | List / create projects |
| GET, PUT, DELETE | `/api/projects/:id` | Project details / edit / delete (owner) |
| POST, DELETE | `/api/projects/:id/members[/:userId]` | Add / remove member (owner) |
| GET, POST | `/api/tasks/project/:projectId` | List / create tasks |
| PUT, DELETE | `/api/tasks/:id` | Update / delete task |
| GET, POST | `/api/comments/task/:taskId` | List / add comments |
| DELETE | `/api/comments/:id` | Delete comment |
| GET | `/api/notifications` | List notifications |
| PUT | `/api/notifications/read-all`, `/api/notifications/:id/read` | Mark as read |

## Notes

- If you open the HTML files with VS Code Live Server, the client automatically talks to the API at `http://localhost:5000`, but the simplest option is to use http://localhost:5000 directly.
- Socket.IO CORS is open for development. Restrict it in `server/config/socket.js` before deploying.
