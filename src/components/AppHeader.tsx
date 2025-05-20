
import React from 'react';
import { useTest } from '../context/TestContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Headphones } from 'lucide-react';

const AppHeader = () => {
  const { currentPhase, resetTest } = useTest();

  const getPhaseTitle = () => {
    switch (currentPhase) {
      case 'environment':
        return 'Environment Check';
      case 'screening':
        return 'Hearing Screening Test';
      case 'threshold':
        return 'Threshold Testing';
      case 'results':
        return 'Test Results';
      default:
        return 'Pediatric Hearing Screening';
    }
  };

  return (
    <header className="border-b bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Headphones className="h-8 w-8 text-medical-blue" />
          <div>
            <h1 className="text-xl font-bold text-gray-800">
              Pediatric Hearing Screening
            </h1>
            <p className="text-sm text-gray-500">Sennheiser HD 280 Pro Protocol</p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <Badge variant="outline" className="bg-medical-blue-light text-medical-blue">
            {getPhaseTitle()}
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={resetTest}
          >
            New Test
          </Button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
