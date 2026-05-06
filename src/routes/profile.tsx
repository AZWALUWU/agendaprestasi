import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { User, Bookmark, Mail, ExternalLink, Download, Smartphone } from "lucide-react";
import { Navbar } from "@frontend/components/Navbar";
import { useAuth } from "@frontend/hooks/use-auth";
import { useBookmarkedPosts } from "@frontend/hooks/useBookmarks";
import { usePWAInstall } from "@frontend/hooks/usePWAInstall";
import { PostCard } from "@frontend/components/PostCard";
import { PostCardSkeleton } from "@frontend/components/PostCardSkeleton";
import { UserAvatar } from "@frontend/components/ui/UserAvatar";
import { Button } from "@frontend/components/ui/button";
import type { Post } from "@backend/queries/posts";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"profil" | "disimpan">("profil");

  // Wait for auth to finish before deciding to redirect
  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="mx-auto max-w-4xl px-4 py-12">
          <PostCardSkeleton />
        </div>
      </div>
    );
  }

  if (!user) {
    navigate({ to: "/login" });
    return null;
  }

  const email = user?.email ?? "";
  const createdAt = user?.created_at
    ? new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(user.created_at))
    : "-";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <UserAvatar email={email} size="md" />
          <div>
            <p className="font-semibold text-foreground">{email}</p>
            <p className="text-sm text-muted-foreground">Bergabung sejak {createdAt}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8 flex gap-1 rounded-lg border bg-card p-1">
          <button
            onClick={() => setActiveTab("profil")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === "profil"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <User className="h-4 w-4" />
            Profil
          </button>
          <DisimpanTabButton active={activeTab === "disimpan"} onClick={() => setActiveTab("disimpan")} />
        </div>

        {activeTab === "profil" ? (
          <ProfilTab email={email} createdAt={createdAt} />
        ) : (
          <DisimpanTab />
        )}
      </div>
    </div>
  );
}

function DisimpanTabButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  const { data: bookmarks } = useBookmarkedPosts();
  const posts = bookmarks?.map((b) => b.post).filter(Boolean) ?? [];

  return (
    <button
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Bookmark className="h-4 w-4" />
      Disimpan
      {posts.length > 0 && (
        <span className={`ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
          active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-primary/10 text-primary"
        }`}>
          {posts.length}
        </span>
      )}
    </button>
  );
}

function ProfilTab({ email, createdAt }: { email: string; createdAt: string }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-6">
        <h3 className="mb-4 text-base font-semibold text-foreground">Informasi Akun</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm font-medium text-foreground">{email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Bergabung</span>
            <span className="text-sm font-medium text-foreground">{createdAt}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <span className="text-sm font-medium text-foreground">Pengguna Aktif</span>
          </div>
        </div>
      </div>

      <ContactCard />
    </div>
  );
}

function ContactCard() {
  const { canInstall, isInstalled, install } = usePWAInstall();

  const handleInstall = async () => {
    await install();
  };

  return (
    <div className="rounded-xl border bg-card p-6">
      <h3 className="mb-4 text-base font-semibold text-foreground">Hubungi Kami</h3>

      <div className="space-y-3">
        {/* Instagram */}
        <a
          href="https://instagram.com/agendaprestasi"
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-3 rounded-lg border border-border p-3 transition-all duration-150 hover:border-pink-300 hover:bg-pink-50 dark:hover:bg-pink-950/20"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-purple-500 via-pink-500 to-orange-400 text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
            </svg>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">Instagram</p>
            <p className="truncate text-xs text-muted-foreground group-hover:text-pink-600 dark:group-hover:text-pink-400">
              @agendaprestasi
            </p>
          </div>

          <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground/50 group-hover:text-pink-500" />
        </a>

        {/* Install PWA */}
        {isInstalled ? (
          <div className="flex items-center gap-3 rounded-lg border border-border p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">Aplikasi Terpasang</p>
              <p className="truncate text-xs text-muted-foreground">
                Kamu sudah memasang Agenda Prestasi.
              </p>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleInstall}
            disabled={!canInstall}
            className="group flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-all duration-150 hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-border disabled:hover:bg-transparent"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Download className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">Install Aplikasi</p>
              <p className="truncate text-xs text-muted-foreground group-hover:text-primary">
                {canInstall
                  ? "Pasang Agenda Prestasi di perangkatmu"
                  : "Buka di Chrome/Edge versi published untuk install"}
              </p>
            </div>
            <Smartphone className="h-4 w-4 shrink-0 text-muted-foreground/50 group-hover:text-primary" />
          </button>
        )}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Ada pertanyaan atau saran? Jangan ragu untuk menghubungi kami.
      </p>
    </div>
  );
}

function DisimpanTab() {
  const { data: bookmarks, isLoading } = useBookmarkedPosts();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <PostCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  const posts = bookmarks?.map((b) => b.post).filter(Boolean) ?? [];

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-16 text-center">
        <Bookmark className="mb-4 h-12 w-12 text-muted-foreground/30" />
        <h3 className="text-lg font-semibold text-muted-foreground">Belum ada yang disimpan</h3>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground/70">
          Temukan beasiswa dan lomba menarik untuk disimpan
        </p>
        <Link to="/" className="mt-6">
          <Button variant="outline" className="gap-1">
            Jelajahi Sekarang →
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((p) => (
        <PostCard key={(p as Post).id} post={p as Post} />
      ))}
    </div>
  );
}
