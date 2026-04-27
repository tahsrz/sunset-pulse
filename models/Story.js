import mongoose from 'mongoose';
const { Schema, model, models } = mongoose;

const StorySchema = new Schema(
  {
    uid: { type: String, required: true, unique: true }, // e.g., 'CATERPILLAR-01'
    title: { type: String, required: true },
    author: String,
    pages: [
      {
        pageNumber: Number,
        originalText: String,
        tacticalInterpretation: String,
        visualCue: {
          type: String,
          enum: ['ripple', 'pulse', 'shake', 'glitch', 'none'],
          default: 'none',
        },
        metadata: {
          vibe: String, // 'peaceful', 'intense', 'hungry'
          backgroundAsset: String, // Optional image/video path for this page
        }
      }
    ],
  },
  { timestamps: true }
);

const Story = models.Story || model('Story', StorySchema);
export default Story;
