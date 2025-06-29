
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, LogOut, Calculator, Users, User, DollarSign, UserCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import CommissionCalculator from './CommissionCalculator';

interface AdminDashboardProps {
  onLogout: () => void;
}

interface PersonEarning {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  total_earnings: number;
  commission_count: number;
  referral_earnings: number;
  referral_count: number;
}

interface PropertyCommission {
  id: string;
  property_price: number;
  property_type: string;
  commission_amount: number;
  commission_percentage: number;
  calculated_at: string;
  level_name?: string;
  referral_level?: number;
  commission_type: 'level' | 'referral';
}

const AdminDashboard = ({ onLogout }: AdminDashboardProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [peopleEarnings, setPeopleEarnings] = useState<PersonEarning[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalPeople: 0,
    totalProperties: 0,
    totalCommissions: 0,
    totalReferralCommissions: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedPersonCommissions, setSelectedPersonCommissions] = useState<PropertyCommission[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch people with their total earnings from both regular and referral commissions
      const [levelCommissionsResult, referralCommissionsResult] = await Promise.all([
        supabase
          .from('commissions')
          .select(`
            person_id,
            commission_amount,
            people!inner(id, username, first_name, last_name, email)
          `),
        supabase
          .from('referral_commissions')
          .select(`
            referrer_id,
            commission_amount,
            people!inner(id, username, first_name, last_name, email)
          `)
      ]);

      if (levelCommissionsResult.error) {
        console.error('Error fetching level commissions:', levelCommissionsResult.error);
        return;
      }

      if (referralCommissionsResult.error) {
        console.error('Error fetching referral commissions:', referralCommissionsResult.error);
        return;
      }

      // Group commissions by person
      const earningsMap = new Map<string, PersonEarning>();
      
      // Process level commissions
      levelCommissionsResult.data?.forEach((item) => {
        const person = item.people;
        const personId = person.id;
        
        if (earningsMap.has(personId)) {
          const existing = earningsMap.get(personId)!;
          existing.total_earnings += Number(item.commission_amount);
          existing.commission_count += 1;
        } else {
          earningsMap.set(personId, {
            id: person.id,
            username: person.username,
            first_name: person.first_name,
            last_name: person.last_name,
            email: person.email,
            total_earnings: Number(item.commission_amount),
            commission_count: 1,
            referral_earnings: 0,
            referral_count: 0
          });
        }
      });

      // Process referral commissions
      referralCommissionsResult.data?.forEach((item) => {
        const person = item.people;
        const personId = person.id;
        
        if (earningsMap.has(personId)) {
          const existing = earningsMap.get(personId)!;
          existing.total_earnings += Number(item.commission_amount);
          existing.referral_earnings += Number(item.commission_amount);
          existing.referral_count += 1;
        } else {
          earningsMap.set(personId, {
            id: person.id,
            username: person.username,
            first_name: person.first_name,
            last_name: person.last_name,
            email: person.email,
            total_earnings: Number(item.commission_amount),
            commission_count: 0,
            referral_earnings: Number(item.commission_amount),
            referral_count: 1
          });
        }
      });

      setPeopleEarnings(Array.from(earningsMap.values()));

      // Fetch total stats
      const [peopleResult, propertiesResult, commissionsResult, referralCommissionsResult2] = await Promise.all([
        supabase.from('people').select('id', { count: 'exact', head: true }),
        supabase.from('properties').select('id', { count: 'exact', head: true }),
        supabase.from('commissions').select('commission_amount'),
        supabase.from('referral_commissions').select('commission_amount')
      ]);

      const totalCommissionAmount = commissionsResult.data?.reduce(
        (sum, item) => sum + Number(item.commission_amount), 0
      ) || 0;

      const totalReferralCommissionAmount = referralCommissionsResult2.data?.reduce(
        (sum, item) => sum + Number(item.commission_amount), 0
      ) || 0;

      setTotalStats({
        totalPeople: peopleResult.count || 0,
        totalProperties: propertiesResult.count || 0,
        totalCommissions: totalCommissionAmount,
        totalReferralCommissions: totalReferralCommissionAmount
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPersonCommissions = async (personId: string) => {
    try {
      // Fetch both level and referral commissions
      const [levelCommissions, referralCommissions] = await Promise.all([
        supabase
          .from('commissions')
          .select(`
            id,
            commission_amount,
            commission_percentage,
            calculated_at,
            properties!inner(price, property_type),
            levels!inner(name)
          `)
          .eq('person_id', personId)
          .order('calculated_at', { ascending: false }),
        supabase
          .from('referral_commissions')
          .select(`
            id,
            commission_amount,
            commission_percentage,
            referral_level,
            calculated_at,
            properties!inner(price, property_type)
          `)
          .eq('referrer_id', personId)
          .order('calculated_at', { ascending: false })
      ]);

      if (levelCommissions.error) {
        console.error('Error fetching level commissions:', levelCommissions.error);
        return;
      }

      if (referralCommissions.error) {
        console.error('Error fetching referral commissions:', referralCommissions.error);
        return;
      }

      const allCommissions: PropertyCommission[] = [
        // Level commissions
        ...(levelCommissions.data?.map(item => ({
          id: item.id,
          property_price: Number(item.properties.price),
          property_type: item.properties.property_type,
          commission_amount: Number(item.commission_amount),
          commission_percentage: Number(item.commission_percentage),
          calculated_at: item.calculated_at,
          level_name: item.levels.name,
          commission_type: 'level' as const
        })) || []),
        // Referral commissions
        ...(referralCommissions.data?.map(item => ({
          id: item.id,
          property_price: Number(item.properties.price),
          property_type: item.properties.property_type,
          commission_amount: Number(item.commission_amount),
          commission_percentage: Number(item.commission_percentage),
          calculated_at: item.calculated_at,
          referral_level: item.referral_level,
          commission_type: 'referral' as const
        })) || [])
      ];

      // Sort by date
      allCommissions.sort((a, b) => new Date(b.calculated_at).getTime() - new Date(a.calculated_at).getTime());

      setSelectedPersonCommissions(allCommissions);
      setSelectedPersonId(personId);
    } catch (error) {
      console.error('Error fetching person commissions:', error);
    }
  };

  const filteredEarnings = peopleEarnings.filter(person =>
    person.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    person.last_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total People</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalStats.totalPeople}</div>
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
                  <div className="text-2xl font-bold">{totalStats.totalProperties}</div>
                  <p className="text-xs text-muted-foreground">
                    Properties processed
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Level Commissions</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${totalStats.totalCommissions.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Traditional commissions
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Referral Commissions</CardTitle>
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${totalStats.totalReferralCommissions.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Referral-based commissions
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
                  {peopleEarnings.slice(0, 10).map((person) => (
                    <div key={person.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-green-500 rounded-full flex items-center justify-center">
                          <User className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="font-medium">
                            {person.first_name} {person.last_name}
                          </div>
                          <div className="text-sm text-gray-500">@{person.username}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          ${person.total_earnings.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500">
                          {person.commission_count} level + {person.referral_count} referral
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
                              {person.first_name} {person.last_name}
                            </h3>
                            <p className="text-gray-600">@{person.username}</p>
                            <p className="text-sm text-gray-500">{person.email}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-600">
                              ${person.total_earnings.toLocaleString()}
                            </div>
                            <div className="text-sm text-gray-500">Total Earnings</div>
                            <div className="text-xs text-gray-400 mt-1">
                              Level: ${(person.total_earnings - person.referral_earnings).toLocaleString()} | 
                              Referral: ${person.referral_earnings.toLocaleString()}
                            </div>
                            <Button
                              onClick={() => fetchPersonCommissions(person.id)}
                              variant="outline"
                              size="sm"
                              className="mt-2"
                            >
                              View Details
                            </Button>
                          </div>
                        </div>

                        {selectedPersonId === person.id && selectedPersonCommissions.length > 0 && (
                          <div className="space-y-2 mt-4 border-t pt-4">
                            <h4 className="font-medium">Commission History:</h4>
                            {selectedPersonCommissions.map((commission) => (
                              <div key={commission.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <div>
                                  <span className="font-medium capitalize">{commission.property_type}</span>
                                  <span className="text-gray-500 ml-2">
                                    (${commission.property_price.toLocaleString()})
                                  </span>
                                  {commission.commission_type === 'level' && commission.level_name && (
                                    <span className="text-gray-500 ml-2">- {commission.level_name}</span>
                                  )}
                                  {commission.commission_type === 'referral' && commission.referral_level && (
                                    <span className="text-green-600 ml-2">- Referral Level {commission.referral_level}</span>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="font-medium">
                                    ${commission.commission_amount.toLocaleString()}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {new Date(commission.calculated_at).toLocaleDateString()}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
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
