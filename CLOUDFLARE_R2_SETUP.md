# Cloudflare R2 Integration Guide for GameMatch

## Overview
Cloudflare R2 is a cost-effective object storage solution perfect for storing user uploads like profile images, game clips, achievement screenshots, and portfolio assets.

## Why Cloudflare R2?

### Cost Benefits
- **$0.015/GB/month** for storage (vs AWS S3's $0.023/GB)
- **No egress fees** (downloads are FREE! 🎉)
- **No API request charges** for Class A operations
- **First 10GB storage FREE per month**

### Perfect for GameMatch
- Profile images (avatars)
- Game clips and highlight videos
- Achievement screenshots
- Stats photos
- Portfolio page assets
- Voice channel recordings (future feature)

## Setup Instructions

### 1. Create Cloudflare R2 Account
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2 Object Storage**
3. Create a new bucket (e.g., `gamematch-uploads`)

### 2. Generate API Credentials
1. In R2 dashboard, go to **Settings** → **API Tokens**
2. Create a new API token with:
   - **Permissions**: Object Read & Write
   - **Bucket**: Your bucket name
3. Save these credentials:
   - Account ID
   - Access Key ID
   - Secret Access Key

### 3. Add Secrets to Replit
Add these environment variables to your Replit project:
```bash
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key
R2_SECRET_ACCESS_KEY=your_secret_key
R2_BUCKET_NAME=gamematch-uploads
```

### 4. Install S3-Compatible Client
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### 5. Create R2 Helper (server/r2.ts)
```typescript
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function uploadToR2(
  file: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  await r2Client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
      Body: file,
      ContentType: contentType,
    })
  );
  
  return `https://pub-${process.env.R2_ACCOUNT_ID}.r2.dev/${key}`;
}

export async function getSignedDownloadUrl(key: string): Promise<string> {
  return getSignedUrl(
    r2Client,
    new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    }),
    { expiresIn: 3600 }
  );
}

export async function deleteFromR2(key: string): Promise<void> {
  await r2Client.send(
    new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    })
  );
}
```

### 6. Update Upload Routes
```typescript
// Example: Profile image upload
app.post("/api/upload/profile-image", upload.single("image"), async (req, res) => {
  if (!req.file) return res.status(400).send("No file uploaded");
  
  const key = `profiles/${req.user!.id}/${Date.now()}-${req.file.originalname}`;
  const url = await uploadToR2(req.file.buffer, key, req.file.mimetype);
  
  await db.update(users).set({ profileImageUrl: url }).where(eq(users.id, req.user!.id));
  
  res.json({ url });
});
```

## File Organization Structure

```
gamematch-uploads/
├── profiles/
│   └── {userId}/
│       └── avatar.jpg
├── clips/
│   └── {userId}/
│       └── {gameId}/
│           └── clip-{timestamp}.mp4
├── achievements/
│   └── {userId}/
│       └── {gameId}/
│           └── screenshot-{timestamp}.png
├── stats/
│   └── {userId}/
│       └── {gameId}/
│           └── stats-{date}.jpg
└── portfolios/
    └── {userId}/
        └── assets/
            └── {filename}
```

## Security Best Practices

1. **Validate file types**: Only allow specific image/video formats
2. **Limit file sizes**: Max 10MB for images, 100MB for videos
3. **Sanitize filenames**: Remove special characters
4. **Use signed URLs**: For private content
5. **Implement rate limiting**: Prevent abuse

## Cost Estimation for GameMatch

Assuming 1,000 active users:
- **Profile images**: 1,000 × 200KB = 200MB
- **Game clips** (10% users): 100 × 50MB = 5GB
- **Screenshots**: 500 × 2MB = 1GB
- **Total**: ~6.2GB/month

**Monthly Cost**: $0.015 × 6.2 = **$0.09/month** 🎉

Compare to AWS S3:
- Storage: $0.023 × 6.2 = $0.14
- Egress (assume 100GB/month): $9.00
- **Total AWS**: ~$9.14/month

**Savings: 99% cheaper with R2!** 💰

## Integration Checklist

- [ ] Create Cloudflare R2 bucket
- [ ] Generate API credentials
- [ ] Add secrets to Replit
- [ ] Install AWS SDK packages
- [ ] Create R2 helper functions
- [ ] Update profile image upload
- [ ] Update game clip upload
- [ ] Update stats photo upload
- [ ] Test file uploads
- [ ] Set up public access (if needed)
- [ ] Configure CORS for direct uploads

## Next Steps

1. Replace local `uploads/` directory with R2
2. Migrate existing files to R2 (if any)
3. Update all file URLs to use R2 CDN
4. Add image optimization (resize, compress)
5. Implement video transcoding for clips

## Resources

- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
- [R2 Pricing](https://developers.cloudflare.com/r2/pricing/)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
