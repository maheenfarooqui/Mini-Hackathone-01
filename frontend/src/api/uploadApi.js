import axios from "axios";
import api from "./axios.js";

export const uploadApi = {
  auth: () => api.get("/api/imagekit/auth").then((res) => res.data),
  async uploadImage(file, onProgress) {
    const auth = await this.auth();
    const data = new FormData();
    data.append("file", file);
    data.append("fileName", file.name);
    data.append("publicKey", auth.publicKey);
    data.append("token", auth.token);
    data.append("expire", String(auth.expire));
    data.append("signature", auth.signature);

    const response = await axios.post(
      "https://upload.imagekit.io/api/v1/files/upload",
      data,
      {
        onUploadProgress: (event) => {
          if (event.total) {
            onProgress?.(Math.round((event.loaded * 100) / event.total));
          }
        },
      },
    );
    return {
      imageUrl: response.data.url,
      imageFileId: response.data.fileId,
    };
  },
};
