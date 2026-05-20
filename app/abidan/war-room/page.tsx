import React from 'react';
import JudgesWarRoom from '@/components/war-room/JudgesWarRoom';

export const metadata = {
  title: 'Abidan Analysis Room | Sunset Pulse',
  description: 'Multi-dimensional property analysis workspace for real estate research.',
};

const WarRoomPage = () => {
  return (
    <main className="min-h-screen bg-black">
      <JudgesWarRoom />
    </main>
  );
};

export default WarRoomPage;
