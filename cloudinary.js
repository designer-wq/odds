/**
 * Cloudinary Upload Utility
 * Upload de imagens para Cloudinary via unsigned upload
 */

const CLOUD_NAME = 'dkeczgmy8';
const UPLOAD_PRESET = 'SUPERODDS';
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

/**
 * Upload an image to Cloudinary
 * @param {string} imageSource - URL or base64 data URL of the image
 * @returns {Promise<string>} - Cloudinary secure URL
 */
export async function uploadToCloudinary(imageSource) {
    const formData = new FormData();
    formData.append('upload_preset', UPLOAD_PRESET);
    formData.append('folder', 'odds-teams');

    // If it's a URL (not base64), upload via URL
    if (imageSource.startsWith('http')) {
        formData.append('file', imageSource);
    } else {
        // base64 data URL
        formData.append('file', imageSource);
    }

    const res = await fetch(UPLOAD_URL, {
        method: 'POST',
        body: formData,
    });

    if (!res.ok) {
        throw new Error(`Cloudinary upload failed: ${res.status}`);
    }

    const data = await res.json();
    return data.secure_url;
}

/**
 * Check if a URL is already a Cloudinary URL
 */
export function isCloudinaryUrl(url) {
    return url && url.includes('cloudinary.com');
}
