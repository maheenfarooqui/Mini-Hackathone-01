import ImageKit from "@imagekit/nodejs";

const maxImageSize = 5 * 1024 * 1024;
let client;

function getImageKitClient() {
  const privateKey =
    process.env.IMAGEKIT_PRIVATE_KEY || process.env.IMAGEKIT_KEY;

  if (!privateKey) {
    const error = new Error("ImageKit private key is not configured.");
    error.statusCode = 503;
    throw error;
  }

  if (!client) {
    client = new ImageKit({ privateKey });
  }

  return client;
}

export function getUploadAuthentication() {
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;

  if (!publicKey || !urlEndpoint) {
    const error = new Error("ImageKit public key and URL endpoint must be configured.");
    error.statusCode = 503;
    throw error;
  }

  const expire = Math.floor(Date.now() / 1000) + 10 * 60;

  return {
    ...getImageKitClient().helper.getAuthenticationParameters(undefined, expire),
    publicKey,
    urlEndpoint,
  };
}

export function validateImageKitFile(file) {
  if (file.fileType !== "image") {
    const error = new Error("Only ImageKit image files can be used.");
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isFinite(file.size) || file.size < 0) {
    const error = new Error("ImageKit did not return a valid file size.");
    error.statusCode = 400;
    throw error;
  }

  if (file.size > maxImageSize) {
    const error = new Error("The image exceeds the 5 MB limit. Choose a smaller image.");
    error.statusCode = 400;
    throw error;
  }

  if (typeof file.fileId !== "string" || !file.fileId) {
    const error = new Error("ImageKit did not return a valid file ID.");
    error.statusCode = 400;
    throw error;
  }

  if (typeof file.url !== "string" || !file.url) {
    const error = new Error("ImageKit did not return a valid file URL.");
    error.statusCode = 400;
    throw error;
  }

  if (typeof file.url !== "string" || !file.url) {
    const error = new Error("ImageKit did not return a valid file URL.");
    error.statusCode = 400;
    throw error;
  }

  // Use the URL retrieved by file ID instead of trusting a client-supplied URL.
  return { imageUrl: file.url, imageFileId: file.fileId };
}

export async function verifyImageKitAsset(fileId) {
  if (typeof fileId !== "string" || !fileId.trim()) {
    const error = new Error("A valid ImageKit file ID is required.");
    error.statusCode = 400;
    throw error;
  }

  let file;
  try {
    file = await getImageKitClient().files.get(fileId.trim());
  } catch (error) {
    if (error.status === 404) {
      const notFound = new Error("The ImageKit file was not found.");
      notFound.statusCode = 400;
      throw notFound;
    }
    throw error;
  }

  return validateImageKitFile(file);
}

export async function deleteImageKitAsset(fileId) {
  if (fileId) {
    try {
      await getImageKitClient().files.delete(fileId);
    } catch (error) {
      if (error.status === 404) {
        const notFound = new Error("The ImageKit file was not found.");
        notFound.statusCode = 404;
        throw notFound;
      }
      throw error;
    }
  }
}
