/**
 * Controlled exact-build Small recovery acceptance. Reopens only the existing startup coordinator
 * lifetime flags on an already source-backed native index, then withholds host metadata for one
 * test-owned note. Real source reconciliation and adoption run unchanged. This isolates recovery,
 * not fresh-process route selection or CPU. Normal plugin reload retires the controlled lifetime.
 */
import {readFileSync} from 'node:fs';
import {join,relative} from 'node:path';
import {validateTarget} from './runner.mjs';
import {runControlledProbe} from './controlledProbe.mjs';

/** Exercise one genuine source failure/recovery while retaining readable published graph state. */
async function scenario(app,c) {
  const check=(value,message)=>{if(!value)throw Error(message);};
  const wait=ms=>new Promise(resolve=>window.setTimeout(resolve,ms));
  /** Observe bounded native work; never retry adoption or force a rebuild from the harness. */
  const until=async(read,message)=>{const end=Date.now()+45000;while(!read()){check(!c.closed&&Date.now()<end,message);await wait(40);}};
  check(app.vault.getName()==='kplex-test-small'&&app.vault.adapter.getBasePath()===c.vaultPath,'Wrong live test vault');
  check(!app.internalPlugins.getPluginById('sync')?.enabled&&!app.internalPlugins.getPluginById('publish')?.enabled,'Writers enabled');
  check([...app.plugins.enabledPlugins].every(id=>id==='k-plex'),'External writer enabled');
  const p=app.plugins.plugins['k-plex'],index=p.index,source=index.sourceAcquisition;
  await until(()=>p.initialIndexComplete&&source.hasSemanticDependencies()&&!index.hasPendingSemanticPreparation(),'Native eager startup did not settle');
  check(index.hasSourceBackedStartup()&&!index.isOnDemandMode(),'Settled source-backed eager prerequisite required');
  const db=await index.indexedDb.open();check(db?.name==='k-plex-index-v1-6b706c65782d746573742d736d616c6c','Wrong native database');
  const path='Kplex206-Recovery-'+Date.now()+'.md',originalCache=app.metadataCache.getFileCache,originalAdopt=index.adoptStartupSources;
  const cacheDescriptor=Object.getOwnPropertyDescriptor(app.metadataCache,'getFileCache'),adoptDescriptor=Object.getOwnPropertyDescriptor(index,'adoptStartupSources');
  /** Restore the original method location as well as its function identity. */
  const restoreCache=()=>{if(cacheDescriptor)Object.defineProperty(app.metadataCache,'getFileCache',cacheDescriptor);else delete app.metadataCache.getFileCache;};
  const attempts=[];
  let file,withheld=false,wrapper,fullBefore,totalAttempts=0;
  c.progress={phase:'setup',attempts};
  try {
    file=await app.vault.create(path,'Status:: before\n[Recovery](https://example.com/kplex-206-recovery)');
    await until(()=>!!originalCache.call(app.metadataCache,file),'Native metadata did not arrive');
    await index.flushSourceRepository();
    await until(()=>source.hasSemanticDependencies()&&!index.hasPendingSemanticPreparation()&&!p.indexDirty&&!p.rebuildTask&&p.rebuildTimer===null,'Fixture did not settle');
    fullBefore=index.getSemanticPreparationDiagnostics().fullBuilds;
    check(index.size>0&&!!document.querySelector('.kplex-app'),'Published native scene required');
    /** Forward the original promise unchanged and retain at most16 scalar attempt outcomes. */
    wrapper=function(...args){totalAttempts++;const result=originalAdopt.apply(this,args);result.then(value=>{if(attempts.length<16)attempts.push({value,sourceReady:source.hasSemanticDependencies(),pending:index.hasPendingSemanticPreparation()});},error=>{if(attempts.length<16)attempts.push({error:String(error)});});return result;};
    index.adoptStartupSources=wrapper;
    app.metadataCache.getFileCache=function(owner){return withheld&&owner===file?null:originalCache.call(this,owner);};
    withheld=true;
    p.initialIndexComplete=false;p.initialSourceIndexIncomplete=false;p.initialIndexTask=null;
    await app.vault.modify(file,'Status:: recovered\n[Recovery](https://example.com/kplex-206-recovery)');
    await p.finishStartupIndexPreparation();
    check(!p.initialIndexComplete&&p.initialSourceIndexIncomplete,'Missing host metadata must remain incomplete');
    check(totalAttempts===1&&attempts[0].value===false,'One actual failed adoption required');
    check(source.getCounters().pendingMetadata>0,'Actual source owner must observe the missing prerequisite');
    check(index.size>0&&!!document.querySelector('.kplex-app'),'Recovery must preserve early presentation');
    c.progress={phase:'metadata-recovery',attempts};
    withheld=false;restoreCache();
    check(!!originalCache.call(app.metadataCache,file),'Genuine native metadata prerequisite unavailable');
    app.metadataCache.trigger('changed',file);
    await until(()=>p.initialIndexComplete,'Recovered source did not automatically complete startup');
    await until(()=>!p.initialSourceRecoveryTask&&!index.hasPendingSemanticPreparation(),'Recovery owner did not release');
    check(attempts.length>=2&&attempts.at(-1).value===true,'Actual recovered adoption required');
    const settledAttempts=totalAttempts;await wait(500);
    check(totalAttempts===settledAttempts&&settledAttempts<=4,'Recovery must be bounded after unchanged readiness');
    check(index.getSourceRepositoryDiagnostics().unsaved===0,'Recovery must not leave a masked source');
    const fullAfter=index.getSemanticPreparationDiagnostics().fullBuilds;
    check(fullAfter===fullBefore,'Recovery cannot force full building');
    return {cases:['actual metadata-unavailable adoption fails','published native scene survives','genuine metadata recovery automatically adopts','unchanged settled state stays bounded','no full build or unsaved mask'],attempts,totalAttempts,fullBefore,fullAfter,
      limitation:'Initial coordinator flags were reopened on a settled source-backed native index; fresh-process startup route is measured separately.'};
  } finally {
    withheld=false;restoreCache();
    if(index.adoptStartupSources===wrapper){if(adoptDescriptor)Object.defineProperty(index,'adoptStartupSources',adoptDescriptor);else delete index.adoptStartupSources;}
    if(file&&app.vault.getFileByPath(path)===file)await app.vault.delete(file);
    await index.flushSourceRepository();
    await app.plugins.disablePlugin('k-plex');
    await app.vault.adapter.write(c.configRelative+'/plugins/k-plex/data.json',c.originalData);
    await app.plugins.enablePlugin('k-plex');
  }
}

if(process.env.KPLEX_TEST_VAULT_NAME!=='kplex-test-small')throw Error('Explicit disposable Small required');
const target=validateTarget({vaultName:process.env.KPLEX_TEST_VAULT_NAME,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
await runControlledProbe('startup-source-recovery-206',scenario,
 'c.vaultPath='+JSON.stringify(target.vault)+';c.configRelative='+JSON.stringify(relative(target.vault,target.config).replaceAll('\\','/'))+';c.originalData='+JSON.stringify(readFileSync(join(target.pluginDir,'data.json'),'utf8'))+';',
 ['src/main.ts','src/adapters/obsidian/sourceAcquisition.ts']);
