import { Alert, Platform } from "react-native";

/** True when an API error was a plan / storage limit (HTTP 402). */
export function isPlanLimit(e: any): boolean {
  return !!(e && e.planLimit);
}

/**
 * Show a friendly "limit reached" prompt with an upgrade action.
 * `onUpgrade` should navigate to /pricing.
 */
export function showPlanLimit(
  e: any,
  onUpgrade: () => void,
  labels?: { title?: string; view?: string; cancel?: string }
) {
  const msg = (e && e.message) || "You've reached your plan limit.";
  const title = labels?.title || "Plan limit reached";
  const view = labels?.view || "View plans";
  const cancel = labels?.cancel || "Not now";
  if (Platform.OS === "web") {
    const go = (globalThis as any)?.confirm?.(`${msg}\n\n${view}?`);
    if (go) onUpgrade();
    return;
  }
  Alert.alert(title, msg, [
    { text: cancel, style: "cancel" },
    { text: view, onPress: onUpgrade },
  ]);
}

/** Combined helper: if `e` is a plan-limit error, prompt & return true. */
export function handlePlanLimit(
  e: any,
  onUpgrade: () => void,
  labels?: { title?: string; view?: string; cancel?: string }
): boolean {
  if (!isPlanLimit(e)) return false;
  showPlanLimit(e, onUpgrade, labels);
  return true;
}
