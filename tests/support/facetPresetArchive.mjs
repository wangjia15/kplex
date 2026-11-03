/** Explicit legacy workflow fixtures come from the preserved portable files, not shipped defaults.
 * Lazy Help is omitted here to model sparse saved entries and keep library-capacity cases bounded. */
import {readFileSync} from 'node:fs';
const files=['arc','para','gtd-horizons','eaccess','sensemaking','publishing-pipeline'];
export const archivedFacetPresets=Object.fromEntries(files.map(file=>{
 const pkg=JSON.parse(readFileSync(new URL(`../../presets/facets/${file}.json`,import.meta.url),'utf8'));
 const {helpMarkdown,helpSourceLocale,...preset}=pkg.preset;
 return [pkg.id,preset];
}));

/** Explicit saved phase/id configuration keeps earlier assignment and mutation cases independent
 * of the new emoji/status defaults. It is fixture data, never another assignment implementation. */
export function legacyWuXingPreset(preset) {
 return {...preset,field:'phase',order:['water','wood','fire','earth','metal'],start:'water',
  categories:Object.fromEntries(Object.entries(preset.categories).map(([id,category])=>[id,{...category,values:[id],assignment:id}]))};
}
