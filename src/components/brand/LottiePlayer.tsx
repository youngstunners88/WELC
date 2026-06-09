"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// lottie-react touches `document`, so load it client-side only.
const Lottie = dynamic(() => import("lottie-react"), { ssr: false });

/**
 * Lightweight Lottie wrapper. Fetches the animation JSON from /public at runtime
 * (keeps it out of the JS bundle) and respects prefers-reduced-motion.
 */
export function LottiePlayer({
  src,
  className,
  loop = true,
}: {
  src: string;
  className?: string;
  loop?: boolean;
}) {
  const [data, setData] = useState<unknown>(null);
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    let active = true;
    fetch(src)
      .then((r) => r.json())
      .then((j) => active && setData(j))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [src]);

  useEffect(() => {
    setReduce(
      Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches)
    );
  }, []);

  if (!data) return <div className={className} aria-hidden />;

  return (
    <Lottie
      animationData={data}
      loop={loop}
      autoplay={!reduce}
      className={className}
      aria-hidden
    />
  );
}
