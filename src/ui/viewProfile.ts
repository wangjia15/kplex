import { Platform } from "obsidian";
import type { ExcaliBrainSettings, KplexDeviceClass, KplexLayoutProfile, KplexViewSurface } from "../settings";

export function currentDeviceClass(): KplexDeviceClass {
  if (!Platform.isMobile) return "desktop";
  // Obsidian's public Platform API distinguishes desktop/mobile, not phone/tablet. On the
  // mobile runtime use the device screen's shortest CSS dimension: 600dp is the conventional
  // Android/iPad breakpoint and, unlike the sidepanel leaf width, remains stable as panes move.
  const screen = window.screen;
  const shortestSide = Math.min(screen?.width ?? window.innerWidth, screen?.height ?? window.innerHeight);
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
