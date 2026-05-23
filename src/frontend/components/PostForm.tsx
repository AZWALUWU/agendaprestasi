import { useState, useEffect } from "react";
import { useAuth } from "@frontend/hooks/use-auth";
import { Button } from "@frontend/components/ui/button";
import { Input } from "@frontend/components/ui/input";
import { Label } from "@frontend/components/ui/label";
import { Textarea } from "@frontend/components/ui/textarea";
import { slugify } from "@frontend/lib/helpers";
import { uploadPostImage, type Post, type PostInsert } from "@backend/queries/posts";
import {
  ALL_CATEGORIES,
  CATEGORY_CONFIG,
  ALL_TAGS,
  TAG_CONFIG,
  type Category,
  type PostTag,
} from "@frontend/lib/getCategoryConfig";
import { toast } from "sonner";
import { Upload, Eye, Code } from "lucide-react";
import DOMPurify from "dompurify";

interface PostFormProps {
  initialData?: Post;
  onSubmit: (data: PostInsert) => void;
  loading?: boolean;
}

export function PostForm({ initialData, onSubmit, loading }: PostFormProps) {
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [content, setContent] = useState(initialData?.content ?? "");
  const [category, setCategory] = useState<Category>(
    (initialData?.category as Category) ?? "scholarship"
  );
  const [tags, setTags] = useState<PostTag[]>(
    (initialData?.tags as PostTag[]) ?? []
  );
  const [openDate, setOpenDate] = useState(initialData?.open_date ?? "");
  const [deadline, setDeadline] = useState(initialData?.deadline ?? "");
  const [announcementDate, setAnnouncementDate] = useState(
    initialData?.announcement_date ?? ""
  );
  const [link, setLink] = useState(initialData?.link ?? "");
  const [imageUrl, setImageUrl] = useState(initialData?.image_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [autoSlug, setAutoSlug] = useState(!initialData);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (autoSlug) setSlug(slugify(title));
  }, [title, autoSlug]);

  const { user } = useAuth();

  const handleTagToggle = (tag: PostTag) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran file maksimal 5MB");
      return;
    }
    setUploading(true);
    try {
      if (!user?.id) throw new Error("Not authenticated");
      const url = await uploadPostImage(file, user.id);
      setImageUrl(url);
      toast.success("Gambar berhasil diupload");
    } catch (err: any) {
      toast.error(err.message || "Gagal upload gambar");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (status: "draft" | "published") => {
    if (!title.trim()) { toast.error("Judul harus diisi"); return; }
    if (!slug.trim()) { toast.error("Slug harus diisi"); return; }
    onSubmit({
      title: title.trim(),
      slug: slug.trim(),
      description: description.trim() || null,
      content: content.trim() || null,
      category,
      tags,
      open_date: openDate || null,
      deadline: deadline || null,
      announcement_date: announcementDate || null,
      link: link.trim() || null,
      image_url: imageUrl || null,
      status,
    });
  };

  const safePreview = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "b", "em", "i", "u", "s",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li", "a", "img",
      "table", "thead", "tbody", "tr", "th", "td",
      "blockquote", "pre", "code", "div", "span", "hr",
    ],
    ALLOWED_ATTR: ["href", "src", "alt", "target", "rel", "class", "style"],
  });

  return (
    <div className="space-y-6 rounded-xl border bg-card p-6 shadow-sm">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="title">Judul *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Judul post"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug *</Label>
          <Input
            id="slug"
            value={slug}
            onChange={(e) => { setSlug(e.target.value); setAutoSlug(false); }}
            placeholder="judul-post"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Deskripsi</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Deskripsi singkat..."
          rows={3}
        />
      </div>

      {/* Kategori */}
      <div className="space-y-2">
        <Label>Kategori *</Label>
        <div className="flex flex-wrap gap-4">
          {ALL_CATEGORIES.map((val) => (
            <label key={val} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name="category"
                value={val}
                checked={category === val}
                onChange={() => setCategory(val)}
                className="accent-primary"
              />
              <span className="text-sm">{CATEGORY_CONFIG[val].label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <Label>
          Tags
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            (Pilih semua yang sesuai)
          </span>
        </Label>
        <div className="flex flex-wrap gap-2">
          {ALL_TAGS.map((tag) => {
            const config = TAG_CONFIG[tag];
            const selected = tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => handleTagToggle(tag)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-all border ${
                  selected
                    ? config.pillClass + " ring-2 ring-offset-1 ring-primary/50"
                    : "bg-secondary text-muted-foreground border-border hover:bg-secondary/80"
                }`}
              >
                {selected && <span className="mr-1">✓</span>}
                {config.label}
              </button>
            );
          })}
        </div>
        {tags.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {tags.length} tag dipilih:{" "}
            {tags.map((t) => TAG_CONFIG[t].label).join(", ")}
          </p>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="openDate">Tanggal Buka Pendaftaran</Label>
          <Input
            id="openDate"
            type="date"
            value={openDate}
            onChange={(e) => setOpenDate(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="deadline">Tanggal Penutupan / Deadline</Label>
          <Input
            id="deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="announcementDate">Tanggal Pengumuman</Label>
          <Input
            id="announcementDate"
            type="date"
            value={announcementDate}
            onChange={(e) => setAnnouncementDate(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="link">Link Eksternal</Label>
        <Input
          id="link"
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://..."
        />
      </div>

      <div className="space-y-2">
        <Label>Cover Image</Label>
        <div className="flex items-center gap-4">
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Cover"
              className="h-20 w-32 rounded-lg object-cover border"
            />
          )}
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
            <Upload className="h-4 w-4" />
            {uploading ? "Mengupload..." : "Upload Gambar"}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <Label htmlFor="content">Konten</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              Gunakan HTML untuk formatting (contoh: &lt;h3&gt;, &lt;ul&gt;, &lt;strong&gt;)
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="gap-2"
          >
            {showPreview ? (
              <><Code className="h-3.5 w-3.5" /> Edit HTML</>
            ) : (
              <><Eye className="h-3.5 w-3.5" /> Preview</>
            )}
          </Button>
        </div>

        {showPreview ? (
          <div
            className="prose prose-neutral min-h-[200px] max-w-none rounded-lg border bg-background px-4 py-3 text-sm text-foreground"
            dangerouslySetInnerHTML={{ __html: safePreview }}
          />
        ) : (
          <Textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="<p>Isi konten...</p>"
            rows={12}
            className="font-mono text-sm"
          />
        )}
      </div>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => handleSubmit("draft")}
          disabled={loading}
        >
          Simpan Draft
        </Button>
        <Button onClick={() => handleSubmit("published")} disabled={loading}>
          {loading ? "Menyimpan..." : "Publish"}
        </Button>
      </div>
    </div>
  );
}