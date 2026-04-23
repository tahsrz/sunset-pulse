import React from 'react';
import JudgesWarRoom from '@/components/war-room/JudgesWarRoom';

export const metadata = {
  title: 'Judges War Room | Sunset Pulse',
  description: 'Multi-dimensional reconnaissance grid for high-stakes real estate intelligence.',
};

const WarRoomPage = () => {
  return (
    <main className="min-h-screen bg-black">
      <JudgesWarRoom />
    </main>
  );
};

export default WarRoomPage;
