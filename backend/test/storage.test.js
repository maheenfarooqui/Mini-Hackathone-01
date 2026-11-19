import test from "node:test";
import assert from "node:assert/strict";
import { validateImageKitFile } from "../services/storage.service.js";

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

test("ImageKit image validation reports a mismatched URL separately", () => {
  assert.throws(
    () => validateImageKitFile(imageFile, "https://ik.imagekit.io/account/other.jpg"),
    {
      message:
        "The ImageKit URL does not match this uploaded file. Upload the image again and save your profile.",
      statusCode: 400,
    },
  );
});
