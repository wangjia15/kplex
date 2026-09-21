import { Platform } from "obsidian";
import type { ExcaliBrainSettings, KplexDeviceClass, KplexLayoutProfile, KplexViewSurface } from "../settings";

export function currentDeviceClass(): KplexDeviceClass {
  if (!Platform.isMobile) return "desktop";
  // Obsidian exposes the stable public `Platform.isMobile` flag, but phone/tablet-specific
  // flags are not part of the supported API surface. Split mobile form factors by the
  // shortest CSS-pixel side instead. 600px is the conventional tablet breakpoint and keeps
  // foldables / small tablets on the more spacious tablet profile when appropriate.
  const screenRef = typeof window !== "undefined" ? window.screen : undefined;
  const width = screenRef?.width || (typeof window !== "undefined" ? window.innerWidth : 0);
  const height = screenRef?.height || (typeof window !== "undefined" ? window.innerHeight : 0);
  const shortestSide = Math.min(width || Number.POSITIVE_INFINITY, height || Number.POSITIVE_INFINITY);
  return shortestSide >= 600 ? "tablet" : "mobile";
}

export function layoutProfileKey(surface: KplexViewSurface, device = currentDeviceClass()): string {
  return `${device}:${surface}`;
}

export function effectiveViewSettings(settings: ExcaliBrainSettings, surface: KplexViewSurface): ExcaliBrainSettings {
  const profile = settings.layoutProfiles[layoutProfileKey(surface)];
  if (!profile) return settings;
  return { ...settings, ...profile };
}

export function activeLayoutProfile(settings: ExcaliBrainSettings, surface: KplexViewSurface): KplexLayoutProfile {
  const key = layoutProfileKey(surface);
  return settings.layoutProfiles[key] ?? {
    compactingFactor: settings.compactingFactor,
    parentColumns: settings.parentColumns,
    childColumns: settings.childColumns,
  };
}
