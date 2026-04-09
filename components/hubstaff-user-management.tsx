'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { User, Save, X, Check } from 'lucide-react';

interface UserData {
  id: number;
  fullName: string;
  email: string;
  hubstaff_id: number | null;
  role: string;
}

export default function HubstaffUserManagement() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const supabase = createClientComponentClient();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, fullName, email, hubstaff_id, role')
        .order('fullName');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const startEditing = (user: UserData) => {
    setEditingId(user.id);
    setEditingValue(user.hubstaff_id?.toString() || '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingValue('');
  };

  const saveHubstaffId = async (userId: number) => {
    try {
      const hubstaffId = editingValue.trim() ? parseInt(editingValue) : null;
      
      const { error } = await supabase
        .from('users')
        .update({ hubstaff_id: hubstaffId })
        .eq('id', userId);

      if (error) throw error;

      // Update local state
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, hubstaff_id: hubstaffId }
          : user
      ));

      setEditingId(null);
      setEditingValue('');

      toast({
        title: "Success",
        description: "Hubstaff ID updated successfully",
      });
    } catch (error) {
      console.error('Error updating Hubstaff ID:', error);
      toast({
        title: "Error",
        description: "Failed to update Hubstaff ID",
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent, userId: number) => {
    if (e.key === 'Enter') {
      saveHubstaffId(userId);
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading users...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Hubstaff User Management</h2>
        <p className="text-muted-foreground">
          Configure Hubstaff IDs for users to enable activity tracking
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="font-medium">{user.fullName}</h3>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {user.role}
                    </Badge>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {editingId === user.id ? (
                    <>
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`hubstaff-${user.id}`} className="text-sm font-medium">
                          Hubstaff ID:
                        </Label>
                        <Input
                          id={`hubstaff-${user.id}`}
                          type="number"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={(e) => handleKeyPress(e, user.id)}
                          className="w-24"
                          placeholder="ID"
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => saveHubstaffId(user.id)}
                        variant="outline"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={cancelEditing}
                        variant="outline"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {user.hubstaff_id ? `ID: ${user.hubstaff_id}` : 'No ID set'}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {user.hubstaff_id ? 'Activity tracking enabled' : 'Activity tracking disabled'}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => startEditing(user)}
                        variant="outline"
                      >
                        <User className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {users.length === 0 && (
            <div className="text-center py-8">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Users Found</h3>
              <p className="text-muted-foreground">
                No users found in the system. Add users first to configure Hubstaff IDs.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
