# 🚀 Deploy GameMatch to Railway

This guide will help you deploy your GameMatch application to Railway in about 10-15 minutes.

## 📋 Prerequisites

- GitHub account
- Railway account (sign up at [railway.app](https://railway.app))
- Credit card (for Railway - won't charge unless you exceed $5 free credit/month)

---

## 🔧 Step 1: Push Code to GitHub

1. **Create a new repository on GitHub**
   - Go to [github.com/new](https://github.com/new)
   - Name it `gamematch` (or your preferred name)
   - Don't initialize with README (we already have code)
   - Click "Create repository"

2. **Push your code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit - GameMatch app ready for Railway"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/gamematch.git
   git push -u origin main
   ```
   
   Replace `YOUR_USERNAME` with your GitHub username.

---

## 🚂 Step 2: Create Railway Project

1. **Go to Railway**
   - Visit [railway.app](https://railway.app)
   - Click "Login" and sign in with GitHub

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your `gamematch` repository
   - Railway will automatically detect it's a Node.js app

---

## 💾 Step 3: Add PostgreSQL Database

1. **Add Database Service**
   - In your Railway project, click "New Service"
   - Select "Database"
   - Choose "PostgreSQL"
   - Railway will create and provision the database

2. **Database will auto-connect**
   - Railway automatically creates `DATABASE_URL` environment variable
   - Your app will use this to connect to the database

---

## 🔐 Step 4: Configure Environment Variables

1. **Open Variables Tab**
   - Click on your web service (not the database)
   - Go to "Variables" tab

2. **Add required variables** (if any beyond DATABASE_URL):
   ```
   NODE_ENV=production
   ```

   The `DATABASE_URL` is automatically added by Railway when you create the PostgreSQL service.

---

## 🗃️ Step 5: Database Migrations (Automatic!)

**Good news!** The database migration is already configured to run automatically during deployment.

1. **Automatic Schema Push**
   - Railway's build command includes: `npm run build && npx drizzle-kit push`
   - On first deploy, your database schema will be automatically created
   - On subsequent deploys, schema changes will be applied automatically

2. **Verify Migration** (Optional)
   - After first deployment, check Railway logs
   - You should see "Schema successfully pushed" message
   - Database tables will be created automatically

3. **Manual Migration (if needed)**
   ```bash
   # Install Railway CLI
   npm i -g @railway/cli
   
   # Login and link to project
   railway login
   railway link
   
   # Run migration manually
   railway run npx drizzle-kit push
   ```

---

## ✅ Step 6: Deploy!

1. **Trigger Deployment**
   - Railway automatically deploys when you push to GitHub
   - Or click "Deploy" in Railway dashboard
   - Wait 2-5 minutes for build and deployment

2. **Get your URL**
   - Once deployed, click "Settings" in your web service
   - Find "Domains" section
   - Click "Generate Domain"
   - You'll get a URL like: `gamematch-production.up.railway.app`

3. **Visit your app!**
   - Click the generated URL
   - Your GameMatch app is now live! 🎮

---

## 🔄 Automatic Deployments

Every time you push to GitHub, Railway will:
1. Automatically detect changes
2. Build your application
3. Deploy the new version
4. Zero downtime deployment

---

## 💰 Cost Monitoring

1. **Check usage**
   - Go to "Usage" tab in Railway
   - See compute hours and costs
   - $5 free credit per month should cover initial traffic

2. **Set up alerts** (optional)
   - Go to Account Settings
   - Set up usage alerts
   - Get notified before charges occur

---

## 🎯 Custom Domain (Optional)

1. **Add your domain**
   - In Railway service settings → "Domains"
   - Click "Custom Domain"
   - Enter your domain (e.g., `gamematch.com`)
   - Update DNS records as instructed
   - SSL certificate auto-provisioned!

---

## 🐛 Troubleshooting

### Build fails
- Check Railway logs in "Deployments" tab
- Ensure all dependencies are in `package.json`
- Verify build command works locally: `npm run build`

### Database connection errors
- Ensure PostgreSQL service is running
- Check `DATABASE_URL` is set in variables
- Verify schema is pushed: `npx drizzle-kit push`

### App won't start
- Check start command: `npm run start`
- Look at runtime logs in Railway
- Ensure PORT is set correctly (Railway provides it automatically)

### WebSocket issues (if using real-time features)
- Railway supports WebSockets by default
- Ensure your WebSocket connection uses the Railway domain
- Check CORS settings if needed

---

## 📊 What You Get

✅ Live URL for your app  
✅ PostgreSQL database  
✅ Automatic deployments from GitHub  
✅ SSL certificate (HTTPS)  
✅ ~$5/month free tier (covers small-medium traffic)  
✅ Easy scaling when you grow  

---

## 🚀 Next Steps

1. Test your live app thoroughly
2. Share the URL with friends/testers
3. Monitor usage in Railway dashboard
4. Add custom domain when ready
5. Scale up resources as traffic grows

---

## 📞 Support

- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **Railway Discord**: [discord.gg/railway](https://discord.gg/railway)
- **Your App Issues**: Check Railway logs first

---

## ⚡ Quick Commands Reference

```bash
# Push new code
git add .
git commit -m "Update feature"
git push

# View logs
railway logs

# Open app in browser
railway open

# Run commands in Railway environment
railway run <command>

# Connect to production database (careful!)
railway connect postgres
```

---

**You're all set! 🎉** Your GameMatch app is now deployed and ready for gamers worldwide!
