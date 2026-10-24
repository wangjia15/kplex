/** Read-only field-use lookup over existing neutral-source field postings and metadata families.
 * No acquisition, parsing, inventory, cache mutation or semantic preparation is requested here.
 * Only terminally authenticated, physically current document names escape the selected reader. */
import type {TFile} from 'obsidian';
import {normalizeFieldName} from '../../core/contracts/fieldName';
import type {NeutralSourceRepository} from '../../index/SourceRepository';

export type OntologyUsageDocument=Readonly<{path:string;name:string}>;
export type OntologyUsageResult=Readonly<{documents:readonly OntologyUsageDocument[];partial:boolean}>;

/** Query the existing field posting, then authenticate its name-only family and native identity.
 * Missing/stale sources yield a truthful partial list, never implicit repair or negative proof.
 * @param current Caller-owned modal/query lifetime, rechecked across every repository await.
 */
export async function readOntologyUsage(repository:Pick<NeutralSourceRepository,'querySources'|'readSelected'>,
  field:string,fileForPath:(path:string)=>TFile|null,current:()=>boolean):Promise<OntologyUsageResult> {
  const key=normalizeFieldName(field),documents=new Map<string,{document:OntologyUsageDocument;file:TFile;mtime:number;size:number}>();let partial=false;
  if(!key||!current())return {documents:[],partial:true};
  const complete=await repository.querySources('field',key,/** Process one bounded posting page without a second vault inventory. */ async ids=>{
    for(const id of ids){
      if(!current())return false;
      const captured:{file:TFile|null}={file:null};
      const result=await repository.readSelected(id,/** Selected heads supply paths; source IDs remain opaque. */ stamp=>{
        const physical=stamp.head.physical,candidate=fileForPath(physical.path);
        if(!candidate||candidate.extension!=='md'||candidate.stat.mtime!==physical.mtime
          ||physical.size!==undefined&&candidate.stat.size!==physical.size)return 'stale';
        if(captured.file&&captured.file!==candidate)return 'stale';captured.file=candidate;return 'ready';
      },/** Metadata name facts include unassigned fields and values without link targets. */ async reader=>{
        let found=false;
        await reader.visit('metadata',/** Retain only membership, never arbitrary property values. */ records=>{
          for(const record of records)if(record.kind==='field-name'&&record.normalizedFieldName===key)found=true;
          return current();
        });
        return found?reader.head.physical.path:null;
      },current);
      if(!current())return false;
      if(result.outcome==='ready'&&result.value){
        const live=fileForPath(result.value);
        if(live&&live===captured.file)documents.set(live.path,{document:{path:live.path,name:live.basename},file:live,mtime:live.stat.mtime,size:live.stat.size});else partial=true;
      }else if(result.outcome!=='ready')partial=true;
    }
    return current();
  },current);
  const available:OntologyUsageDocument[]=[];
  for(const value of documents.values()){
    const live=fileForPath(value.document.path);
    if(live===value.file&&live.stat.mtime===value.mtime&&live.stat.size===value.size)available.push(value.document);else partial=true;
  }
  return {documents:current()?available.sort(/** Stable path ordering disambiguates duplicate basenames. */ (a,b)=>a.path.localeCompare(b.path)):[],partial:partial||!complete||!current()};
}
