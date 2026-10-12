'use client';

import { useState, useRef } from 'react';
import {
  Volume2,
  Play,
  Pause,
  RotateCcw as RewindIcon,
  Maximize2,
  FileText,
  Video,
  Image as ImageIcon,
  BookOpen,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface LearningMaterialsProps {
  passage?: string | null;
  audioUrl?: string | null;
  videoUrl?: string | null;
  imageUrl?: string | null;
  className?: string;
  defaultOpen?: boolean;
}

export function LearningMaterialsBox({
  passage,
  audioUrl,
  videoUrl,
  imageUrl,
  className = '',
}: LearningMaterialsProps) {
  // Audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Image zoom lightbox
  const [isImageZoomed, setIsImageZoomed] = useState(false);

  const hasPassage = Boolean(passage?.trim());
  const hasAudio = Boolean(audioUrl?.trim());
  const hasVideo = Boolean(videoUrl?.trim());
  const hasImage = Boolean(imageUrl?.trim());

  if (!hasPassage && !hasAudio && !hasVideo && !hasImage) {
    return null;
  }

  const togglePlayAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  const rewindAudio = (seconds: number = 5) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - seconds);
  };

  const changeSpeed = (speed: number) => {
    if (!audioRef.current) return;
    audioRef.current.playbackRate = speed;
    setPlaybackSpeed(speed);
  };

  return (
    <div
      className={`border-border bg-card space-y-4 rounded-2xl border p-4 shadow-xs sm:p-5 ${className}`}
    >
      {/* Header kho học liệu */}
      <div className="border-border/60 flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 text-primary flex size-7 items-center justify-center rounded-lg">
            <BookOpen className="size-4" />
          </div>
          <span className="text-foreground text-sm font-bold tracking-tight">
            Kho học liệu & Ngữ liệu tham khảo
          </span>
        </div>
        <div className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-[11px] font-medium">
          {hasAudio && (
            <span className="bg-info/10 text-info inline-flex items-center gap-1 rounded-md px-2 py-0.5">
              <Volume2 className="size-3" /> Âm thanh
            </span>
          )}
          {hasVideo && (
            <span className="bg-destructive/10 text-destructive inline-flex items-center gap-1 rounded-md px-2 py-0.5">
              <Video className="size-3" /> Video
            </span>
          )}
          {hasPassage && (
            <span className="bg-warning/10 text-warning inline-flex items-center gap-1 rounded-md px-2 py-0.5">
              <FileText className="size-3" /> Đoạn văn
            </span>
          )}
          {hasImage && (
            <span className="bg-success/10 text-success inline-flex items-center gap-1 rounded-md px-2 py-0.5">
              <ImageIcon className="size-3" /> Hình ảnh
            </span>
          )}
        </div>
      </div>

      {/* 1. Trình phát âm thanh (Audio player) */}
      {hasAudio && audioUrl && (
        <div className="border-info/30 bg-info/5 space-y-3 rounded-xl border p-4">
          <div className="text-info flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-1.5">
              <Volume2 className="size-4" /> File âm thanh nghe / Audio
            </span>
            <div className="flex items-center gap-1">
              {[0.75, 1, 1.25, 1.5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => changeSpeed(s)}
                  className={`cursor-pointer rounded px-1.5 py-0.5 text-[10px] font-bold transition ${
                    playbackSpeed === s
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background/80 text-muted-foreground hover:bg-background'
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>

          <audio
            ref={audioRef}
            src={audioUrl}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          />

          <div className="flex items-center gap-3">
            <Button
              type="button"
              size="sm"
              onClick={togglePlayAudio}
              className="bg-primary hover:bg-primary/90 text-primary-foreground size-9 cursor-pointer rounded-full p-0"
            >
              {isPlaying ? <Pause className="size-4" /> : <Play className="ml-0.5 size-4" />}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => rewindAudio(5)}
              className="size-8 cursor-pointer rounded-full p-0 text-xs"
              title="Tua lại 5 giây"
            >
              <RewindIcon className="size-3.5" />
            </Button>

            <div className="flex-1 space-y-1">
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentTime}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setCurrentTime(val);
                  if (audioRef.current) audioRef.current.currentTime = val;
                }}
                className="accent-primary h-1.5 w-full cursor-pointer"
              />
              <div className="text-muted-foreground flex justify-between font-mono text-[10px]">
                <span>{Math.floor(currentTime)}s</span>
                <span>{duration ? `${Math.floor(duration)}s` : '--'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Trình chiếu Video */}
      {hasVideo && videoUrl && (
        <div className="space-y-1.5">
          <div className="text-destructive flex items-center gap-1.5 text-xs font-semibold">
            <Video className="size-3.5" /> Video hướng dẫn / Minh họa bài tập
          </div>
          <div className="border-border aspect-video overflow-hidden rounded-xl border bg-black shadow-xs">
            <iframe
              src={
                videoUrl.includes('watch?v=') ? videoUrl.replace('watch?v=', 'embed/') : videoUrl
              }
              title="Video bài tập"
              className="size-full border-0"
              allowFullScreen
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            />
          </div>
        </div>
      )}

      {/* 3. Hình ảnh ngữ liệu minh họa */}
      {hasImage && imageUrl && (
        <div className="space-y-1.5">
          <div className="text-success flex items-center gap-1.5 text-xs font-semibold">
            <ImageIcon className="size-3.5" /> Hình ảnh minh họa (Biểu đồ / Tranh mô tả)
          </div>
          <div className="border-border bg-muted/20 group relative overflow-hidden rounded-xl border">
            <img
              src={imageUrl}
              alt="Hình ảnh ngữ liệu bài tập"
              className="bg-card/50 max-h-80 w-full cursor-pointer object-contain transition hover:opacity-95"
              onClick={() => setIsImageZoomed(true)}
            />
            <button
              type="button"
              onClick={() => setIsImageZoomed(true)}
              className="absolute right-2 bottom-2 flex cursor-pointer items-center gap-1 rounded-md bg-black/70 px-2.5 py-1 text-xs text-white opacity-0 shadow-sm transition group-hover:opacity-100"
            >
              <Maximize2 className="size-3.5" /> Phóng to
            </button>
          </div>
        </div>
      )}

      {/* 4. Đoạn văn ngữ liệu / Đọc hiểu (Passage) */}
      {hasPassage && passage && (
        <div className="space-y-1.5">
          <div className="text-warning flex items-center gap-1.5 text-xs font-semibold">
            <FileText className="size-3.5" /> Đoạn văn bản / Ngữ liệu đọc hiểu (Passage)
          </div>
          <div className="border-warning/20 bg-warning/5 text-foreground/95 max-h-96 overflow-y-auto rounded-xl border p-4 font-serif text-xs leading-relaxed whitespace-pre-wrap sm:text-sm">
            {passage}
          </div>
        </div>
      )}

      {/* Lightbox zoom ảnh */}
      {isImageZoomed && imageUrl && (
        <div
          className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs duration-200"
          onClick={() => setIsImageZoomed(false)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <img
              src={imageUrl}
              alt="Ảnh phóng to"
              className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            />
            <button
              type="button"
              onClick={() => setIsImageZoomed(false)}
              className="absolute top-2 right-2 cursor-pointer rounded-full bg-black/70 p-2 text-white transition hover:bg-black"
              aria-label="Đóng"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
