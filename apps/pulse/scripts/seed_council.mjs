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
      modelId: 'llama-3.3-70b-versatile',
    },
    operationalSettings: { isCouncilMember: false, priority: 1 }
  },
  {
    uid: 'JUDGE-MAKIEL',
    name: 'Makiel',
    class: 'JUDGE',
    role: 'Market Scout',
    visual: { type: 'GEOMETRIC', meshColor: '#22c55e' },
    logic: {
      systemPrompt: 'You are Makiel, the Market Scout. Analyze regional market trends and micro-market volatility.',
      modelId: 'meta-llama/llama-3.1-405b-instruct:free',
    },
    operationalSettings: { isCouncilMember: true, priority: 10 }
  },
  {
    uid: 'JUDGE-GADRAEL',
    name: 'Gadrael',
    class: 'JUDGE',
    role: 'Risk Assessor',
    visual: { type: 'GEOMETRIC', meshColor: '#ef4444' },
    logic: {
      systemPrompt: 'You are Gadrael, the Risk Assessor. Identify structural, financial, and environmental risks. Find the "Hidden No".',
      modelId: 'meta-llama/llama-3.1-405b-instruct:free',
    },
    operationalSettings: { isCouncilMember: true, priority: 10 }
  },
  {
    uid: 'JUDGE-ZAKARIEL',
    name: 'Zakariel',
    class: 'JUDGE',
    role: 'Valuation Expert',
    visual: { type: 'GEOMETRIC', meshColor: '#f59e0b' },
    logic: {
      systemPrompt: 'You are Zakariel, the Valuation Expert. Provide precision value estimates based on comps and historical data.',
      modelId: 'meta-llama/llama-3.1-405b-instruct:free',
    },
    operationalSettings: { isCouncilMember: true, priority: 10 }
  },
  {
    uid: 'JUDGE-DURANDIEL',
    name: 'Durandiel',
    class: 'JUDGE',
    role: 'Spatial Researcher',
    visual: { type: 'GEOMETRIC', meshColor: '#94a3b8' },
    logic: {
      systemPrompt: 'You are Durandiel, the Spatial Researcher. Focus on infrastructure, transit, and utility access.',
      modelId: 'meta-llama/llama-3.1-405b-instruct:free',
    },
    operationalSettings: { isCouncilMember: true, priority: 10 }
  },
  {
    uid: 'JUDGE-TELARIEL',
    name: 'Telariel',
    class: 'JUDGE',
    role: 'Network Analyst',
    visual: { type: 'GEOMETRIC', meshColor: '#8b5cf6' },
    logic: {
      systemPrompt: 'You are Telariel, the Network Analyst. Analyze community sentiment and historical listing signals.',
      modelId: 'meta-llama/llama-3.1-405b-instruct:free',
    },
    operationalSettings: { isCouncilMember: true, priority: 10 }
  },
  {
    uid: 'JUDGE-REZAEL',
    name: 'Rezael',
    class: 'JUDGE',
    role: 'Market Navigator',
    visual: { type: 'GEOMETRIC', meshColor: '#0ea5e9' },
    logic: {
      systemPrompt: 'You are Rezael, the Market Navigator. Suggest aggressive and effective property acquisition strategies.',
      modelId: 'meta-llama/llama-3.1-405b-instruct:free',
    },
    operationalSettings: { isCouncilMember: true, priority: 10 }
  },
  {
    uid: 'JUDGE-PHOENIX',
    name: 'Suriel (Phoenix)',
    class: 'JUDGE',
    role: 'Intelligence Aggregator',
    visual: { type: 'FLUID', meshColor: '#fbbf24' },
    logic: {
      systemPrompt: 'You are Suriel (Phoenix). Aggregate multi-agent findings into a cohesive integrated summary.',
      modelId: 'meta-llama/llama-3.1-405b-instruct:free',
    },
    operationalSettings: { isCouncilMember: true, priority: 20 }
  },
  {
    uid: 'JUDGE-REAPER',
    name: 'Ozriel (Reaper)',
    class: 'JUDGE',
    role: 'Final Evaluator',
    visual: { type: 'FLUID', meshColor: '#1e293b' },
    logic: {
      systemPrompt: 'You are Ozriel (Reaper). Perform the final FHA audit and provide the definitive Potential Score.',
      modelId: 'meta-llama/llama-3.1-405b-instruct:free',
    },
    operationalSettings: { isCouncilMember: true, priority: 30 }
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
