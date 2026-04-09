import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Send } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

export default function TwilioMessageInput({ onSend, isSending, channel }: { onSend: (body: string) => void, isSending: boolean, channel: 'sms' | 'whatsapp' }) {
  const [body, setBody] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (!body.trim()) return;
    onSend(body);
    setBody('');
    if (textareaRef.current) textareaRef.current.value = '';
  };

  return (
    <div className="flex gap-2 items-end">
      <Textarea
        ref={textareaRef}
        placeholder={`Type your ${channel === 'whatsapp' ? 'WhatsApp' : 'SMS'} message...`}
        value={body}
        onChange={e => setBody(e.target.value)}
        className="min-h-[40px] flex-1 border-0 focus-visible:ring-0 font-mono text-sm"
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
      />
      <Button onClick={handleSend} disabled={isSending || !body.trim()}>
        {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      </Button>
    </div>
  );
}
