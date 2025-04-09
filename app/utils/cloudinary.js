/**
 * Transforms a Cloudinary URL to optimize image delivery
 * @param {string} url - Original Cloudinary URL
 * @param {Object} options - Transformation options
 * @returns {string} - Transformed URL
 */
export const optimizeCloudinaryUrl = (url, options = {}) => {
  if (!url || typeof url !== "string" || !url.includes("cloudinary.com")) {
    return url;
  }

  const defaultOptions = {
    width: options.width || null,
    height: options.height || null,
    quality: options.quality || "auto",
    format: options.format || "auto",
  };

  // Find the upload part of the URL
  const uploadIndex = url.indexOf("/upload/");
  if (uploadIndex === -1) return url;

  // Build transformation string
  const transformations = [];

  if (defaultOptions.width || defaultOptions.height) {
    let resizeStr = "c_fill";
    if (defaultOptions.width) resizeStr += `,w_${defaultOptions.width}`;
    if (defaultOptions.height) resizeStr += `,h_${defaultOptions.height}`;
    transformations.push(resizeStr);
  }

  transformations.push(`q_${defaultOptions.quality}`);
  transformations.push(`f_${defaultOptions.format}`);

  // Insert transformations into URL
  const transformationString = transformations.join(",");
  const newUrl = `${url.substring(
    0,
    uploadIndex + 8
  )}${transformationString}/${url.substring(uploadIndex + 8)}`;

  return newUrl;
};

/**
 * Creates a fallback color based on wallet address
 * @param {string} walletAddress - User's wallet address
 * @returns {string} - CSS color string
 */
export const generateWalletColor = (walletAddress) => {
  if (!walletAddress) return "rgb(64, 63, 173)";

  const hash = walletAddress.slice(-6);
  const r = parseInt(hash.slice(0, 2), 16);
  const g = parseInt(hash.slice(2, 4), 16);
  const b = parseInt(hash.slice(4, 6), 16);

  return `rgb(${r}, ${g}, ${b})`;
};
