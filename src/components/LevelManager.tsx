
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Level } from './CommissionCalculator';

interface LevelManagerProps {
  levels: Level[];
  onCommissionUpdate: (levelId: string, commission: number) => void;
}

const LevelManager = ({ levels, onCommissionUpdate }: LevelManagerProps) => {
  return (
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
                  value={level.commission || ''}
                  onChange={(e) => onCommissionUpdate(level.id, Number(e.target.value))}
                  className="text-center font-medium"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default LevelManager;
