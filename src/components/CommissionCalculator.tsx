
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, Users, UserCheck, UserPlus, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import LevelManager, { Level } from './LevelManager';

export interface Person {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  referred_by?: string;
  referral_level?: number;
}

export interface Property {
  id: string;
  price: number;
  property_type: string;
  totalCommission: number;
  created_at: Date;
  sold_by?: string;
}

interface ReferralCommission {
  person_id: string;
  username: string;
  first_name: string;
  last_name: string;
  level: number;
  commission_percentage: number;
  commission_amount: number;
}

const CommissionCalculator = () => {
  const [propertyPrice, setPropertyPrice] = useState<number>(0);
  const [propertyType, setPropertyType] = useState<string>('');
  const [selectedSeller, setSelectedSeller] = useState<string>('');
  const [calculations, setCalculations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [allPeople, setAllPeople] = useState<Person[]>([]);
  const [referralPreview, setReferralPreview] = useState<ReferralCommission[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchAllPeople();
    fetchReferralLevels();
  }, []);

  useEffect(() => {
    if (selectedSeller && propertyPrice > 0) {
      previewReferralCommissions();
    } else {
      setReferralPreview([]);
    }
  }, [selectedSeller, propertyPrice, levels]);

  const fetchAllPeople = async () => {
    try {
      const { data, error } = await supabase
        .from('people')
        .select('*')
        .order('first_name');

      if (error) {
        console.error('Error fetching people:', error);
        return;
      }

      setAllPeople(data || []);
    } catch (error) {
      console.error('Error fetching people:', error);
    }
  };

  const fetchReferralLevels = async () => {
    try {
      const { data, error } = await supabase
        .from('referral_levels')
        .select('*')
        .order('level');

      if (error) {
        console.error('Error fetching referral levels:', error);
        return;
      }

      const formattedLevels: Level[] = data?.map(level => ({
        id: level.id,
        level: level.level,
        commission_percentage: level.commission_percentage,
        name: `Level ${level.level} Referrer`
      })) || [];

      setLevels(formattedLevels);
    } catch (error) {
      console.error('Error fetching referral levels:', error);
    }
  };

  const handleCommissionUpdate = async (level: number, commission: number) => {
    try {
      const { error } = await supabase
        .from('referral_levels')
        .update({ commission_percentage: commission })
        .eq('level', level);

      if (error) {
        console.error('Error updating commission:', error);
        toast({
          title: "Error",
          description: "Failed to update commission percentage.",
          variant: "destructive",
        });
        return;
      }

      // Update local state
      setLevels(prev => prev.map(l => 
        l.level === level ? { ...l, commission_percentage: commission } : l
      ));

      toast({
        title: "Commission updated",
        description: `Level ${level} commission set to ${commission}%`,
      });
    } catch (error) {
      console.error('Error updating commission:', error);
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

  const previewReferralCommissions = async () => {
    if (!selectedSeller || !propertyPrice) return;

    try {
      const { data: referralChain, error } = await supabase
        .rpc('get_referral_chain', { seller_id: selectedSeller });

      if (error) {
        console.error('Error getting referral chain:', error);
        return;
      }

      const commissions: ReferralCommission[] = [];
      
      referralChain?.forEach((referrer) => {
        const levelData = levels.find(l => l.level === referrer.level - 1);
        if (levelData) {
          const commissionAmount = (propertyPrice * levelData.commission_percentage) / 100;
          commissions.push({
            person_id: referrer.person_id,
            username: referrer.username,
            first_name: referrer.first_name,
            last_name: referrer.last_name,
            level: referrer.level - 1,
            commission_percentage: levelData.commission_percentage,
            commission_amount: commissionAmount
          });
        }
      });

      setReferralPreview(commissions);
    } catch (error) {
      console.error('Error previewing referral commissions:', error);
    }
  };

  const handleAddPerson = async (personData: Omit<Person, 'id'>) => {
    try {
      const { data: existingPerson } = await supabase
        .from('people')
        .select('username')
        .eq('username', personData.username)
        .single();

      if (existingPerson) {
        toast({
          title: "Username already exists",
          description: "Please choose a different username.",
          variant: "destructive",
        });
        return false;
      }

      let referralLevel = 1;
      if (personData.referred_by) {
        referralLevel = await calculateUserLevel(personData.referred_by) + 1;
      }

      const { data: newPerson, error } = await supabase
        .from('people')
        .insert([{
          username: personData.username,
          first_name: personData.first_name,
          last_name: personData.last_name,
          phone: personData.phone || '',
          email: personData.email,
          referred_by: personData.referred_by || null,
          referral_level: referralLevel
        }])
        .select()
        .single();

      if (error) {
        toast({
          title: "Error adding person",
          description: error.message,
          variant: "destructive",
        });
        return false;
      }

      setAllPeople(prev => [...prev, newPerson]);
      
      toast({
        title: "Person added successfully",
        description: `${personData.first_name} ${personData.last_name} has been added at Level ${referralLevel}.`,
      });
      
      return true;
    } catch (error) {
      console.error('Error adding person:', error);
      toast({
        title: "Error",
        description: "Failed to add person. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const calculateCommissions = async () => {
    if (!propertyPrice || !propertyType || !selectedSeller) {
      toast({
        title: "Missing information",
        description: "Please enter property price, type, and select a seller.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .insert({
          price: propertyPrice,
          property_type: propertyType as 'residential' | 'commercial' | 'industrial' | 'land' | 'luxury',
          sold_by: selectedSeller
        })
        .select()
        .single();

      if (propertyError) {
        throw propertyError;
      }

      const referralCommissionRecords = [];
      let totalReferralCommissions = 0;

      for (const referralCommission of referralPreview) {
        const commissionRecord = {
          property_id: property.id,
          referrer_id: referralCommission.person_id,
          referral_level: referralCommission.level,
          commission_percentage: referralCommission.commission_percentage,
          commission_amount: referralCommission.commission_amount
        };
        referralCommissionRecords.push(commissionRecord);
        totalReferralCommissions += referralCommission.commission_amount;
      }

      if (referralCommissionRecords.length > 0) {
        const { error: referralError } = await supabase
          .from('referral_commissions')
          .insert(referralCommissionRecords);

        if (referralError) {
          throw referralError;
        }
      }

      const newCalculation = {
        id: property.id,
        propertyPrice,
        propertyType,
        seller: allPeople.find(p => p.id === selectedSeller),
        totalCommission: totalReferralCommissions,
        referralResults: referralPreview,
        totalReferralCommissions,
        createdAt: new Date()
      };

      setCalculations(prev => [newCalculation, ...prev]);

      toast({
        title: "Commission calculated successfully",
        description: `Total commission: $${totalReferralCommissions.toLocaleString()}`,
      });

      setPropertyPrice(0);
      setPropertyType('');
      setSelectedSeller('');
      setReferralPreview([]);

    } catch (error) {
      console.error('Error calculating commissions:', error);
      toast({
        title: "Error",
        description: "Failed to calculate commissions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Commission Level Settings */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-purple-600 to-blue-600 text-white">
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Commission Level Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <LevelManager 
            levels={levels} 
            onCommissionUpdate={handleCommissionUpdate}
          />
        </CardContent>
      </Card>

      {/* Property Commission Calculator */}
      <Card className="shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-green-600 text-white">
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Property Commission Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="price" className="text-sm font-medium">Property Price ($)</Label>
              <Input
                id="price"
                type="number"
                placeholder="Enter property price"
                value={propertyPrice || ''}
                onChange={(e) => setPropertyPrice(Number(e.target.value))}
                className="text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type" className="text-sm font-medium">Property Type</Label>
              <Select onValueChange={setPropertyType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select property type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="industrial">Industrial</SelectItem>
                  <SelectItem value="land">Land</SelectItem>
                  <SelectItem value="luxury">Luxury</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="seller" className="text-sm font-medium">Seller</Label>
              <Select onValueChange={setSelectedSeller}>
                <SelectTrigger>
                  <SelectValue placeholder="Select seller" />
                </SelectTrigger>
                <SelectContent>
                  {allPeople.map(person => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.first_name} {person.last_name} (@{person.username}) - Level {person.referral_level || 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Referral Commission Preview */}
          {referralPreview.length > 0 && (
            <Card className="bg-green-50 border-green-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2 text-green-800">
                  <UserCheck className="w-5 h-5" />
                  Referral Commission Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {referralPreview.map((referral) => (
                  <div key={referral.person_id} className="flex justify-between items-center p-3 bg-white rounded-lg border">
                    <div>
                      <div className="font-medium text-gray-900">
                        {referral.first_name} {referral.last_name}
                      </div>
                      <div className="text-sm text-gray-600">
                        @{referral.username} • Level {referral.level} Referrer
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">
                        ${referral.commission_amount.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {referral.commission_percentage}%
                      </div>
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t border-green-200">
                  <div className="flex justify-between items-center font-semibold text-green-800">
                    <span>Total Referral Commissions:</span>
                    <span>${referralPreview.reduce((sum, r) => sum + r.commission_amount, 0).toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Add New Person Section */}
          <Card className="shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Add New Person
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PeopleManager
                allPeople={allPeople}
                onAddPerson={handleAddPerson}
              />
            </CardContent>
          </Card>

          <div className="pt-6 border-t">
            <Button 
              onClick={calculateCommissions}
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white py-3 text-lg font-medium"
              size="lg"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Calculating...
                </div>
              ) : (
                <>
                  <Calculator className="w-5 h-5 mr-2" />
                  Calculate Commission
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Latest Results */}
      {calculations.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Latest Commission Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {calculations[0].seller && (
                <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <h4 className="font-semibold text-blue-800 mb-2">Property Seller</h4>
                  <div className="text-sm">
                    <span className="font-medium">{calculations[0].seller.first_name} {calculations[0].seller.last_name}</span>
                    <span className="text-gray-600 ml-2">(@{calculations[0].seller.username}) - Level {calculations[0].seller.referral_level || 1}</span>
                  </div>
                </div>
              )}

              {calculations[0].referralResults && calculations[0].referralResults.length > 0 && (
                <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                  <h4 className="font-semibold text-green-800 mb-3">Referral Commissions</h4>
                  <div className="space-y-2">
                    {calculations[0].referralResults.map((referral: ReferralCommission) => (
                      <div key={referral.person_id} className="flex justify-between items-center text-sm bg-white p-2 rounded">
                        <span>{referral.first_name} {referral.last_name} (Level {referral.level})</span>
                        <span className="font-medium">${referral.commission_amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-2 border-t border-green-200 flex justify-between font-medium text-green-800">
                    <span>Total Commission:</span>
                    <span>${calculations[0].totalReferralCommissions.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// PeopleManager component for adding new users
const PeopleManager = ({ allPeople, onAddPerson }: {
  allPeople: Person[];
  onAddPerson: (person: Omit<Person, 'id'>) => Promise<boolean>;
}) => {
  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    referred_by: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username || !formData.first_name || !formData.last_name || !formData.email) {
      return;
    }

    const success = await onAddPerson(formData);
    
    if (success) {
      setFormData({
        username: '',
        first_name: '',
        last_name: '',
        phone: '',
        email: '',
        referred_by: ''
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
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
            value={formData.first_name}
            onChange={(e) => handleInputChange('first_name', e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName" className="text-sm font-medium">Last Name *</Label>
          <Input
            id="lastName"
            type="text"
            placeholder="Last name"
            value={formData.last_name}
            onChange={(e) => handleInputChange('last_name', e.target.value)}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <div className="space-y-2">
          <Label htmlFor="referredBy" className="text-sm font-medium">Invited By (Optional)</Label>
          <Select onValueChange={(value) => handleInputChange('referred_by', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select who invited this person" />
            </SelectTrigger>
            <SelectContent>
              {allPeople.map(person => (
                <SelectItem key={person.id} value={person.id}>
                  {person.first_name} {person.last_name} (@{person.username}) - Level {person.referral_level || 1}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
        <UserPlus className="w-4 h-4 mr-2" />
        Add Person (Level will be auto-calculated)
      </Button>
    </form>
  );
};

export default CommissionCalculator;
