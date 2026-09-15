'use client';

const SIZE_CLASSES = {
  sm: 'h-12 w-12',
  md: 'h-20 w-20',
  lg: 'h-32 w-32 sm:h-40 sm:w-40'
};

export default function AngelicAvatar({ abidan, size = 'md', className = '' }) {
  return (
    <div
      className={`relative shrink-0 ${SIZE_CLASSES[size] || SIZE_CLASSES.md} ${className}`}
      aria-label={`${abidan.name} angelic portrait`}
      role="img"
    >
      <div
        className="absolute inset-1 rounded-full border border-white/40 bg-slate-950 bg-no-repeat shadow-2xl"
        style={{
          backgroundImage: "url('/images/abidan/abidan-roster-sheet.png')",
          backgroundPosition: abidan.portraitPosition,
          backgroundSize: '300% 300%',
          boxShadow: `0 0 28px ${abidan.color}66, inset 0 0 18px ${abidan.color}44`
        }}
      />
      <div
        className="absolute inset-0 rounded-full border-2 opacity-80"
        style={{ borderColor: abidan.color, boxShadow: `0 0 12px ${abidan.color}88` }}
      />
      <div
        className="absolute -inset-1 rounded-full border border-dashed opacity-50"
        style={{ borderColor: abidan.color }}
      />
      <span
        className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 rounded-full"
        style={{ backgroundColor: abidan.color, boxShadow: `0 0 10px ${abidan.color}` }}
      />
    </div>
  );
}
