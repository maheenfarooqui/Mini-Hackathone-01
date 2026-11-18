import { useState } from "react";
import { ShieldCheck, UserRound } from "lucide-react";
import toast from "react-hot-toast";
import { getApiError } from "../api/axios.js";
import { userApi } from "../api/userApi.js";
import { useAuth } from "../context/AuthContext.jsx";
import ImageUpload from "../components/ImageUpload.jsx";
import { Badge, Button, Card, Field, PageHeader } from "../components/UI.jsx";

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [image, setImage] = useState({
    imageUrl: user.image || "",
    imageFileId: user.imageFileId || "",
  });
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    const payload = { name: values.name, phone: values.phone };
    if (image.imageUrl && image.imageFileId) Object.assign(payload, image);
    setSaving(true);
    try {
      const response = await userApi.updateProfile(payload);
      setUser({ ...user, ...response.user });
      setImage({
        imageUrl: response.user.image || "",
        imageFileId: response.user.imageFileId || "",
      });
      toast.success("Your profile has been updated.");
    } catch (error) {
      toast.error(getApiError(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader eyebrow="Account settings" title="My profile" description="Manage the personal details and image associated with your account." />
      <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
        <Card className="flex flex-col items-center p-6 text-center">
          {image.imageUrl ? (
            <img src={image.imageUrl} alt="" className="h-24 w-24 rounded-3xl object-cover" />
          ) : (
            <span className="flex h-24 w-24 items-center justify-center rounded-3xl bg-orange/10 text-orange"><UserRound size={32} /></span>
          )}
          <h2 className="mt-4 font-semibold text-copy">{user.name}</h2>
          <p className="mt-1 text-xs text-muted">{user.email}</p>
          <Badge className="mt-4">{user.role === "warehouseManager" ? "Warehouse manager" : user.role === "salesRepresentative" ? "Sales representative" : user.role === "admin" ? "Administrator" : "Supplier"}</Badge>
        </Card>
        <Card className="p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-300/10 text-sky-200"><ShieldCheck size={16} /></span>
            <div><h2 className="text-sm font-semibold">Profile information</h2><p className="mt-1 text-[11px] text-muted">Your email and account role are managed securely and cannot be changed here.</p></div>
          </div>
          <form onSubmit={submit} className="mt-5 space-y-4">
            <Field label="Full name" name="name" defaultValue={user.name} maxLength={100} required />
            <Field label="Email address" value={user.email} disabled readOnly />
            <Field label="Phone number" name="phone" type="tel" defaultValue={user.phone || ""} maxLength={30} />
            <ImageUpload currentUrl={image.imageUrl} onChange={setImage} label="Profile image" />
            <div className="flex justify-end border-t border-line pt-4">
              <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
