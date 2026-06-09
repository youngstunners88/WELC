"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

declare global {
  interface Window {
    Kakao?: {
      isInitialized: () => boolean;
      init: (key: string) => void;
      Share?: {
        sendDefault: (opts: unknown) => void;
      };
    };
  }
}

const SDK_SRC = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js";

/**
 * "Share to KakaoTalk" — posts class info into a Kakao chat the user picks.
 * Requires NEXT_PUBLIC_KAKAO_JS_KEY; without it we fall back to copying the
 * message so the owner can paste it into their existing group chat.
 */
export function KakaoShareButton({
  text,
  url,
  label,
  copiedLabel,
}: {
  text: string;
  url: string;
  label: string;
  copiedLabel: string;
}) {
  const jsKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!jsKey) return;
    if (window.Kakao?.isInitialized()) {
      setReady(true);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SDK_SRC}"]`
    );
    const onLoad = () => {
      try {
        if (window.Kakao && !window.Kakao.isInitialized()) {
          window.Kakao.init(jsKey);
        }
        setReady(true);
      } catch {
        setReady(false);
      }
    };
    if (existing) {
      existing.addEventListener("load", onLoad);
      if (window.Kakao) onLoad();
      return () => existing.removeEventListener("load", onLoad);
    }
    const script = document.createElement("script");
    script.src = SDK_SRC;
    script.async = true;
    script.onload = onLoad;
    document.head.appendChild(script);
  }, [jsKey]);

  async function onClick() {
    if (ready && window.Kakao?.Share) {
      window.Kakao.Share.sendDefault({
        objectType: "text",
        text,
        link: { mobileWebUrl: url, webUrl: url },
      });
      return;
    }
    // Fallback: copy so the user can paste into their Kakao group chat.
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      toast.success(copiedLabel);
    } catch {
      toast.error(text);
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="gap-2 border-[#FEE500] bg-[#FEE500]/20 text-[#3c1e1e] hover:bg-[#FEE500]/40"
      onClick={onClick}
    >
      <Share2 className="h-4 w-4" />
      {label}
    </Button>
  );
}
