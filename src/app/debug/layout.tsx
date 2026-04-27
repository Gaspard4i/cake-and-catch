import { notFound } from "next/navigation";

/**
 * /debug/* is a developer-only area (pivot tuner, snack 3D inspector,
 * berry inspector). Gate it off in production deployments so visitors
 * never land on it. Keeping this in a layout means every nested route
 * (and any future addition) is protected by default.
 *
 * The opt-in env var DEBUG_ROUTES=1 lets us enable it on a preview
 * deployment when needed.
 */
export default function DebugLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production" && process.env.DEBUG_ROUTES !== "1") {
    notFound();
  }
  return <>{children}</>;
}
