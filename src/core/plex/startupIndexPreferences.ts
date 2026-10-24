/** Restart-required indexing preferences; independent of graph and appearance policy. */
import {persistedLayoutDeviceClass, type PersistedLayoutDeviceClass} from './viewPresentation';
import type {PresentationDeviceClass} from '../contracts/presentationEnvironment';

export type IndexingMode = 'eager' | 'on-demand';
export interface StartupIndexPreferences {
  indexBeforeViewDesktop: boolean;
  indexBeforeViewTablet: boolean;
  indexBeforeViewMobile: boolean;
  indexingModeDesktop: IndexingMode;
  indexingModeTablet: IndexingMode;
  indexingModeMobile: IndexingMode;
}
export const STARTUP_INDEX_DEFAULTS: Readonly<StartupIndexPreferences> = {
  indexBeforeViewDesktop: true,
  indexBeforeViewTablet: false,
  indexBeforeViewMobile: false,
  indexingModeDesktop: 'eager',
  indexingModeTablet: 'on-demand',
  indexingModeMobile: 'on-demand',
};

/** Missing device fields use explicit defaults; the retired global mode is not copied across devices. */
export function sanitizeStartupIndexPreferences(value: Partial<StartupIndexPreferences>): StartupIndexPreferences {
  return {
    indexBeforeViewDesktop: typeof value.indexBeforeViewDesktop === 'boolean' ? value.indexBeforeViewDesktop : STARTUP_INDEX_DEFAULTS.indexBeforeViewDesktop,
    indexBeforeViewTablet: typeof value.indexBeforeViewTablet === 'boolean' ? value.indexBeforeViewTablet : STARTUP_INDEX_DEFAULTS.indexBeforeViewTablet,
    indexBeforeViewMobile: typeof value.indexBeforeViewMobile === 'boolean' ? value.indexBeforeViewMobile : STARTUP_INDEX_DEFAULTS.indexBeforeViewMobile,
    indexingModeDesktop: sanitizeIndexingMode(value.indexingModeDesktop, STARTUP_INDEX_DEFAULTS.indexingModeDesktop),
    indexingModeTablet: sanitizeIndexingMode(value.indexingModeTablet, STARTUP_INDEX_DEFAULTS.indexingModeTablet),
    indexingModeMobile: sanitizeIndexingMode(value.indexingModeMobile, STARTUP_INDEX_DEFAULTS.indexingModeMobile),
  };
}

/** Accept only supported strategies; unknown/newer values do not become executable policy. */
function sanitizeIndexingMode(value: unknown, fallback: IndexingMode): IndexingMode {
  return value === 'eager' || value === 'on-demand' ? value : fallback;
}

/** Capture once from main-host device facts, never from a particular tab or popout width. */
export function startupIndexPolicy(settings: StartupIndexPreferences, device: PresentationDeviceClass): Readonly<{
  device: PersistedLayoutDeviceClass; beforeView: boolean; mode: IndexingMode;
}> {
  const stored = persistedLayoutDeviceClass(device);
  return {device: stored, beforeView: settings[stored === 'desktop' ? 'indexBeforeViewDesktop'
    : stored === 'tablet' ? 'indexBeforeViewTablet' : 'indexBeforeViewMobile'],
    mode: settings[stored === 'desktop' ? 'indexingModeDesktop'
      : stored === 'tablet' ? 'indexingModeTablet' : 'indexingModeMobile']};
}
