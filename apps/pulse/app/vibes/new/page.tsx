"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import React from "react";
import { VIBE_PRESETS } from "@/lib/cms/vibePresets";
import { toVibeSlug } from "@/lib/cms/vibeSlug";
import { isValidVibeSlug } from "@/lib/cms/vibeSlug";
import { VibePageHeader } from "../_components/VibePageHeader";
const PRESETS = [
  {
    id: "",
    name: "Default",
    note: "A neutral, editable starting point.",
    colors: ["#2563eb", "#0f172a", "#f8fafc"],
    typography: {
      fontFamilyHeading: "Inter",
      fontFamilyBody: "Inter",
      baseFontSize: "16px",
    },
    layout: { borderRadius: "md", elevation: "subtle" },
  },
  ...VIBE_PRESETS,
] as const;
const toSlug = toVibeSlug;
export default function NewVibePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [description, setDescription] = useState("");
  const [preset, setPreset] = useState<string>("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function create() {
    if (!isValidVibeSlug(slug)) {
      setError("Use lowercase letters, numbers, and single hyphens only.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/vibes", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, slug, description, ...(preset ? { preset } : {}) }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error || "Unable to create vibe.");
        return;
      }
      router.push(`/vibes/${payload.vibe.vibeId}/edit`);
    } catch {
      setError("Unable to create vibe. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-2xl">
        <VibePageHeader title="Add New Vibe" description="Create a draft identity to continue in the structured editor." backHref="/vibes" backLabel="All Vibes" />
        <form
          className="mt-6 space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          onSubmit={(event) => {
            event.preventDefault();
            void create();
          }}
        >
          <fieldset>
            <legend className="text-sm font-bold">Starting style</legend>
            <p className="mt-1 text-xs text-slate-500">
              Copied into this new draft only; every value remains editable.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {PRESETS.map((item) => (
                <label
                  key={item.id || "default"}
                  className={`cursor-pointer rounded-lg border p-3 ${preset === item.id ? "border-[#2271b1] bg-sky-50 ring-1 ring-[#2271b1]" : "border-slate-200 bg-white"}`}
                >
                  <input
                    className="sr-only"
                    type="radio"
                    name="preset"
                    value={item.id}
                    checked={preset === item.id}
                    onChange={() => setPreset(item.id)}
                  />
                  <span className="font-semibold">{item.name}</span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {item.note}
                  </span>
                  <span className="mt-2 block text-xs text-slate-600">
                    {item.typography.fontFamilyHeading} +{" "}
                    {item.typography.fontFamilyBody} ·{" "}
                    {item.typography.baseFontSize}
                  </span>
                  <span className="mt-1 block text-xs text-slate-600">
                    {item.layout.borderRadius} radius · {item.layout.elevation}{" "}
                    elevation
                  </span>
                  <span className="mt-3 flex overflow-hidden rounded">
                    <i
                      className="h-4 flex-1"
                      style={{ background: item.colors[0] }}
                    />
                    <i
                      className="h-4 flex-1"
                      style={{ background: item.colors[1] }}
                    />
                    <i
                      className="h-4 flex-1"
                      style={{ background: item.colors[2] }}
                    />
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block text-sm font-bold">
            Title
            <input
              required
              value={title}
              onChange={(event) => {
                const next = event.target.value;
                setTitle(next);
                if (!slugEdited) setSlug(toSlug(next));
              }}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 font-normal"
            />
          </label>
          <label className="block text-sm font-bold">
            Slug
            <input
              required
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              value={slug}
              onChange={(event) => {
                setSlug(event.target.value);
                setSlugEdited(true);
              }}
              className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 font-mono font-normal"
            />
            <span className="mt-1 block text-xs font-normal text-slate-500">Lowercase letters, numbers, and hyphens. This identifies the Vibe, not a public site URL.</span>
          </label>
          <label className="block text-sm font-bold">
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-2 min-h-32 w-full rounded-md border border-slate-300 px-3 py-2 font-normal"
            />
          </label>
          {error ? (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <button
            disabled={saving}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save draft and continue editing"}
          </button>
        </form>
      </div>
    </div>
  );
}
