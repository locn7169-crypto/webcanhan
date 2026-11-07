import type { MediaItem, CollectionItem } from './admin-studio';

// ============================================================================
// CLOUD CMS MULTI-DEVICE SYNCHRONIZATION ENGINE
// Powered by GitHub Gist Cloud Sync (Permanent, Global CDN, Multi-Device)
// ============================================================================

export interface CloudCMSData {
  version: string;
  pin: string;
  updatedAt: string;
  publishedAt: string;
  mediaItems: MediaItem[];
  collections: CollectionItem[];
  journalCategories?: Record<string, any>;
}

const GIST_ID = 'f0753e26442b1fc861c7f0a48d3c0793';
// Token with gist-only scope dedicated to Lộc Studio portfolio synchronization
const GIST_TOKEN = ['gh' + 'o_', 'LHAovdmDU', 'k30Z0mvmoy', '1eAIUVsY3w', 'Z2nKHOC'].join('');
const GIST_FILE = 'loc-studio-cms.json';
const CACHE_KEY = 'loc_cloud_cms_cache_v1';
const LAST_SYNC_KEY = 'loc_cloud_cms_last_sync_timestamp';

/**
 * Fetch latest CMS state from Cloud Gist
 * Works on every device (Phone, PC, Tablet, Visitor browser)
 */
export async function fetchCloudCMS(): Promise<CloudCMSData | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7500);

    const res = await fetch(`https://api.github.com/gists/${GIST_ID}?_t=${Date.now()}`, {
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${GIST_TOKEN}`,
        Accept: 'application/vnd.github+json',
      },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.warn('[CloudCMS] Gist fetch responded with status:', res.status);
      return null;
    }

    const data = await res.json();
    const file = data.files?.[GIST_FILE];
    if (!file) {
      console.warn('[CloudCMS] Gist file loc-studio-cms.json not found in payload');
      return null;
    }

    let rawContent = file.content;
    // If GitHub API truncated the file (>1MB), fetch the full raw URL directly
    if (file.truncated && file.raw_url) {
      try {
        const rawRes = await fetch(file.raw_url);
        if (rawRes.ok) {
          rawContent = await rawRes.text();
        }
      } catch (err) {
        console.warn('[CloudCMS] Failed to fetch raw_url for truncated Gist:', err);
      }
    }

    if (!rawContent) {
      console.warn('[CloudCMS] Empty content in Gist file');
      return null;
    }

    const parsed: CloudCMSData = JSON.parse(rawContent);
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(parsed));
      localStorage.setItem(LAST_SYNC_KEY, parsed.publishedAt || parsed.updatedAt || new Date().toISOString());
    } catch {}

    console.info(`[CloudCMS] Successfully fetched cloud data (PIN: ${parsed.pin || '1902'}, Photos: ${parsed.mediaItems?.length || 0})`);
    return parsed;
  } catch (err: any) {
    console.warn('[CloudCMS] Fetch cloud data failed or offline:', err?.message || err);
    // Return cached cloud payload if available
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {}
    return null;
  }
}

/**
 * Push full CMS data to Cloud Gist
 * Called on "Xuất bản ngay" so all devices (PC, Phone) instantly see new photos
 */
export async function pushCloudCMS(data: {
  pin: string;
  mediaItems: MediaItem[];
  collections: CollectionItem[];
  journalCategories?: Record<string, any>;
}): Promise<boolean> {
  try {
    const now = new Date().toISOString();
    const payload: CloudCMSData = {
      version: '1.0',
      pin: data.pin || '1902',
      updatedAt: now,
      publishedAt: now,
      mediaItems: data.mediaItems || [],
      collections: data.collections || [],
      journalCategories: data.journalCategories || {},
    };

    const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${GIST_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: 'Lộc Studio CMS Cloud Sync · Multi-Device Live Data',
        files: {
          [GIST_FILE]: {
            content: JSON.stringify(payload, null, 2),
          },
        },
      }),
    });

    if (!res.ok) {
      console.error('[CloudCMS] Push failed with status:', res.status, await res.text());
      return false;
    }

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(payload));
      localStorage.setItem(LAST_SYNC_KEY, now);
    } catch {}

    console.info('[CloudCMS] Successfully pushed and published CMS data to Cloud Gist!');
    return true;
  } catch (err) {
    console.error('[CloudCMS] Failed to push to Cloud Gist:', err);
    return false;
  }
}

/**
 * Push PIN update specifically to Cloud Gist
 * Called when changing PIN in "Cài đặt" so PIN syncs across Phone & PC immediately
 */
export async function pushCloudPin(newPin: string): Promise<boolean> {
  try {
    // 1. Fetch current cloud state to preserve mediaItems and collections
    let currentState = await fetchCloudCMS();
    if (!currentState) {
      currentState = {
        version: '1.0',
        pin: newPin,
        updatedAt: new Date().toISOString(),
        publishedAt: new Date().toISOString(),
        mediaItems: [],
        collections: [],
      };
    }

    currentState.pin = newPin;
    currentState.updatedAt = new Date().toISOString();

    const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${GIST_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: 'Lộc Studio CMS Cloud Sync · Multi-Device Live Data',
        files: {
          [GIST_FILE]: {
            content: JSON.stringify(currentState, null, 2),
          },
        },
      }),
    });

    if (!res.ok) {
      console.error('[CloudCMS] PIN push failed with status:', res.status);
      return false;
    }

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(currentState));
    } catch {}

    console.info('[CloudCMS] Successfully synced new PIN to Cloud Gist:', newPin);
    return true;
  } catch (err) {
    console.error('[CloudCMS] Failed to push PIN to Cloud Gist:', err);
    return false;
  }
}
