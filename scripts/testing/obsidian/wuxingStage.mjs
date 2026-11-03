/** Stage only three built artifacts in the explicitly authorized disposable Small. This is a
 * hash-checked native-test handoff, never a build/verification receipt or personal-vault installer. */
import assert from 'node:assert/strict';
import {copyFileSync,readFileSync,existsSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {validateTarget} from './runner.mjs';
import {obsidianCliExecutable,spawnNativeSync} from './processTools.mjs';
assert.equal(process.env.KPLEX_TEST_VAULT_NAME,'kplex-test-small');
const target=validateTarget({vaultName:process.env.KPLEX_TEST_VAULT_NAME,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
const source=resolve(process.argv[2]??'dist'),backup=process.argv[3];
assert(backup&&existsSync(join(backup,'baseline.json')),'Original private resource backup required');
const cli=(command,...args)=>{const result=spawnNativeSync(obsidianCliExecutable(),['vault=kplex-test-small',command,...args],{encoding:'utf8',timeout:15000,killSignal:'SIGKILL',maxBuffer:2*1024*1024});if(result.error||result.status!==0||/^Error:/m.test(result.stdout))throw Error(result.error?.message||result.stderr||result.stdout);return result.stdout.trim()};
const hash=path=>createHash('sha256').update(readFileSync(path)).digest('hex');
assert.equal(resolve(cli('vault','info=path').replace(/^path\s+/,'')),target.vault);
assert(!cli('eval','code=JSON.stringify({controller:!!window.kplexIndexingProbe})').includes('"controller":true'),'Finish previous native controller first');
const names=['main.js','manifest.json','styles.css'],hashes=Object.fromEntries(names.map(name=>[name,hash(join(source,name))]));
const enabledPath=join(target.config,'community-plugins.json'),originalEnabled=JSON.parse(readFileSync(enabledPath,'utf8'));
assert(Array.isArray(originalEnabled)&&originalEnabled.every(id=>typeof id==='string'),'Native enablement list required');
/** CLI completion can precede the native enablement-file write. Observe each actual transition
 * before the next stage or probe snapshot; do not waive the probe's byte-preservation assertion. */
async function enabledState(expected){
 const end=Date.now()+20000,targetState=JSON.stringify([...expected].sort());
 while(true){const value=JSON.parse(readFileSync(enabledPath,'utf8'));if(Array.isArray(value)&&JSON.stringify([...value].sort())===targetState)return;
  assert(Date.now()<end,'Native enablement write did not settle');await new Promise(resolve=>setTimeout(resolve,100))}
}
// Enablement-file writes are host tasks too. Foreground the explicitly owned Small before
// disable, rather than waiting until after a minimized window's throttled write must settle.
cli('eval','code=(()=>{const win=require("@electron/remote").getCurrentWindow();win.restore();win.show();win.focus();win.webContents.focus();return JSON.stringify({foreground:true})})()');
cli('plugin:disable','id=k-plex');
// The host can retire an enabled plugin without immediately rewriting its persisted list.
// Actual unload is the authority for safe artifact replacement; the final enablement-file
// and probe byte-preservation checks below remain required.
const retired=cli('eval','code=JSON.stringify({loaded:!!app.plugins.plugins["k-plex"],enabled:app.plugins.enabledPlugins.has("k-plex")})');
assert(retired.includes('"loaded":false')&&retired.includes('"enabled":false'),'Native plugin must be fully retired before replacing artifacts');
for(const name of names){copyFileSync(join(source,name),join(target.pluginDir,name));assert.equal(hash(join(target.pluginDir,name)),hashes[name])}
// A public Help snapshot uses its own accepted ontology/appearance. Only this explicit
// disposable lane stages those settings while the native plugin is fully retired.
if(process.env.KPLEX_WUXING_NATIVE_LANE==='help-vault'){
 const help=JSON.parse(readFileSync(process.env.KPLEX_HELP_DEMO_PAYLOAD,'utf8'));
 assert(help.repository==='zsviczian/kplex-help'&&/^[a-f0-9]{40}$/.test(help.commit)&&help.settings&&typeof help.settings==='object','Frozen public Help settings required');
 writeFileSync(join(target.pluginDir,'data.json'),JSON.stringify(help.settings,null,2)+'\n');
}
cli('plugin:enable','id=k-plex');
await enabledState([...new Set([...originalEnabled,'k-plex'])]);
// Enablement-file completion does not establish completion of native settings/lifecycle setup.
// Foreground the owned test window before waiting; do not await global source/index completion.
cli('eval','code=(()=>{const win=require("@electron/remote").getCurrentWindow();win.restore();win.show();win.focus();win.webContents.focus();return JSON.stringify({foreground:true})})()');
const readyEnd=Date.now()+30000;let lifecycleReady=false;
while(Date.now()<readyEnd){
 const value=cli('eval','code=JSON.stringify({ready:!!app.plugins.plugins["k-plex"]?.layoutReady&&!app.plugins.plugins["k-plex"]?.isStartupInitializing()})');
 if(value.includes('"ready":true')){lifecycleReady=true;break;}
 await new Promise(resolve=>setTimeout(resolve,100));
}
assert(lifecycleReady,'Native plugin settings/lifecycle did not settle');
console.log(JSON.stringify({staged:true,hashes,enablementWriteSettled:true,lifecycleReady,verificationClaim:false}));
