
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, UserPlus } from 'lucide-react';
import { Person } from './CommissionCalculator';

interface PeopleManagerProps {
  levelId: string;
  levelName: string;
  people: Person[];
  onAddPerson: (levelId: string, person: Person) => boolean;
}

const PeopleManager = ({ levelId, levelName, people, onAddPerson }: PeopleManagerProps) => {
  const [formData, setFormData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    phone: '',
    email: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username || !formData.firstName || !formData.lastName || !formData.email) {
      return;
    }

    const newPerson: Person = {
      id: Date.now().toString(),
      ...formData
    };

    const success = onAddPerson(levelId, newPerson);
    
    if (success) {
      setFormData({
        username: '',
        firstName: '',
        lastName: '',
        phone: '',
        email: ''
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <UserPlus className="w-5 h-5" />
          Add People to {levelName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">Username *</Label>
              <Input
                id="username"
                type="text"
                placeholder="Unique username"
                value={formData.username}
                onChange={(e) => handleInputChange('username', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="Email address"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="text-sm font-medium">First Name *</Label>
              <Input
                id="firstName"
                type="text"
                placeholder="First name"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="text-sm font-medium">Last Name *</Label>
              <Input
                id="lastName"
                type="text"
                placeholder="Last name"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="Phone number"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
            />
          </div>

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
            <UserPlus className="w-4 h-4 mr-2" />
            Add Person to {levelName}
          </Button>
        </form>

        {people.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <User className="w-4 h-4" />
              People in {levelName} ({people.length})
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {people.map((person) => (
                <div key={person.id} className="p-3 bg-gray-50 rounded-lg border">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900">
                        {person.firstName} {person.lastName}
                      </div>
                      <div className="text-sm text-gray-600">@{person.username}</div>
                      <div className="text-sm text-gray-600">{person.email}</div>
                      {person.phone && (
                        <div className="text-sm text-gray-600">{person.phone}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PeopleManager;
