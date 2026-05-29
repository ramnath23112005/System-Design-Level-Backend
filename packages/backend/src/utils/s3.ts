import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';
import { logger } from './logger';

const UPLOAD_DIR = path.resolve(__dirname, '..', '..', 'uploads');

function ensureUploadDir(): void {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

const useS3 = !!(config.aws.accessKeyId && config.aws.secretAccessKey);

let s3Client: any = null;

async function getS3Client() {
  if (!s3Client && useS3) {
    const { S3Client } = await import('@aws-sdk/client-s3');
    s3Client = new S3Client({
      region: config.aws.region,
      credentials: {
        accessKeyId: config.aws.accessKeyId!,
        secretAccessKey: config.aws.secretAccessKey!,
      },
    });
  }
  return s3Client;
}

async function uploadToS3(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  const client = await getS3Client();
  const { PutObjectCommand } = await import('@aws-sdk/client-s3');
  await client.send(
    new PutObjectCommand({
      Bucket: config.aws.s3Bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  if (config.aws.cloudfrontDomain) {
    return `https://${config.aws.cloudfrontDomain}/${key}`;
  }
  return `https://${config.aws.s3Bucket}.s3.${config.aws.region}.amazonaws.com/${key}`;
}

async function uploadToLocal(
  key: string,
  body: Buffer,
  _contentType: string
): Promise<string> {
  ensureUploadDir();
  const filePath = path.join(UPLOAD_DIR, key);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(filePath, body);

  if (config.aws.cloudfrontDomain) {
    return `https://${config.aws.cloudfrontDomain}/${key}`;
  }
  return `${config.urls.apiBaseUrl}/uploads/${key}`;
}

export const s3 = {
  async upload(
    key: string,
    body: Buffer | Uint8Array | string,
    contentType: string = 'application/octet-stream'
  ): Promise<string> {
    const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
    try {
      if (useS3) {
        return await uploadToS3(key, buffer, contentType);
      }
      return await uploadToLocal(key, buffer, contentType);
    } catch (error) {
      logger.error('File upload error', { key, error: (error as Error).message });
      if (useS3) {
        logger.warn('S3 upload failed, falling back to local storage', { key });
        try {
          return await uploadToLocal(key, buffer, contentType);
        } catch (fallbackError) {
          throw fallbackError;
        }
      }
      throw error;
    }
  },

  async delete(key: string): Promise<void> {
    try {
      if (useS3) {
        const client = await getS3Client();
        const { DeleteObjectCommand } = await import('@aws-sdk/client-s3');
        await client.send(
          new DeleteObjectCommand({
            Bucket: config.aws.s3Bucket,
            Key: key,
          })
        );
      } else {
        const filePath = path.join(UPLOAD_DIR, key);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
    } catch (error) {
      logger.error('File delete error', { key, error: (error as Error).message });
      throw error;
    }
  },

  async getSignedDownloadUrl(
    key: string,
    expiresInSeconds: number = 3600
  ): Promise<string> {
    try {
      if (useS3) {
        const client = await getS3Client();
        const { GetObjectCommand } = await import('@aws-sdk/client-s3');
        const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
        const url = await getSignedUrl(
          client,
          new GetObjectCommand({
            Bucket: config.aws.s3Bucket,
            Key: key,
          }),
          { expiresIn: expiresInSeconds }
        );
        return url;
      }

      if (config.aws.cloudfrontDomain) {
        return `https://${config.aws.cloudfrontDomain}/${key}`;
      }
      return `${config.urls.apiBaseUrl}/uploads/${key}`;
    } catch (error) {
      logger.error('getSignedUrl error', { key, error: (error as Error).message });
      if (config.aws.cloudfrontDomain) {
        return `https://${config.aws.cloudfrontDomain}/${key}`;
      }
      return `${config.urls.apiBaseUrl}/uploads/${key}`;
    }
  },

  async exists(key: string): Promise<boolean> {
    try {
      if (useS3) {
        const client = await getS3Client();
        const { HeadObjectCommand } = await import('@aws-sdk/client-s3');
        await client.send(
          new HeadObjectCommand({
            Bucket: config.aws.s3Bucket,
            Key: key,
          })
        );
        return true;
      }
      return fs.existsSync(path.join(UPLOAD_DIR, key));
    } catch {
      return false;
    }
  },
};
