import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. Load the .env.local file from the root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

// 2. Use the variable from your .env
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI || !MONGODB_URI.startsWith('mongodb')) {
  console.error("❌ ERROR: MONGODB_URI is missing or invalid in .env.local");
  process.exit(1);
}

const SiteConfigSchema = new mongoose.Schema({
  agentId: String,
  branding: {
    primaryColor: String,
    fontFamily: String,
    siteName: String,
  },
  hero: {
    title: String,
    subtitle: String,
  },
  lastModifiedBy: String,
});

const SiteConfig = mongoose.models.SiteConfig || mongoose.model('SiteConfig', SiteConfigSchema);

async function seed() {
  try {
    console.log("Connecting to:", MONGODB_URI.split('@')[1] || "Local DB"); // Logs everything after the password for safety
    await mongoose.connect(MONGODB_URI);
    
    const defaultId = "taz-realty-001";

    const defaultSettings = {
      agentId: defaultId,
      branding: {
        primaryColor: "#2563eb", 
        fontFamily: "Inter",
        siteName: "Sunset Pulse Realty",
      },
      hero: {
        title: "Find Your Edge in North Texas",
        subtitle: "Intelligence-driven real estate, powered by Jamie AI.",
      },
      lastModifiedBy: "System Initializer",
    };

    await SiteConfig.findOneAndUpdate(
      { agentId: defaultId }, 
      defaultSettings, 
      { upsert: true, new: true }
    );

    console.log("✅ Jamie's Base Config is locked in. The street is ready.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err.message);
    process.exit(1);
  }
}

seed();