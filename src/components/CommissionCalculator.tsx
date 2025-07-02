
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calculator, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface Property {
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

export interface Person {
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
}

interface Level {
  id: string;
  name: string;
  commission_percentage: number;
  level_order: number;
  property_id?: string;
}

interface CommissionResult {
  level: string;
  percentage: number;
  amount: number;
  people: Person[];
  totalAmount: number;
  perPersonAmount: number;
}

const CommissionCalculator = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string>('');
  const [selectedSeller, setSelectedSeller] = useState<string>('');
  const [commissionResults, setCommissionResults] = useState<CommissionResult[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchProperties();
    fetchPeople();
    fetchLevels();
  }, []);

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching properties:', error);
        return;
      }

      setProperties(data || []);
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const fetchPeople = async () => {
    try {
      const { data, error } = await supabase
        .from('people')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching people:', error);
        return;
      }

      setPeople(data || []);
    } catch (error) {
      console.error('Error fetching people:', error);
    }
  };

  const fetchLevels = async () => {
    try {
      const { data, error } = await supabase
        .from('levels')
        .select('*')
        .order('level_order', { ascending: true });

      if (error) {
        console.error('Error fetching levels:', error);
        return;
      }

      setLevels(data || []);
    } catch (error) {
      console.error('Error fetching levels:', error);
    }
  };

  const calculateCommissions = async () => {
    if (!selectedProperty || !selectedSeller) {
      toast({
        title: "Missing Selection",
        description: "Please select both a property and a seller.",
        variant: "destructive",
      });
      return;
    }

    const property = properties.find(p => p.id === selectedProperty);
    if (!property) return;

    const results: CommissionResult[] = [];

    for (const level of levels) {
      const levelPeople = people.filter(p => p.referral_level === level.level_order);
      const totalCommissionAmount = (property.price * level.commission_percentage) / 100;
      const perPersonAmount = levelPeople.length > 0 ? totalCommissionAmount / levelPeople.length : 0;

      results.push({
        level: level.name,
        percentage: level.commission_percentage,
        amount: totalCommissionAmount,
        people: levelPeople,
        totalAmount: totalCommissionAmount,
        perPersonAmount: perPersonAmount
      });

      // Save commission calculations to database for each person
      for (const person of levelPeople) {
        try {
          await supabase
            .from('commissions')
            .insert({
              property_id: selectedProperty,
              person_id: person.id,
              level_id: level.id,
              commission_percentage: level.commission_percentage,
              commission_amount: perPersonAmount
            });
        } catch (error) {
          console.error('Error saving commission:', error);
        }
      }
    }

    setCommissionResults(results);

    toast({
      title: "Commissions Calculated",
      description: "Commission calculations have been completed and saved.",
    });
  };

  const selectedPropertyData = properties.find(p => p.id === selectedProperty);
  const selectedSellerData = people.find(p => p.id === selectedSeller);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Commission Calculator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="property">Select Property</label>
              <Select value={selectedProperty} onValueChange={setSelectedProperty}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map(property => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.property_name} - ${property.price.toLocaleString()} ({property.property_type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label htmlFor="seller">Select Seller</label>
              <Select value={selectedSeller} onValueChange={setSelectedSeller}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a seller" />
                </SelectTrigger>
                <SelectContent>
                  {people.map(person => (
                    <SelectItem key={person.id} value={person.id}>
                      {person.first_name} {person.last_name} (@{person.username}) - Level {person.referral_level || 1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedPropertyData && selectedSellerData && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium mb-2">Selected Details:</h4>
              <p><strong>Property:</strong> {selectedPropertyData.property_name} - ${selectedPropertyData.price.toLocaleString()}</p>
              <p><strong>Address:</strong> {selectedPropertyData.address}</p>
              <p><strong>Seller:</strong> {selectedSellerData.first_name} {selectedSellerData.last_name} (@{selectedSellerData.username})</p>
            </div>
          )}

          <Button onClick={calculateCommissions} className="w-full" disabled={!selectedProperty || !selectedSeller}>
            <DollarSign className="w-4 h-4 mr-2" />
            Calculate Commissions
          </Button>
        </CardContent>
      </Card>

      {commissionResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Commission Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Level</TableHead>
                  <TableHead>Commission %</TableHead>
                  <TableHead>Total Amount</TableHead>
                  <TableHead>People Count</TableHead>
                  <TableHead>Per Person</TableHead>
                  <TableHead>People Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissionResults.map((result, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{result.level}</TableCell>
                    <TableCell>{result.percentage}%</TableCell>
                    <TableCell>${result.totalAmount.toLocaleString()}</TableCell>
                    <TableCell>{result.people.length}</TableCell>
                    <TableCell>
                      {result.people.length > 0 ? `$${result.perPersonAmount.toLocaleString()}` : '$0'}
                    </TableCell>
                    <TableCell>
                      {result.people.length > 0 ? (
                        <div className="space-y-1">
                          {result.people.map(person => (
                            <div key={person.id} className="text-sm">
                              {person.first_name} {person.last_name} (@{person.username})
                              <div className="text-green-600 font-medium">
                                Gets: ${result.perPersonAmount.toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500">No people assigned</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CommissionCalculator;
