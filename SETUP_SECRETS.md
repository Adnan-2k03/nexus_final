# Required Secrets Setup

This project requires the following secrets to be configured in Replit Secrets (Settings > Secrets):

## 100ms Voice Chat Credentials

To enable voice channels and real-time communication:

1. **HMS_APP_ACCESS_KEY** - Your 100ms App Access Key (also called App ID)
2. **HMS_APP_SECRET** - Your 100ms App Secret
3. **HMS_TEMPLATE_ID** - Your 100ms Template ID for voice-only rooms

### How to Get These:

1. Go to [100ms Dashboard](https://dashboard.100ms.live/)
2. Create or select your app
3. Copy the Access Key and App Secret from the developer settings
4. Go to Templates and copy the Template ID for a voice-only template

## Optional Secrets

- **GOOGLE_CLIENT_ID** - For Google OAuth login (optional)
- **GOOGLE_CLIENT_SECRET** - For Google OAuth login (optional)

## After Adding Secrets

The server will automatically detect these secrets on startup. If secrets are missing, you'll see warnings in the console.

**Note**: These secrets are automatically requested when you import this project from GitHub.
