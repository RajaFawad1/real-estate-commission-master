
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Plus, Edit, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Person {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string;
  referred_by?: string | null;
  referral_level?: number | null;
  created_at: string | null;
  updated_at: string | null;
  referrer?: {
    first_name: string;
    last_name: string;
    username: string;
  } | null;
}

const PersonManager = () => {
  const [people, setPeople] = useState<Person[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    password: '',
    referred_by: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPeople();
  }, []);

  const fetchPeople = async () => {
    try {
      console.log('Fetching people...');
      const { data, error } = await supabase
        .from('people')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching people:', error);
        toast({
          title: "Error",
          description: "Failed to fetch people. Please try again.",
          variant: "destructive",
        });
        return;
      }

      console.log('Fetched people:', data);
      setPeople(data || []);
    } catch (error) {
      console.error('Error fetching people:', error);
      toast({
        title: "Error",
        description: "Failed to fetch people. Please try again.",
        variant: "destructive",
      });
    }
  };

  const fetchReferrerInfo = async (referredBy: string): Promise<Person | null> => {
    try {
      const { data, error } = await supabase
        .from('people')
        .select('first_name, last_name, username')
        .eq('id', referredBy)
        .single();

      if (error || !data) {
        return null;
      }

      return data as Person;
    } catch (error) {
      console.error('Error fetching referrer:', error);
      return null;
    }
  };

  const calculateUserLevel = async (userId: string): Promise<number> => {
    try {
      const traceToRoot = async (currentUserId: string, depth: number = 1): Promise<number> => {
        const { data: user, error } = await supabase
          .from('people')
          .select('referred_by')
          .eq('id', currentUserId)
          .single();

        if (error || !user || !user.referred_by) {
          return depth;
        }

        return await traceToRoot(user.referred_by, depth + 1);
      };

      return await traceToRoot(userId);
    } catch (error) {
      console.error('Error calculating user level:', error);
      return 1;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username || !formData.first_name || !formData.last_name || !formData.email || (!isEditing && !formData.password)) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields including password.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (isEditing && editingId) {
        const { error } = await supabase
          .from('people')
          .update({
            username: formData.username,
            first_name: formData.first_name,
            last_name: formData.last_name,
            phone: formData.phone || null,
            email: formData.email,
            referred_by: formData.referred_by || null
          })
          .eq('id', editingId);

        if (error) throw error;

        toast({
          title: "Person updated",
          description: "Person has been updated successfully.",
        });
      } else {
        // Check if username already exists
        const { data: existingPerson } = await supabase
          .from('people')
          .select('username')
          .eq('username', formData.username)
          .maybeSingle();

        if (existingPerson) {
          toast({
            title: "Username already exists",
            description: "Please choose a different username.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        let referralLevel = 1;
        if (formData.referred_by) {
          referralLevel = (await calculateUserLevel(formData.referred_by)) + 1;
        }

        // Create auth user via edge function (auto-confirms email)
        const response = await fetch(
          `https://gycsxuqegpgreackwpoa.supabase.co/functions/v1/create-user`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            },
            body: JSON.stringify({
              email: formData.email,
              password: formData.password,
              first_name: formData.first_name,
              last_name: formData.last_name,
            }),
          }
        );

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to create user');

        const { error } = await supabase
          .from('people')
          .insert([{
            username: formData.username,
            first_name: formData.first_name,
            last_name: formData.last_name,
            phone: formData.phone || null,
            email: formData.email,
            referred_by: formData.referred_by || null,
            referral_level: referralLevel
          }]);

        if (error) throw error;

        toast({
          title: "Person added",
          description: `Person has been added with login credentials at Level ${referralLevel}.`,
        });
      }

      resetForm();
      await fetchPeople(); // Refresh the people list
    } catch (error) {
      console.error('Error saving person:', error);
      toast({
        title: "Error",
        description: "Failed to save person. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (person: Person) => {
    setFormData({
      username: person.username,
      first_name: person.first_name,
      last_name: person.last_name,
      phone: person.phone || '',
      email: person.email,
      password: '',
      referred_by: person.referred_by || ''
    });
    setIsEditing(true);
    setEditingId(person.id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this person?')) return;

    try {
      const { error } = await supabase
        .from('people')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Person deleted",
        description: "Person has been deleted successfully.",
      });

      await fetchPeople(); // Refresh the people list
    } catch (error) {
      console.error('Error deleting person:', error);
      toast({
        title: "Error",
        description: "Failed to delete person. Please try again.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      password: '',
      referred_by: ''
    });
    setIsEditing(false);
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            {isEditing ? 'Edit Person' : 'Add New Person'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter username"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  type="text"
                  placeholder="Enter first name"
                  value={formData.first_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  type="text"
                  placeholder="Enter last name"
                  value={formData.last_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter phone number"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              {!isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter login password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="referred_by">Referred By (Optional)</Label>
              <Select value={formData.referred_by} onValueChange={(value) => setFormData(prev => ({ ...prev, referred_by: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select who referred this person" />
                </SelectTrigger>
                <SelectContent>
                  {people.filter(p => p.id !== editingId).map(person => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.first_name} {person.last_name} (@{person.username}) - Level {person.referral_level || 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </div>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    {isEditing ? 'Update Person' : 'Add Person'}
                  </>
                )}
              </Button>
              {isEditing && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>People List ({people.length} total)</CardTitle>
        </CardHeader>
        <CardContent>
          {people.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No people added yet. Add your first person above!
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Referred By</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {people.map((person) => (
                  <TableRow key={person.id}>
                    <TableCell className="font-medium">
                      {person.first_name} {person.last_name}
                    </TableCell>
                    <TableCell>@{person.username}</TableCell>
                    <TableCell>{person.email}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        Level {person.referral_level || 1}
                      </span>
                    </TableCell>
                    <TableCell>
                      {person.referred_by ? (
                        <span className="text-sm text-green-600">
                          Referred by someone
                        </span>
                      ) : (
                        <span className="text-sm text-blue-600">Root User</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(person)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(person.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PersonManager;
