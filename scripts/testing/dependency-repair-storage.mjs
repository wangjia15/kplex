/** PR207 test-only four-way storage isolation. Never selects a production runtime flag. */
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdtemp,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createDependencyRepairPointReadVariant} from '../../tests/support/dependencyRepairPointReads.mjs';
import {createDependencyRepairCursorProofVariant} from '../../tests/support/dependencyRepairCursorProof.mjs';
import {createDependencyRepairVariants} from '../../tests/support/dependencyRepairVariants.mjs';
import {contributorBrowserBundle} from '../../tests/support/contributorBrowserFixture.mjs';
import {arm} from './dependency-count-reuse.mjs';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..'),runtime='src/index/SourceRepository.ts';
const baseline='930747679894f003a2acf3b800df798826ee090c',reviewed='d6ef7f07b199e2eb2497f13148374f5edf6802d3';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
/** Pin source overrides independently of later documentation or corrective commits. */
function committedSource(commit){return execFileSync('git',['show',`${commit}:${runtime}`],{cwd:root,encoding:'utf8'});}
/** Finite alternating plan is observable and separately contract-tested. */
export function storageComparisonPlan(mode){
  if(!['smoke','causal','counts','point-smoke','point'].includes(mode))throw Error('Use smoke, causal, counts, point-smoke, or point');
  const orders=mode==='causal'?[['A','B','C','D'],['D','C','B','A'],['B','A','D','C']]:mode==='point'?[['A','E','F','D'],['D','F','E','A'],['E','A','D','F']]:mode==='point-smoke'?[['A','E','F','D']]:mode==='counts'?[['A','B','C','D','E','F']]:[['A','B','C','D']];
  return orders.flatMap((order,index)=>order.map(variant=>({variant,pair:index+1,owners:mode.endsWith('smoke')?2:256,distribution:'mixed',operation:'delete',wide:false,shutdown:'graceful',reopenDiagnostic:true,rootProcessCpu:true,detailed:mode==='counts',storageInventory:mode==='counts'})));
}
/** Preserve every arm immediately, including unfavorable or incomplete outcomes. */
async function main(){
 if(process.version!=='v22.22.2')throw Error('Pinned Node22.22.2 required');
 const mode=process.argv[2]??'smoke',plan=storageComparisonPlan(mode),candidateSource=committedSource(reviewed),variants={...createDependencyRepairVariants({baselineSource:committedSource(baseline),candidateSource}),E:createDependencyRepairPointReadVariant({candidateSource}),F:createDependencyRepairCursorProofVariant({candidateSource})};
 if(['smoke','causal','counts','point-smoke','point'].includes(mode)&&sha(await readFile(join(root,runtime)))!==sha(variants.D.source))throw Error('Production changed before initial causal comparison completed');
 const directory=await mkdtemp(join(tmpdir(),`kplex-repair-storage-207-${mode}-`));
 const summary={version:'dependency-repair-storage-207-v1',mode,directory,createdAt:new Date().toISOString(),node:process.version,platform:process.platform,baseline,reviewed,head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),variants:{},plan,results:[],status:'incomplete',decisionRule:'Unchanged candidate >=10% AND >5ms excess in >=2/3 matched pairs; assess native open and separated restart/reopen sum. A exact baseline; B/C/D share bounded cursor prefix. B-D isolates deletion; C-D grouped ledger including request ordering; common scaffold remains a confound if all B/C/D regress.',conditions:{logical:'Same256-owner mixed source seed/deletion history; full source/membership/ledger oracles before work, after deletion and after reopen/recreation/edit.',lifecycle:'Actual native terminal transaction drain, closed connection, graceful Browser.close acknowledged exit0/no fallback and different root PID.',observers:'Primary timing omits detailed native wrappers. Root SystemInfo CPU snapshots outside renderer timing endpoints; no renderer double counting. Separate counts cohort.',cache:'Fresh owned profile per arm; physical storage/OS cache equality not established. No GC/delay/compaction/durability changes.'}};
 const bundles={};
 for(const key of new Set(plan.map(item=>item.variant))){const source=variants[key].source;bundles[key]=await contributorBrowserBundle([runtime],{[runtime]:source});summary.variants[key]={...variants[key],source:undefined,sourceOverrides:undefined,sourceSha256:sha(source),bundleSha256:sha(bundles[key])};await writeFile(join(directory,`${key}.SourceRepository.ts`),source);}
 summary.productionArtifacts={baseline:sha(await readFile(join(process.env.KPLEX_REPAIR_BASELINE_ARTIFACT_DIR??'', 'main.js'))),reviewed:sha(await readFile(join(root,'dist/main.js')))};
 if(summary.productionArtifacts.baseline!=='7fa00a354d38fb2cedecbb9d15c5277e0513813b7074d487f5ebda9820c2b79f'||summary.productionArtifacts.reviewed!=='19d75415c69d8c77bbde934f618eeece2f0387459a49003090eedef61b9bb28f')throw Error('Frozen production artifacts changed');
 summary.toolingHashes={};for(const file of ['scripts/testing/dependency-repair-storage.mjs','scripts/testing/dependency-count-reuse.mjs','tests/support/dependencyRepairVariants.mjs','tests/support/dependencyRepairPointReads.mjs','tests/support/dependencyRepairCursorProof.mjs','tests/support/indexedDbFileInventory.mjs','tests/support/chromiumProcessMetrics.mjs','tests/support/contributorBrowserFixture.mjs','tests/support/retiredSourcePrototypes.mjs','tests/support/browserExecutable.mjs','tests/support/browserTypeScript.mjs','tests/support/chromiumLifecycle.mjs','tests/support/restartCompletionObserver.mjs','tests/support/dependencyCountReuseFixture.mjs'])summary.toolingHashes[file]=sha(await readFile(join(root,file)));
 console.log(JSON.stringify({directory,mode,variants:summary.variants}));
 await writeFile(join(directory,'summary.json'),JSON.stringify(summary,null,2));
 for(const config of plan){const name=`storage-${mode}-${config.owners}-${config.pair}-${config.variant}`,file=name+'.json';const result=await arm(bundles[config.variant],name,config,config.detailed);await writeFile(join(directory,file),JSON.stringify(result,null,2));summary.results.push({name,file,status:result.status});await writeFile(join(directory,'summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify({name,status:result.status,elapsedMs:result.elapsedMs}));if(result.cleanup?.status!=='passed')throw Error('Stop: owned browser cleanup incomplete');}
 summary.finishedAt=new Date().toISOString();summary.status=summary.results.every(r=>r.status==='passed')?'passed':'failed';await writeFile(join(directory,'summary.json'),JSON.stringify(summary,null,2));if(summary.status!=='passed')process.exitCode=1;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)await main();
