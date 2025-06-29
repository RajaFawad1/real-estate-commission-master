
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, LogOut, Calculator, Users, User } from 'lucide-react';
import CommissionCalculator from './CommissionCalculator';

interface AdminDashboardProps {
  onLogout: () => void;
}

const AdminDashboard = ({ onLogout }: AdminDashboardProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Mock data for demonstration
  const mockEarnings = [
    {
      id: '1',
      username: 'john_doe',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      totalEarnings: 25000,
      properties: [
        { id: '1', type: 'Residential', price: 500000, commission: 15000, date: '2024-01-15' },
        { id: '2', type: 'Commercial', price: 800000, commission: 10000, date: '2024-02-20' }
      ]
    },
    {
      id: '2',
      username: 'jane_smith',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      totalEarnings: 18000,
      properties: [
        { id: '3', type: 'Luxury', price: 1200000, commission: 18000, date: '2024-03-10' }
      ]
    }
  ];

  const filteredEarnings = mockEarnings.filter(person =>
    person.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.lastName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-green-600 rounded-lg flex items-center justify-center">
                <Calculator className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">
                Real Estate Commission Manager
              </h1>
            </div>
            <Button 
              onClick={onLogout}
              variant="outline"
              className="flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="calculator" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
            <TabsTrigger value="calculator" className="flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Calculator
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Search
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calculator" className="space-y-6">
            <CommissionCalculator />
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total People</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{mockEarnings.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Active commission earners
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {mockEarnings.reduce((sum, person) => sum + person.properties.length, 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Properties processed
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Commissions</CardTitle>
                  <User className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${mockEarnings.reduce((sum, person) => sum + person.totalEarnings, 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Total paid out
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Earnings Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockEarnings.map((person) => (
                    <div key={person.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {person.firstName} {person.lastName}
                          </div>
                          <div className="text-sm text-gray-500">@{person.username}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          ${person.totalEarnings.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {person.properties.length} properties
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="search" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Search People & Earnings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Input
                    placeholder="Search by username, first name, or last name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1"
                  />
                  <Button variant="outline">
                    <Search className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  {filteredEarnings.map((person) => (
                    <Card key={person.id} className="shadow-sm">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-semibold text-lg">
                              {person.firstName} {person.lastName}
                            </h3>
                            <p className="text-gray-600">@{person.username}</p>
                            <p className="text-sm text-gray-500">{person.email}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-600">
                              ${person.totalEarnings.toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-500">Total Earnings</div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="font-medium">Property Commissions:</h4>
                          {person.properties.map((property) => (
                            <div key={property.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                              <div>
                                <span className="font-medium">{property.type}</span>
                                <span className="text-gray-500 ml-2">
                                  (${property.price.toLocaleString()})
                                </span>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">
                                  ${property.commission.toLocaleString()}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {property.date}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {filteredEarnings.length === 0 && searchTerm && (
                  <div className="text-center py-8 text-gray-500">
                    No people found matching "{searchTerm}"
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
