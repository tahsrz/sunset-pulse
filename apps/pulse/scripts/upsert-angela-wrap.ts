import './load-env.js';

import mongoose from 'mongoose';

import connectDB from '../lib/core/database.js';
import MenuItem from '../models/MenuItem.js';

const ANGELA_WRAP = {
  id: 'staff-03',
  agentId: 'taz-realty-001',
  name: "Angela's Chicken Bacon Wrap",
  price: 10.99,
  category: 'Favorites',
  description:
    'Chicken bacon wrap on a flour tortilla with grilled onion, bacon, grilled bell peppers, grilled tomatoes, lettuce, cheese, and ranch or honey mustard.',
  options: [
    {
      key: 'chickenStyle',
      label: 'Chicken Style',
      required: true,
      defaultValue: 'grilled',
      choices: [
        {
          value: 'grilled',
          label: 'Grilled',
          description: 'Grilled chicken breast',
        },
        {
          value: 'crispy',
          label: 'Crispy',
          description: 'Two chicken strips',
        },
      ],
    },
    {
      key: 'dressing',
      label: 'Dressing',
      required: true,
      defaultValue: 'ranch',
      choices: [
        {
          value: 'ranch',
          label: 'Ranch',
        },
        {
          value: 'honeyMustard',
          label: 'Honey Mustard',
        },
      ],
    },
  ],
  isAvailable: true,
  isDaisyPick: false,
  isStaffPick: true,
};

async function main() {
  await connectDB();

  const item = await MenuItem.findOneAndUpdate(
    { agentId: ANGELA_WRAP.agentId, id: ANGELA_WRAP.id },
    { $set: ANGELA_WRAP },
    { new: true, setDefaultsOnInsert: true, upsert: true }
  ).lean();

  console.log(
    `Upserted menu item: ${item.name} (${item._id}) - staffPick=${item.isStaffPick}`
  );
}

main()
  .catch((error) => {
    console.error('Failed to upsert Angela wrap menu item:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
