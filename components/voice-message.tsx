'use client';

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Play, Pause, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface VoiceMessageProps {
    audioBlob?: Blob;
    audioUrl?: string;
    text?: string;
    isOwn?: boolean;
    className?: string;
    showText?: boolean;
    showPlayButton?: boolean;
    autoPlay?: boolean;
    isMuted?: boolean;
    stopAudio?: boolean;
    onPlay?: () => void;
    onPause?: () => void;
    onEnded?: () => void;
    onShowText?: () => void;
    onTimeUpdate?: (currentTime: number, duration: number) => void;
    onDurationChange?: (duration: number) => void;
}

export function VoiceMessage({
    audioBlob,
    audioUrl: propAudioUrl,
    className,
    isOwn = false,
    autoPlay = false,
    isMuted = false,
    stopAudio = false,
    showText = false,
    showPlayButton = true,
    text = '',
    onPlay,
    onPause,
    onEnded,
    onShowText,
    onTimeUpdate,
    onDurationChange
}: VoiceMessageProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [progress, setProgress] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isAudioReady, setIsAudioReady] = useState(false);

    const audioSrc = useMemo(() => {
        if (audioBlob) {
            return URL.createObjectURL(audioBlob);
        }
        return propAudioUrl;
    }, [audioBlob, propAudioUrl]);

    useEffect(() => {
        if (audioBlob && audioSrc) {
            return () => {
                URL.revokeObjectURL(audioSrc);
            };
        }
    }, [audioBlob, audioSrc]);

    // Format time in seconds to MM:SS format
    const formatTime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    // Handle play state
    const handlePlay = useCallback(() => {
        if (isPlaying) return;
        setIsPlaying(true);
        setIsLoading(false);
        onPlay?.();
    }, [isPlaying, onPlay]);

    // Handle pause state
    const handlePause = useCallback(() => {
        if (!isPlaying) return;
        setIsPlaying(false);
        onPause?.();
    }, [isPlaying, onPause]);

    // Handle end of playback
    const handleEnded = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        onEnded?.();
    };

    // Handle loaded metadata
    const handleLoadedMetadata = () => {
        if (!audioRef.current) return;
        
        // Ensure we have valid duration before considering audio ready
        const { duration } = audioRef.current;
        if (isNaN(duration) || !isFinite(duration) || duration <= 0) {
            console.warn('Invalid audio duration:', duration);
            return;
        }
        
        setDuration(duration);
        setIsAudioReady(true);
        setIsLoading(false);
    };

    // Handle time update
    const handleTimeUpdate = () => {
        if (audioRef.current) {
            const { currentTime, duration } = audioRef.current;
            setProgress(duration > 0 ? (currentTime / duration) * 100 : 0);
            onTimeUpdate?.(currentTime, duration);
        }
    };

    // Handle duration change
    const handleDurationChange = () => {
        if (audioRef.current) {
            onDurationChange?.(audioRef.current.duration);
        }
    };

    // Toggle play/pause
    const togglePlay = async () => {
        if (!audioRef.current || !audioSrc) return;

        // If already playing, just pause it
        if (isPlaying) {
            audioRef.current.pause();
            handlePause();
            return;
        }

        // If we're at the end, restart the audio
        if (audioRef.current.ended || (audioRef.current.duration > 0 && audioRef.current.currentTime >= audioRef.current.duration)) {
            audioRef.current.currentTime = 0;
        }

        // Reset the audio element if needed
        if (audioRef.current.readyState === 0) {
            audioRef.current.load();
        }

        setIsLoading(true);
        
        try {
            // Ensure any previous playback is properly stopped
            await audioRef.current.play();
            handlePlay();
        } catch (error: unknown) {
            console.error('Error playing audio:', error instanceof Error ? error.message : 'Unknown error');
            // If play was interrupted, ensure we're in a clean state
            if (error instanceof Error && error.name === 'AbortError') {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Handle mute state changes and autoPlay prop changes
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        // If audio is playing and we're muting or disabling autoPlay, stop the audio
        if (isPlaying && (isMuted || !autoPlay)) {
            audio.pause();
            handlePause();
            audio.currentTime = 0; // Reset to beginning
        }

        // If we're unmuting and autoPlay is enabled, start playing
        if (!isMuted && autoPlay && !isPlaying && isAudioReady) {
            const playAudio = async () => {
                try {
                    await audio.play();
                    handlePlay();
                } catch (error) {
                    console.error('Error playing audio after unmute:', error);
                }
            };
            playAudio();
        }
    }, [isMuted, autoPlay, isAudioReady, isPlaying, handlePause, handlePlay]);

    // Handle stop audio from parent
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !stopAudio) return;

        if (isPlaying) {
            audio.pause();
            audio.currentTime = 0; // Reset to beginning
            handlePause();
        }
    }, [stopAudio, isPlaying, handlePause]);

    // Handle auto-play and audio source changes
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio || !audioSrc) return;

        const handleAutoPlay = async () => {
            if (!autoPlay || !isAudioReady || isPlaying) return;

            try {
                // Reset audio element if needed
                if (audio.readyState === 0) {
                    audio.load();
                    await new Promise(resolve => {
                        audio.onloadeddata = resolve;
                        // Fallback in case loadeddata doesn't fire
                        setTimeout(resolve, 500);
                    });
                }

                // Ensure we're at the start
                audio.currentTime = 0;
                
                // Play the audio
                await audio.play();
                handlePlay();
            } catch (error: unknown) {
                if (error instanceof Error) {
                    console.error('Error auto-playing audio:', error.message);
                } else {
                    console.error('An unknown error occurred while auto-playing audio');
                }
                // Don't show error to user for autoplay failures
            } finally {
                setIsLoading(false);
            }
        };

        handleAutoPlay();

        // Cleanup
        return () => {
            if (audio) {
                audio.pause();
                audio.currentTime = 0;
            }
        };
    }, [autoPlay, audioSrc, isAudioReady]);

    // Update progress bar during playback
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateProgress = () => {
            if (audio.duration) {
                setCurrentTime(audio.currentTime);
                setProgress((audio.currentTime / audio.duration) * 100);
            }
        };

        audio.addEventListener('timeupdate', updateProgress);
        return () => {
            audio.removeEventListener('timeupdate', updateProgress);
        };
    }, [audioSrc]);

    useEffect(() => {
        setIsAudioReady(false);
    }, [audioSrc]);

    return (
        <div className={cn('flex flex-col w-full', className)}>
            <div className={cn('flex items-center', !showText && 'mb-2')}>
                <audio
                    ref={audioRef}
                    src={audioSrc}
                    onPlay={handlePlay}
                    onPause={handlePause}
                    onEnded={handleEnded}
                    onTimeUpdate={handleTimeUpdate}
                    onDurationChange={handleDurationChange}
                    onLoadedMetadata={handleLoadedMetadata}
                    className="hidden"
                />

                <div className="flex items-center gap-2 w-full">
                    {showPlayButton && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={togglePlay}
                            className={cn('h-8 w-8 rounded-full', isPlaying ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700 hover:bg-blue-200')}
                            disabled={!audioSrc || isLoading}
                            title={isPlaying ? 'Pause' : 'Play'}
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : isPlaying ? (
                                <Pause className="h-4 w-4" />
                            ) : (
                                <Play className="h-4 w-4" />
                            )}
                        </Button>
                    )}

                    <div className="flex-1 mx-2">
                        <div className="flex-1 h-1 bg-blue-200 rounded-full overflow-hidden relative">
                            <div
                                className="h-full bg-blue-600 transition-all duration-300 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                            {audioSrc && (
                                <div
                                    className="absolute inset-0 cursor-pointer"
                                    onClick={(e) => {
                                        if (audioRef.current) {
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const pos = (e.clientX - rect.left) / rect.width;
                                            const duration = audioRef.current.duration || 0;
                                            audioRef.current.currentTime = pos * duration;
                                        }
                                    }}
                                />
                            )}
                        </div>
                    </div>

                    <span className={cn(
                        'text-xs min-w-[80px] text-right',
                        isOwn ? 'text-blue-200/80' : 'text-blue-900/80'
                    )}>
                        {isLoading ? 'Loading...' : `${formatTime(currentTime)} / ${formatTime(duration)}`}
                    </span>

                    {onShowText && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onShowText}
                            className="text-xs h-6 px-2 text-blue-700 hover:text-blue-900"
                            title={showText ? 'Hide transcription' : 'Show transcription'}
                        >
                            {showText ? 'Hide Text' : 'Show Text'}
                        </Button>
                    )}
                </div>
            </div>

            {showText && text && (
                <div
                    className={cn(
                        'mt-2 p-2 text-sm rounded-md',
                        isOwn ? 'bg-blue-800/10 text-blue-100' : 'bg-blue-100 text-blue-900'
                    )}
                >
                    {text}
                </div>
            )}
        </div>
    );
}
