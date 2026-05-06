import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@frontend/hooks/use-auth";
import { supabase } from "@backend/supabase/client";
import { Button } from "@frontend/components/ui/button";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [pending, setPending] = useState(false);

  // Redirect jika sudah login
  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/" });
    }
  }, [user, loading, navigate]);

  const handleGoogleLogin = async () => {
    setPending(true);

    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth/callback`,
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (error) {
        console.error("OAuth error:", error);
        toast.error("Gagal masuk dengan Google");
        setPending(false);
      }

      // Tidak perlu navigate karena akan redirect ke Google
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error("Terjadi kesalahan");
      setPending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center">
        {/* Branding */}
        <div className="mb-8">
          <Link to="/" className="text-3xl font-bold text-primary">
            Agenda Prestasi
          </Link>
          <p className="mt-3 text-base text-muted-foreground leading-relaxed">
            Temukan beasiswa dan lomba
            <br />
            terbaik untukmu
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-foreground">
            Masuk ke Akun
          </h2>
          <p className="text-sm text-muted-foreground">
            Simpan beasiswa &amp; lomba favoritmu
          </p>

          <Button
            onClick={handleGoogleLogin}
            disabled={pending}
            variant="outline"
            className="w-full gap-3 py-5 text-sm font-medium"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 001 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {pending ? "Memproses..." : "Lanjutkan dengan Google"}
          </Button>
        </div>

        {/* Fine print */}
        <p className="mt-6 text-xs text-muted-foreground">
          Dengan masuk, kamu menyetujui{" "}
          <span className="underline cursor-pointer">
            Syarat &amp; Ketentuan
          </span>{" "}
          kami
        </p>
      </div>
    </div>
  );
}