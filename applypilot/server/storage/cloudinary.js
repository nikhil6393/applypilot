/**
 * Cloudinary Resume Storage
 * Uploads PDF/DOCX resume files to Cloudinary and returns a secure URL.
 */
import { v2 as cloudinary } from 'cloudinary';

// Configure from env (loaded by dotenv in server.js)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Upload a resume buffer to Cloudinary.
 *
 * @param {Buffer} fileBuffer - The raw file buffer (PDF or DOCX)
 * @param {string} fileName   - Original file name (used for public_id)
 * @param {string} mimeType   - MIME type ('application/pdf' or 'application/vnd.openxmlformats...')
 * @param {string} userId     - User ID for folder namespacing
 * @returns {Promise<{ url: string, publicId: string }>}
 */
export async function uploadResumeToCloudinary(fileBuffer, fileName, mimeType, userId = 'anonymous') {
  const ext = fileName?.toLowerCase().endsWith('.pdf') ? 'pdf' : 'docx';
  const safeName = (fileName || 'resume')
    .replace(/\.[^.]+$/, '')          // strip extension
    .replace(/[^a-zA-Z0-9_-]/g, '_') // sanitize
    .slice(0, 60);

  const publicId = `resumes/${userId}/${safeName}_${Date.now()}`;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'raw',   // raw = any non-image/video file
        public_id: publicId,
        format: ext,
        overwrite: false,
        tags: ['resume', userId],
        context: { uploaded_by: userId, original_name: fileName || 'resume' },
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    uploadStream.end(fileBuffer);
  });
}

/**
 * Delete a previously uploaded resume from Cloudinary.
 *
 * @param {string} publicId - The Cloudinary public_id to delete
 */
export async function deleteResumeFromCloudinary(publicId) {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
  } catch (err) {
    console.warn('[Cloudinary] Delete warning:', err?.message);
  }
}

export { cloudinary };
