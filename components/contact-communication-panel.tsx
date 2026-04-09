import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Paperclip, Send, Mail, MessageSquare, Phone, File, X, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { MessageHistory } from './MessageHistory';
import { useAuth } from '@/contexts/auth-context';
import { supabase } from '@/lib/supabase';

type EmailConnection = {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  token_expires_at: string | null;
  primary_calendar_id: string | null;
  connected_at: string | null;
  updated_at: string | null;
};

type ContactCommunicationPanelProps = {
  contactId: string;
  contactEmail: string;
  contactPhone?: string;
};

type MessageType = 'email' | 'sms' | 'whatsapp';

export function ContactCommunicationPanel({ contactId, contactEmail, contactPhone }: ContactCommunicationPanelProps) {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // UI State
  const [activeTab, setActiveTab] = useState<MessageType>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Connection State
  const [emailConnection, setEmailConnection] = useState<EmailConnection | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);

  // Form State
  const [emailContent, setEmailContent] = useState({ 
    subject: '', 
    body: '',
    isHtml: false 
  });
  const [attachments, setAttachments] = useState<Array<{ file: File; preview: string }>>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [smsContent, setSmsContent] = useState('');
  const [whatsappContent, setWhatsappContent] = useState('');
  const [includeSignature, setIncludeSignature] = useState(true);
  const [userPhoneNumber, setUserPhoneNumber] = useState<string>("");

  // Generate email signature with user's phone number
  const generateSignature = (phoneNumber: string) => {
    if (!phoneNumber) return "";
    
    // Remove leading 0 if present
    const formattedPhone = phoneNumber.replace(/^0/, '');
    
    return `
      <br><br>
      <p>
        Business Development Associate<br>
        PeopleManager.co<br>
        +44 (0)${formattedPhone}<br>
        Vune1292<br>
        Compass Building<br>
        Al Hulaila Industrial, Zone-FZ UAE Vune1292<br>
        <a href="https://peoplemanager.co" style="color:#0073e6; text-decoration:none;">https://peoplemanager.co</a><br><br>
        Confidentiality Notice: This email and any attachments are intended solely for the recipient and may contain confidential or legally privileged information.
        If you are not the intended recipient, please notify the sender immediately and delete this message.<br><br>
        © PeopleManager FZ-LLC · All rights reserved.
      </p>
      <p>
        <img src="https://peoplemanager.co/logo-full.png" alt="PeopleManager Logo" style="width:120px; margin-top:10px;">
      </p>
    `;
  };

  // Handle disconnecting email
  const handleDisconnectEmail = async () => {
    if (!emailConnection?.id) return;

    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('email_connections')
        .delete()
        .eq('id', emailConnection.id);

      if (error) throw error;

      setEmailConnection(null);
      toast({
        title: 'Email disconnected',
        description: 'Your email account has been successfully disconnected.',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error disconnecting email:', error);
      toast({
        title: 'Error disconnecting email',
        description: 'Failed to disconnect your email account. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Check email connection status on component mount
  const checkEmailConnection = useCallback(async () => {
    if (!user?.id) {
      setIsCheckingConnection(false);
      return;
    }

    try {
      setIsCheckingConnection(true);
      const { data, error } = await supabase
        .from('email_connections')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      setEmailConnection(data || null);
    } catch (error) {
      console.error('Error checking email connection:', error);
      toast({
        title: 'Error checking email connection',
        description: 'Failed to check email connection status',
        variant: 'destructive',
      });
    } finally {
      setIsCheckingConnection(false);
    }
  }, [user, toast]);

  useEffect(() => {
    if (!authLoading) {
      checkEmailConnection();
    }
  }, [authLoading, checkEmailConnection]);

  // Check for OAuth callback success and refresh connection status
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const emailSuccess = urlParams.get('emailSuccess');
    
    if (emailSuccess === 'connected') {
      // Refresh connection status after successful OAuth
      checkEmailConnection();
      // Clean up URL parameter
      const newUrl = window.location.pathname + window.location.search.replace(/[?&]emailSuccess=connected/, '');
      window.history.replaceState({}, '', newUrl);
      toast({
        title: 'Email connected',
        description: 'Your email account has been successfully connected.',
        variant: 'default',
      });
    }
  }, [checkEmailConnection, toast]);

  // Fetch current user's phone number
  useEffect(() => {
    async function fetchUserData() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (authUser) {
          const { data: userData, error } = await supabase
            .from("users")
            .select("phone_number")
            .eq("user_id", authUser.id)
            .single();
          
          if (error) {
            console.error("Error fetching user data:", error);
          } else if (userData?.phone_number) {
            setUserPhoneNumber(userData.phone_number);
          }
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    }
    fetchUserData();
  }, []);

  // Handle OAuth connection for email
  const handleConnectEmail = async () => {
    if (!user?.id) {
      console.log('No authenticated user found');
      toast({
        title: 'Authentication required',
        description: 'Please sign in to connect your email',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      console.log('Initiating OAuth flow...');
      
      // Get the auth URL from our API route
      const response = await fetch('/api/email-connect/init?user_id=' + user.id);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to initialize email connection');
      }
      
      // Get the current user's session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        throw new Error('Failed to get user session');
      }
      
      if (!sessionData?.session?.access_token) {
        throw new Error('No active session found');
      }
      
      // Redirect to the OAuth URL
      window.location.href = data.authUrl;
      return; // Exit the function after redirecting
      
    } catch (error) {
      console.error('Error initiating OAuth flow:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to connect email',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  // Handle sending messages
  const handleSendMessage = async (type: MessageType) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to send messages',
        variant: 'destructive',
      });
      return;
    }
    try {
      setIsSending(true);
      let content = '';
      let endpoint = '';
      let payload: any = {};
      
      // Process attachments if any
      const processedAttachments = await Promise.all(
        attachments.map(async ({ file }) => {
          const arrayBuffer = await file.arrayBuffer();
          const base64 = btoa(
            new Uint8Array(arrayBuffer).reduce(
              (data, byte) => data + String.fromCharCode(byte),
              ''
            )
          );
          return {
            fileName: file.name,
            contentType: file.type || 'application/octet-stream',
            content: base64,
            size: file.size,
          };
        })
      );

      switch (type) {
        case 'email':
          if (!emailContent.subject || (!emailContent.body && attachments.length === 0)) {
            throw new Error('Subject and either body or attachment is required');
          }
          
          // Prepare email content with signature if checked
          let emailBodyWithSignature = emailContent.body || '';
          if (includeSignature && userPhoneNumber) {
            emailBodyWithSignature += generateSignature(userPhoneNumber);
          }
          
          content = emailBodyWithSignature;
          endpoint = '/api/send-email';
          payload = {
            userId: user.id,
            contactId, // Pass contact ID for conversation tracking
            to: contactEmail,
            subject: emailContent.subject,
            content: emailBodyWithSignature,
            htmlContent: emailContent.isHtml ? emailBodyWithSignature : undefined,
            attachments: processedAttachments,
          };
          break;
        case 'sms':
          if (!smsContent.trim()) {
            throw new Error('Message cannot be empty');
          }
          content = smsContent;
          endpoint = '/api/send-sms';
          payload = {
            to: contactPhone,
            body: smsContent,
          };
          break;
        case 'whatsapp':
          if (!whatsappContent.trim()) {
            throw new Error('Message cannot be empty');
          }
          content = whatsappContent;
          endpoint = '/api/send-whatsapp';
          payload = {
            to: contactPhone,
            body: whatsappContent,
          };
          break;
      }
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send message');
      }
      // Clear form on success
      if (type === 'email') {
        setEmailContent({ subject: '', body: '', isHtml: false });
        setAttachments([]);
      } else if (type === 'sms') {
        setSmsContent('');
      } else {
        setWhatsappContent('');
      }
      toast({
        title: 'Success',
        description: `${type.toUpperCase()} message sent successfully!`,
        variant: 'default',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  // Handle input changes
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    setEmailContent((prev) => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value 
    }));
  };
  
  const toggleHtmlMode = () => {
    setEmailContent(prev => ({
      ...prev,
      isHtml: !prev.isHtml
    }));
  };
  const MAX_FILE_SIZE_MB = 10;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const newFiles = Array.from(e.target.files);
    const oversizedFiles = newFiles.filter(file => file.size > MAX_FILE_SIZE_BYTES);
    
    if (oversizedFiles.length > 0) {
      toast({
        title: 'File too large',
        description: `Please select files smaller than ${MAX_FILE_SIZE_MB}MB`,
        variant: 'destructive',
      });
      return;
    }

    const validFiles = newFiles.filter(file => file.size <= MAX_FILE_SIZE_BYTES);
    
    try {
      const newAttachments = await Promise.all(
        validFiles.map(async (file) => {
          const preview = file.type.startsWith('image/')
            ? URL.createObjectURL(file)
            : '';
          return { file, preview };
        })
      );
      
      setAttachments(prev => {
        // Check total size after adding new files
        const totalSize = [...prev, ...newAttachments].reduce(
          (total, { file }) => total + file.size, 0
        );
        
        if (totalSize > MAX_FILE_SIZE_BYTES) {
          toast({
            title: 'Total size exceeded',
            description: `Total attachments size cannot exceed ${MAX_FILE_SIZE_MB}MB`,
            variant: 'destructive',
          });
          return prev; // Don't add new files if total size exceeds limit
        }
        
        return [...prev, ...newAttachments];
      });
      
    } catch (error) {
      console.error('Error processing files:', error);
      toast({
        title: 'Error',
        description: 'Failed to process one or more files',
        variant: 'destructive',
      });
    } finally {
      // Reset the file input to allow selecting the same file again if needed
      e.target.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => {
      const newAttachments = [...prev];
      URL.revokeObjectURL(newAttachments[index].preview);
      newAttachments.splice(index, 1);
      return newAttachments;
    });
  };

  const handleSmsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSmsContent(e.target.value);
  };

  const handleWhatsappChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setWhatsappContent(e.target.value);
  };

  if (authLoading || isCheckingConnection) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading communication options...</span>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Send Communication
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as MessageType)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" /> Email
            </TabsTrigger>
            <TabsTrigger value="sms" className="flex items-center gap-2">
              <Phone className="h-4 w-4" /> SMS
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> WhatsApp
            </TabsTrigger>
          </TabsList>

          {/* Email Tab */}
          <TabsContent value="email">
            {!emailConnection ? (
              <div className="space-y-4 text-center p-4 border rounded-lg">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground" />
                <h3 className="text-lg font-medium">Connect your email</h3>
                <p className="text-sm text-muted-foreground">
                  Connect your email account to send emails directly from this app
                </p>
                <Button
                  onClick={handleConnectEmail}
                  disabled={isLoading}
                  className="mt-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Connect Email'
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-sm font-medium">Email connected</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDisconnectEmail}
                    disabled={isLoading}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                        Disconnecting...
                      </>
                    ) : (
                      'Disconnect'
                    )}
                  </Button>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowHistory(!showHistory)}
                      >
                        {showHistory ? 'Hide History' : 'Show Message History'}
                      </Button>
                    </div>
                  </div>

                  {showHistory && (
                    <div className="border-b pb-4">
                      <MessageHistory
                        contactEmail={contactEmail}
                        userId={user?.id || ''}
                        className="h-[200px]"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email-subject">Subject</Label>
                    <Input
                      id="email-subject"
                      name="subject"
                      value={emailContent.subject}
                      onChange={handleEmailChange}
                      placeholder="Email subject"
                    />
                  </div>
                  
                  {/* Email Signature Checkbox */}
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="includeSignatureContact"
                      checked={includeSignature}
                      onChange={(e) => setIncludeSignature(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="includeSignatureContact" className="text-sm font-medium cursor-pointer text-blue-900">
                      ✍️ Include email signature with my phone number
                    </label>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="email-body">Message</Label>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-500">HTML</span>
                        <button
                          type="button"
                          onClick={toggleHtmlMode}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full ${emailContent.isHtml ? 'bg-blue-600' : 'bg-gray-200'}`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${emailContent.isHtml ? 'translate-x-6' : 'translate-x-1'}`}
                          />
                        </button>
                      </div>
                    </div>
                    {emailContent.isHtml ? (
                      <div className="space-y-2">
                        <div className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background">
                        <div 
                          id="email-body"
                          contentEditable
                          dangerouslySetInnerHTML={{ __html: emailContent.body || '<p>Type your HTML email here...</p>' }}
                          onBlur={(e) => setEmailContent(prev => ({ ...prev, body: e.currentTarget.innerHTML }))}
                          className="min-h-[200px] outline-none"
                        />
                        </div>
                        <p className="text-xs text-gray-500">
                          Tip: Use HTML for rich text formatting
                        </p>
                      </div>
                    ) : (
                      <Textarea
                        id="email-body"
                        name="body"
                        value={emailContent.body}
                        onChange={handleEmailChange}
                        placeholder="Type your email here..."
                        className="min-h-[200px]"
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('file-upload')?.click()}
                        disabled={isSending}
                      >
                        <Paperclip className="h-4 w-4 mr-2" />
                        Attach Files
                      </Button>
                      <input
                        id="file-upload"
                        type="file"
                        className="hidden"
                        multiple
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                        onChange={handleFileChange}
                        disabled={isSending}
                      />
                      <div className="absolute -bottom-6 left-0 text-xs text-muted-foreground">
                        Max {MAX_FILE_SIZE_MB}MB per file
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={() => handleSendMessage('email')}
                      disabled={isSending || !emailContent.subject || !emailContent.body}
                    >
                      <Send className="h-4 w-4 mr-2" /> Send Email
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* SMS Tab */}
          <TabsContent value="sms">
            <div className="space-y-4">
              {!contactPhone ? (
                <div className="text-center p-4 border rounded-lg">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No phone number available for this contact
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Textarea
                      id="sms-message"
                      value={smsContent}
                      onChange={handleSmsChange}
                      placeholder="Type your SMS message here..."
                      rows={6}
                      disabled={isSending}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={() => handleSendMessage('sms')}
                      disabled={isSending || !smsContent.trim()}
                    >
                      <Send className="h-4 w-4 mr-2" /> Send SMS
                    </Button>
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          {/* WhatsApp Tab */}
          <TabsContent value="whatsapp">
            <div className="space-y-4">
              {!contactPhone ? (
                <div className="text-center p-4 border rounded-lg">
                  <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No phone number available for this contact
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Textarea
                      id="whatsapp-message"
                      value={whatsappContent}
                      onChange={handleWhatsappChange}
                      placeholder="Type your WhatsApp message here..."
                      rows={6}
                      disabled={isSending}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={() => handleSendMessage('whatsapp')}
                      disabled={isSending || !whatsappContent.trim()}
                    >
                      <Send className="h-4 w-4 mr-2" /> Send WhatsApp
                    </Button>
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default ContactCommunicationPanel;
