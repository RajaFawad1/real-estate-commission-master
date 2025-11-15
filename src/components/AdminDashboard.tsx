import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, Users, Home, Calculator, TrendingUp, Building } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import PropertyManager from './PropertyManager';
import PersonManager from './PersonManager';
import CommissionCalculator from './CommissionCalculator';
import LevelManager from './LevelManager';

interface Property {
  id: string;
  property_name: string;
  price: number;
  property_type: 'residential' | 'commercial' | 'industrial' | 'land' | 'luxury';
  address: string;
  created_at: string | null;
  created_by: string | null;
  sold_by: string | null;
  updated_at: string | null;
}

interface Person {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  referral_level: number | null;
  referred_by: string | null;
  created_at: string | null;
  updated_at: string | null;
}

interface Level {
  id: string;
  name: string;
  commission_percentage: number;
  level_order: number;
  property_id?: string | null;
}

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('analytics');
  const [stats, setStats] = useState({
    totalProperties: 0,
    pendingProperties: 0,
    totalPeople: 0,
    totalCommissions: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [propertiesRes, peopleRes, commissionsRes] = await Promise.all([
        supabase.from('properties').select('status', { count: 'exact' }),
        supabase.from('people').select('*', { count: 'exact' }),
        supabase.from('commissions').select('commission_amount'),
      ]);

      const pendingCount = propertiesRes.data?.filter(p => p.status === 'pending').length || 0;
      const totalCommissions = commissionsRes.data?.reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0;

      setStats({
        totalProperties: propertiesRes.count || 0,
        pendingProperties: pendingCount,
        totalPeople: peopleRes.count || 0,
        totalCommissions,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };
  const [properties, setProperties] = useState<Property[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch properties
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (propertiesError) {
        console.error('Error fetching properties:', propertiesError);
      } else {
        setProperties(propertiesData || []);
      }

      // Fetch people
      const { data: peopleData, error: peopleError } = await supabase
        .from('people')
        .select('*')
        .order('created_at', { ascending: false });

      if (peopleError) {
        console.error('Error fetching people:', peopleError);
      } else {
        setPeople(peopleData || []);
      }

      // Fetch levels
      const { data: levelsData, error: levelsError } = await supabase
        .from('levels')
        .select('*')
        .order('level_order', { ascending: true });

      if (levelsError) {
        console.error('Error fetching levels:', levelsError);
      } else {
        setLevels(levelsData || []);
      }

      // If no levels exist, create default ones
      if (!levelsData || levelsData.length === 0) {
        await createDefaultLevels();
      }

      // Fetch commissions
      const { data: commissionsData, error: commissionsError } = await supabase
        .from('commissions')
        .select('*')
        .order('calculated_at', { ascending: false });

      if (commissionsError) {
        console.error('Error fetching commissions:', commissionsError);
      } else {
        setCommissions(commissionsData || []);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultLevels = async () => {
    const defaultLevels = [
      { name: 'Level 1', level_order: 1, commission_percentage: 5.0 },
      { name: 'Level 2', level_order: 2, commission_percentage: 3.0 },
      { name: 'Level 3', level_order: 3, commission_percentage: 2.0 },
      { name: 'Level 4', level_order: 4, commission_percentage: 1.5 },
      { name: 'Level 5', level_order: 5, commission_percentage: 1.0 },
    ];

    try {
      const { data, error } = await supabase
        .from('levels')
        .insert(defaultLevels)
        .select();

      if (error) {
        console.error('Error creating default levels:', error);
      } else {
        setLevels(data || []);
        console.log('Default levels created successfully');
      }
    } catch (error) {
      console.error('Error creating default levels:', error);
    }
  };

  const handleCommissionUpdate = async (levelOrder: number, commission: number) => {
    try {
      const { error } = await supabase
        .from('levels')
        .update({ commission_percentage: commission })
        .eq('level_order', levelOrder);

      if (error) {
        console.error('Error updating commission:', error);
      } else {
        // Update local state
        setLevels(prev => prev.map(level => 
          level.level_order === levelOrder 
            ? { ...level, commission_percentage: commission }
            : level
        ));
        console.log(`Commission updated for level ${levelOrder}: ${commission}%`);
      }
    } catch (error) {
      console.error('Error updating commission:', error);
    }
  };

  // Calculate statistics
  const totalProperties = properties.length;
  const totalPeople = people.length;
  const totalCommissions = commissions.reduce((sum, comm) => sum + (comm.commission_amount || 0), 0);
  const totalPropertyValue = properties.reduce((sum, prop) => sum + (prop.price || 0), 0);

  // Prepare chart data
  const propertyTypeData = properties.reduce((acc, property) => {
    const type = property.property_type;
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(propertyTypeData).map(([type, count]) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    value: count,
  }));

  const levelData = people.reduce((acc, person) => {
    const level = person.referral_level || 1;
    acc[level] = (acc[level] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);

  const levelChartData = Object.entries(levelData).map(([level, count]) => ({
    level: `Level ${level}`,
    people: count,
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const renderAnalytics = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProperties}</div>
            <p className="text-xs text-muted-foreground">Properties in system</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total People</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPeople}</div>
            <p className="text-xs text-muted-foreground">People in network</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Property Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalPropertyValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Combined property value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Commissions</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalCommissions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Commissions calculated</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Property Types Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>People by Referral Level</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={levelChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="level" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="people" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderContent = () => {
    if (activeTab === 'analytics') {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
                <Building className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{stats.totalProperties}</div>
                <p className="text-xs text-muted-foreground mt-1">{stats.pendingProperties} pending approval</p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total People</CardTitle>
                <Users className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{stats.totalPeople}</div>
                <p className="text-xs text-muted-foreground mt-1">Registered users</p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Total Commissions</CardTitle>
                <DollarSign className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">${stats.totalCommissions.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">Calculated earnings</p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-all duration-300 hover:scale-[1.02]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Growth</CardTitle>
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-500">+12%</div>
                <p className="text-xs text-muted-foreground mt-1">From last month</p>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'analytics':
        return renderAnalytics();
      case 'properties':
        return <PropertyManager />;
      case 'people':
        return <PersonManager />;
      case 'levels':
        return <LevelManager levels={levels} onCommissionUpdate={handleCommissionUpdate} />;
      case 'calculator':
        return <CommissionCalculator />;
      default:
        return renderAnalytics();
    }
  };

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gradient-to-br from-background via-background to-muted/10">
        <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main className="flex-1">
          <div className="sticky top-0 z-10 backdrop-blur-sm bg-background/80 border-b border-border/40 p-4">
            <div className="flex items-center justify-between">
              <SidebarTrigger className="hover:scale-110 transition-transform" />
              <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <Button onClick={fetchDashboardData} variant="outline" className="hover:scale-105 transition-transform">
                Refresh Data
              </Button>
            </div>
          </div>
          <div className="p-6 animate-fade-in">
            {renderContent()}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;
