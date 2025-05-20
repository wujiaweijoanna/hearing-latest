
import React from 'react';
import { TestProvider, useTest } from '../context/TestContext';
import AppHeader from '../components/AppHeader';
import EnvironmentCheck from '../components/EnvironmentCheck';
import ScreeningTest from '../components/ScreeningTest';
import ResultsView from '../components/ResultsView';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';

const TestContent = () => {
  const { currentPhase } = useTest();
  
  switch (currentPhase) {
    case 'environment':
      return <EnvironmentCheck />;
    case 'screening':
    case 'threshold':
      return <ScreeningTest />;
    case 'results':
      return <ResultsView />;
    default:
      return <EnvironmentCheck />;
  }
};

const Index = () => {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <TestProvider>
        <div className="flex justify-between items-center p-4 bg-white shadow">
          <AppHeader />
          <Button onClick={signOut} variant="outline">Logout</Button>
        </div>
        <div className="flex-grow">
          <TestContent />
        </div>
      </TestProvider>
    </div>
  );
};

export default Index;
