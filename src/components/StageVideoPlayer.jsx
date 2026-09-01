import React, { useEffect, useRef, useState } from 'react';

/**
 * Pure Fullscreen Video Player for Stage Presentation
 * Zero UI elements - 100% full-screen video playback with bulletproof auto-play and graceful fallbacks
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
  const [videoUrl, setVideoUrl] = useState(activeVideo?.url);

  // Sync active video URL
  useEffect(() => {
    retryCountRef.current = 0;
    setVideoUrl(activeVideo?.url);
  }, [currentVideoIndex, activeVideo?.url]);

  // Robust play function with unmuted -> muted fallback for all browser policies
  const attemptPlay = () => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    video.load();

    // First attempt: unmuted playback
    video.muted = false;
    const playPromise = video.play();

    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Unmuted autoplay blocked by browser policy, attempting muted start:', err);
        // Fallback: start muted so video NEVER fails to appear
        if (videoRef.current) {
          videoRef.current.muted = true;
          videoRef.current.play().catch((e) => {
            console.error('Playback error:', e);
          });
        }
      });
    }
  };

  useEffect(() => {
    attemptPlay();

    // Unmute as soon as any click or keypress occurs
    const handleUnmuteGesture = () => {
      if (videoRef.current && videoRef.current.muted) {
        videoRef.current.muted = false;
      }
    };

    window.addEventListener('click', handleUnmuteGesture, { passive: true });
    window.addEventListener('keydown', handleUnmuteGesture, { passive: true });
    window.addEventListener('touchstart', handleUnmuteGesture, { passive: true });

    return () => {
      window.removeEventListener('click', handleUnmuteGesture);
      window.removeEventListener('keydown', handleUnmuteGesture);
      window.removeEventListener('touchstart', handleUnmuteGesture);
    };
  }, [currentVideoIndex, videoUrl]);

  // Invisible keyboard controls for stage technicians
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space' || e.code === 'KeyK') {
        e.preventDefault();
        if (videoRef.current) {
          if (videoRef.current.paused) {
            videoRef.current.muted = false;
            videoRef.current.play().catch(() => {});
          } else {
            videoRef.current.pause();
          }
        }
      } else if (e.code === 'KeyN' || e.code === 'ArrowRight' || e.code === 'BracketRight') {
        e.preventDefault();
        onAdvanceToNext?.();
      } else if (e.code === 'KeyP' || e.code === 'ArrowLeft' || e.code === 'BracketLeft') {
        e.preventDefault();
        onBackToPrev?.();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        if (videoRef.current) {
          videoRef.current.muted = !videoRef.current.muted;
        }
      } else if (e.code === 'Escape' || e.code === 'KeyS') {
        e.preventDefault();
        onSkipAll?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onAdvanceToNext, onBackToPrev, onSkipAll]);

  // Click on screen to play/pause or unmute
  const handleClick = () => {
    if (videoRef.current) {
      if (videoRef.current.muted) {
        videoRef.current.muted = false;
      }
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  };

  const handleVideoError = (e) => {
    console.error('Video error encountered:', e);
    if (retryCountRef.current < 2) {
      retryCountRef.current += 1;
      console.log(`Retrying video playback (${retryCountRef.current}/2)...`);
      setTimeout(() => {
        attemptPlay();
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
      <video
        ref={videoRef}
        key={videoUrl}
        src={videoUrl}
        autoPlay
        playsInline
        webkit-playsinline="true"
        preload="auto"
        className="w-full h-full object-contain bg-black"
        onEnded={() => {
          onVideoEnded?.(currentVideoIndex);
        }}
        onError={handleVideoError}
      >
        <source src={videoUrl} type="video/mp4" />
      </video>
    </div>
  );
}
