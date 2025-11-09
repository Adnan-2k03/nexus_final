# Setup Guides for Optional Services

This document provides setup instructions for optional third-party services used in GameMatch.

---

## Google OAuth Setup

### Overview
Enable users to sign in with their Google accounts.

### Setup Steps

1. **Go to Google Cloud Console**
   - Visit https://console.cloud.google.com/
   - Create a new project or select existing

2. **Enable Google+ API**
   - Navigate to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click "Enable"

3. **Create OAuth Credentials**
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Web application"
   - Add Authorized redirect URIs:
     ```
     http://localhost:5000/api/auth/google/callback
     https://your-app.replit.app/api/auth/google/callback
     https://your-app.railway.app/api/auth/google/callback
     ```

4. **Save Credentials**
   - Copy the **Client ID**
   - Copy the **Client Secret**

5. **Add to Environment Variables**
   ```bash
   GOOGLE_CLIENT_ID=your-client-id-here
   GOOGLE_CLIENT_SECRET=your-client-secret-here
   ```

### Cost
**FREE** - No charges for OAuth usage

---

## 100ms WebRTC (Voice Channels)

### Overview
Enable real-time voice channels for gaming groups.

### Setup Steps

1. **Create 100ms Account**
   - Go to https://www.100ms.live/
   - Sign up for free account
   - Create a new app

2. **Get Credentials**
   - Go to Developer Section
   - Copy **App Access Key**
   - Copy **App Secret**

3. **Create Room Template**
   - Go to Templates → Create Template
   - Choose "Audio Room" or "Video Conferencing"
   - Configure roles (host, guest, speaker)
   - Copy the **Template ID**

4. **Add to Environment Variables**
   ```bash
   HMS_APP_ACCESS_KEY=your-access-key
   HMS_APP_SECRET=your-app-secret
   HMS_TEMPLATE_ID=your-template-id
   ```

### Cost
- **FREE**: 10,000 minutes/month
- **After free tier**: $0.0099/minute (~$99 per 10,000 minutes)

---

## AWS SNS (Phone Authentication)

### Overview
Enable SMS-based phone number verification for user registration.

### Setup Steps

1. **Create AWS Account**
   - Go to https://aws.amazon.com/
   - Sign up (credit card required but won't be charged for free tier)

2. **Enable SNS Service**
   - Search for "SNS" in AWS Console
   - Click "Simple Notification Service"
   - Go to "Text messaging (SMS)"

3. **SMS Sandbox Mode (For Testing)**
   - Click "Sandbox destination phone numbers"
   - Add your phone number for testing
   - You can only send SMS to verified numbers in sandbox mode

4. **Request Production Access (For Real Users)**
   - Go to "Account settings" → "Request production access"
   - Fill out the form
   - Approval usually takes 24 hours
   - Once approved, you can send SMS to any number

5. **Get Access Keys**
   - Click your name (top right) → "Security credentials"
   - Scroll to "Access keys" → "Create access key"
   - Choose "Application running on AWS compute service"
   - Save the **Access Key ID** and **Secret Access Key** (shown only once!)

6. **Add to Environment Variables**
   ```bash
   AWS_ACCESS_KEY_ID=your-access-key-id
   AWS_SECRET_ACCESS_KEY=your-secret-access-key
   AWS_REGION=us-east-1
   ```

### Cost
- **FREE**: 100 SMS/month (first year with AWS Free Tier)
- **After free tier**: $0.00645 per SMS (US)
- **Example costs**:
  - 1,000 users/month: $6.45
  - 10,000 users/month: $64.50

### Security Features Built-in
- Rate limiting (3 attempts per hour per phone)
- Code expiration (10 minutes)
- Hashed codes in database
- Phone number validation

---

## Firebase (Phone Authentication Alternative)

### Overview
Alternative to AWS SNS for phone verification using Firebase.

### Setup Steps

1. **Create Firebase Project**
   - Go to https://console.firebase.google.com/
   - Click "Add project"
   - Follow the setup wizard

2. **Enable Phone Authentication**
   - Go to Authentication → Sign-in method
   - Enable "Phone" provider

3. **Get Service Account Credentials**
   - Go to Project Settings → Service accounts
   - Click "Generate new private key"
   - Download the JSON file

4. **Add to Environment Variables**
   ```bash
   FIREBASE_PROJECT_ID=your-project-id
   FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
   ```

### Cost
- **FREE**: First 10K verifications/month
- **After free tier**: $0.01 per verification (more expensive than AWS SNS)

---

## Cloudflare R2 (File Storage)

### Overview
Store user-uploaded files (profile photos, game clips) on Cloudflare R2 (S3-compatible).

### Setup Steps

1. **Create Cloudflare Account**
   - Go to https://dash.cloudflare.com/
   - Sign up for account

2. **Create R2 Bucket**
   - Navigate to R2
   - Click "Create bucket"
   - Name it: `gamematch-uploads`
   - Create bucket

3. **Get R2 Credentials**
   - Go to R2 → Manage R2 API Tokens
   - Click "Create API token"
   - Permissions: Object Read & Write
   - Apply to specific bucket: `gamematch-uploads`
   - Save:
     - **Access Key ID**
     - **Secret Access Key**
     - **Account ID** (found in R2 overview)

4. **Enable Public Access (Optional)**
   - Go to bucket → Settings
   - Enable "Public Access"
   - Note the **Public Bucket URL**: `https://pub-[hash].r2.dev`

5. **Add to Environment Variables**
   ```bash
   R2_ACCOUNT_ID=your-account-id
   R2_ACCESS_KEY_ID=your-access-key
   R2_SECRET_ACCESS_KEY=your-secret-key
   R2_BUCKET_NAME=gamematch-uploads
   R2_PUBLIC_URL=https://pub-[hash].r2.dev
   ```

### Cost
- **FREE**: First 10GB storage/month
- **After free tier**: $0.015/GB/month (very cheap)
- **Bandwidth**: FREE (unlike AWS S3!)

---

## Web Push Notifications (VAPID)

### Overview
Send browser push notifications to users even when they're not on the site.

### Setup (Automatic)

The application **auto-generates** VAPID keys if not configured. On first run, check the console logs for:

```
📧 [VAPID] Generated new VAPID keys:
   Public:  BNxxx...
   Private: abc123...
   
   Add these to your environment secrets to persist across restarts:
   VAPID_PUBLIC_KEY=BNxxx...
   VAPID_PRIVATE_KEY=abc123...
   VAPID_SUBJECT=mailto:your-email@example.com
```

### Setup (Manual)

1. **Generate VAPID Keys**
   ```bash
   npx web-push generate-vapid-keys
   ```

2. **Add to Environment Variables**
   ```bash
   VAPID_PUBLIC_KEY=generated-public-key
   VAPID_PRIVATE_KEY=generated-private-key
   VAPID_SUBJECT=mailto:support@yourdomain.com
   ```

### Cost
**FREE** - No charges for push notifications

### Requirements
- HTTPS in production (push notifications don't work on HTTP)
- User must grant permission in browser

---

## PostgreSQL Database

### On Replit

1. Click "Database" in left sidebar
2. PostgreSQL database is automatically provisioned
3. `DATABASE_URL` is automatically set as environment variable

### On Railway

1. In your project, click "+ New"
2. Select "Database" → "Add PostgreSQL"
3. Railway automatically creates `DATABASE_URL` environment variable

### On Other Platforms

Use any PostgreSQL provider:
- **Neon** (https://neon.tech/) - Serverless, free tier
- **Supabase** (https://supabase.com/) - Free tier
- **ElephantSQL** (https://www.elephantsql.com/) - Free tier

Get the connection string and set:
```bash
DATABASE_URL=postgresql://user:password@host:port/database
```

---

## Summary of Costs

| Service | Free Tier | After Free Tier | Required? |
|---------|-----------|-----------------|-----------|
| **Google OAuth** | FREE Forever | FREE | Optional |
| **100ms Voice** | 10K min/mo | $0.0099/min | Optional |
| **AWS SNS** | 100 SMS/mo (1yr) | $0.00645/SMS | Optional |
| **Firebase** | 10K verify/mo | $0.01/verify | Optional |
| **Cloudflare R2** | 10GB storage | $0.015/GB | Optional |
| **VAPID Push** | FREE Forever | FREE | Optional |
| **PostgreSQL** | FREE (various) | Varies by host | **Required** |

**Minimum to run app:** Just PostgreSQL (FREE on Replit/Railway)
**Full features:** ~$0-20/month depending on usage

---

## Quick Start (Minimal Setup)

To get started quickly with just the essentials:

1. **Required:**
   ```bash
   DATABASE_URL=<provided-by-hosting-platform>
   SESSION_SECRET=<generate-random-string>
   ```

2. **Run the app:**
   ```bash
   npm run dev
   ```

3. **Add optional services later** as needed

The app works perfectly fine without any optional services - they just enhance functionality!

---

*Last updated: November 2025*
