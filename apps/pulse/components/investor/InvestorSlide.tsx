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
          <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter leading-none">
            {slide.title}
          </h1>
        </div>
        <h2 className="text-lg text-orange-400/80 font-black uppercase tracking-widest italic">{slide.subtitle}</h2>
      </div>
      <p className="text-white/60 leading-relaxed text-sm font-medium">{slide.content}</p>
      {slide.interactive && <div className="py-2">{slide.interactive}</div>}
      <button 
        onClick={slide.action} 
        className="group flex items-center gap-3 px-8 py-4 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] transition-all bg-white text-black hover:bg-orange-500 hover:shadow-[0_0_20px_rgba(249,115,22,0.4)] active:scale-95"
      >
        {slide.button}
        <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
      </button>
    </div>
  );
};

export default InvestorSlide;
