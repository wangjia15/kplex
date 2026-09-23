import { Platform } from "obsidian";
import type { ExcaliBrainSettings, KplexDeviceClass, KplexLayoutProfile, KplexViewSurface } from "../settings";

export function currentDeviceClass(): KplexDeviceClass {
  if (!Platform.isMobile) return "desktop";
  // Modern Obsidian exposes explicit phone/tablet form-factor flags. Prefer them so command
  // availability and persisted layout profiles follow Obsidian's own classification on iPad,
  // Android tablets, foldables and narrow split-screen layouts. Keep the screen-size fallback
  // for older Obsidian API packages where those runtime properties may not exist yet.
  const runtime = Platform as typeof Platform & { isPhone?: boolean; isTablet?: boolean };
  if (runtime.isPhone) return "mobile";
  if (runtime.isTablet) return "tablet";
  const screenRef = typeof window !== "undefined" ? window.screen : undefined;
  const width = screenRef?.width || (typeof window !== "undefined" ? window.innerWidth : 0);
  const height = screenRef?.height || (typeof window !== "undefined" ? window.innerHeight : 0);
  const shortestSide = Math.min(width || Number.POSITIVE_INFINITY, height || Number.POSITIVE_INFINITY);
  return shortestSide >= 600 ? "tablet" : "mobile";
}

export function layoutProfileKey(surface: KplexViewSurface, device = currentDeviceClass()): string {
  return `${device}:${surface}`;
}

type EffectiveSettingsCacheEntry = {
  profile: KplexLayoutProfile;
  value: ExcaliBrainSettings;
};

const effectiveSettingsCache = new WeakMap<ExcaliBrainSettings, Map<string, EffectiveSettingsCacheEntry>>();

export function effectiveViewSettings(settings: ExcaliBrainSettings, surface: KplexViewSurface): ExcaliBrainSettings {
  const key = layoutProfileKey(surface);
  const profile = settings.layoutProfiles[key];
  if (!profile) return settings;

  let bySurface = effectiveSettingsCache.get(settings);
  if (!bySurface) {
    bySurface = new Map();
    effectiveSettingsCache.set(settings, bySurface);
  }
  const cached = bySurface.get(key);
  if (cached?.profile === profile) return cached.value;

  // Layout profiles override only a small subset of settings. Inherit the rest from the live base
  // settings object instead of spreading it on every React render: base-setting mutations remain
  // immediately visible while the effective object's identity changes only when the profile does.
  const value = Object.assign(Object.create(settings) as ExcaliBrainSettings, profile);
  bySurface.set(key, { profile, value });
  return value;
}

export function activeLayoutProfile(settings: ExcaliBrainSettings, surface: KplexViewSurface): KplexLayoutProfile {
  const key = layoutProfileKey(surface);
  return settings.layoutProfiles[key] ?? {
    compactingFactor: settings.compactingFactor,
    parentColumns: settings.parentColumns,
    childColumns: settings.childColumns,
  };
}
