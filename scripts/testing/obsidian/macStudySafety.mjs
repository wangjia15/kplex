/**
 * Test-only identity and staging boundary for PR203. Refuses production, path aliases and shared
 * write targets before native work. Private receipts also refuse every Git ancestor. Reuses the
 * standard target validator; never enables plugins.
 */
import {createHash} from 'node:crypto';
import {lstatSync,readFileSync,realpathSync,readdirSync,writeFileSync,renameSync,unlinkSync,openSync,readSync,closeSync,existsSync} from 'node:fs';
import {basename,dirname,isAbsolute,join,relative,sep} from 'node:path';
import {validateTarget} from './runner.mjs';

export const STUDY_NAME='kplex-test-brain-mac';
export const PROTECTED_NAME="Zsolt's Brain (2025)";
export const ARTIFACTS=['main.js','manifest.json','styles.css'];

/** Derive the exact baseline database identity; never enumerate/delete by prefix. */
export function studyDatabaseName(name) {
  return 'k-plex-index-v1-'+Buffer.from(name,'utf8').toString('hex').slice(0,96);
}

/** Reject aliases at every existing path component, including an aliased ancestor. */
function rejectAliases(path) {
  if(!isAbsolute(path))throw Error('Absolute paths required');
  for(let current=path;;current=dirname(current)) {
    const stat=lstatSync(current);
    if(stat.isSymbolicLink())throw Error('Symlink refused');
    if(stat.isFile()&&stat.nlink!==1)throw Error('Shared hard-linked write target refused');
    if(current===dirname(current))break;
  }
}

/** Compare exact/ancestral paths in both directions, never just string prefixes. */
function nested(parent,child) {
  const value=relative(parent,child);
  return !value||(!isAbsolute(value)&&value!=='..'&&!value.startsWith('..'+sep));
}

/** Validate explicit live-copy coordinates and every installed plugin/config write target. */
export function validateStudyTarget({vaultName,vaultPath,configDir,productionPath,smoke=false}) {
  if(vaultName!==(smoke?'kplex-test-small':STUDY_NAME))throw Error('Explicit study/Small name required');
  if(!productionPath||basename(productionPath)!==PROTECTED_NAME)throw Error('Explicit protected production path required');
  for(const path of [vaultPath,configDir,productionPath])rejectAliases(path);
  const production=realpathSync(productionPath),target=validateTarget({vaultName,vaultPath,configDir});
  if(nested(production,target.vault)||nested(target.vault,production))throw Error('Production overlap refused');
  const pending=[target.config];
  while(pending.length) {
    const path=pending.pop();rejectAliases(path);
    if(lstatSync(path).isDirectory())for(const item of readdirSync(path))pending.push(join(path,item));
  }
  return {...target,production,vaultName,databaseName:studyDatabaseName(vaultName)};
}

/** Refuse cache operations unless live name, path and exact database all agree with the guard. */
export function assertLiveStudy(target,live,databaseName=target.databaseName) {
  if(live.name!==target.vaultName||live.path!==target.vault||databaseName!==studyDatabaseName(target.vaultName)
    ||databaseName===studyDatabaseName(PROTECTED_NAME))throw Error('Live vault/database identity refused');
}

/** Refuse Git metadata directories and worktree files anywhere above a private destination. */
function rejectGitAncestors(parent) {
  for(let current=parent;;current=dirname(current)) {
    if(existsSync(join(current,'.git')))throw Error('Private evidence inside Git refused');
    if(current===dirname(current))break;
  }
}

/** Keep raw evidence outside every Git checkout and both vaults, resolving the parent even before
 * a new file exists. Git worktrees have a metadata file rather than a directory; both are refused. */
export function validateStudyReceiptPath(target,project,file) {
  if(!isAbsolute(file))throw Error('Absolute checkpoint path required');
  rejectAliases(dirname(file));const parent=realpathSync(dirname(file));
  if(existsSync(file))rejectAliases(file);
  for(const root of [project,target.vault,target.production])if(nested(root,parent))throw Error('Private checkpoint must be outside source and vaults');
  rejectGitAncestors(parent);
}

/** Verify the retained complete stream before deletion. The receipt names a database, not a vault. */
export function verifyStudyCheckpoint(target,file) {
  rejectAliases(file);rejectAliases(file+'.json');
  const meta=JSON.parse(readFileSync(file+'.json','utf8'));
  if(meta.format!==2||meta.name!==target.databaseName||meta.path!==target.vault)throw Error('Reset backup belongs to another target');
  const fd=openSync(file,'r'),buffer=Buffer.alloc(1024*1024),hash=createHash('sha256');
  try{for(let bytes;(bytes=readSync(fd,buffer,0,buffer.length,null))>0;)hash.update(buffer.subarray(0,bytes));}
  finally{closeSync(fd);}
  if(hash.digest('hex')!==meta.fileSha256)throw Error('Reset backup digest mismatch');
  return meta;
}

/** Hash bytes outside timed intervals, including manifests and style artifacts. */
export function artifactHashes(directory) {
  if(JSON.parse(readFileSync(join(directory,'manifest.json'),'utf8')).id!=='k-plex')throw Error('Wrong plugin manifest');
  return Object.fromEntries(ARTIFACTS.map(/** Hash one fixed installable artifact. */ name=>[name,createHash('sha256').update(readFileSync(join(directory,name))).digest('hex')]));
}

/** Stage complete verified siblings, then atomically replace each artifact while the plugin is off. */
export function stageStudyArtifacts(target,directory,{loaded,storageBusy}) {
  if(loaded||storageBusy)throw Error('Staging requires stopped plugin and storage tooling');
  const expected=artifactHashes(directory),pending=[];
  try {
    for(const name of ARTIFACTS) {
      const dest=join(target.pluginDir,name);rejectAliases(dest);
      const temporary=dest+'.pr203-stage';
      writeFileSync(temporary,readFileSync(join(directory,name)),{flag:'wx',mode:0o600});pending.push(temporary);
      if(createHash('sha256').update(readFileSync(temporary)).digest('hex')!==expected[name])throw Error('Staged hash mismatch');
    }
    for(const name of ARTIFACTS)renameSync(join(target.pluginDir,name)+'.pr203-stage',join(target.pluginDir,name));
    if(JSON.stringify(artifactHashes(target.pluginDir))!==JSON.stringify(expected))throw Error('Installed hash mismatch');
    return expected;
  } finally {
    for(const path of pending)try{unlinkSync(path);}catch(error){if(error.code!=='ENOENT')throw error;}
  }
}

/** Enforce observation-before-enable without mutating production scheduling or timing policy. */
export async function enableObserved({arm,enable,cleanup}) {
  let armed=false;
  try {armed=true;await arm();return await enable();}
  catch(error){if(armed)await cleanup();throw error;}
}
