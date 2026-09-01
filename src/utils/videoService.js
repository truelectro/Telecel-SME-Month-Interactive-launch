// ========================================================
// VIDEO SERVICE & SUPABASE STORAGE RESOLVER FOR TELECEL SME LAUNCH
// ========================================================

const STORAGE_KEY = 'telecel_launch_video_config';

// High-reliability default demo video fallbacks (used when no custom Supabase URLs are set)
const DEFAULT_DEMO_VIDEOS = {
  video1: {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    title: 'TELECEL SME MONTH • LAUNCH VIDEO (VIDEO 1)',
    source: 'Default Tech Showcase 1',
  },
  video2: {
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    title: 'TELECEL SME SOLUTIONS • SPOTLIGHT (VIDEO 2)',
    source: 'Default Tech Showcase 2',
  },
};

/**
 * Clean URL formatting helper
 */
function cleanUrl(url = '') {
  return url.trim().replace(/\/+$/, '');
}

/**
 * Encode URI component safely without double-encoding
 */
function safeEncodePath(p = '') {
  const parts = p.trim().replace(/^\/+/, '').split('/');
  return parts.map(part => {
    try {
      return decodeURIComponent(part) !== part ? part : encodeURIComponent(part);
    } catch (e) {
      return encodeURIComponent(part);
    }
  }).join('/');
}

/**
 * Build public Supabase Storage URL from components
 */
export function buildSupabasePublicUrl(supabaseUrl, bucket, filePath) {
  if (!filePath) return '';
  const trimmedPath = filePath.trim();
  
  // If already a full URL, return directly
  if (trimmedPath.startsWith('http://') || trimmedPath.startsWith('https://')) {
    return trimmedPath;
  }

  if (!supabaseUrl || !bucket) return '';

  const baseUrl = cleanUrl(supabaseUrl);
  const cleanBucket = safeEncodePath(bucket);
  const cleanFile = safeEncodePath(trimmedPath);

  return `${baseUrl}/storage/v1/object/public/${cleanBucket}/${cleanFile}`;
}

/**
 * Get current video configuration (merging localStorage, env vars, and defaults)
 */
export function getVideoConfig() {
  let localData = {};
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        localData = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Could not read video config from localStorage:', e);
    }
  }

  // Environment variables
  const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};

  const supabaseUrl = localData.supabaseUrl ?? env.VITE_SUPABASE_URL ?? '';
  const supabaseAnonKey = localData.supabaseAnonKey ?? env.VITE_SUPABASE_ANON_KEY ?? '';
  const bucket = localData.bucket ?? env.VITE_SUPABASE_BUCKET ?? 'SME Month Videos';
  const video1Path = localData.video1Path ?? env.VITE_SUPABASE_VIDEO_1_PATH ?? 'vid 1_L.mp4';
  const video2Path = localData.video2Path ?? env.VITE_SUPABASE_VIDEO_2_PATH ?? 'Vid 2_L.mp4';

  const directVideo1Url = localData.video1Url ?? env.VITE_VIDEO_1_URL ?? '';
  const directVideo2Url = localData.video2Url ?? env.VITE_VIDEO_2_URL ?? '';

  const video1Title = localData.video1Title || env.VITE_VIDEO_1_TITLE || 'TELECEL SME MONTH • LAUNCH VIDEO';
  const video2Title = localData.video2Title || env.VITE_VIDEO_2_TITLE || 'TELECEL SME SOLUTIONS • SPOTLIGHT';

  // Resolve Video 1 URL
  let resolvedVideo1Url = '';
  let video1Source = '';
  if (directVideo1Url.trim()) {
    resolvedVideo1Url = directVideo1Url.trim();
    video1Source = 'Direct Supabase / CDN URL';
  } else if (video1Path.trim().startsWith('http://') || video1Path.trim().startsWith('https://')) {
    resolvedVideo1Url = video1Path.trim();
    video1Source = 'Supabase Storage Direct URL';
  } else if (supabaseUrl.trim() && bucket.trim() && video1Path.trim()) {
    resolvedVideo1Url = buildSupabasePublicUrl(supabaseUrl, bucket, video1Path);
    video1Source = 'Supabase Storage Bucket';
  } else {
    resolvedVideo1Url = DEFAULT_DEMO_VIDEOS.video1.url;
    video1Source = 'Default Fallback Demo';
  }

  // Resolve Video 2 URL
  let resolvedVideo2Url = '';
  let video2Source = '';
  if (directVideo2Url.trim()) {
    resolvedVideo2Url = directVideo2Url.trim();
    video2Source = 'Direct Supabase / CDN URL';
  } else if (video2Path.trim().startsWith('http://') || video2Path.trim().startsWith('https://')) {
    resolvedVideo2Url = video2Path.trim();
    video2Source = 'Supabase Storage Direct URL';
  } else if (supabaseUrl.trim() && bucket.trim() && video2Path.trim()) {
    resolvedVideo2Url = buildSupabasePublicUrl(supabaseUrl, bucket, video2Path);
    video2Source = 'Supabase Storage Bucket';
  } else {
    resolvedVideo2Url = DEFAULT_DEMO_VIDEOS.video2.url;
    video2Source = 'Default Fallback Demo';
  }

  return {
    supabaseUrl,
    supabaseAnonKey,
    bucket,
    video1Path,
    video2Path,
    directVideo1Url,
    directVideo2Url,
    video1: {
      url: resolvedVideo1Url,
      title: video1Title,
      source: video1Source,
      isCustom: video1Source !== 'Default Fallback Demo',
    },
    video2: {
      url: resolvedVideo2Url,
      title: video2Title,
      source: video2Source,
      isCustom: video2Source !== 'Default Fallback Demo',
    },
  };
}

/**
 * Save video configuration to localStorage and notify listeners
 */
export function saveVideoConfig(config) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('video_config_updated', { detail: config }));
  } catch (e) {
    console.error('Failed to save video config to localStorage:', e);
  }
}

/**
 * Reset video configuration to system defaults
 */
export function resetVideoConfig() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('video_config_updated', { detail: {} }));
  } catch (e) {
    console.error('Failed to reset video config:', e);
  }
}
