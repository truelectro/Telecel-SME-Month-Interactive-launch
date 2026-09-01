import React, { useEffect, useRef, useCallback } from 'react';

/**
 * Pure Fullscreen Video Player for Stage Presentation
 * Zero UI elements - 100% full-screen video playback with persistent audio volume across auto-play & manual skips
 */
export default function StageVideoPlayer({
  currentVideoIndex = 1,
  video1,
  video2,
  onVideoEnded,
  onAdvanceToNext,
  onBackToPrev,
  onSkipAll,
}) {
  const videoRef = useRef(null);
  const retryCountRef = useRef(0);
  const activeVideo = currentVideoIndex === 1 ? video1 : video2;
  const currentUrlRef = useRef(activeVideo?.url);

  // Play unmuted with 100% volume
  const playVideoUnmuted = useCallback((srcUrl) => {
    const video = videoRef.current;
    if (!video) return;

    // Preserve persistent unmuted state
    video.muted = false;
    video.volume = 1.0;
    video.defaultMuted = false;

    if (srcUrl && video.src !== srcUrl) {
      video.src = srcUrl;
    }

    video.currentTime = 0;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          // Double-check volume after playback begins
          if (videoRef.current) {
            videoRef.current.muted = false;
            videoRef.current.volume = 1.0;
          }
        })
        .catch((err) => {
          console.warn('Initial unmuted play blocked, attempting fallback:', err);
          // If strictly blocked before user interaction, start muted and unmute immediately on interaction
          if (videoRef.current) {
            videoRef.current.muted = true;
            videoRef.current.play().then(() => {
              // Try unmuting immediately
              setTimeout(() => {
                if (videoRef.current) {
                  videoRef.current.muted = false;
                  videoRef.current.volume = 1.0;
                }
              }, 100);
            }).catch((e) => {
              console.error('Playback error:', e);
            });
          }
        });
    }
  }, []);

  // Update and play when video index or URL changes
  useEffect(() => {
    retryCountRef.current = 0;
    currentUrlRef.current = activeVideo?.url;

    if (activeVideo?.url) {
      playVideoUnmuted(activeVideo.url);
    }
  }, [currentVideoIndex, activeVideo?.url, playVideoUnmuted]);

  // Unmute on ANY user interaction anywhere on the window
  useEffect(() => {
    const handleGlobalUserGesture = () => {
      const video = videoRef.current;
      if (video) {
        video.muted = false;
        video.volume = 1.0;
        if (video.paused) {
          video.play().catch(() => {});
        }
      }
    };

    window.addEventListener('click', handleGlobalUserGesture, { passive: true });
    window.addEventListener('keydown', handleGlobalUserGesture, { passive: true });
    window.addEventListener('touchstart', handleGlobalUserGesture, { passive: true });
    window.addEventListener('pointerdown', handleGlobalUserGesture, { passive: true });

    return () => {
      window.removeEventListener('click', handleGlobalUserGesture);
      window.removeEventListener('keydown', handleGlobalUserGesture);
      window.removeEventListener('touchstart', handleGlobalUserGesture);
      window.removeEventListener('pointerdown', handleGlobalUserGesture);
    };
  }, []);

  // Invisible keyboard controls for stage technicians
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const video = videoRef.current;
      if (video) {
        // Any technician keypress ensures sound is unmuted
        video.muted = false;
        video.volume = 1.0;
      }

      if (e.code === 'Space' || e.code === 'KeyK') {
        e.preventDefault();
        if (video) {
          if (video.paused) {
            video.muted = false;
            video.volume = 1.0;
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        }
      } else if (e.code === 'KeyN' || e.code === 'ArrowRight' || e.code === 'BracketRight') {
        e.preventDefault();
        if (video) {
          video.muted = false;
          video.volume = 1.0;
        }
        onAdvanceToNext?.();
      } else if (e.code === 'KeyP' || e.code === 'ArrowLeft' || e.code === 'BracketLeft') {
        e.preventDefault();
        if (video) {
          video.muted = false;
          video.volume = 1.0;
        }
        onBackToPrev?.();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        if (video) {
          video.muted = !video.muted;
          if (!video.muted) video.volume = 1.0;
        }
      } else if (e.code === 'Escape' || e.code === 'KeyS') {
        e.preventDefault();
        onSkipAll?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onAdvanceToNext, onBackToPrev, onSkipAll]);

  // Click on screen to toggle play/pause or unmute
  const handleClick = () => {
    const video = videoRef.current;
    if (video) {
      video.muted = false;
      video.volume = 1.0;
      if (video.paused) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    }
  };

  const handleVideoError = (e) => {
    console.error('Video error encountered:', e);
    if (retryCountRef.current < 2) {
      retryCountRef.current += 1;
      console.log(`Retrying video playback (${retryCountRef.current}/2)...`);
      setTimeout(() => {
        if (activeVideo?.url) {
          playVideoUnmuted(activeVideo.url);
        }
      }, 500);
    } else {
      console.warn('Video failed after retries, advancing to next stage...');
      setTimeout(() => {
        onAdvanceToNext?.();
      }, 1500);
    }
  };

  return (
    <div 
      onClick={handleClick}
      className="fixed inset-0 z-[90] w-screen h-screen bg-black overflow-hidden flex items-center justify-center p-0 m-0 select-none animate-fade-in cursor-none"
    >
      {/* Single persistent video element to preserve browser unmuted activation state */}
      <video
        ref={videoRef}
        src={activeVideo?.url}
        autoPlay
        playsInline
        webkit-playsinline="true"
        preload="auto"
        className="w-full h-full object-contain bg-black"
        onEnded={() => {
          onVideoEnded?.(currentVideoIndex);
        }}
        onError={handleVideoError}
      />
    </div>
  );
}
