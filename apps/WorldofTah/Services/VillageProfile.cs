using System;
using System.Collections.Generic;

namespace WorldofTah.TahEngine.Services
{
    public enum MusicalArchetype
    {
        Minimalist,    // Simple, repetitive, clean patterns.
        Experimentalist, // Complex, glitchy, avant-garde.
        Traditionalist, // Classic rhythms, tonal, predictable.
        ChaosEngine     // Random, loud, dissonant.
    }

    public class VillageProfile
    {
        public string CharName { get; set; } = string.Empty;
        public byte Level { get; set; }
        public uint Gold { get; set; }
        public byte Alignment { get; set; } // 0 = Harmonious, 255 = Dissonant/Malicious

        // --- Musical Matrix ---
        public byte RhythmComplexity { get; set; } // 0-100
        public byte HarmonicPurity { get; set; }   // 0-100
        public byte BPM { get; set; }              // 60-200
        public string StrudelPattern { get; set; } = string.Empty; // The generated TidalCycles code

        public byte SuspicionLevel { get; set; }  // How much the town dislikes their "vibe"
        public MusicalArchetype Archetype { get; set; }
        public string RecentActivityLog { get; set; } = string.Empty;
    }

    public class VotingOutcome
    {
        public string reasoning { get; set; } = string.Empty;
        public string target_villager_vote { get; set; } = string.Empty;
        public int hostility_intensity { get; set; }
        public string public_accusation_speech { get; set; } = string.Empty;
    }
}
