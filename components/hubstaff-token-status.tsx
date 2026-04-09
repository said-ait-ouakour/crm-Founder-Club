'use client';

import { useState, useEffect } from 'react';
import { HubstaffTokenManager } from '@/lib/hubstaff-token-manager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw, CheckCircle, XCircle, Settings } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function HubstaffTokenStatus() {
  const [tokenStatus, setTokenStatus] = useState<{
    hasToken: boolean;
    isValid: boolean;
    loading: boolean;
  }>({
    hasToken: false,
    isValid: false,
    loading: true
  });
  
  const [showTokenUpdate, setShowTokenUpdate] = useState(false);
  const [newRefreshToken, setNewRefreshToken] = useState('');
  const [updatingToken, setUpdatingToken] = useState(false);

  const checkTokenStatus = async () => {
    setTokenStatus(prev => ({ ...prev, loading: true }));
    
    try {
      const hasToken = HubstaffTokenManager.hasValidToken();
      let isValid = false;
      
      if (hasToken) {
        try {
          await HubstaffTokenManager.getValidAccessToken();
          isValid = true;
        } catch (error) {
          isValid = false;
        }
      }
      
      setTokenStatus({
        hasToken,
        isValid,
        loading: false
      });
    } catch (error) {
      setTokenStatus({
        hasToken: false,
        isValid: false,
        loading: false
      });
    }
  };

  const refreshToken = async () => {
    try {
      await HubstaffTokenManager.getValidAccessToken();
      await checkTokenStatus();
    } catch (error) {
      console.error('Failed to refresh token:', error);
    }
  };

  const updateRefreshToken = async () => {
    if (!newRefreshToken.trim()) {
      toast({
        title: "Error",
        description: "Please enter a refresh token",
        variant: "destructive",
      });
      return;
    }

    setUpdatingToken(true);
    try {
      const response = await fetch('/api/hubstaff/refresh-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: newRefreshToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update refresh token');
      }

      toast({
        title: "Success",
        description: "Refresh token updated successfully",
      });

      setNewRefreshToken('');
      setShowTokenUpdate(false);
      await checkTokenStatus();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to update refresh token',
        variant: "destructive",
      });
    } finally {
      setUpdatingToken(false);
    }
  };

  useEffect(() => {
    checkTokenStatus();
  }, []);

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Hubstaff Token Status
          {tokenStatus.loading && <RefreshCw className="h-4 w-4 animate-spin" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Token Available:</span>
          <Badge variant={tokenStatus.hasToken ? "default" : "secondary"}>
            {tokenStatus.hasToken ? (
              <CheckCircle className="h-3 w-3 mr-1" />
            ) : (
              <XCircle className="h-3 w-3 mr-1" />
            )}
            {tokenStatus.hasToken ? "Yes" : "No"}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Token Valid:</span>
          <Badge variant={tokenStatus.isValid ? "default" : "destructive"}>
            {tokenStatus.isValid ? (
              <CheckCircle className="h-3 w-3 mr-1" />
            ) : (
              <XCircle className="h-3 w-3 mr-1" />
            )}
            {tokenStatus.isValid ? "Yes" : "No"}
          </Badge>
        </div>
        
        <Button 
          onClick={refreshToken} 
          disabled={tokenStatus.loading}
          className="w-full"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Token
        </Button>
        
        <Button 
          onClick={() => setShowTokenUpdate(!showTokenUpdate)}
          variant="outline"
          className="w-full"
        >
          <Settings className="h-4 w-4 mr-2" />
          Update Refresh Token
        </Button>
        
        {showTokenUpdate && (
          <div className="space-y-3 pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor="refresh-token">New Refresh Token</Label>
              <Input
                id="refresh-token"
                type="text"
                value={newRefreshToken}
                onChange={(e) => setNewRefreshToken(e.target.value)}
                placeholder="Enter new refresh token..."
                className="text-sm"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={updateRefreshToken}
                disabled={updatingToken}
                size="sm"
                className="flex-1"
              >
                {updatingToken ? (
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <CheckCircle className="h-3 w-3 mr-1" />
                )}
                Update
              </Button>
              <Button 
                onClick={() => {
                  setShowTokenUpdate(false);
                  setNewRefreshToken('');
                }}
                variant="outline"
                size="sm"
              >
                <XCircle className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
