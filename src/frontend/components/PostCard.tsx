import { Link } from "@tanstack/react-router";
import { Calendar, Clock, Megaphone } from "lucide-react";
import type { Post } from "@backend/queries/posts";
import { getPostStatus } from "@frontend/lib/getPostStatus";
import { getCategoryConfig, getTagConfig } from "@frontend/lib/getCategoryConfig";
import { formatDateID } from "@frontend/lib/formatDate";
import { StatusBadge } from "@frontend/components/StatusBadge";

type DateTone = "open" | "deadline" | "announcement";

function DateRow({
  icon: Icon,
  label,
  date,
  tone = "open",
}: {
  icon: React.ElementType;
  label: string;
  date: string | null;
  tone?: DateTone;
}) {
  if (!date) return null;

  const toneClass =
    tone === "deadline"
      ? "text-red-600 dark:text-red-400"
      : tone === "announcement"
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-blue-600 dark:text-blue-400";

  const valueClass =
    tone === "deadline"
      ? "text-red-600 dark:text-red-400 font-semibold"
      : "text-foreground font-medium";

  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon className={`h-3.5 w-3.5 shrink-0 ${toneClass}`} />
      <span className={`w-20 shrink-0 ${toneClass}`}>{label}</span>
      <span className={valueClass}>{formatDateID(date)}</span>
    </div>
  );
}

export function PostCard({ post }: { post: Post }) {
  const postStatus = getPostStatus(post);
  const categoryConfig = getCategoryConfig(post.category);
  const hasAnyDate = post.open_date || post.deadline || post.announcement_date;
  const postTags = post.tags ?? [];

  return (
    <Link
      to="/posts/$slug"
      params={{ slug: post.slug }}
      className="group relative flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:shadow-md"
    >
      <StatusBadge status={postStatus} className="mb-4 flex justify-center" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${categoryConfig.pillClass}`}>
            {categoryConfig.label}
          </span>
          {postTags.slice(0, 2).map((tag) => {
            const tagConfig = getTagConfig(tag);
            return (
              <span
                key={tag}
                className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${tagConfig.pillClass}`}
              >
                {tagConfig.label}
              </span>
            );
          })}
          {postTags.length > 2 && (
            <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-secondary text-muted-foreground">
              +{postTags.length - 2}
            </span>
          )}
        </div>

        <h3 className="line-clamp-2 text-base font-semibold text-card-foreground group-hover:text-primary transition-colors">
          {post.title}
        </h3>

        {post.description && (
          <p className="line-clamp-3 text-sm text-muted-foreground">
            {post.description}
          </p>
        )}

        {hasAnyDate && (
          <div className="mt-2 space-y-1.5 border-t pt-3">
            <DateRow icon={Calendar} label="Buka" date={post.open_date} tone="open" />
            <DateRow icon={Clock} label="Tutup" date={post.deadline} tone="deadline" />
            <DateRow icon={Megaphone} label="Pengumuman" date={post.announcement_date} tone="announcement" />
          </div>
        )}

        <span className="mt-auto pt-2 text-sm font-medium text-primary">
          Lihat Detail →
        </span>
      </div>
    </Link>
  );
}