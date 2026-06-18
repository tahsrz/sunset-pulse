import React from 'react';
import RetailClashGame from './RetailClashGame';

export const metadata = {
  title: 'Retail Clash | Sunset Pulse',
  description: 'Guess which store item moves more monthly volume.'
};

export default function RetailClashPage() {
  return (
    <div className="min-h-screen bg-[#06131d] flex flex-col items-center pt-24 px-4 pb-12">
      <div className="w-full max-w-4xl text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">
          RETAIL <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600">CLASH</span>
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          Which C-Store item pulls more monthly volume? Build your streak to unlock operational insights.
        </p>
      </div>

      <RetailClashGame />
    </div>
  );
}
