import React from 'react';

const TRECConsumerNotice = () => {
  return (
    <header className="bg-slate-900 border-b border-white/5 py-2 px-6 text-center no-print">
      <p className="text-[10pt] text-slate-400 font-medium leading-relaxed max-w-7xl mx-auto">
        <span className="text-blue-500 font-bold uppercase tracking-wider mr-1">Notice to Consumers:</span>
        The contract forms displayed on this site are promulgated by the Texas Real Estate Commission (TREC). 
        These forms are intended for use primarily by licensed real estate brokers or sales agents who are trained in their correct use. 
        Use by the general public without the guidance of a licensed professional is at the user's own risk. 
        These forms are provided for informational/simulation purposes only and do not constitute legal advice.
      </p>
    </header>
  );
};

export default TRECConsumerNotice;
