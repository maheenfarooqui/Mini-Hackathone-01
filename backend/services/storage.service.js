import ImageKit from "@imagekit/nodejs";

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

export async function verifyImageKitAsset(fileId, imageUrl) {
  if (
    typeof fileId !== "string" ||
    !fileId.trim() ||
    typeof imageUrl !== "string" ||
    !imageUrl.trim()
  ) {
    const error = new Error("A valid ImageKit file ID and URL are required.");
    error.statusCode = 400;
    throw error;
  }

  const file = await getImageKitClient().files.get(fileId.trim());

  if (
    file.fileType !== "image" ||
    file.size > 5 * 1024 * 1024 ||
    file.url !== imageUrl.trim()
  ) {
    const error = new Error(
      "The ImageKit file must be an image under 5 MB and its URL must match the uploaded file.",
    );
    error.statusCode = 400;
    throw error;
  }

  return { imageUrl: file.url, imageFileId: file.fileId };
}

export async function deleteImageKitAsset(fileId) {
  if (fileId) {
    await getImageKitClient().files.delete(fileId);
  }
}
