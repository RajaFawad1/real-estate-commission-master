import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, Users, Plus, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface Level {
  id: string;
  name: string;
  commission_percentage: number;
  people: Person[];
  level_order: number;
}

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
  levels: Level[];
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
  const [levels, setLevels] = useState<Level[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [calculations, setCalculations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [allPeople, setAllPeople] = useState<Person[]>([]);
  const [referralPreview, setReferralPreview] = useState<ReferralCommission[]>([]);
  const { toast } = useToast();

  // Initialize default levels and fetch all people
  useEffect(() => {
    const defaultLevels: Level[] = [
      { id: '1', name: 'Level 1', commission_percentage: 0, people: [], level_order: 1 },
      { id: '2', name: 'Level 2', commission_percentage: 0, people: [], level_order: 2 },
      { id: '3', name: 'Level 3', commission_percentage: 0, people: [], level_order: 3 },
      { id: '4', name: 'Level 4', commission_percentage: 0, people: [], level_order: 4 },
      { id: '5', name: 'Level 5', commission_percentage: 0, people: [], level_order: 5 },
    ];
    setLevels(defaultLevels);
    fetchAllPeople();
  }, []);

  // Preview referral commissions when seller is selected
  useEffect(() => {
    if (selectedSeller && propertyPrice > 0) {
      previewReferralCommissions();
    } else {
      setReferralPreview([]);
    }
  }, [selectedSeller, propertyPrice]);

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

  const previewReferralCommissions = async () => {
    if (!selectedSeller || !propertyPrice) return;

    try {
      // Get referral chain for the seller
      const { data: referralChain, error } = await supabase
        .rpc('get_referral_chain', { seller_id: selectedSeller });

      if (error) {
        console.error('Error getting referral chain:', error);
        return;
      }

      // Get referral commission percentages
      const { data: referralLevels, error: levelsError } = await supabase
        .from('referral_levels')
        .select('*')
        .order('level');

      if (levelsError) {
        console.error('Error fetching referral levels:', levelsError);
        return;
      }

      // Calculate commissions for each referrer
      const commissions: ReferralCommission[] = [];
      
      referralChain?.forEach((referrer) => {
        const levelData = referralLevels?.find(l => l.level === referrer.level);
        if (levelData) {
          const commissionAmount = (propertyPrice * levelData.commission_percentage) / 100;
          commissions.push({
            person_id: referrer.person_id,
            username: referrer.username,
            first_name: referrer.first_name,
            last_name: referrer.last_name,
            level: referrer.level - 1, // Adjust level for display (referrer levels start from 2)
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

  const handleLevelCommissionUpdate = (levelId: string, commission: number) => {
    setLevels(prev => prev.map(level => 
      level.id === levelId ? { ...level, commission_percentage: commission } : level
    ));
  };

  const handleAddPerson = async (levelId: string, personData: Omit<Person, 'id'>) => {
    try {
      // Check if username already exists
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

      // Insert new person
      const { data: newPerson, error } = await supabase
        .from('people')
        .insert([{
          username: personData.username,
          first_name: personData.first_name,
          last_name: personData.last_name,
          phone: personData.phone || '',
          email: personData.email
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

      // Update local states
      setLevels(prev => prev.map(level => 
        level.id === levelId 
          ? { ...level, people: [...level.people, newPerson] }
          : level
      ));
      
      setAllPeople(prev => [...prev, newPerson]);
      
      toast({
        title: "Person added successfully",
        description: `${personData.first_name} ${personData.last_name} has been added to ${levels.find(l => l.id === levelId)?.name}.`,
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
      // Create property record
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

      // Calculate and save referral commissions
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

      // Insert referral commission records
      if (referralCommissionRecords.length > 0) {
        const { error: referralError } = await supabase
          .from('referral_commissions')
          .insert(referralCommissionRecords);

        if (referralError) {
          throw referralError;
        }
      }

      // Process traditional level-based commissions
      const results = [];
      const levelCommissionRecords = [];

      for (const level of levels) {
        if (level.commission_percentage > 0) {
          // Create level record
          const { data: levelRecord, error: levelError } = await supabase
            .from('levels')
            .insert({
              property_id: property.id,
              name: level.name,
              commission_percentage: level.commission_percentage,
              level_order: level.level_order
            })
            .select()
            .single();

          if (levelError) {
            throw levelError;
          }

          const levelCommissionAmount = (propertyPrice * level.commission_percentage) / 100;
          const commissionPerPerson = level.people.length > 0 
            ? levelCommissionAmount / level.people.length 
            : 0;

          // Create level-people associations and commission records
          for (const person of level.people) {
            // Create level-people association
            await supabase
              .from('level_people')
              .insert({
                level_id: levelRecord.id,
                person_id: person.id
              });

            // Create commission record
            const commissionRecord = {
              property_id: property.id,
              person_id: person.id,
              level_id: levelRecord.id,
              commission_amount: commissionPerPerson,
              commission_percentage: level.commission_percentage
            };

            levelCommissionRecords.push(commissionRecord);
          }

          results.push({
            levelId: level.id,
            levelName: level.name,
            commissionPercentage: level.commission_percentage,
            totalLevelCommission: levelCommissionAmount,
            peopleCount: level.people.length,
            commissionPerPerson: commissionPerPerson,
            people: level.people.map(person => ({
              ...person,
              commission: commissionPerPerson
            }))
          });
        }
      }

      // Insert level commission records
      if (levelCommissionRecords.length > 0) {
        const { error: commissionError } = await supabase
          .from('commissions')
          .insert(levelCommissionRecords);

        if (commissionError) {
          throw commissionError;
        }
      }

      const totalLevelCommissions = results.reduce((sum, result) => sum + result.totalLevelCommission, 0);
      const grandTotal = totalLevelCommissions + totalReferralCommissions;

      const newCalculation = {
        id: property.id,
        propertyPrice,
        propertyType,
        seller: allPeople.find(p => p.id === selectedSeller),
        totalCommission: grandTotal,
        levelResults: results,
        referralResults: referralPreview,
        totalReferralCommissions,
        createdAt: new Date()
      };

      setCalculations(prev => [newCalculation, ...prev]);

      toast({
        title: "Commission calculated successfully",
        description: `Total commission: $${grandTotal.toLocaleString()}`,
      });

      // Reset form
      setPropertyPrice(0);
      setPropertyType('');
      setSelectedSeller('');
      setLevels(prev => prev.map(level => ({ ...level, commission_percentage: 0, people: [] })));
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

  const addNewLevel = () => {
    const newLevelNumber = levels.length + 1;
    const newLevel: Level = {
      id: newLevelNumber.toString(),
      name: `Level ${newLevelNumber}`,
      commission_percentage: 0,
      people: [],
      level_order: newLevelNumber
    };
    setLevels(prev => [...prev, newLevel]);
    
    toast({
      title: "New level added",
      description: `Level ${newLevelNumber} has been created.`,
    });
  };

  return (
    <div className="space-y-6">
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
                      {person.first_name} {person.last_name} (@{person.username})
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

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Commission Levels</h3>
              <Button onClick={addNewLevel} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add New Level
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {levels.map((level) => (
                <Card key={level.id} className="shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-gray-800">{level.name}</h4>
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          {level.people.length} people
                        </span>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`commission-${level.id}`} className="text-sm">
                          Commission (%)
                        </Label>
                        <Input
                          id={`commission-${level.id}`}
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          placeholder="Enter %"
                          value={level.commission_percentage || ''}
                          onChange={(e) => handleLevelCommissionUpdate(level.id, Number(e.target.value))}
                          className="text-center font-medium"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5" />
              People Management
            </h3>
            <div className="space-y-2">
              <Label htmlFor="levelSelect" className="text-sm font-medium">Select Level to Add People</Label>
              <Select onValueChange={setSelectedLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a level" />
                </SelectTrigger>
                <SelectContent>
                  {levels.map(level => (
                    <SelectItem key={level.id} value={level.id}>
                      {level.name} ({level.people.length} people)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedLevel && (
              <PeopleManager
                levelId={selectedLevel}
                levelName={levels.find(l => l.id === selectedLevel)?.name || ''}
                people={levels.find(l => l.id === selectedLevel)?.people || []}
                onAddPerson={handleAddPerson}
                allPeople={allPeople}
              />
            )}
          </div>

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
                    <span className="text-gray-600 ml-2">(@{calculations[0].seller.username})</span>
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
                    <span>Referral Total:</span>
                    <span>${calculations[0].totalReferralCommissions.toLocaleString()}</span>
                  </div>
                </div>
              )}

              {calculations[0].levelResults.map((result: any) => (
                <div key={result.levelId} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold">{result.levelName}</h4>
                    <span className="text-sm text-gray-600">
                      {result.commissionPercentage}% Commission
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Total Level Commission:</span>
                      <span className="font-medium ml-2">
                        ${result.totalLevelCommission.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Per Person:</span>
                      <span className="font-medium ml-2">
                        ${result.commissionPerPerson.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {result.people.length > 0 && (
                    <div className="mt-3">
                      <h5 className="font-medium text-sm mb-2">People in this level:</h5>
                      <div className="space-y-1">
                        {result.people.map((person: any) => (
                          <div key={person.id} className="text-xs bg-white p-2 rounded flex justify-between">
                            <span>{person.first_name} {person.last_name} (@{person.username})</span>
                            <span className="font-medium">${person.commission.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-green-800">Grand Total Commission:</span>
                  <span className="text-xl font-bold text-green-800">
                    ${calculations[0].totalCommission.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// PeopleManager component
const PeopleManager = ({ levelId, levelName, people, onAddPerson, allPeople }: {
  levelId: string;
  levelName: string;
  people: Person[];
  onAddPerson: (levelId: string, person: Omit<Person, 'id'>) => Promise<boolean>;
  allPeople: Person[];
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

    const success = await onAddPerson(levelId, formData);
    
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
    <Card className="shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="w-5 h-5" />
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
              <Label htmlFor="referredBy" className="text-sm font-medium">Referred By</Label>
              <Select onValueChange={(value) => handleInputChange('referred_by', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select referrer (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {allPeople.map(person => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.first_name} {person.last_name} (@{person.username})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
            <Users className="w-4 h-4 mr-2" />
            Add Person to {levelName}
          </Button>
        </form>

        {people.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              People in {levelName} ({people.length})
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {people.map((person) => (
                <div key={person.id} className="p-3 bg-gray-50 rounded-lg border">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900">
                        {person.first_name} {person.last_name}
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

export default CommissionCalculator;
