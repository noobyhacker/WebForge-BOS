import { useFeatureFlag } from "@/hooks/useFeatureFlags";
import type { ReactNode } from "react";

interface FeatureGateProps {
  flagKey: string;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Conditionally renders children only when the feature flag with the given key is enabled.
 * Optionally renders a fallback when the flag is disabled.
 */
export function FeatureGate({ flagKey, children, fallback = null }: FeatureGateProps) {
  const isEnabled = useFeatureFlag(flagKey);
  return <>{isEnabled ? children : fallback}</>;
}
