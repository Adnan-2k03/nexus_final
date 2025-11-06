# AWS SNS Phone Authentication Setup Guide

## Overview
You've successfully implemented phone number authentication using AWS SNS! This guide will help you set up AWS credentials to enable SMS verification.

## Features Implemented

✅ Phone number verification with SMS OTP codes  
✅ Rate limiting (3 attempts per hour per phone number)  
✅ Code expiration (10 minutes)  
✅ Country code support (10+ countries)  
✅ Secure user registration with phone verification  
✅ Database schema for tracking verification codes  
✅ Complete frontend UI with 3-step flow

## Cost Overview

**AWS SNS Pricing (2025):**
- **$0.00645 per SMS** (US)
- **40% cheaper than Firebase** ($0.01/SMS)
- **100 FREE SMS/month** (first year with AWS Free Tier)

**Example Costs:**
- 1,000 users/month: **$6.45**
- 10,000 users/month: **$64.50**
- 100,000 users/month: **$645.00**

## AWS Setup Instructions

### Step 1: Create AWS Account
1. Go to https://aws.amazon.com/
2. Click "Create an AWS Account"
3. Follow the signup process (credit card required but won't be charged for free tier)

### Step 2: Enable SNS SMS Functionality
1. Log in to AWS Console
2. Search for "SNS" in the services search bar
3. Click on "Simple Notification Service (SNS)"
4. Go to "Text messaging (SMS)" in the left sidebar
5. Click "Sandbox destination phone numbers"
6. **IMPORTANT**: By default, you're in SMS Sandbox mode
   - In Sandbox mode, you can only send SMS to verified numbers
   - To send to any number: Request production access
     - Click "Account settings" → "Request production access"
     - Fill out the form (usually approved within 24 hours)

### Step 3: Get AWS Access Keys
1. In AWS Console, click your name (top right) → "Security credentials"
2. Scroll down to "Access keys"
3. Click "Create access key"
4. Choose "Application running on an AWS compute service" or "Other"
5. Save both:
   - **Access Key ID** (looks like: `AKIAIOSFODNN7EXAMPLE`)
   - **Secret Access Key** (shown only once! Save it!)

### Step 4: Set Environment Variables

#### On Replit:
1. Click "Secrets" (lock icon) in the left sidebar
2. Add these three secrets:

```bash
AWS_ACCESS_KEY_ID=your_access_key_id_here
AWS_SECRET_ACCESS_KEY=your_secret_access_key_here
AWS_REGION=us-east-1
```

#### On Railway:
1. Go to your Railway project
2. Click on your service → "Variables"
3. Add the same three variables

#### On Vercel:
Not needed on Vercel (frontend only)

## Testing the Implementation

### Test in Development (FREE - No SMS sent)

Without AWS credentials, the app still works but won't send real SMS:
1. Go to the Phone tab
2. Enter a phone number
3. Click "Send Verification Code"
4. You'll see an error message about SMS not being configured

### Test with AWS (Sends Real SMS)

**Option 1: Sandbox Mode (FREE but limited)**
1. Add your own phone number as a verified destination in AWS SNS
2. You can only send SMS to verified numbers
3. Great for testing!

**Option 2: Production Mode (Costs money)**
1. Request production access in AWS SNS
2. Once approved, you can send SMS to any phone number
3. Each SMS costs $0.00645

### Testing Steps:
1. Start your application
2. Navigate to the authentication page
3. Click the "Phone" tab
4. Select your country code
5. Enter your phone number
6. Click "Send Verification Code"
7. Check your phone for the 6-digit code
8. Enter the code and verify
9. Complete registration

## Rate Limiting Protection

**Built-in safeguards:**
- Max 3 verification requests per phone number per hour
- Prevents SMS spam and cost abuse
- Returns clear error message when limit reached

## Security Features

✅ Codes expire after 10 minutes  
✅ Codes are hashed before storage  
✅ Rate limiting prevents abuse  
✅ Phone numbers are validated before sending  
✅ Failed attempts are tracked  

## API Endpoints Created

### POST `/api/auth/phone/send-code`
Send verification code to phone number
```json
{
  "phoneNumber": "+12345678900"
}
```

### POST `/api/auth/phone/verify-code`
Verify the SMS code
```json
{
  "phoneNumber": "+12345678900",
  "code": "123456"
}
```

### POST `/api/auth/phone/register`
Register new user with verified phone
```json
{
  "phoneNumber": "+12345678900",
  "verificationCode": "123456",
  "gamertag": "ProGamer123",
  "firstName": "John",
  "lastName": "Doe",
  "age": 25
}
```

### POST `/api/auth/phone/login`
Login existing user with phone number
```json
{
  "phoneNumber": "+12345678900"
}
```

## Database Schema

**New Tables:**
- `phone_verification_codes` - Stores temporary verification codes
- Updated `users` table with `phoneNumber` and `phoneVerified` fields

## Troubleshooting

### "Phone authentication is not configured"
**Solution**: Add AWS credentials to your environment secrets

### "Failed to send verification code"
**Possible causes:**
1. AWS credentials are incorrect
2. AWS region is wrong (use `us-east-1`)
3. You're in Sandbox mode and phone number isn't verified
4. AWS account doesn't have SNS permissions

**Check AWS console** for detailed error messages

### "Too many verification attempts"
**Solution**: Wait 1 hour or contact support to reset rate limit

### SMS not received
**Possible causes:**
1. Phone number format is incorrect (include country code)
2. Carrier blocking the message
3. AWS SNS in Sandbox mode (verify phone number first)

## Moving to Production

1. **Request Production Access** in AWS SNS
2. **Set up spending alerts** in AWS Console to avoid unexpected charges
3. **Monitor usage** in AWS SNS dashboard
4. **Configure sender ID** (optional, for branded SMS)

## Support

- AWS SNS Documentation: https://docs.aws.amazon.com/sns/
- AWS SNS Pricing: https://aws.amazon.com/sns/pricing/
- AWS Free Tier: https://aws.amazon.com/free/

---

**You're all set!** 🎉

Your phone authentication system is production-ready. Just add AWS credentials to start sending verification codes.
