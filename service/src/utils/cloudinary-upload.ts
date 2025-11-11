import { cloudinary } from '../config/cloudinary.js';
import { Readable } from 'stream';

export interface UploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
}

/**
 * Upload an image to Cloudinary from a buffer
 * @param buffer - The image buffer from multer
 * @param folder - Optional folder path in Cloudinary
 * @returns Upload result with URLs
 */
export const uploadImageToCloudinary = async (
  buffer: Buffer,
  folder = 'irl/avatars'
): Promise<UploadResult> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        format: 'jpg',
        transformation: [
          { width: 150, height: 150, crop: 'limit' }
        ]
      },
      (error, result) => {
        if (error) {
          reject(new Error(`Cloudinary upload failed: ${error.message}`));
          return;
        }
        
        if (!result) {
          reject(new Error('Cloudinary upload failed: No result returned'));
          return;
        }

        resolve({
          url: result.url,
          secureUrl: result.secure_url,
          publicId: result.public_id
        });
      }
    );

    // Convert buffer to stream and pipe to Cloudinary
    const readableStream = new Readable();
    readableStream.push(buffer);
    readableStream.push(null);
    readableStream.pipe(uploadStream);
  });
};

/**
 * Delete an image from Cloudinary by public ID
 * @param publicId - The Cloudinary public ID
 */
export const deleteImageFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Failed to delete image from Cloudinary:', error);
    // Don't throw - deletion is not critical
  }
};

