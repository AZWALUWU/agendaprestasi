import { useCallback, useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function usePWAInstall() {
  const getPrompt = () =>
    typeof window !== "undefined"
      ? ((window as any).__PWA_PROMPT__ as BeforeInstallPromptEvent | null)
      : null;

  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(getPrompt());

  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const sync = () => {
      setDeferredPrompt(getPrompt());
    };

    const installedCheck = () => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone === true;

      setIsInstalled(standalone);
    };

    installedCheck();

    window.addEventListener("beforeinstallprompt", sync);
    window.addEventListener("appinstalled", installedCheck);

    return () => {
      window.removeEventListener("beforeinstallprompt", sync);
      window.removeEventListener("appinstalled", installedCheck);
    };
  }, []);

  const install = useCallback(async () => {
    const prompt = getPrompt();
    if (!prompt) return false;

    await prompt.prompt();
    const choice = await prompt.userChoice;

    (window as any).__PWA_PROMPT__ = null;
    setDeferredPrompt(null);

    return choice.outcome === "accepted";
  }, []);

  return {
    isInstalled,
    canInstall: !!deferredPrompt,
    install,
  };
}