'use client';

interface IntelCardProps {
  businessName: string;
  items: any[];
  onAction: () => void;
}

export default function IntelCard({ businessName, items, onAction }: IntelCardProps) {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-xl shadow-inner border border-blue-100 animate-in slide-in-from-right-4">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-xs font-black uppercase tracking-tighter text-blue-900">
          📍 Local Intel: {businessName}
        </h4>
        <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
          LIVE DATA
        </span>
      </div>
      
      <div className="space-y-2 mb-4">
        {items.map((item, idx) => (
          <div key={idx} className="flex justify-between text-sm border-b border-blue-50 pb-1">
            <span className="text-gray-700 font-medium">{item.name}</span>
            <span className="text-blue-600 font-bold">${item.price}</span>
          </div>
        ))}
      </div>

      <button 
        onClick={onAction}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded-lg transition-colors uppercase tracking-widest shadow-md"
      >
        Order for Pickup via Taz
      </button>
    </div>
  );
}
