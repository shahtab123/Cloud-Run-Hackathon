import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import CircuitBackground from '../components/CircuitBackground';
import ShuffleText from '../components/ShuffleText';

const WelcomePage: React.FC = () => {
  const navigate = useNavigate();

  const steps = [
    { number: 1, text: "Write your scene plan" },
    { number: 2, text: "Generate images" },
    { number: 3, text: "Generate video from images" },
    { number: 4, text: "Add AI-generated voice" },
    { number: 5, text: "Publish your masterpiece" },
  ];

  return (
    <CircuitBackground>
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[90vh] text-center">
          <div
            className="animate-fade-in-up"
            style={{ animationDelay: '100ms' }}
          >
            <h1 className="text-5xl md:text-7xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-rose-400 mb-4 pb-2">
              <ShuffleText text="Easy Animation" />
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto mb-12">
              Create stunning animated YouTube videos with AI.
            </p>
          </div>

          <div
            className="w-full max-w-4xl mb-12 animate-fade-in-up"
            style={{ animationDelay: '300ms' }}
          >
            <h2 className="text-3xl font-bold mb-8 text-gray-100">How It Works</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              {steps.map((step, index) => (
                <Card 
                  key={step.number} 
                  className="p-6 text-center !bg-gray-900/50 backdrop-blur-sm border border-green-500/20 !hover:border-green-400/80"
                  style={{ animationDelay: `${200 + index * 100}ms` }}
                >
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-green-900/50 text-green-400 font-extrabold text-xl">
                      {step.number}
                    </div>
                    <h3 className="text-md font-semibold text-gray-200 flex items-center justify-center min-h-[3.5rem]">{step.text}</h3>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div
            className="animate-fade-in-up"
            style={{ animationDelay: '500ms' }}
          >
            <Button onClick={() => navigate('/new-project')} className="hover-glow-green !bg-green-600 !text-white !hover:bg-green-700">
              Start Creating
            </Button>
          </div>
        </div>
      </div>
    </CircuitBackground>
  );
};

export default WelcomePage;