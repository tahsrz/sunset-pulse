import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Vibe from '../models/Vibe.js';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Please define the MONGODB_URI environment variable');
  process.exit(1);
}

const initialVibes = [
  {
    vibeId: 'vibe-noir-spike',
    name: 'Noir Tactical (Spike Spiegel)',
    description: 'A world of cigarette smoke, jazz, and nonchalant high-stakes operations.',
    linguisticLogic: {
      tone: 'cynical',
      pacing: 'relaxed',
      vocabulary: ['whatever', 'bounty', 'jazz', 'smoke', 'easy']
    },
    visualParameters: {
      meshColor: '#f87171',
      bloomIntensity: 1.2,
      glitchFrequency: 0.05,
      particleDensity: 50
    },
    sourceVideoPath: '/videos/anime_spike.mp4'
  },
  {
    vibeId: 'vibe-emerald-matrix',
    name: 'Emerald Intelligence (Jamie)',
    description: 'A crisp, high-fidelity digital realm focused on strategic asset management.',
    linguisticLogic: {
      tone: 'professional',
      pacing: 'flowing',
      vocabulary: ['optimized', 'grid', 'intelligence', 'sync', 'strategic']
    },
    visualParameters: {
      meshColor: '#22c55e',
      bloomIntensity: 0.8,
      glitchFrequency: 0.01,
      particleDensity: 120
    },
    sourceVideoPath: '/videos/jamie_base.mp4'
  }
];

async function seedVibes() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    for (const vibe of initialVibes) {
      await Vibe.findOneAndUpdate({ vibeId: vibe.vibeId }, vibe, { upsert: true, new: true });
      console.log(`Seeded Vibe: ${vibe.name} [${vibe.vibeId}]`);
    }

    console.log('Vibe Dictionary Initialized.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seedVibes();
