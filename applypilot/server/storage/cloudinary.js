/**
 * Cloudinary Storage Module
 *
 * Handles all Cloudinary operations for ApplyPilot:
 *   - Resume files  (PDF / DOCX)   → resource_type: 'raw'
 *   - Profile images (JPG/PNG/WEBP) → resource_type: 'image'
 *
 * Required env vars:
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 */
import { v2 as cloudinary } from 'cloudinary';

// Configure once from env (loaded by dotenv in server.js / config.js)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// ── Config check ──────────────────────────────────────────────────────────────

/**
 * Returns true when all three Cloudinary env vars are present and not placeholder values.
 */
export function isCloudinaryConfigured() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  return (
    Boolean(CLOUDINARY_CLOUD_NAME) &&
    Boolean(CLOUDINARY_API_KEY) &&
    Boolean(CLOUDINARY_API_SECRET) &&
    CLOUDINARY_API_SECRET !== 'YOUR_API_SECRET_HERE' &&
    CLOUDINARY_API_KEY !== 'YOUR_API_KEY_HERE'
  );
}

// ── Internal helper ───────────────────────────────────────────────────────────

/**
 * Wraps cloudinary.uploader.upload_stream in a Promise.
 *
 * @param {Buffer} buffer
 * @param {object} options - Cloudinary upload options
 * @returns {Promise<{ url: string, publicId: string }>}
 */
function uploadBufferToCloudinary(buffer, options) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) return reject(error);
      resolve({ url: result.secure_url, publicId: result.public_id });
    });
    stream.end(buffer);
  });
}

// ── Resume upload ─────────────────────────────────────────────────────────────

/**
 * Upload a resume buffer (PDF or DOCX) to Cloudinary.
 *
 * @param {Buffer} fileBuffer - Raw file bytes
 * @param {string} fileName   - Original file name (used to derive public_id)
 * @param {string} mimeType   - MIME type (informational only)
 * @param {string} userId     - User ID for folder namespacing
 * @returns {Promise<{ url: string, publicId: string }>}
 */
export async function uploadResumeToCloudinary(fileBuffer, fileName, mimeType, userId = 'anonymous') {
  const ext = (fileName || '').toLowerCase().endsWith('.pdf') ? 'pdf' : 'docx';
  const safeName = (fileName || 'resume')
    .replace(/\.[^.]+$/, '')           // strip extension
    .replace(/[^a-zA-Z0-9_-]/g, '_')  // sanitize special chars
    .slice(0, 60);

  const publicId = `resumes/${userId}/${safeName}_${Date.now()}`;

  return uploadBufferToCloudinary(fileBuffer, {
    resource_type: 'raw',   // raw = any non-image/video file (PDF, DOCX …)
    public_id: publicId,
    format: ext,
    overwrite: false,
    tags: ['resume', userId],
    context: { uploaded_by: userId, original_name: fileName || 'resume' },
  });
}

// ── Profile image upload ──────────────────────────────────────────────────────

/**
 * Upload a profile image buffer to Cloudinary.
 *
 * Applies face-aware crop (400×400), converts to WEBP, and generates
 * a 64×64 eager thumbnail for fast avatar delivery.
 *
 * @param {Buffer} imageBuffer - Raw image bytes (PNG / JPG / WEBP / GIF)
 * @param {string} userId      - User ID for folder namespacing
 * @returns {Promise<{ url: string, publicId: string, thumbnailUrl: string }>}
 */
export async function uploadProfileImageToCloudinary(imageBuffer, userId = 'anonymous') {
  const publicId = `profile-images/${userId}/avatar_${Date.now()}`;

  const result = await uploadBufferToCloudinary(imageBuffer, {
    resource_type: 'image',
    public_id: publicId,
    overwrite: true,            // replace current avatar
    format: 'webp',             // convert to WEBP for smaller payload
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' }, // face-aware square crop
      { quality: 'auto:good' },
    ],
    eager: [
      // Pre-generate 64×64 thumbnail for navbar/avatar use
      { width: 64, height: 64, crop: 'fill', gravity: 'face', format: 'webp' },
    ],
    eager_async: false,
    tags: ['profile-image', userId],
    context: { uploaded_by: userId },
  });

  // Build thumbnail URL from base URL (Cloudinary transformation URL pattern)
  const thumbnailUrl = result.url.replace(
    '/upload/',
    '/upload/w_64,h_64,c_fill,g_face,f_webp,q_auto/'
  );

  return { url: result.url, publicId: result.publicId, thumbnailUrl };
}

// ── Delete helpers ────────────────────────────────────────────────────────────

/**
 * Delete a previously uploaded resume from Cloudinary.
 *
 * @param {string} publicId - The Cloudinary public_id to delete
 */
export async function deleteResumeFromCloudinary(publicId) {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' });
  } catch (err) {
    console.warn('[Cloudinary] Resume delete warning:', err?.message);
  }
}

/**
 * Delete a profile image from Cloudinary.
 *
 * @param {string} publicId - The Cloudinary public_id to delete
 */
export async function deleteProfileImageFromCloudinary(publicId) {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch (err) {
    console.warn('[Cloudinary] Profile image delete warning:', err?.message);
  }
}

/**
 * Generic delete — auto-detects resource type from the publicId prefix.
 *
 * @param {string} publicId
 */
export async function deleteFromCloudinary(publicId) {
  if (!publicId) return;
  const resourceType = publicId.startsWith('resumes/') ? 'raw' : 'image';
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.warn('[Cloudinary] Delete warning:', err?.message);
  }
}

export { cloudinary };
