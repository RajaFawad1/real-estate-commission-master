
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, UserCheck, Settings } from 'lucide-react';
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
  property_name: string;
  price: number;
  property_type: string;
  address: string;
  created_at: Date;
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
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [selectedSeller, setSelectedSeller] = useState<string>('');
  const [calculations, setCalculations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [allPeople, setAllPeople] = useState<Person[]>([]);
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [referralPreview, setReferralPreview] = useState<ReferralCommission[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchAllPeople();
    fetchAllProperties();
    fetchReferralLevels();
  }, []);

  useEffect(() => {
    if (selectedSeller && selectedProperty) {
      previewReferralCommissions();
    } else {
      setReferralPreview([]);
    }
  }, [selectedSeller, selectedProperty, levels]);

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

  const fetchAllProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching properties:', error);
        return;
      }

      setAllProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
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

  const previewReferralCommissions = async () => {
    if (!selectedSeller || !selectedProperty) return;

    const selectedPropertyData = allProperties.find(p => p.id === selectedProperty);
    if (!selectedPropertyData) return;

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
          const commissionAmount = (selectedPropertyData.price * levelData.commission_percentage) / 100;
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

  const calculateCommissions = async () => {
    if (!selectedProperty || !selectedSeller) {
      toast({
        title: "Missing information",
        description: "Please select both property and seller.",
        variant: "destructive",
      });
      return;
    }

    const selectedPropertyData = allProperties.find(p => p.id === selectedProperty);
    if (!selectedPropertyData) return;

    setLoading(true);

    try {
      const referralCommissionRecords = [];
      let totalReferralCommissions = 0;

      for (const referralCommission of referralPreview) {
        const commissionRecord = {
          property_id: selectedProperty,
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
        id: selectedProperty,
        property: selectedPropertyData,
        seller: allPeople.find(p => p.id === selectedSeller),
        totalCommission: totalReferralCommissions,
        referralResults: referralPreview,
        totalReferralCommissions,
        createdAt: new Date()
      };

      setCalculations(prev => [newCalculation, ...prev]);

      toast({
        title: "Commission calculated successfully",
        description: `Total commission: €${totalReferralCommissions.toLocaleString()}`,
      });

      setSelectedProperty('');
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

  const selectedPropertyData = allProperties.find(p => p.id === selectedProperty);

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Property</label>
              <Select onValueChange={setSelectedProperty}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a property" />
                </SelectTrigger>
                <SelectContent>
                  {allProperties.map(property => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.property_name} - €{property.price.toLocaleString()} ({property.property_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Seller</label>
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

          {/* Selected Property Details */}
          {selectedPropertyData && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <h4 className="font-semibold text-blue-800 mb-2">Selected Property Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Name:</span> {selectedPropertyData.property_name}
                  </div>
                  <div>
                    <span className="font-medium">Price:</span> €{selectedPropertyData.price.toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">Type:</span> {selectedPropertyData.property_type}
                  </div>
                  <div>
                    <span className="font-medium">Address:</span> {selectedPropertyData.address}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
                        €{referral.commission_amount.toLocaleString()}
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
                    <span>€{referralPreview.reduce((sum, r) => sum + r.commission_amount, 0).toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
              {calculations[0].property && (
                <div className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                  <h4 className="font-semibold text-purple-800 mb-2">Property Details</h4>
                  <div className="text-sm">
                    <div><span className="font-medium">Name:</span> {calculations[0].property.property_name}</div>
                    <div><span className="font-medium">Price:</span> €{calculations[0].property.price.toLocaleString()}</div>
                    <div><span className="font-medium">Type:</span> {calculations[0].property.property_type}</div>
                    <div><span className="font-medium">Address:</span> {calculations[0].property.address}</div>
                  </div>
                </div>
              )}

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
                        <span className="font-medium">€{referral.commission_amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-2 border-t border-green-200 flex justify-between font-medium text-green-800">
                    <span>Total Commission:</span>
                    <span>€{calculations[0].totalReferralCommissions.toLocaleString()}</span>
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

export default CommissionCalculator;
