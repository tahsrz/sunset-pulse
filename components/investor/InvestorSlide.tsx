import React from 'react';
import { FaArrowRight } from 'react-icons/fa';

interface InvestorSlideProps {
  slide: {
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    content: string;
    interactive?: React.ReactNode;
    button: string;
    action: () => void;
  };
  aiActive: boolean;
  step: number;
}

const InvestorSlide: React.FC<InvestorSlideProps> = ({ slide, aiActive, step }) => {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          {slide.icon}
          <h1 className="text-4xl font-black uppercase italic tracking-tighter leading-none">
            {slide.title}
          </h1>
        </div>
        <h2 className="text-lg text-green-400/80 font-medium italic">{slide.subtitle}</h2>
      </div>
      <p className="text-white/70 leading-relaxed text-sm">{slide.content}</p>
      {slide.interactive && <div className="py-4">{slide.interactive}</div>}
      <button 
        onClick={slide.action} 
        className={`group flex items-center gap-3 px-6 py-3 rounded-full font-black uppercase tracking-widest text-xs transition-all hover:scale-105 ${
          aiActive && step === 1 
            ? 'bg-blue-500 text-white shadow-xl shadow-blue-500/30' 
            : 'bg-white text-black hover:bg-green-500'
        }`}
      >
        {slide.button}
        <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
};

export default InvestorSlide;
