import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Calendar } from "lucide-react";
import { fetchPostBySlug } from "@backend/queries/posts";
import { supabase } from "@backend/supabase/client";
import { getDeadlineStatus, formatDeadline } from "@frontend/lib/helpers";
import { getPostStatus } from "@frontend/lib/getPostStatus";
import { getCategoryConfig, getTagConfig } from "@frontend/lib/getCategoryConfig";
import { StatusBadge } from "@frontend/components/StatusBadge";
import { BookmarkButton } from "@frontend/components/BookmarkButton";
import { Button } from "@frontend/components/ui/button";
import { Skeleton } from "@frontend/components/ui/skeleton";
import { Navbar } from "@frontend/components/Navbar";
import { useAuth } from "@frontend/hooks/use-auth";
import DOMPurify from "dompurify";
import { track } from "@/lib/analytics/events";
import { EVENTS } from "@/lib/analytics/event-names";
import { useEffect } from "react";
import { posthog } from "@/lib/posthog/client";

export const Route = createFileRoute("/posts/$slug")({
  component: PostDetailPage,
});

const deadlineClasses: Record<string, string> = {
  green: "bg-deadline-green text-deadline-green-foreground",
  yellow: "bg-deadline-yellow text-deadline-yellow-foreground",
  red: "bg-deadline-red text-deadline-red-foreground",
  gray: "bg-deadline-gray text-deadline-gray-foreground",
};

function PostDetailPage() {
  const { slug } = Route.useParams();
  const { loading: authLoading } = useAuth();

  const { data: post, isLoading, error } = useQuery({
    queryKey: ["post", slug],
    queryFn: () => fetchPostBySlug(slug),
    enabled: !authLoading,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  // =========================
  // POST VIEW TRACKING
  // =========================
  useEffect(() => {
    if (!post) return;
    posthog.capture("post_viewed", {
      post_id: post.id,
      slug: post.slug,
      title: post.title,
      category: post.category,
      tags: post.tags,
    });
  }, [post]);

  useEffect(() => {
    if (!post) return;
    track(EVENTS.POST_VIEWED, {
      post_id: post.id,
      slug: post.slug,
      title: post.title,
      category: post.category,
      tags: post.tags,
    });
  }, [post]);

  // =========================
  // LOADING & ERROR STATES
  // =========================
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto max-w-3xl px-4 py-8">
          <Skeleton className="mb-6 h-8 w-32" />
          <Skeleton className="aspect-video w-full rounded-xl" />
          <Skeleton className="mt-6 h-10 w-3/4" />
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <h2 className="text-xl font-semibold">Post tidak ditemukan</h2>
          <Link to="/" className="mt-4 text-primary hover:underline">Kembali ke Beranda</Link>
        </div>
      </div>
    );
  }

  // =========================
  // DERIVED VALUES & SANITIZE
  // =========================
  const deadlineStatus = getDeadlineStatus(post.deadline);
  const postStatus = getPostStatus(post);
  const categoryConfig = getCategoryConfig(post.category);
  const postTags = post.tags ?? [];

  const safeContent = post.content
    ? DOMPurify.sanitize(post.content, {
        ALLOWED_TAGS: [
          "p", "br", "strong", "b", "em", "i", "u", "s", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "a", 
          "img", "table", "thead", "tbody", "tr", "th", "td", "blockquote", "pre", "code", "div", "span", "hr",
        ],
        ALLOWED_ATTR: ["href", "src", "alt", "target", "rel", "class", "style"],
      })
    : null;

  // =========================
  // RENDER
  // =========================
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <article className="mx-auto max-w-3xl px-4 py-8">
        <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>

        {post.image_url ? (
          <div className="relative mb-8 overflow-hidden rounded-xl">
            <img src={post.image_url} alt={post.title} className="w-full object-cover" style={{ maxHeight: 400 }} />
            <StatusBadge status={postStatus} className="absolute top-3 right-3" />
          </div>
        ) : (
          <div className="mb-4 flex justify-end">
            <StatusBadge status={postStatus} />
          </div>
        )}

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${categoryConfig.pillClass}`}>
            {categoryConfig.label}
          </span>

          {post.deadline && (
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${deadlineClasses[deadlineStatus]}`}>
              <Calendar className="h-3 w-3" />
              {formatDeadline(post.deadline)}
            </span>
          )}

          <BookmarkButton postId={post.id} variant="detail" />
        </div>

        {/* TAGS */}
        {postTags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-1.5">
            {postTags.map((tag) => {
              const tagConfig = getTagConfig(tag);
              return (
                <span key={tag} className={`rounded-full px-3 py-1 text-xs font-medium ${tagConfig.pillClass}`}>
                  {tagConfig.label}
                </span>
              );
            })}
          </div>
        )}

        <h1 className="text-2xl font-bold text-foreground md:text-3xl">{post.title}</h1>

        {post.description && <p className="mt-4 leading-relaxed text-muted-foreground">{post.description}</p>}

        {safeContent && (
          <div className="prose prose-neutral mt-8 max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: safeContent }} />
        )}

        {post.link && (
          <div className="mt-8">
            <a
              href={post.link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                track(EVENTS.EXTERNAL_LINK_CLICKED, { post_id: post.id, slug: post.slug, category: post.category });
                posthog.capture("post_external_click", { post_id: post.id, slug: post.slug, category: post.category });
              }}
            >
              <Button size="lg" className="gap-2">
                Kunjungi Situs Resmi <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          </div>
        )}
      </article>
    </div>
  );
}