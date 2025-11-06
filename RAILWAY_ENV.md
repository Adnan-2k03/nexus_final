# Railway Environment Variables - EXACT NAMES REQUIRED

Copy and paste these EXACT variable names into your Railway environment variables.
**DO NOT** rename or modify these names - they must match exactly.

## 🚨 CRITICAL - Cross-Origin Authentication (Required)

```bash
# These 4 variables are MANDATORY for Vercel + Railway split deployment
NODE_ENV=production
BACKEND_ONLY=true
CORS_ORIGIN=https://nexus-final-tau.vercel.app
FRONTEND_URL=https://nexus-final-tau.vercel.app
```

**⚠️ IMPORTANT**: After adding these, you MUST redeploy Railway for the cookie fix to work!

---

## 🔐 Session & Authentication (Required)

```bash
# Session secret - generate a random string (minimum 32 characters)
SESSION_SECRET=YOUR_RANDOM_SECRET_HERE_MINIMUM_32_CHARS

# Google OAuth credentials (if using Google login)
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

**How to generate SESSION_SECRET:**
```bash
# Run this command and copy the output:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 💾 Database (Auto-configured by Railway)

```bash
# Railway auto-generates this when you add PostgreSQL database
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

**Note**: This is automatically set by Railway. Don't modify it.

---

## 🎙️ 100ms Voice Channels (Required for Voice Features)

```bash
# Get these from https://dashboard.100ms.live/
HMS_APP_ACCESS_KEY=your-100ms-access-key
HMS_APP_SECRET=your-100ms-secret

# Optional - if not provided, uses a default template
HMS_TEMPLATE_ID=your-template-id-optional
```

**⚠️ EXACT NAMES**: Use `HMS_APP_ACCESS_KEY` and `HMS_APP_SECRET` (NOT `HMS_APP_ID` or similar)

**Where to find these:**
1. Go to https://dashboard.100ms.live/
2. Select your app
3. Go to **Developer** section
4. Copy **App Access Key** → Use for `HMS_APP_ACCESS_KEY`
5. Copy **App Secret** → Use for `HMS_APP_SECRET`
6. (Optional) Create a template and note Template ID

**Template ID is optional** - If you don't provide it, the system uses a default template.

---

## 📦 Cloudflare R2 File Storage (Optional)

```bash
# Only needed if you want file upload features (profile images, clips, etc.)
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=your-r2-access-key
R2_SECRET_ACCESS_KEY=your-r2-secret-key
R2_BUCKET_NAME=your-bucket-name
R2_PUBLIC_URL=https://pub-your-hash.r2.dev
```

**If not configured**: File uploads will be disabled, but the app will still work.

---

## 🔔 Web Push Notifications (Optional)

```bash
# These are auto-generated on first run if not provided
# Check your Railway logs for the generated values, then add them here
VAPID_PUBLIC_KEY=your-generated-public-key
VAPID_PRIVATE_KEY=your-generated-private-key
VAPID_SUBJECT=mailto:your-email@example.com
```

**If not configured**: Temporary keys are generated on each restart (notifications won't persist).

---

## 🤖 OpenAI Integration (Optional)

```bash
# Only needed if you want AI features
OPENAI_API_KEY=sk-your-openai-api-key
```

---

## 📋 Complete Checklist

### Minimum Required Variables (App will work):
- [x] `NODE_ENV=production`
- [x] `BACKEND_ONLY=true`
- [x] `CORS_ORIGIN=https://nexus-final-tau.vercel.app`
- [x] `FRONTEND_URL=https://nexus-final-tau.vercel.app`
- [x] `SESSION_SECRET=<32+ character random string>`
- [x] `DATABASE_URL=<auto-configured by Railway>`

### Recommended Variables (Full functionality):
- [ ] `GOOGLE_CLIENT_ID=<from Google Cloud Console>`
- [ ] `GOOGLE_CLIENT_SECRET=<from Google Cloud Console>`
- [ ] `HMS_APP_ACCESS_KEY=<from 100ms dashboard>`
- [ ] `HMS_APP_SECRET=<from 100ms dashboard>`

### Optional Variables:
- [ ] `HMS_TEMPLATE_ID=<optional, uses default if not set>`
- [ ] `R2_ACCOUNT_ID` + other R2 variables
- [ ] `VAPID_*` variables for persistent notifications
- [ ] `OPENAI_API_KEY` for AI features

---

## 🚀 After Adding Variables

1. **Commit and push** your code changes:
   ```bash
   git add .
   git commit -m "Fix: Enable cross-origin cookies for split deployment"
   git push origin main
   ```

2. **Railway will auto-deploy** (or manually trigger redeploy)

3. **Clear browser cookies** on Vercel site

4. **Test authentication**:
   - Open https://nexus-final-tau.vercel.app
   - Try to log in
   - Should work without 403 errors

---

## ❌ Common Mistakes

| ❌ Wrong | ✅ Correct |
|---------|----------|
| `HMS_APP_ID` | `HMS_APP_ACCESS_KEY` |
| `HMS_API_KEY` | `HMS_APP_SECRET` |
| `CORS_ORIGIN=nexus-final-tau.vercel.app` | `CORS_ORIGIN=https://nexus-final-tau.vercel.app` (include https://) |
| `BACKEND_ONLY=false` | `BACKEND_ONLY=true` |
| `SESSION_SECRET=secret123` | `SESSION_SECRET=<long random string>` |

---

## 🐛 Debugging

### 403 Forbidden Errors
- Missing `CORS_ORIGIN` or `FRONTEND_URL`
- Backend not redeployed after code fix
- Browser cookies not cleared

### Voice Channels Not Working
- Check Railway logs for "100ms voice service configured"
- If you see "100ms not configured", check:
  - Variable names are EXACT: `HMS_APP_ACCESS_KEY` and `HMS_APP_SECRET`
  - Values are correct from 100ms dashboard
  - Railway redeployed after adding variables

### Session/Login Issues
- `SESSION_SECRET` too short (minimum 32 chars)
- `NODE_ENV` not set to `production`
- CORS settings incorrect

---

## 📞 Need Help?

Check Railway deployment logs:
1. Go to Railway dashboard
2. Click on your service
3. Go to **Deployments** tab
4. Click on latest deployment
5. View logs for error messages

Look for these success messages:
- `✅ 100ms voice service configured` (voice working)
- `serving on port XXXX` (server started)
- No `⚠️` warnings about missing config
