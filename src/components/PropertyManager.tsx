
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Edit, Trash2, Building } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Property {
  id: string;
  property_name: string;
  property_type: string;
  address: string;
  price: number;
  sold_by: string | null;
  created_at: string;
  seller?: {
    first_name: string;
    last_name: string;
    username: string;
  };
}

interface User {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
}

const PropertyManager = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [formData, setFormData] = useState({
    property_name: '',
    property_type: '',
    address: '',
    price: '',
    sold_by: ''
  });
  const { toast } = useToast();

  const propertyTypes = ['residential', 'commercial', 'industrial', 'land'];

  useEffect(() => {
    fetchProperties();
    fetchUsers();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('properties')
        .select(`
          *,
          seller:people!properties_sold_by_fkey (
            first_name,
            last_name,
            username
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching properties:', error);
        toast({
          title: "Error",
          description: "Failed to fetch properties",
          variant: "destructive",
        });
      } else {
        setProperties(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('people')
        .select('id, username, first_name, last_name')
        .order('first_name');

      if (error) {
        console.error('Error fetching users:', error);
      } else {
        setUsers(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const propertyData = {
        property_name: formData.property_name,
        property_type: formData.property_type,
        address: formData.address,
        price: parseFloat(formData.price),
        sold_by: formData.sold_by || null
      };

      if (editingProperty) {
        // Update existing property
        const { error } = await supabase
          .from('properties')
          .update(propertyData)
          .eq('id', editingProperty.id);

        if (error) {
          console.error('Error updating property:', error);
          toast({
            title: "Error",
            description: "Failed to update property",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Success",
          description: "Property updated successfully",
        });
      } else {
        // Create new property
        const { error } = await supabase
          .from('properties')
          .insert([propertyData]);

        if (error) {
          console.error('Error creating property:', error);
          toast({
            title: "Error",
            description: "Failed to create property",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Success",
          description: "Property created successfully",
        });
      }

      // Reset form and close dialog
      setFormData({
        property_name: '',
        property_type: '',
        address: '',
        price: '',
        sold_by: ''
      });
      setEditingProperty(null);
      setIsDialogOpen(false);
      fetchProperties();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleEdit = (property: Property) => {
    setEditingProperty(property);
    setFormData({
      property_name: property.property_name || '',
      property_type: property.property_type,
      address: property.address || '',
      price: property.price.toString(),
      sold_by: property.sold_by || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (propertyId: string) => {
    if (!confirm('Are you sure you want to delete this property?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyId);

      if (error) {
        console.error('Error deleting property:', error);
        toast({
          title: "Error",
          description: "Failed to delete property",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Property deleted successfully",
      });
      fetchProperties();
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      property_name: '',
      property_type: '',
      address: '',
      price: '',
      sold_by: ''
    });
    setEditingProperty(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Property Management</h2>
          <p className="text-gray-600">Add, edit, and manage properties in the system</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Property
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingProperty ? 'Edit Property' : 'Add New Property'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="property_name">Property Name</Label>
                <Input
                  id="property_name"
                  value={formData.property_name}
                  onChange={(e) => setFormData({ ...formData, property_name: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="property_type">Property Type</Label>
                <Select value={formData.property_type} onValueChange={(value) => setFormData({ ...formData, property_type: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select property type" />
                  </SelectTrigger>
                  <SelectContent>
                    {propertyTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="price">Price</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="sold_by">Sold By</Label>
                <Select value={formData.sold_by} onValueChange={(value) => setFormData({ ...formData, sold_by: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select seller (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.first_name} {user.last_name} (@{user.username})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingProperty ? 'Update Property' : 'Create Property'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Properties ({properties.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {properties.map((property) => (
              <div key={property.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div>
                      <h3 className="font-semibold">{property.property_name || 'Unnamed Property'}</h3>
                      <p className="text-lg font-bold text-green-600">${property.price.toLocaleString()}</p>
                    </div>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {property.property_type.charAt(0).toUpperCase() + property.property_type.slice(1)}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    <p>{property.address}</p>
                    {property.seller && (
                      <p className="text-green-600">
                        Sold by: {property.seller.first_name} {property.seller.last_name} (@{property.seller.username})
                      </p>
                    )}
                    <p className="text-gray-400">
                      Created: {new Date(property.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(property)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(property.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {properties.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No properties found. Add your first property to get started.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PropertyManager;
