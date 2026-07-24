import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, Maximize, Volume2, VolumeX, RotateCcw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";

const HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds

export default function VideoPlayer({ assetId, title, duration, onProgress }) {
  const videoRef = useRef(null);
  const heartbeatRef = useRef(null);
  const sessionTokenRef = useRef(`sess_${Date.now()}_${Math.random().toString(36).slice(2)}`);

  const [playbackUrl, setPlaybackUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(duration || 0);
  const [buffered, setBuffered] = useState(0);
  const [showControls, setShowControls] = useState(true);

  const controlsTimeoutRef = useRef(null);

  // Fetch signed playback URL
  useEffect(() => {
    async function fetchUrl() {
      try {
        setLoading(true);
        const response = await api.get(`/content/playback/${assetId}`);
        setPlaybackUrl(response.data.data.playbackUrl);

        // If mock mode, use a sample video
        if (response.data.data.isMock) {
          setPlaybackUrl("https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8");
        }
      } catch (err) {
        setError("Unable to load video. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    if (assetId) fetchUrl();
  }, [assetId]);

  // Heartbeat — fires every 30 seconds during active playback
  const sendHeartbeat = useCallback(async () => {
    if (!videoRef.current || videoRef.current.paused) return;

    const video = videoRef.current;
    try {
      await api.post("/engagement/heartbeat", {
        assetId,
        topicId: null, // Will be set by the parent component
        playbackPosition: Math.floor(video.currentTime),
        sessionToken: sessionTokenRef.current,
      });

      if (onProgress) {
        onProgress({
          currentTime: Math.floor(video.currentTime),
          duration: Math.floor(video.duration || totalDuration),
        });
      }
    } catch {
      // Heartbeat failures are non-critical — don't interrupt playback
    }
  }, [assetId, totalDuration, onProgress]);

  // Start/stop heartbeat based on play state
  useEffect(() => {
    if (playing) {
      // Send immediately on play
      sendHeartbeat();
      heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    } else {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }
    }

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, [playing, sendHeartbeat]);

  // Handle visibility change — pause heartbeat when tab hidden
  useEffect(() => {
    function handleVisibility() {
      if (document.hidden && heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
        // Pause the video when tab is hidden (anti-gaming)
        if (videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  // Auto-hide controls
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (playing) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [playing]);

  // Video event handlers
  const handlePlay = () => setPlaying(true);
  const handlePause = () => { setPlaying(false); setShowControls(true); };
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setTotalDuration(videoRef.current.duration);
    }
  };
  const handleProgress = () => {
    if (videoRef.current && videoRef.current.buffered.length > 0) {
      setBuffered(videoRef.current.buffered.end(videoRef.current.buffered.length - 1));
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setMuted(videoRef.current.muted);
  };

  const toggleFullscreen = () => {
    const container = videoRef.current?.parentElement;
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  };

  const handleSeek = (e) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pct * totalDuration;
  };

  const rewind = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
    }
  };

  function formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  if (loading) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl bg-gray-900">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-white/60" />
          <p className="text-sm text-white/40">Loading video...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl bg-gray-900">
        <p className="text-sm text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div
      className="relative aspect-video overflow-hidden rounded-xl bg-black group"
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={playbackUrl}
        className="h-full w-full"
        onPlay={handlePlay}
        onPause={handlePause}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onProgress={handleProgress}
        onClick={togglePlay}
        playsInline
      />

      {/* Play/Pause Overlay */}
      {!playing && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur">
            <Play className="h-8 w-8 text-white ml-1" fill="white" />
          </div>
        </button>
      )}

      {/* Controls Bar */}
      <div
        className={cn(
          "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-8 transition-opacity duration-200",
          showControls || !playing ? "opacity-100" : "opacity-0"
        )}
      >
        {/* Progress Bar */}
        <div
          className="mb-3 h-1.5 w-full cursor-pointer rounded-full bg-white/20"
          onClick={handleSeek}
        >
          {/* Buffered */}
          <div
            className="h-full rounded-full bg-white/30 absolute"
            style={{ width: `${(buffered / totalDuration) * 100}%` }}
          />
          {/* Progress */}
          <div
            className="h-full rounded-full bg-primary-400 relative"
            style={{ width: `${(currentTime / totalDuration) * 100}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-white shadow-md" />
          </div>
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={togglePlay} className="text-white hover:text-white/80">
              {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <button onClick={rewind} className="text-white/70 hover:text-white">
              <RotateCcw className="h-4 w-4" />
            </button>
            <button onClick={toggleMute} className="text-white/70 hover:text-white">
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            <span className="text-xs text-white/60 tabular-nums">
              {formatTime(currentTime)} / {formatTime(totalDuration)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={toggleFullscreen} className="text-white/70 hover:text-white">
              <Maximize className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Title Overlay */}
      {title && showControls && (
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/60 to-transparent px-4 pt-3 pb-8">
          <p className="text-sm font-medium text-white/90 truncate">{title}</p>
        </div>
      )}
    </div>
  );
}
