// ========================================================
// VIDEO SERVICE & SUPABASE STORAGE RESOLVER FOR TELECEL SME LAUNCH
// ========================================================

const STORAGE_KEY = 'telecel_launch_video_config';

// Verified Supabase Public Storage URLs for Telecel SME Month Launch
export const DEFAULT_LAUNCH_VIDEOS = {
  video1: {
    url: 'https://qrfoifqbcgojvpwtlpon.supabase.co/storage/v1/object/public/SME%20Month%20Videos/vid%201_L.mp4',
    title: 'TELECEL SME MONTH • LAUNCH VIDEO',
    source: 'Supabase Public Storage',
  },
  video2: {
    url: 'https://qrfoifqbcgojvpwtlpon.supabase.co/storage/v1/object/public/SME%20Month%20Videos/Vid%202_L.mp4',
    title: 'TELECEL SME SOLUTIONS • SPOTLIGHT',
    source: 'Supabase Public Storage',
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
 * Get current video configuration (merging localStorage, env vars, and verified defaults)
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

  // Environment variables (if deployed with env vars)
  const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : {};

  const supabaseUrl = localData.supabaseUrl || env.VITE_SUPABASE_URL || 'https://qrfoifqbcgojvpwtlpon.supabase.co';
  const supabaseAnonKey = localData.supabaseAnonKey || env.VITE_SUPABASE_ANON_KEY || '';
  const bucket = localData.bucket || env.VITE_SUPABASE_BUCKET || 'SME Month Videos';
  const video1Path = localData.video1Path || env.VITE_SUPABASE_VIDEO_1_PATH || 'vid 1_L.mp4';
  const video2Path = localData.video2Path || env.VITE_SUPABASE_VIDEO_2_PATH || 'Vid 2_L.mp4';

  const directVideo1Url = localData.video1Url || env.VITE_VIDEO_1_URL || '';
  const directVideo2Url = localData.video2Url || env.VITE_VIDEO_2_URL || '';

  const video1Title = localData.video1Title || env.VITE_VIDEO_1_TITLE || DEFAULT_LAUNCH_VIDEOS.video1.title;
  const video2Title = localData.video2Title || env.VITE_VIDEO_2_TITLE || DEFAULT_LAUNCH_VIDEOS.video2.title;

  // Resolve Video 1 URL
  let resolvedVideo1Url = '';
  let video1Source = '';
  if (directVideo1Url.trim()) {
    resolvedVideo1Url = directVideo1Url.trim();
    video1Source = 'Direct Supabase URL';
  } else if (video1Path.trim().startsWith('http://') || video1Path.trim().startsWith('https://')) {
    resolvedVideo1Url = video1Path.trim();
    video1Source = 'Supabase Storage Direct URL';
  } else if (supabaseUrl.trim() && bucket.trim() && video1Path.trim()) {
    resolvedVideo1Url = buildSupabasePublicUrl(supabaseUrl, bucket, video1Path);
    video1Source = 'Supabase Storage Bucket';
  } else {
    resolvedVideo1Url = DEFAULT_LAUNCH_VIDEOS.video1.url;
    video1Source = 'Default Supabase Storage';
  }

  // Resolve Video 2 URL
  let resolvedVideo2Url = '';
  let video2Source = '';
  if (directVideo2Url.trim()) {
    resolvedVideo2Url = directVideo2Url.trim();
    video2Source = 'Direct Supabase URL';
  } else if (video2Path.trim().startsWith('http://') || video2Path.trim().startsWith('https://')) {
    resolvedVideo2Url = video2Path.trim();
    video2Source = 'Supabase Storage Direct URL';
  } else if (supabaseUrl.trim() && bucket.trim() && video2Path.trim()) {
    resolvedVideo2Url = buildSupabasePublicUrl(supabaseUrl, bucket, video2Path);
    video2Source = 'Supabase Storage Bucket';
  } else {
    resolvedVideo2Url = DEFAULT_LAUNCH_VIDEOS.video2.url;
    video2Source = 'Default Supabase Storage';
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
      url: resolvedVideo1Url || DEFAULT_LAUNCH_VIDEOS.video1.url,
      title: video1Title,
      source: video1Source,
      isCustom: true,
    },
    video2: {
      url: resolvedVideo2Url || DEFAULT_LAUNCH_VIDEOS.video2.url,
      title: video2Title,
      source: video2Source,
      isCustom: true,
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
