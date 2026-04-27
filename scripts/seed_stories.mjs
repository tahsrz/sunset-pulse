import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Story from '../models/Story.js';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Please define the MONGODB_URI environment variable');
  process.exit(1);
}

const stories = [
  {
    uid: 'CATERPILLAR-01',
    title: 'The Very Hungry Operative',
    author: 'Eric Carle (Tactical Adaption)',
    pages: [
      {
        pageNumber: 1,
        originalText: 'In the light of the moon, a little egg lay on a leaf.',
        metadata: { vibe: 'peaceful' }
      },
      {
        pageNumber: 2,
        originalText: 'One Sunday morning the warm sun came up and - pop! - out of the egg came a tiny and very hungry caterpillar.',
        metadata: { vibe: 'intense' }
      },
      {
        pageNumber: 3,
        originalText: 'He started to look for some food.',
        metadata: { vibe: 'hungry' }
      },
      {
        pageNumber: 4,
        originalText: 'On Monday he ate through one apple. But he was still hungry.',
        metadata: { vibe: 'hungry' }
      },
      {
        pageNumber: 5,
        originalText: 'On Tuesday he ate through two pears, but he was still hungry.',
        metadata: { vibe: 'hungry' }
      },
      {
        pageNumber: 6,
        originalText: 'On Wednesday he ate through three plums, but he was still hungry.',
        metadata: { vibe: 'hungry' }
      },
      {
        pageNumber: 7,
        originalText: 'On Thursday he ate through four strawberries, but he was still hungry.',
        metadata: { vibe: 'hungry' }
      },
      {
        pageNumber: 8,
        originalText: 'On Friday he ate through five oranges, but he was still hungry.',
        metadata: { vibe: 'hungry' }
      },
      {
        pageNumber: 9,
        originalText: 'On Saturday he ate through one piece of chocolate cake, one ice-cream cone, one pickle, one slice of Swiss cheese, one slice of salami, one lollipop, one piece of cherry pie, one sausage, one cupcake, and one slice of watermelon.',
        metadata: { vibe: 'overwhelmed' }
      },
      {
        pageNumber: 10,
        originalText: 'The next day was Sunday again. The caterpillar ate through one nice green leaf, and after that he felt much better.',
        metadata: { vibe: 'relieved' }
      },
      {
        pageNumber: 11,
        originalText: 'Now he wasn\'t hungry anymore - and he wasn\'t a little caterpillar anymore. He was a big, fat caterpillar.',
        metadata: { vibe: 'growth' }
      },
      {
        pageNumber: 12,
        originalText: 'He built a small house, called a cocoon, around himself. He stayed inside for more than two weeks.',
        metadata: { vibe: 'incubation' }
      },
      {
        pageNumber: 13,
        originalText: 'Then he nibbled a hole in the cocoon, pushed his way out and... he was a beautiful butterfly!',
        metadata: { vibe: 'transformation' }
      }
    ]
  }
];

async function seedStories() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB.');

    for (const story of stories) {
      await Story.findOneAndUpdate({ uid: story.uid }, story, { upsert: true, new: true });
      console.log(`Seeded story: ${story.title} [${story.uid}]`);
    }

    console.log('Story Seeding Complete.');
    process.exit(0);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

seedStories();
