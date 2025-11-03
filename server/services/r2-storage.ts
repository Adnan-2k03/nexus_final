import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'gamematch-uploads';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID!,
    secretAccessKey: R2_SECRET_ACCESS_KEY!,
  },
});

export interface UploadOptions {
  key: string;
  buffer: Buffer;
  contentType: string;
}

export interface R2StorageService {
  uploadFile: (options: UploadOptions) => Promise<string>;
  getSignedDownloadUrl: (key: string, expiresIn?: number) => Promise<string>;
  deleteFile: (key: string) => Promise<void>;
  isConfigured: () => boolean;
}

export const r2Storage: R2StorageService = {
  isConfigured: () => {
    return !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
  },

  uploadFile: async ({ key, buffer, contentType }: UploadOptions): Promise<string> => {
    if (!r2Storage.isConfigured()) {
      throw new Error('R2 storage is not configured. Please set R2 environment variables.');
    }

    if (!R2_PUBLIC_URL) {
      throw new Error('R2_PUBLIC_URL is required for file uploads. Please configure a public R2 bucket or use a custom domain.');
    }

    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });

    await s3Client.send(command);

    return `${R2_PUBLIC_URL}/${key}`;
  },

  getSignedDownloadUrl: async (key: string, expiresIn: number = 3600): Promise<string> => {
    if (!r2Storage.isConfigured()) {
      throw new Error('R2 storage is not configured.');
    }

    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
  },

  deleteFile: async (key: string): Promise<void> => {
    if (!r2Storage.isConfigured()) {
      throw new Error('R2 storage is not configured.');
    }

    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
  },
};

export function generateFileKey(userId: string, filename: string, folder: string = 'uploads'): string {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
  return `${folder}/${userId}/${timestamp}-${sanitizedFilename}`;
}
