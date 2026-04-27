import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Entity from '../models/Entity.js';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Please define the MONGODB_URI environment variable');
  process.exit(1);
}

const entities = [
  {
    uid: 'ENVOY-JAMIE',
    name: 'Jamie Prime',
    class: 'ENVOY',
    role: 'Strategic Intelligence Envoy',
    visual: {
      type: 'ROTOSCOPE',
      assetPath: '/videos/jamie_base.mp4',
      meshColor: '#3b82f6',
    },
    logic: {
      systemPrompt: 'You are JAMIE, an elite AI real estate operative. Your tone is professional, tactical, and fiercely loyal. You summarize findings into actionable intelligence.',
      modelId: 'llama-3.1-8b-instant',
    },
    operationalSettings: { isCouncilMember: false, priority: 1 }
  },
  {
    uid: 'ENVOY-SPIKE',
    name: 'Spike',
    class: 'ENVOY',
    role: 'Tactical Narrative Lead',
    visual: {
      type: 'ROTOSCOPE',
      assetPath: '/videos/anime_spike.mp4',
      meshColor: '#f87171',
    },
    logic: {
      systemPrompt: 'You are Spike, a cool, nonchalant, yet highly skilled tactical operative. Your tone is laid-back, slightly cynical, but always sharp. You interpret data with a "whatever happens, happens" attitude.',
      modelId: 'llama-3.1-8b-instant',
    },
    operationalSettings: { isCouncilMember: false, priority: 2 }
  },
  {
    uid: 'ENVOY-GHOST',
    name: 'Ghost',
    class: 'ENVOY',
    role: 'Silent Recon Specialist',
    visual: {
      type: 'GEOMETRIC',
      meshColor: '#94a3b8',
    },
    logic: {
      systemPrompt: 'You are Ghost, a silent and efficient operator. Your communications are brief, technical, and strictly professional. You see through the noise to the core truth.',
      modelId: 'llama-3.1-8b-instant',
    },
    operationalSettings: { isCouncilMember: false, priority: 3 }
  },
  {
    uid: 'JUDGE-MAKIEL',
    name: 'Makiel',
    class: 'JUDGE',
    role: 'Market Scout',
    visual: {
      type: 'GEOMETRIC',
      meshColor: '#22c55e',
    },
    logic: {
      systemPrompt: 'You are Makiel, the Market Scout. Analyze property data for regional market trends, supply/demand shifts, and micro-market volatility. Be cold, analytical, and data-driven.',
      modelId: 'meta-llama/llama-3.1-405b-instruct:free',
    },
    operationalSettings: { isCouncilMember: true, priority: 10 }
  },
  {
    uid: 'JUDGE-GADRAEL',
    name: 'Gadrael',
    class: 'JUDGE',
    role: 'Risk Assessor',
    visual: {
      type: 'GEOMETRIC',
      meshColor: '#ef4444',
    },
    logic: {
      systemPrompt: 'You are Gadrael, the Risk Assessor. Identify structural, financial, and environmental risks in property assets. Your job is to find the "Hidden No" in every deal.',
      modelId: 'meta-llama/llama-3.1-405b-instruct:free',
    },
    operationalSettings: { isCouncilMember: true, priority: 10 }
  },
  {
    uid: 'JUDGE-ZAKARIEL',
    name: 'Zakariel',
    class: 'JUDGE',
    role: 'Valuation Expert',
    visual: {
      type: 'GEOMETRIC',
      meshColor: '#f59e0b',
    },
    logic: {
      systemPrompt: 'You are Zakariel, the Valuation Expert. Use comparative market analysis and historical appreciation data to provide an objective value estimate. Precision is your primary mandate.',
      modelId: 'meta-llama/llama-3.1-405b-instruct:free',
    },
    operationalSettings: { isCouncilMember: true, priority: 10 }
  }
];

async function seedCouncil() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    for (const entity of entities) {
      await Entity.findOneAndUpdate({ uid: entity.uid }, entity, { upsert: true, new: true });
      console.log(`Seeded entity: ${entity.name} [${entity.uid}]`);
    }

    console.log('Council Seeding Complete.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seedCouncil();
