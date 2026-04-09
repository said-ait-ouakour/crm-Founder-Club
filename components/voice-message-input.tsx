'use client';

import { useState, useRef, useEffect } from 'react';
import { Mic, StopCircle, Send, Loader2, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

export interface VoiceMessageInputProps {
  onTranscriptionComplete: (text: string, audioBlob?: Blob) => void;
  onTranscriptionConfirm?: (text: string) => void;
  disabled?: boolean;
  className?: string;
  initialText?: string;
  onTextChange?: (text: string) => void;
}

export function VoiceMessageInput({ 
  onTranscriptionComplete, 
  onTranscriptionConfirm,
  disabled, 
  className, 
  initialText = '',
  onTextChange
}: VoiceMessageInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [transcriptionText, setTranscriptionText] = useState(initialText);
  const [showConfirm, setShowConfirm] = useState(!!initialText);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Update transcription text when initialText changes
  useEffect(() => {
    setTranscriptionText(initialText);
    setShowConfirm(!!initialText);
  }, [initialText]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setTranscriptionText(text);
    onTextChange?.(text);
  };

  const handleConfirm = () => {
    if (transcriptionText.trim()) {
      onTranscriptionConfirm?.(transcriptionText);
      setShowConfirm(false);
      setTranscriptionText('');
    }
  };

  const handleCancel = () => {
    setShowConfirm(false);
    setTranscriptionText('');
  };

  // Format recording time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setTranscriptionText('');
      setShowConfirm(false);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        clearInterval(timerRef.current);
        setRecordingTime(0);
        
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
          await transcribeAudio(audioBlob);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      startTimer();
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: 'Microphone access denied',
        description: 'Please allow microphone access to record audio messages.',
        variant: 'destructive',
      });
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  // Transcribe audio using n8n webhook
  const transcribeAudio = async (audioBlob: Blob): Promise<void> => {
    if (disabled || isTranscribing) return;
    
    setIsTranscribing(true);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.wav');
      
      // Send audio to n8n webhook for transcription
      const response = await fetch('https://n8n.aipersonalassistants.ai/webhook/618543d6-d40e-4f86-8c12-44f57ea8d6d6', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.text();
      const transcription = result || '';
      
      if (transcription) {
        // Show the transcription in the input for confirmation
        setTranscriptionText(transcription);
        setShowConfirm(true);
        onTextChange?.(transcription);
        
        // Call the callback with the transcription and audio blob
        onTranscriptionComplete(transcription, audioBlob);
      } else {
        throw new Error('No transcription returned from server');
      }
    } catch (error) {
      console.error('Error transcribing audio:', error);
      toast({
        title: 'Transcription failed',
        description: 'Could not transcribe the audio message. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  const startTimer = () => {
    setRecordingTime(0);
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  // Clean up on unmount and when recording stops
  useEffect(() => {
    const mediaRecorder = mediaRecorderRef.current;
    const timer = timerRef.current;
    
    return () => {
      if (mediaRecorder) {
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        }
        mediaRecorder.stream?.getTracks().forEach(track => track.stop());
      }
      if (timer) {
        clearInterval(timer);
      }
    };
  }, []);

  // Clean up timer when recording stops
  useEffect(() => {
    if (!isRecording && timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
  }, [isRecording]);

  if (showConfirm) {
    return (
      <div className={cn('flex flex-col gap-2 w-full', className)}>
        <div className="flex flex-col gap-2 w-full">
          <textarea
            value={transcriptionText}
            onChange={handleTextChange}
            className="w-full min-h-[80px] p-2 border border-blue-300 bg-blue-100 text-blue-900 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
            placeholder="Edit your message..."
            disabled={disabled}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={!transcriptionText.trim() || disabled}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
            >
              Send
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={disabled}
              className="border-blue-400 text-blue-700 bg-blue-100 hover:bg-blue-200"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-2 w-full', className)}>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={isRecording ? stopRecording : startRecording}
          disabled={disabled || isTranscribing}
          className={cn(
            'h-10 w-10 rounded-full border-blue-400',
            isRecording ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
          )}
        >
          {isRecording ? (
            <StopCircle className="h-5 w-5" />
          ) : isTranscribing ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </Button>
        {isRecording && (
          <div className="flex items-center gap-2 text-sm text-blue-200">
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span>{formatTime(recordingTime)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
