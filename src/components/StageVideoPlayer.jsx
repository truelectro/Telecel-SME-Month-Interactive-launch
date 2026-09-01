import React, { useEffect, useRef } from 'react';

/**
 * Pure Fullscreen Video Player for Stage Presentation
 * Zero UI elements - 100% full-screen video playback with seamless auto-transition
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
  const activeVideo = currentVideoIndex === 1 ? video1 : video2;

  // Auto-play active video when switching between Video 1 and Video 2
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.load();
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Autoplay notice (click screen to resume):', err);
        });
      }
    }
  }, [currentVideoIndex, activeVideo?.url]);

  // Invisible keyboard controls for stage technicians
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space' || e.code === 'KeyK') {
        e.preventDefault();
        if (videoRef.current) {
          if (videoRef.current.paused) {
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
      } else if (e.code === 'Escape' || e.code === 'KeyS') {
        e.preventDefault();
        onSkipAll?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onAdvanceToNext, onBackToPrev, onSkipAll]);

  // Click on screen to play/pause
  const handleClick = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  };

  return (
    <div 
      onClick={handleClick}
      className="fixed inset-0 z-[90] w-screen h-screen bg-black overflow-hidden flex items-center justify-center p-0 m-0 select-none animate-fade-in cursor-none"
    >
      <video
        ref={videoRef}
        src={activeVideo?.url}
        autoPlay
        playsInline
        className="w-full h-full object-contain bg-black"
        onEnded={() => {
          onVideoEnded?.(currentVideoIndex);
        }}
        onError={(e) => {
          console.error('Video error:', e);
          // If video fails, automatically advance after a brief pause so stage show doesn't halt
          setTimeout(() => {
            onAdvanceToNext?.();
          }, 1500);
        }}
      />
    </div>
  );
}
