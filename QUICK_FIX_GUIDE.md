# 🚀 Quick Fix Guide - Split Deployment (Vercel + Railway)

## What I Fixed

✅ **403 Forbidden Errors** - Session cookies now work across domains  
✅ **Messages Page Errors** - Fixed API calls to include credentials  
✅ **100ms Voice Setup** - Documented exact environment variable names  
✅ **HMS Template ID** - Confirmed it's optional (uses default if not set)

---

## 🔥 WHAT YOU NEED TO DO RIGHT NOW

### Step 1: Add These Environment Variables to Railway

**CRITICAL - These 4 variables are REQUIRED:**

```bash
NODE_ENV=production
BACKEND_ONLY=true
CORS_ORIGIN=https://nexus-final-tau.vercel.app
FRONTEND_URL=https://nexus-final-tau.vercel.app
```

**Important:** Make sure you include `https://` in the URLs!

### Step 2: Add 100ms Keys to Railway (For Voice Channels)

```bash
HMS_APP_ACCESS_KEY=your-100ms-access-key
HMS_APP_SECRET=your-100ms-secret
```

**⚠️ EXACT NAMES:** Use `HMS_APP_ACCESS_KEY` and `HMS_APP_SECRET`  
**NOT** `HMS_APP_ID` or `HMS_API_KEY` - those won't work!

**Where to find these:**
1. Go to https://dashboard.100ms.live/
2. Select your app
3. Go to **Developer** section
4. Copy **App Access Key** → paste as `HMS_APP_ACCESS_KEY`
5. Copy **App Secret** → paste as `HMS_APP_SECRET`

**Template ID is optional** - You don't need to add `HMS_TEMPLATE_ID` unless you want to use a specific template.

### Step 3: Push Code & Redeploy Railway

```bash
git add .
git commit -m "Fix: Enable cross-origin cookies for split deployment"
git push origin main
```

Railway will auto-deploy. Wait for it to finish.

### Step 4: Clear Browser Cookies & Test

1. Open **DevTools** (F12)
2. Go to **Application** → **Cookies**
3. Delete all cookies for `nexus-final-tau.vercel.app`
4. Refresh the page
5. Try logging in

**You should see:**
- No more 403 errors
- Messages page loads without errors
- Voice channel creation works (if you added HMS keys)

---

## 📋 Complete Railway Environment Variables

Here's the complete list you should have:

### Required (App Won't Work Without These):
```bash
NODE_ENV=production
BACKEND_ONLY=true
CORS_ORIGIN=https://nexus-final-tau.vercel.app
FRONTEND_URL=https://nexus-final-tau.vercel.app
SESSION_SECRET=<generate a random 32+ character string>
DATABASE_URL=<auto-configured by Railway>
```

### For Google Login:
```bash
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### For Voice Channels (100ms):
```bash
HMS_APP_ACCESS_KEY=your-100ms-access-key
HMS_APP_SECRET=your-100ms-secret
```

### Optional:
```bash
HMS_TEMPLATE_ID=your-template-id-optional
R2_ACCOUNT_ID=your-cloudflare-r2-account-id
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=your-bucket-name
VAPID_PUBLIC_KEY=<check logs for generated value>
VAPID_PRIVATE_KEY=<check logs for generated value>
VAPID_SUBJECT=mailto:your-email@example.com
```

---

## 🐛 Troubleshooting

### Still Getting 403 Errors?
1. Check that `CORS_ORIGIN` exactly matches your Vercel URL (with `https://`)
2. Verify `BACKEND_ONLY=true` is set on Railway
3. Make sure Railway redeployed after you pushed the code
4. Clear browser cookies completely

### Voice Channels Not Working?
1. Check Railway logs for: `✅ 100ms voice service configured`
2. If you see `⚠️  100ms not configured`, check:
   - Variable names are EXACT: `HMS_APP_ACCESS_KEY` and `HMS_APP_SECRET`
   - Values are correct from 100ms dashboard
   - Railway redeployed after adding variables

### Messages Page Blank or Errors?
1. Clear browser cookies
2. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. Check browser console for errors

---

## 📖 More Details

For complete documentation, see:
- **RAILWAY_ENV.md** - All environment variables explained
- **DEPLOYMENT.md** - Full deployment guide with all services

---

## ✅ Success Checklist

- [ ] Added `NODE_ENV`, `BACKEND_ONLY`, `CORS_ORIGIN`, `FRONTEND_URL` to Railway
- [ ] Added `HMS_APP_ACCESS_KEY` and `HMS_APP_SECRET` to Railway
- [ ] Pushed code to GitHub
- [ ] Railway redeployed successfully
- [ ] Cleared browser cookies
- [ ] Can log in without 403 errors
- [ ] Messages page loads correctly
- [ ] Voice channels can be created

Once all checked, your split deployment should work perfectly! 🎉
