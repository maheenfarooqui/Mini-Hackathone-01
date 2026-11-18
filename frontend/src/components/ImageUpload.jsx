import { useRef, useState } from "react";
import { ImagePlus, LoaderCircle, UploadCloud } from "lucide-react";
import toast from "react-hot-toast";
import { uploadApi } from "../api/uploadApi.js";
import { getApiError } from "../api/axios.js";
import { Button, cx } from "./UI.jsx";

export default function ImageUpload({ currentUrl, onChange, label = "Image" }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function handleFile(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Images must be 5 MB or smaller.");
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      const uploaded = await uploadApi.uploadImage(file, setProgress);
      onChange(uploaded);
      toast.success("Image uploaded.");
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <span className="mb-2 block text-xs font-medium text-muted">{label}</span>
      <div className="flex items-center gap-4 rounded-xl border border-dashed border-line bg-ink/40 p-3">
        {currentUrl ? (
          <img src={currentUrl} alt="Uploaded preview" className="h-14 w-14 rounded-lg object-cover" />
        ) : (
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-line bg-card text-muted">
            <ImagePlus size={19} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-copy">
            {uploading ? `Uploading image${progress ? ` · ${progress}%` : "…"}` : "Add a product or profile image"}
          </p>
          <p className="mt-1 text-[10px] text-muted">JPG, PNG, GIF or WebP · up to 5 MB</p>
          {uploading && (
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-orange transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
        <Button
          variant="secondary"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="gap-1.5"
        >
          {uploading ? <LoaderCircle size={13} className="animate-spin" /> : <UploadCloud size={13} />}
          <span className="hidden sm:inline">{uploading ? "Uploading" : "Upload"}</span>
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFile}
          disabled={uploading}
        />
      </div>
    </div>
  );
}
