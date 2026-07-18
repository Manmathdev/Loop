import { registerPlugin } from "@capacitor/core";

export interface ShareIntentPlugin {
  getSharedUrl(): Promise<{ url: string | null; received: boolean }>;
  clear(): Promise<void>;
}

export const ShareIntent = registerPlugin<ShareIntentPlugin>("ShareIntent");

export async function getSharedUrl(): Promise<string | null> {
  try {
    const result = await ShareIntent.getSharedUrl();
    if (result.received && result.url) return result.url;
  } catch {}
  return null;
}

export async function clearSharedUrl(): Promise<void> {
  try {
    await ShareIntent.clear();
  } catch {}
}
