
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, Users } from 'lucide-react';
import LevelManager from './LevelManager';
import PeopleManager from './PeopleManager';
import { useToast } from '@/hooks/use-toast';

export interface Level {
  id: string;
  name: string;
  commission: number;
  people: Person[];
}

export interface Person {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
}

export interface Property {
  id: string;
  price: number;
  type: string;
  levels: Level[];
  totalCommission: number;
  createdAt: Date;
}

const CommissionCalculator = () => {
  const [propertyPrice, setPropertyPrice] = useState<number>(0);
  const [propertyType, setPropertyType] = useState<string>('');
  const [levels, setLevels] = useState<Level[]>([
    { id: '1', name: 'Level 1', commission: 0, people: [] },
    { id: '2', name: 'Level 2', commission: 0, people: [] },
    { id: '3', name: 'Level 3', commission: 0, people: [] },
    { id: '4', name: 'Level 4', commission: 0, people: [] },
    { id: '5', name: 'Level 5', commission: 0, people: [] },
  ]);
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [calculations, setCalculations] = useState<any[]>([]);
  const { toast } = useToast();

  const handleLevelCommissionUpdate = (levelId: string, commission: number) => {
    setLevels(prev => prev.map(level => 
      level.id === levelId ? { ...level, commission } : level
    ));
  };

  const handleAddPerson = (levelId: string, person: Person) => {
    // Check for unique username across all levels
    const allPeople = levels.flatMap(level => level.people);
    const usernameExists = allPeople.some(p => p.username === person.username);
    
    if (usernameExists) {
      toast({
        title: "Username already exists",
        description: "Please choose a different username.",
        variant: "destructive",
      });
      return false;
    }

    setLevels(prev => prev.map(level => 
      level.id === levelId 
        ? { ...level, people: [...level.people, person] }
        : level
    ));
    
    toast({
      title: "Person added successfully",
      description: `${person.firstName} ${person.lastName} has been added to ${levels.find(l => l.id === levelId)?.name}.`,
    });
    
    return true;
  };

  const calculateCommissions = () => {
    if (!propertyPrice || !propertyType) {
      toast({
        title: "Missing information",
        description: "Please enter property price and type.",
        variant: "destructive",
      });
      return;
    }

    const results = levels.map(level => {
      const levelCommissionAmount = (propertyPrice * level.commission) / 100;
      const commissionPerPerson = level.people.length > 0 
        ? levelCommissionAmount / level.people.length 
        : 0;

      return {
        levelId: level.id,
        levelName: level.name,
        commissionPercentage: level.commission,
        totalLevelCommission: levelCommissionAmount,
        peopleCount: level.people.length,
        commissionPerPerson: commissionPerPerson,
        people: level.people.map(person => ({
          ...person,
          commission: commissionPerPerson
        }))
      };
    });

    const totalCommission = results.reduce((sum, result) => sum + result.totalLevelCommission, 0);

    const newCalculation = {
      id: Date.now().toString(),
      propertyPrice,
      propertyType,
      totalCommission,
      results,
      createdAt: new Date()
    };

    setCalculations(prev => [newCalculation, ...prev]);

    toast({
      title: "Commission calculated successfully",
      description: `Total commission: $${totalCommission.toLocaleString()}`,
    });
  };

  const addNewLevel = () => {
    const newLevelNumber = levels.length + 1;
    const newLevel: Level = {
      id: newLevelNumber.toString(),
      name: `Level ${newLevelNumber}`,
      commission: 0,
      people: []
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Commission Levels</h3>
              <Button onClick={addNewLevel} variant="outline" size="sm">
                Add New Level
              </Button>
            </div>
            
            <LevelManager 
              levels={levels} 
              onCommissionUpdate={handleLevelCommissionUpdate}
            />
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
              />
            )}
          </div>

          <div className="pt-6 border-t">
            <Button 
              onClick={calculateCommissions}
              className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white py-3 text-lg font-medium"
              size="lg"
            >
              <Calculator className="w-5 h-5 mr-2" />
              Calculate Commission
            </Button>
          </div>
        </CardContent>
      </Card>

      {calculations.length > 0 && (
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>Commission Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {calculations[0].results.map((result: any) => (
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
                            <span>{person.firstName} {person.lastName} (@{person.username})</span>
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
                  <span className="font-semibold text-green-800">Total Commission:</span>
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

export default CommissionCalculator;
