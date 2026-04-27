import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const EntitySchema = new Schema(
  {
    uid: {
      type: String,
      required: true,
      unique: true, // e.g., 'ENVOY-JAMIE', 'JUDGE-MAKIEL'
    },
    name: {
      type: String,
      required: true,
    },
    class: {
      type: String,
      enum: ['ENVOY', 'JUDGE', 'SCOUT', 'ARCHITECT'],
      required: true,
    },
    role: {
      type: String,
      default: 'Intelligence Node',
    },
    visual: {
      type: {
        type: String,
        enum: ['ROTOSCOPE', 'GEOMETRIC', 'FLUID'],
        default: 'GEOMETRIC',
      },
      assetPath: String, // e.g., '/videos/jamie_base.mp4'
      meshColor: {
        type: String,
        default: '#22c55e',
      },
    },
    logic: {
      systemPrompt: {
        type: String,
        required: true,
      },
      modelId: {
        type: String,
        default: 'llama-3.1-8b-instant',
      },
      temperature: {
        type: Number,
        default: 0.7,
      },
    },
    operationalSettings: {
      isCouncilMember: {
        type: Boolean,
        default: false,
      },
      priority: {
        type: Number,
        default: 10,
      },
    },
    metadata: {
      type: Map,
      of: String,
    },
    sourceClip: {
      type: String, // Path to the original clip used for extraction
    },
    isExtracted: {
      type: Boolean,
      default: false,
    }
  },
  {
    timestamps: true,
  }
);

const Entity = models.Entity || model('Entity', EntitySchema);
export default Entity;
