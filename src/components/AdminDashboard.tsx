import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Calculator, Users, BarChart3, DollarSign, TrendingUp, Building, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import CommissionCalculator from './CommissionCalculator';
import PropertyManager from './PropertyManager';
import PersonManager from './PersonManager';

interface AdminDashboardProps {
  onLogout: () => void;
}

interface DashboardStats {
  totalProperties: number;
  totalCommissions: number;
  totalPeople: number;
  totalReferralCommissions: number;
}

interface Property {
  id: string;
  property_name: string;
  price: number;
  property_type: string;
  address: string;
  created_at: string;
  sold_by: string;
  seller?: {
    first_name: string;
    last_name: string;
    username: string;
    referral_level: number;
  };
}

interface Person {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  referral_level: number;
  referred_by: string | null;
  referrer?: {
    first_name: string;
    last_name: string;
    username: string;
  };
}

const AdminDashboard = ({ onLogout }: AdminDashboardProps) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalProperties: 0,
    totalCommissions: 0,
    totalPeople: 0,
    totalReferralCommissions: 0
  });
  const [recentProperties, setRecentProperties] = useState<Property[]>([]);
  const [allPeople, setAllPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch properties with seller information
      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select(`
          *,
          seller:people!properties_sold_by_fkey (
            first_name,
            last_name,
            username,
            referral_level
          )
        `)
        .order('created_at', { ascending: false })
        .limit(5);

      if (propertiesError) {
        console.error('Error fetching properties:', propertiesError);
      } else {
        const formattedProperties = properties?.map(prop => ({
          ...prop,
          seller: Array.isArray(prop.seller) ? prop.seller[0] : prop.seller
        })) || [];
        setRecentProperties(formattedProperties);
      }

      // Fetch all people with referrer information
      const { data: people, error: peopleError } = await supabase
        .from('people')
        .select(`
          *,
          referrer:people!people_referred_by_fkey (
            first_name,
            last_name,
            username
          )
        `)
        .order('created_at', { ascending: false });

      if (peopleError) {
        console.error('Error fetching people:', peopleError);
      } else {
        const formattedPeople = people?.map(person => ({
          ...person,
          referrer: Array.isArray(person.referrer) ? person.referrer[0] : person.referrer
        })) || [];
        setAllPeople(formattedPeople);
      }

      // Fetch commission stats
      const { data: commissions, error: commissionsError } = await supabase
        .from('commissions')
        .select('commission_amount');

      const { data: referralCommissions, error: referralCommissionsError } = await supabase
        .from('referral_commissions')
        .select('commission_amount');

      // Calculate stats
      const totalCommissions = commissions?.reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0;
      const totalReferralCommissions = referralCommissions?.reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0;

      setStats({
        totalProperties: properties?.length || 0,
        totalCommissions,
        totalPeople: people?.length || 0,
        totalReferralCommissions
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Calculator className="w-8 h-8 text-blue-600" />
                <h1 className="text-2xl font-bold text-gray-900">Commission Dashboard</h1>
              </div>
            </div>
            <Button onClick={onLogout} variant="outline" className="flex items-center space-x-2">
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Properties</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalProperties}</p>
                </div>
                <Building className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total People</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalPeople}</p>
                </div>
                <Users className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Level Commissions</p>
                  <p className="text-3xl font-bold text-gray-900">€{stats.totalCommissions.toLocaleString()}</p>
                </div>
                <DollarSign className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Referral Commissions</p>
                  <p className="text-3xl font-bold text-gray-900">€{stats.totalReferralCommissions.toLocaleString()}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="calculator" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="calculator">Calculator</TabsTrigger>
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="add-property">Add Property</TabsTrigger>
            <TabsTrigger value="add-person">Add Person</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="calculator">
            <CommissionCalculator />
          </TabsContent>

          <TabsContent value="properties">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Recent Properties
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentProperties.map((property) => (
                    <div key={property.id} className="p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-lg">{property.property_name}</span>
                            <span className="font-semibold text-lg">€{property.price.toLocaleString()}</span>
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                              {property.property_type}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{property.address}</p>
                          {property.seller && (
                            <p className="text-sm text-gray-600 mt-1">
                              Sold by: {property.seller.first_name} {property.seller.last_name} 
                              <span className="text-gray-500"> (@{property.seller.username})</span>
                              <span className="ml-2 px-1 py-0.5 bg-green-100 text-green-800 text-xs rounded">
                                Level {property.seller.referral_level}
                              </span>
                            </p>
                          )}
                        </div>
                        <div className="text-right text-sm text-gray-500">
                          {new Date(property.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="add-property">
            <PropertyManager />
          </TabsContent>

          <TabsContent value="add-person">
            <PersonManager />
          </TabsContent>

          <TabsContent value="analytics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5" />
                    Commission Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                      <span className="font-medium">Level-based Commissions</span>
                      <span className="font-bold text-yellow-700">€{stats.totalCommissions.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                      <span className="font-medium">Referral Commissions</span>
                      <span className="font-bold text-purple-700">€{stats.totalReferralCommissions.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border-2 border-green-200">
                      <span className="font-semibold">Total Commissions</span>
                      <span className="font-bold text-green-700 text-lg">
                        €{(stats.totalCommissions + stats.totalReferralCommissions).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Network Overview
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600">{stats.totalPeople}</div>
                      <div className="text-sm text-gray-600">Total Network Members</div>
                    </div>
                    <div className="space-y-2">
                      {[1, 2, 3, 4, 5].map(level => {
                        const levelCount = allPeople.filter(p => (p.referral_level || 1) === level).length;
                        return (
                          <div key={level} className="flex justify-between items-center">
                            <span className="text-sm">Level {level}</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-20 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-500 h-2 rounded-full" 
                                  style={{ width: `${stats.totalPeople > 0 ? (levelCount / stats.totalPeople) * 100 : 0}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium w-8">{levelCount}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;
