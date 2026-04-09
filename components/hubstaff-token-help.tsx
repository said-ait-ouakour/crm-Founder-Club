'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function HubstaffTokenHelp() {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Command copied to clipboard",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          How to Get a Fresh Refresh Token
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            If you're getting "Bad Request" errors, your refresh token has likely expired. 
            Follow these steps to get a new one:
          </p>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">1. Get a new refresh token</h4>
            <div className="bg-gray-100 p-3 rounded-md">
              <code className="text-xs">
                curl --location 'https://account.hubstaff.com/access_tokens' \
                --form 'refresh_token="YOUR_CURRENT_REFRESH_TOKEN"' \
                --form 'grant_type="refresh_token"'
              </code>
            </div>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => copyToClipboard(`curl --location 'https://account.hubstaff.com/access_tokens' --form 'refresh_token="YOUR_CURRENT_REFRESH_TOKEN"' --form 'grant_type="refresh_token"'`)}
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy Command
            </Button>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">2. Extract the new refresh token</h4>
            <p className="text-xs text-muted-foreground">
              From the response, copy the <code className="bg-gray-100 px-1 rounded">refresh_token</code> value
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">3. Update in the system</h4>
            <p className="text-xs text-muted-foreground">
              Use the "Update Refresh Token" button above to paste your new refresh token
            </p>
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">Note</Badge>
            <span className="text-xs text-muted-foreground">
              Refresh tokens typically last for 30 days. You'll need to repeat this process when they expire.
            </span>
          </div>
        </div>

        <div className="pt-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open('https://developer.hubstaff.com/docs/authentication', '_blank')}
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            Hubstaff API Docs
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
