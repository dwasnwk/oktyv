import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import fs from 'fs';
import { createLogger } from '../../utils/logger.js';

const logger = createLogger('cloud-storage');

export interface S3Credentials {
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
}

export interface S3UploadOptions {
  bucket: string;
  key: string;
  filePath: string;
  credentials: S3Credentials;
}

export interface S3DownloadOptions {
  bucket: string;
  key: string;
  destination: string;
  credentials: S3Credentials;
}

export interface S3ListOptions {
  bucket: string;
  prefix?: string;
  credentials: S3Credentials;
}

export interface S3Object {
  key: string;
  size: number;
  lastModified: Date;
}

/**
 * Cloud storage manager (S3)
 */
export class CloudStorage {
  /**
   * Initialize cloud storage
   */
  constructor() {
    logger.info('Cloud storage initialized');
  }
  
  /**
   * Upload file to S3
   * 
   * @param options - Upload options
   */
  async uploadToS3(options: S3UploadOptions): Promise<void> {
    const { bucket, key, filePath, credentials } = options;
    
    logger.info('Uploading to S3', { bucket, key, filePath });
    
    try {
      const client = this.createS3Client(credentials);
      const fileStream = fs.createReadStream(filePath);
      
      // Use multipart upload for better performance
      const upload = new Upload({
        client,
        params: {
          Bucket: bucket,
          Key: key,
          Body: fileStream,
        },
      });
      
      await upload.done();
      
      logger.info('S3 upload complete', { bucket, key });
    } catch (error) {
      logger.error('S3 upload failed', { error });
      throw new Error(`S3_UPLOAD_FAILED: ${(error as Error).message}`);
    }
  }
  
  /**
   * Download file from S3
   * 
   * @param options - Download options
   */
  async downloadFromS3(options: S3DownloadOptions): Promise<void> {
    const { bucket, key, destination, credentials } = options;
    
    logger.info('Downloading from S3', { bucket, key, destination });
    
    try {
      const client = this.createS3Client(credentials);
      
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });
      
      const response = await client.send(command);
      
      if (!response.Body) {
        throw new Error('No data received from S3');
      }
      
      // Write to file
      const writeStream = fs.createWriteStream(destination);
      
      await new Promise<void>((resolve, reject) => {
        (response.Body as any)
          .pipe(writeStream)
          .on('finish', () => resolve())
          .on('error', reject);
      });
      
      logger.info('S3 download complete', { destination });
    } catch (error) {
      logger.error('S3 download failed', { error });
      throw new Error(`S3_DOWNLOAD_FAILED: ${(error as Error).message}`);
    }
  }
  
  /**
   * List objects in S3 bucket
   * 
   * @param options - List options
   * @returns List of objects
   */
  async listS3Objects(options: S3ListOptions): Promise<S3Object[]> {
    const { bucket, prefix, credentials } = options;
    
    logger.info('Listing S3 objects', { bucket, prefix });
    
    try {
      const client = this.createS3Client(credentials);
      
      const command = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
      });
      
      const response = await client.send(command);
      
      const objects: S3Object[] = (response.Contents || []).map((obj) => ({
        key: obj.Key!,
        size: obj.Size || 0,
        lastModified: obj.LastModified || new Date(),
      }));
      
      logger.info('S3 list complete', { count: objects.length });
      
      return objects;
    } catch (error) {
      logger.error('S3 list failed', { error });
      throw new Error(`S3_LIST_FAILED: ${(error as Error).message}`);
    }
  }
  
  /**
   * Create S3 client
   */
  private createS3Client(credentials: S3Credentials): S3Client {
    return new S3Client({
      region: credentials.region || 'us-east-1',
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
      },
    });
  }
}
