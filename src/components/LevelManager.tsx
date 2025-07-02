
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

export interface Level {
  id: string;
  level_order: number;
  commission_percentage: number;
  name: string;
}

interface LevelManagerProps {
  levels: Level[];
  onCommissionUpdate: (levelOrder: number, commission: number) => void;
}

const LevelManager = ({ levels, onCommissionUpdate }: LevelManagerProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {levels.map((levelData) => (
        <Card key={levelData.id} className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-gray-800">{levelData.name}</h4>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                  Level {levelData.level_order}
                </span>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`commission-${levelData.level_order}`} className="text-sm">
                  Commission (%)
                </Label>
                <Input
                  id={`commission-${levelData.level_order}`}
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="Enter %"
                  value={levelData.commission_percentage || ''}
                  onChange={(e) => onCommissionUpdate(levelData.level_order, Number(e.target.value))}
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
