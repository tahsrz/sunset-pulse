using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Text.Json.Serialization;
using System.Text;
using System.Text.Json;
using System.Net.Http;
using WorldofTah.TahEngine.Services;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.ConfigureHttpJsonOptions(options => {
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors();

// Simulation State
List<VillageProfile> activeTown = new List<VillageProfile>();
List<string> logs = new List<string>();

app.MapPost("/api/simulation/start", async () => {
    activeTown.Clear();
    logs.Clear();
    for (int i = 0; i < 4; i++)
    {
        var villager = BiomeRegistry.SpawnMusicalVillager();
        activeTown.Add(villager);
    }

    // Initial composition cycle
    foreach(var v in activeTown) {
        v.StrudelPattern = await BiomeRegistry.ComposePattern(v);
    }

    logs.Add("=== Musical Simulation Initialized ===");
    return Results.Ok(new { message = "Music simulation started", population = activeTown.Count });
});

app.MapGet("/api/simulation/state", () => {
    return Results.Ok(new {
        population = activeTown,
        logs = logs.TakeLast(50).ToList()
    });
});

app.MapPost("/api/simulation/tick", async () => {
    if (activeTown.Count == 0) return Results.BadRequest("Simulation not started");

    logs.Add($"--- Monthly Concert Cycle Beginning ---");

    // 1. Compose new patterns
    foreach(var v in activeTown) {
        v.StrudelPattern = await BiomeRegistry.ComposePattern(v);
    }

    // 2. Voting (Musical Tribunal)
    Dictionary<string, int> voteTally = activeTown.ToDictionary(v => v.CharName, v => 0);
    List<VotingOutcome> monthlyBallots = new List<VotingOutcome>();

    foreach (var voter in activeTown)
    {
        VotingOutcome ballot = await TribalEngine.RunMusicalVote(voter, activeTown);
        monthlyBallots.Add(ballot);

        string matchingTarget = activeTown.FirstOrDefault(t =>
            ballot.target_villager_vote.Contains(t.CharName) ||
            t.CharName.Contains(ballot.target_villager_vote))?.CharName;

        if (matchingTarget != null)
        {
            voteTally[matchingTarget]++;
            logs.Add($"{voter.CharName} ({voter.Archetype}) voted out {matchingTarget}: \"{ballot.public_accusation_speech}\"");
        }
    }

    // 3. Execution (The Silence)
    var sortedTally = voteTally.OrderByDescending(kvp => kvp.Value).ToList();
    string executionTarget = sortedTally.First().Key;
    int topVoteCount = sortedTally.First().Value;

    if (topVoteCount > 0)
    {
        VillageProfile victim = activeTown.First(v => v.CharName == executionTarget);
        VotingOutcome? primaryBallot = monthlyBallots.FirstOrDefault(b =>
            b.target_villager_vote.Contains(executionTarget) ||
            executionTarget.Contains(b.target_villager_vote));

        logs.Add($"THE SILENCE: {executionTarget} banished for producing offensive frequencies ({topVoteCount} votes).");

        // We'll skip binary serialization for now to focus on the UI/Ollama loop
        victim.SuspicionLevel = 255; // Mark for exile

        if (victim.SuspicionLevel > 60)
        {
            activeTown.Remove(victim);
            var replacement = BiomeRegistry.SpawnMusicalVillager();
            replacement.StrudelPattern = await BiomeRegistry.ComposePattern(replacement);
            activeTown.Add(replacement);
            logs.Add($"NEW WAVE: {replacement.CharName} ({replacement.Archetype}) entered the scene.");
        }
    }

    return Results.Ok(new { message = "Concert Tick complete", logs = logs.TakeLast(10) });
});

app.Run();

public static class BiomeRegistry
{
    private static readonly Random _rng = new Random();
    private static readonly string[] FirstNames = { "Beats", "Lush", "Glitch", "Synth", "Droner", "Echo", "Tempo", "Vibe" };
    private static readonly string[] LastNames = { "Makar", "Wave", "Freq", "Noise", "Loop", "Note", "Chord", "Beat" };
    private static readonly HttpClient _httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };

    public static VillageProfile SpawnMusicalVillager()
    {
        Array archetypes = Enum.GetValues(typeof(MusicalArchetype));
        MusicalArchetype chosen = (MusicalArchetype)archetypes.GetValue(_rng.Next(archetypes.Length));

        string name = $"{FirstNames[_rng.Next(FirstNames.Length)]} {LastNames[_rng.Next(LastNames.Length)]}";

        return new VillageProfile {
            CharName = name, Level = 1, Gold = (uint)_rng.Next(100, 1000),
            Alignment = (byte)_rng.Next(0, 255),
            RhythmComplexity = (byte)_rng.Next(10, 100),
            HarmonicPurity = (byte)_rng.Next(10, 100),
            BPM = (byte)_rng.Next(80, 180),
            Archetype = chosen,
            RecentActivityLog = $"A local {chosen} known for their unique sonic texture."
        };
    }

    public static async Task<string> ComposePattern(VillageProfile v)
    {
        string prompt = $@"
CRITICAL: Return ONLY a single line of Strudel.cc (JavaScript) code.
DO NOT include any text, explanations, or markdown.
Archetype: {v.Archetype}
Pattern Style: {v.BPM} BPM, Complexity {v.RhythmComplexity}/100.

EXAMPLES:
Minimalist: s('bd*2 [sd [cp bd]]').gain(.8)
Experimentalist: s('gretsch:1*8').jux(rev).chop(8).iter(4)
Traditionalist: stack(s('bd sd'), n('c3 e3 g3 b3').s('piano'))
ChaosEngine: s('industrial:1*16').speed(rand().range(0.5, 2)).room(0.8)

CHARACTER RESPONSE:
";
        try {
            var requestBody = new { model = "phi4-mini", prompt = prompt, stream = false };
            var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");
            var response = await _httpClient.PostAsync("http://localhost:11434/api/generate", content);
            var resDoc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            string rawCode = resDoc.RootElement.GetProperty("response").GetString() ?? "s('bd')";

            // Regex to find the first likely strudel function call if LLM yaps
            var match = System.Text.RegularExpressions.Regex.Match(rawCode, @"(s\(|n\(|stack\(|note\().*");
            string cleanCode = match.Success ? match.Value : rawCode;

            cleanCode = cleanCode
                .Split('\n')[0] // Only take the first line
                .Replace("```javascript", "")
                .Replace("```js", "")
                .Replace("```", "")
                .Trim();

            return string.IsNullOrEmpty(cleanCode) ? "s('bd')" : cleanCode;
        } catch {
            return "s('bd')";
        }
    }
}

public static class TribalEngine
{
    private static readonly HttpClient _httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(30) };

    public static async Task<VotingOutcome> RunMusicalVote(VillageProfile voter, List<VillageProfile> townRegistry)
    {
        StringBuilder concertReport = new StringBuilder();
        foreach (var v in townRegistry)
        {
            concertReport.AppendLine($"- {v.CharName} ({v.Archetype}): {v.StrudelPattern}");
        }

        string systemPrompt = $@"
You are a musical judge and citizen: {voter.CharName} ({voter.Archetype}).
Alignment: {voter.Alignment} (0=Harmony-lover, 255=Chaos-lover).

THE TRIBUNAL OF SOUND:
The town must maintain a 'vibe'. You must vote out ONE villager whose music you find offensive or 'bad' based on your archetype.
- Minimalists HATE Chaos.
- Experimentalists HATE Traditionalists.
- Traditionalists HATE Glitch/Chaos.
- ChaosEngines HATE Silence/Minimalism.

TODAY'S PERFORMANCES:
{concertReport.ToString()}

Vote based on your personality.
Output ONLY a raw, single-line JSON string:
{{
  ""reasoning"": ""STRING"",
  ""target_villager_vote"": ""STRING (Exact Name)"",
  ""hostility_intensity"": NUMBER,
  ""public_accusation_speech"": ""STRING""
}}";

        var requestBody = new { model = "phi4-mini", prompt = systemPrompt, format = "json", stream = false };
        var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

        try
        {
            var response = await _httpClient.PostAsync("http://localhost:11434/api/generate", content);
            var resDoc = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            string rawJsonOutput = resDoc.RootElement.GetProperty("response").GetString() ?? "{}";
            return JsonSerializer.Deserialize<VotingOutcome>(rawJsonOutput) ?? new VotingOutcome();
        }
        catch { return new VotingOutcome { target_villager_vote = "None" }; }
    }
}
