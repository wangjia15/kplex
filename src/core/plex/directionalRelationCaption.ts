/** Directional connector wording over committed pair metadata and existing active decisions.
 * This presentation-only helper never changes field/style/filter identity, chooses semantic roles,
 * resolves nodes or reads sources. Missing provenance retains the available physical label. */
import {normalizeFieldName} from '../contracts/fieldName';
import type {OntologyPair} from '../contracts/ontologyConfiguration';
import type {EvidenceDecision} from '../graph/evidence';

/** Check joined physical labels before requesting already-cached exact-pair evidence. */
export function hasDirectionalCaption(definition:string|undefined,pairs:ReadonlyMap<string,OntologyPair>):boolean {
  return pairs.size>0&&Boolean(definition?.split(',').some(/** Existing definition aggregation uses comma-separated physical labels. */ field=>pairs.has(normalizeFieldName(field.trim()))));
}
/** Format every active physical contribution in the actual semantic endpoint perspective.
 * Never infer perspective from gate placement, arrow direction or a transient display identity. */
export function directionalRelationCaption(definition:string|undefined,pairs:ReadonlyMap<string,OntologyPair>,
  sourcePath:string,targetPath:string,decisions:readonly EvidenceDecision[]|undefined):string|undefined {
  if(!hasDirectionalCaption(definition,pairs)||!decisions?.length)return definition;
  const labels=new Set<string>();
  for(const token of definition!.split(',').map(/** Preserve existing physical token ordering while trimming aggregation whitespace. */ field=>field.trim()).filter(Boolean)){
    const key=normalizeFieldName(token),pair=pairs.get(key);if(!pair){labels.add(token);continue;}
    let resolved=false;
    for(const decision of decisions){
      const evidence=decision.evidence;if(!decision.active||normalizeFieldName(evidence.fieldName??evidence.definition??'')!==key)continue;
      if(evidence.declaredByPath===sourcePath&&evidence.declaredTargetPath===targetPath){labels.add(pair.field);resolved=true;}
      else if(evidence.declaredByPath===targetPath&&evidence.declaredTargetPath===sourcePath){labels.add(pair.partner);resolved=true;}
    }
    if(!resolved)labels.add(token);
  }
  return [...labels].join(', ');
}
