# EBox Deployment Guide

## Quick Deploy to Vercel (Recommended)

### Prerequisites
1. **MySQL Database**: You need a MySQL database. Recommended options:
   - [PlanetScale](https://planetscale.com) (free tier, works great with Vercel)
   - [Aiven](https://aiven.io) (free tier available)
   - [Railway](https://railway.app) (free tier available)

### Step 1: Set up Database
1. Create a MySQL database on your chosen provider
2. Note down the connection details:
   - Host
   - Port (usually 3306)
   - Username
   - Password
   - Database name

### Step 2: Deploy to Vercel
1. **Fork/Clone this repository**
2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import your repository
   - Vercel will auto-detect this as a Node.js project

3. **Set Environment Variables** in Vercel dashboard:
   ```
   NODE_ENV=production
   SESSION_SECRET=your_strong_random_secret_here
   DB_HOST=your_mysql_host
   DB_PORT=3306
   DB_USER=your_mysql_username
   DB_PASSWORD=your_mysql_password
   DB_DATABASE=your_database_name
   DB_SSL=true
   DB_SSL_REJECT_UNAUTHORIZED=false
   ```

4. **Deploy**: Click "Deploy" - Vercel will handle the rest!

### Step 3: Test Your Deployment
- Visit your Vercel URL
- Create an account
- Add some tasks to test functionality

## Alternative Deployment Options

### Railway
1. Connect your GitHub repo to Railway
2. Set the same environment variables
3. Railway will auto-deploy

### Render
1. Create a new Web Service
2. Connect your repository
3. Set environment variables
4. Use build command: `npm install`
5. Use start command: `npm start`

### Fly.io
1. Install Fly CLI
2. Run `fly launch`
3. Set environment variables with `fly secrets set`
4. Deploy with `fly deploy`

## Environment Variables Reference

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `SESSION_SECRET` | Secret for session encryption | `your_random_string` |
| `DB_HOST` | MySQL host | `aws.connect.psdb.cloud` |
| `DB_PORT` | MySQL port | `3306` |
| `DB_USER` | MySQL username | `your_username` |
| `DB_PASSWORD` | MySQL password | `your_password` |
| `DB_DATABASE` | Database name | `your_database` |
| `DB_SSL` | Enable SSL | `true` |
| `DB_SSL_REJECT_UNAUTHORIZED` | SSL validation | `false` |

## Database Setup

The app will automatically create the required tables on first run:
- `users` table for authentication
- `tasks` table for task management

## Troubleshooting

### Common Issues

1. **404 errors on API routes**
   - Make sure you're deploying the full app, not just static files
   - Check that `vercel.json` is in your repository root

2. **Database connection errors**
   - Verify all database environment variables are set correctly
   - Check that your database allows connections from your deployment platform
   - Ensure SSL settings match your database provider

3. **Session issues**
   - Make sure `SESSION_SECRET` is set to a strong random string
   - In production, cookies require HTTPS (Vercel provides this automatically)

### Getting Help

If you encounter issues:
1. Check the deployment logs in your platform's dashboard
2. Verify all environment variables are set correctly
3. Test database connectivity separately

## Security Notes

- Always use strong, unique `SESSION_SECRET` values
- Use SSL/TLS for database connections in production
- Keep your database credentials secure
- Regularly update dependencies

## Local Development

To run locally:
1. Copy `env.example` to `.env`
2. Fill in your database credentials
3. Run `npm install`
4. Run `npm run dev`
5. Visit `http://localhost:3000`
