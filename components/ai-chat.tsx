'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare, X, Loader2, Mic, Volume2, VolumeX, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { VoiceMessage } from './voice-message';
import { VoiceMessageInput } from './voice-message-input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { aiService } from '@/lib/ai-service';

interface Message {
    id: string;
    content: string;
    sender: 'user' | 'ai';
    timestamp: Date;
    audioBlob?: Blob;
    audioUrl?: string;
    showText?: boolean;
}

interface ActionButton {
    type: 'viewRows' | 'viewLead' | 'viewCallSummary';
    label: string;
    data: any;
}

export interface AIChatProps {
    className?: string;
    onViewLeads?: (leads: any[]) => void;
    onViewLead?: (leadId: string) => void;
    onAction?: (action: string) => void;
}

export const AIChat = ({ onViewLeads, onViewLead, onAction }: AIChatProps) => {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [sessionId, setSessionId] = useState<string>('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [loadingState, setLoadingState] = useState(false);
    const [actionButtons, setActionButtons] = useState<ActionButton[]>([]);
    const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [pendingVoiceMessage, setPendingVoiceMessage] = useState<{
        text: string;
        audioBlob?: Blob;
    } | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    // Welcome audio and message state
    const [hasPlayedWelcome, setHasPlayedWelcome] = useState(false);
    const welcomeAudioRef = useRef<HTMLAudioElement | null>(null);
    const [playTrigger, setPlayTrigger] = useState(0);

    // Clean up pending voice message URL when it changes
    useEffect(() => {
        return () => {
            if (pendingVoiceMessage?.audioBlob) {
                const url = URL.createObjectURL(pendingVoiceMessage.audioBlob);
                URL.revokeObjectURL(url);
            }
        };
    }, [pendingVoiceMessage]);

    // Generate a new session ID when component mounts
    useEffect(() => {
        const newSessionId = `session_${Date.now()}`;
        setSessionId(newSessionId);
    }, []);

    // Reset chat and generate a new session
    const resetChat = () => {
        setMessages([]);
        setActionButtons([]);
        const newSessionId = `session_${Date.now()}`;
        setSessionId(newSessionId);
    };

    // Scroll to bottom of messages
    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    // Parse special commands in AI response
    const parseResponse = (response: string) => {
        let displayContent = response;
        const buttons: ActionButton[] = [];

        // Check for ViewRows command
        const viewRowsMatch = response.match(/\{\{ViewRows sql="([^"]+)"\}\}/);
        if (viewRowsMatch) {
            buttons.push({
                type: 'viewRows',
                label: 'View Results',
                data: { sql: viewRowsMatch[1] }
            });
            displayContent = displayContent.replace(viewRowsMatch[0], '');
        }

        // Check for ViewLead command
        const viewLeadMatch = response.match(/\{\{ViewLead id="([^"]+)"\}\}/);
        if (viewLeadMatch && onViewLead) {
            buttons.push({
                type: 'viewLead',
                label: 'View Lead',
                data: { leadId: viewLeadMatch[1] }
            });
            displayContent = displayContent.replace(viewLeadMatch[0], '');
        }

        // Check for ViewCallSummary command
        const viewCallMatch = response.match(/\{\{ViewCallSummary id="([^"]+)"\}\}/);
        if (viewCallMatch) {
            buttons.push({
                type: 'viewCallSummary',
                label: 'View Call Summary',
                data: { callId: viewCallMatch[1] }
            });
            displayContent = displayContent.replace(viewCallMatch[0], '');
        }

        // Check for ViewLead command
        const leadMatch = response.match(/\{\{ViewLead\s+id="([^"]+)"(?:\s+firstName="([^"]*)")?(?:\s+lastName="([^"]*)")?\s*\}\}/);
        if (leadMatch) {
            const [, id, firstName = '', lastName = ''] = leadMatch;
            buttons.push({
                type: 'viewLead',
                label: `View ${firstName || lastName ? `${firstName} ${lastName}`.trim() : 'Lead'}'s Profile`,
                data: { id, firstName, lastName }
            });
            displayContent = displayContent.replace(leadMatch[0], '');
        }

        return { displayContent, buttons };
    };

    // Handle sending a text message from the input field
    const handleSendTextMessage = async () => {
        const textToSend = pendingVoiceMessage?.text || inputValue.trim();
        if (!textToSend || loadingState) return;

        // Create a new message with the current input or transcription
        const messageId = Date.now().toString();
        const audioUrl = pendingVoiceMessage?.audioBlob ? URL.createObjectURL(pendingVoiceMessage.audioBlob) : undefined;
        
        const userMessage: Message = {
            id: messageId,
            content: textToSend,
            sender: 'user',
            timestamp: new Date(),
            audioBlob: pendingVoiceMessage?.audioBlob,
            audioUrl,
            showText: false
        };

        // Add user message to the chat
        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setPendingVoiceMessage(null);
        setLoadingState(true);

        try {
            // Send message to the chat API
            const response = await fetch('https://n8n.aipersonalassistants.ai/webhook/a4cb0e58-b42f-46c9-a461-b42ae8a91e59/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chatInput: textToSend,
                    sessionId: sessionId,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to get response from AI');
            }

            const data = await response.json();
            const aiResponse = data.output || 'I apologize, but I encountered an error processing your request.';

            // Parse the response for special commands
            const { displayContent, buttons } = parseResponse(aiResponse);

            // Convert AI response to speech
            let audioUrl: string | undefined;
            try {
                audioUrl = await convertTextToSpeech(displayContent);
                if (audioUrl) {
                    console.log('TTS successful, audio URL:', audioUrl);
                } else {
                    console.log('TTS failed to generate audio URL');
                }
            } catch (error) {
                console.error('Error converting text to speech:', error);
                // Continue without audio if TTS fails
            }

            // Add AI response to the chat
            const messageId = `ai-${Date.now()}`;
            const aiMessage: Message = {
                id: messageId,
                content: displayContent.trim(),
                sender: 'ai',
                timestamp: new Date(),
                audioUrl,
            };

            setMessages(prev => [...prev, aiMessage]);
            setActionButtons(buttons);

            // Auto-play the new message if it has audio and not muted
            if (audioUrl && !isMuted) {
                console.log('Setting currently playing ID for auto-play:', messageId);
                triggerAutoPlay(messageId);
            } else if (!audioUrl) {
                console.log('No audio URL generated for message:', messageId);
            } else if (isMuted) {
                console.log('Audio muted, not auto-playing for message:', messageId);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            // Add error message to the chat
            const errorMessage: Message = {
                id: `error-${Date.now()}`,
                content: 'Sorry, I encountered an error. Please try again later.',
                sender: 'ai',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoadingState(false);
        }
    };

    // Handle receiving a voice message transcription
    const handleTranscriptionComplete = (text: string, audioBlob?: Blob) => {
        if (audioBlob) {
            setPendingVoiceMessage({ 
                text: text || 'Voice message', 
                audioBlob 
            });
            setInputValue(text);
        }
    };

    // Handle confirming a voice message
    const handleTranscriptionConfirm = (text: string) => {
        if (pendingVoiceMessage) {
            handleSendTextMessage();
        }
    };

    // Handle sending a voice message
    const handleSendVoiceMessage = async (text: string, audioBlob?: Blob) => {
        if (loadingState || (!text && !audioBlob)) return;

        const messageId = Date.now().toString();
        const audioUrl = audioBlob ? URL.createObjectURL(audioBlob) : undefined;
        
        const userMessage: Message = {
            id: messageId,
            content: text || 'Voice message',
            sender: 'user',
            timestamp: new Date(),
            audioBlob,
            audioUrl,
            showText: false,
        };

        // Add user message to the chat
        setMessages(prev => [...prev, userMessage]);
        setLoadingState(true);

        try {
            // Send message to the chat API
            const response = await fetch('https://n8n.aipersonalassistants.ai/webhook/a4cb0e58-b42f-46c9-a461-b42ae8a91e59/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chatInput: text,
                    sessionId: sessionId,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to get response from AI');
            }

            const data = await response.json();
            const aiResponse = data.output || 'I apologize, but I encountered an error processing your request.';

            // Parse the response for special commands
            const { displayContent, buttons } = parseResponse(aiResponse);

            // Add AI response to the chat first
            const aiMessageId = `ai-${Date.now()}`;
            const aiMessage: Message = {
                id: aiMessageId,
                content: displayContent.trim(),
                sender: 'ai',
                timestamp: new Date(),
                audioUrl: undefined, // Will be set after TTS completes
                showText: true,
            };

            setMessages(prev => [...prev, aiMessage]);
            setActionButtons(buttons);

            // Convert AI response to speech in the background
            if (!isMuted) {
                try {
                    const audioUrl = await convertTextToSpeech(displayContent);
                    if (audioUrl) {
                        // Update the message with the audio URL and auto-play
                        setMessages(prev => prev.map(msg => 
                            msg.id === aiMessageId 
                                ? { ...msg, audioUrl }
                                : msg
                        ));
                        
                        // Set currently playing ID to trigger auto-play in VoiceMessage
                        setCurrentlyPlayingId(aiMessageId);
                    }
                } catch (error) {
                    console.error('Error in text-to-speech conversion:', error);
                }
            }
        } catch (error) {
            console.error('Error sending voice message:', error);
            // Add error message to the chat
            const errorMessage: Message = {
                id: `error-${Date.now()}`,
                content: 'Sorry, I encountered an error processing your voice message. Please try again.',
                sender: 'ai',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoadingState(false);
        }
    };

    // Convert text to speech using fish.audio
    const convertTextToSpeech = async (text: string): Promise<string | undefined> => {
        if (!text) return undefined;

        try {
            const response = await fetch('/api/fish-audio/text-to-speech', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Fish.audio API error:', errorText);
                throw new Error(`Failed to convert text to speech: ${response.statusText}`);
            }

            const blob = await response.blob();
            if (!blob || blob.size === 0) {
                throw new Error('Received empty audio blob from fish.audio');
            }

            // Verify blob type
            console.log('Audio blob created:', {
                size: blob.size,
                type: blob.type
            });

            const audioUrl = URL.createObjectURL(blob);
            console.log('Audio URL created:', audioUrl);
            
            return audioUrl;
        } catch (error) {
            console.error('Error in text-to-speech conversion:', error);
            return undefined;
        }
    };

    // Handle play event from VoiceMessage
    const handlePlay = (messageId: string) => {
        console.log('handlePlay called for messageId:', messageId, 'isMuted:', isMuted, 'currentlyPlayingId:', currentlyPlayingId);
        
        if (isMuted) {
            console.log('Audio is muted, not playing');
            return;
        }
        
        // Only update the currently playing ID for tracking purposes
        // Don't interfere with manual play by updating playTrigger
        setCurrentlyPlayingId(messageId);
        console.log('Updated currently playing ID to:', messageId);
    };

    // Trigger auto-play for a specific message
    const triggerAutoPlay = (messageId: string) => {
        console.log('Triggering auto-play for messageId:', messageId);
        setCurrentlyPlayingId(messageId);
        setPlayTrigger(prev => prev + 1);
    };

    // Toggle mute state for AI responses
    const toggleMute = () => {
        const newMuteState = !isMuted;
        setIsMuted(newMuteState);

        // If we're muting, stop any currently playing audio
        if (newMuteState && currentlyPlayingId) {
            const audioElement = document.getElementById(`audio-${currentlyPlayingId}`) as HTMLAudioElement;
            if (audioElement) {
                audioElement.pause();
                setCurrentlyPlayingId(null);
            }
        }
    };

    // Handle action button clicks
    const handleAction = async (button: ActionButton) => {
        if (button.type === 'viewRows' && button.data?.sql) {
            try {
                setLoadingState(true);
                const result = await aiService.executeQuery(button.data.sql);
                if (result && onViewLeads) {
                    // Ensure result is an array before passing to onViewLeads
                    const leadsArray = Array.isArray(result) ? result : [result];
                    onViewLeads(leadsArray);

                    const resultMessage: Message = {
                        id: `result-${Date.now()}`,
                        content: `Showing ${leadsArray.length} leads in the table below.`,
                        sender: 'ai',
                        timestamp: new Date(),
                    };
                    setMessages(prev => [...prev, resultMessage]);
                }
            } catch (error) {
                console.error('Error executing query:', error);
                const errorMessage: Message = {
                    id: `error-${Date.now()}`,
                    content: `Error executing query: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    sender: 'ai',
                    timestamp: new Date(),
                };
                setMessages(prev => [...prev, errorMessage]);
            } finally {
                setLoadingState(false);
            }
        } else if (button.type === 'viewLead' && button.data?.id) {
            // Navigate to the lead details page
            window.location.href = `/leads/${button.data.id}`;
            
            // Also call the onViewLead callback if provided (for backward compatibility)
            if (onViewLead) {
                onViewLead(button.data.id);
            }

            // Add a message to the chat
            const leadInfo = button.data;
            const leadMessage: Message = {
                id: `lead-${Date.now()}`,
                content: `Showing details for lead: ${leadInfo.firstName || ''} ${leadInfo.lastName || ''}`.trim() || `Showing lead with ID: ${leadInfo.id}`,
                sender: 'ai',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, leadMessage]);
        } else if (button.type === 'viewCallSummary' && onAction) {
            onAction(`{{ViewCallSummary id="${button.data.callId}"}}`);
        }
    };

    // Play welcome audio and show welcome message on open
    useEffect(() => {
        if (isOpen && !hasPlayedWelcome) {
            const welcomeMessage = {
                id: 'welcome',
                content: "\uD83D\uDC4B Hi, I'm Charlotte! What can I help you with today to make your leads a smashing success? \uD83D\uDCA1\u2728 \uD83D\uDE80",
                sender: 'ai' as const,
                timestamp: new Date(),
                audioUrl: '/audio/welcome.mp3',
                showText: true,
            };
            
            setMessages([welcomeMessage]);
            
            // Only play the welcome audio if not muted
            if (!isMuted) {
                const playWelcomeAudio = async () => {
                    try {
                        // Small delay to ensure the audio element is ready
                        await new Promise(resolve => setTimeout(resolve, 300));
                        if (welcomeAudioRef.current) {
                            await welcomeAudioRef.current.play();
                        }
                    } catch (error) {
                        console.error('Error playing welcome audio:', error);
                    }
                };
                
                playWelcomeAudio();
            }
            
            setHasPlayedWelcome(true);
        }
        
        // Cleanup function to reset the welcome state when chat is closed
        return () => {
            if (!isOpen) {
                if (welcomeAudioRef.current) {
                    welcomeAudioRef.current.pause();
                    welcomeAudioRef.current.currentTime = 0;
                }
                setHasPlayedWelcome(false);
            }
        };
    }, [isOpen, hasPlayedWelcome, isMuted]);

    if (!isOpen) {
        return (
            <Button
                onClick={() => setIsOpen(true)}
                className="h-16 w-16 rounded-full shadow-xl bg-blue-600 hover:bg-blue-700 text-white text-2xl flex items-center justify-center"
                size="icon"
            >
                <MessageSquare className="h-8 w-8" />
            </Button>
        );
    }

    return (
        <div
            className={cn(
                "fixed z-50 flex items-center justify-center w-full h-full top-0 left-0 bg-blue-900/40 backdrop-blur-sm"
            )}
            style={{ pointerEvents: isOpen ? 'auto' : 'none' }}
        >
            <Card
                className={cn(
                    "flex flex-col shadow-2xl border-0 bg-gradient-to-br from-blue-600 to-blue-400 text-white mx-auto rounded-3xl transition-all duration-300 w-[95vw] max-w-2xl h-[80vh] md:w-[600px] md:h-[700px] p-0"
                )}
            >
                <CardHeader className="border-b-0 p-6 flex flex-row items-center justify-between bg-blue-700/80 rounded-t-3xl">
                    <CardTitle className="text-2xl font-bold">AI Assistant</CardTitle>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={resetChat}
                            className="h-8 text-xs bg-blue-500/80 text-white border-0 hover:bg-blue-600"
                        >
                            New Chat
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsOpen(false)}
                            className="h-8 w-8 rounded-full p-0 bg-blue-500/80 text-white border-0 hover:bg-blue-600"
                        >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Close</span>
                        </Button>
                    </div>
                </CardHeader>

                <ScrollArea className="flex-1 px-6 py-4 overflow-y-auto">
                    <div className="space-y-4">
                        {messages.length === 0 ? (
                            <div className="flex items-center justify-center h-40 text-blue-100 text-lg">
                                How can I help you today?
                            </div>
                        ) : (
                            messages.map((message) => (
                                <div key={message.id} className="w-full mb-4">
                                    <div className={cn(
                                        'flex',
                                        message.sender === 'user' ? 'justify-end' : 'justify-start',
                                        message.audioUrl ? 'items-end' : 'items-center',
                                        'relative group w-full',
                                        'flex-col',
                                        message.sender === 'user' ? 'items-end' : 'items-start'
                                    )}>
                                        <div className={cn(
                                            'rounded-lg px-4 py-3',
                                            message.sender === 'user'
                                                ? 'bg-blue-800 text-white'
                                                : 'bg-blue-100 text-blue-900',
                                            'relative group',
                                            message.sender === 'user' ? 'ml-auto' : 'mr-auto',
                                            message.audioUrl ? 'w-full max-w-[85%]' : 'max-w-[80%]'
                                        )}>
                                            {message.sender === 'ai' && message.audioUrl ? (
                                                <div className="w-full">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <button 
                                                            onClick={toggleMute}
                                                            className="text-blue-400 hover:text-blue-700 transition-colors"
                                                            title={isMuted ? 'Unmute AI' : 'Mute AI'}
                                                        >
                                                            {isMuted ? (
                                                                <VolumeX className="h-4 w-4" />
                                                            ) : (
                                                                <Volume2 className="h-4 w-4" />
                                                            )}
                                                        </button>
                                                        <div className="flex-1">
                                                            <VoiceMessage
                                                                key={message.id}
                                                                audioBlob={message.audioBlob}
                                                                audioUrl={message.audioUrl}
                                                                className="w-full"
                                                                isOwn={false}
                                                                autoPlay={!isMuted && currentlyPlayingId === message.id}
                                                                showText={message.showText}
                                                                showPlayButton={true}
                                                                text={message.content}
                                                                onEnded={() => setCurrentlyPlayingId(null)}
                                                                onPlay={() => {
                                                                    console.log('VoiceMessage onPlay called for:', message.id);
                                                                    handlePlay(message.id);
                                                                }}
                                                                onPause={() => setCurrentlyPlayingId(null)}
                                                                onShowText={() => {
                                                                    setMessages(prev => prev.map(m =>
                                                                        m.id === message.id
                                                                            ? { ...m, showText: !m.showText }
                                                                            : m
                                                                    ));
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            setMessages(prev => prev.map(m =>
                                                                m.id === message.id
                                                                    ? { ...m, showText: !m.showText }
                                                                    : m
                                                            ));
                                                        }}
                                                        className="text-xs text-blue-400 hover:text-blue-700 mt-1"
                                                    >
                                                        {message.showText ? 'Hide Text' : 'Show Text'}
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="text-sm">
                                                    {message.content}
                                                </div>
                                            )}
                                        </div>
                                        <p className={cn(
                                            'text-xs mt-1',
                                            message.sender === 'user' ? 'text-blue-200/70' : 'opacity-70',
                                            'w-full',
                                            message.sender === 'user' ? 'text-right' : 'text-left',
                                            'px-1'
                                        )}>
                                            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                        {loadingState && (
                            <div className="flex items-center justify-start gap-2">
                                <div className="h-2 w-2 animate-bounce rounded-full bg-blue-200" />
                                <div className="h-2 w-2 animate-bounce rounded-full bg-blue-200" style={{ animationDelay: '0.2s' }} />
                                <div className="h-2 w-2 animate-bounce rounded-full bg-blue-200" style={{ animationDelay: '0.4s' }} />
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>
                </ScrollArea>

                <div className="border-t-0 p-6 bg-blue-700/60 rounded-b-3xl">
                    <div className="flex items-center gap-2">
                        {pendingVoiceMessage ? (
                            <div className="flex-1 flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setPendingVoiceMessage(null)}
                                    className="h-8 w-8 text-blue-200"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ) : (
                            <input
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSendTextMessage()}
                                placeholder="Type your message..."
                                className="flex-1 rounded-md border border-blue-300 bg-blue-100 text-blue-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
                                disabled={loadingState}
                            />
                        )}
                        <Button
                            onClick={handleSendTextMessage}
                            disabled={(!inputValue.trim() && !pendingVoiceMessage) || loadingState}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {loadingState ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </Button>
                        <VoiceMessageInput
                            onTranscriptionComplete={handleTranscriptionComplete}
                            onTranscriptionConfirm={handleTranscriptionConfirm}
                            disabled={loadingState}
                            initialText={pendingVoiceMessage?.text}
                            onTextChange={(text) => setInputValue(text)}
                        />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {actionButtons.map((button, index) => (
                            <Button
                                key={index}
                                variant="outline"
                                size="sm"
                                onClick={() => handleAction(button)}
                                disabled={loadingState}
                                className="text-xs bg-blue-500/80 text-white border-0 hover:bg-blue-600"
                            >
                                {button.label}
                            </Button>
                        ))}
                    </div>
                </div>
            </Card>
            {/* Hidden welcome audio element for auto-play */}
            <audio
                ref={welcomeAudioRef}
                src="/audio/welcome.mp3"
                preload="auto"
                id="audio-welcome"
                style={{ display: 'none' }}
            />
        </div>
    );
}
