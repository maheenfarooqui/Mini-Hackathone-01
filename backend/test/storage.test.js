import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanupImageKitAsset,
  cleanupReplacedImageKitAsset,
  validateImageKitFile,
} from "../services/storage.service.js";

const imageFile = {
  fileType: "image",
  size: 5 * 1024 * 1024,
  fileId: "image-file-id",
  url: "https://ik.imagekit.io/account/profile.jpg",
};

test("ImageKit image validation accepts the 5 MB limit and returns its canonical URL", () => {
  assert.deepEqual(validateImageKitFile(imageFile, imageFile.url), {
    imageUrl: imageFile.url,
    imageFileId: imageFile.fileId,
  });
});

test("ImageKit image validation reports an oversized file separately", () => {
  assert.throws(
    () => validateImageKitFile({ ...imageFile, size: imageFile.size + 1 }, imageFile.url),
    {
      message: "The image exceeds the 5 MB limit. Choose a smaller image.",
      statusCode: 400,
    },
  );
});

test("ImageKit image validation returns the canonical ImageKit URL", () => {
  assert.deepEqual(validateImageKitFile(imageFile), {
    imageUrl: imageFile.url,
    imageFileId: imageFile.fileId,
  });
});

test("replaced ImageKit files are cleaned up only when the file ID changes", async () => {
  const deleted = [];
  const deleteAsset = async (fileId) => deleted.push(fileId);

  await cleanupReplacedImageKitAsset("old-file", "old-file", deleteAsset);
  await cleanupReplacedImageKitAsset("old-file", "new-file", deleteAsset);
  await cleanupReplacedImageKitAsset("", "new-file", deleteAsset);

  assert.deepEqual(deleted, ["old-file"]);
});

test("ImageKit cleanup failures are logged and never reject", async () => {
  const originalError = console.error;
  const logged = [];
  console.error = (...args) => logged.push(args);
  try {
    await assert.doesNotReject(
      cleanupImageKitAsset("old-file", async () => {
        throw new Error("ImageKit unavailable");
      }),
    );
    assert.deepEqual(logged, [["ImageKit cleanup failed:", "ImageKit unavailable"]]);
  } finally {
    console.error = originalError;
  }
});
