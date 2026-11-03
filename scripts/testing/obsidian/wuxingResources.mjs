/** Transactional outer backup/restore for disposable Wu Xing native acceptance. Private configuration/content inventory stays in the explicitly supplied temporary report directory, outside Git; only owned artifacts/configuration are restored. */
import assert from 'node:assert/strict';
import {existsSync,mkdirSync,readFileSync,writeFileSync,readdirSync,rmSync} from 'node:fs';
import {join,resolve,relative,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
import {validateTarget} from './runner.mjs';
import {obsidianCliExecutable,spawnNativeSync} from './processTools.mjs';

const name=process.env.KPLEX_TEST_VAULT_NAME;
assert.equal(name,'kplex-test-small','Explicit Small required');
const target=validateTarget({vaultName:name,vaultPath:process.env.KPLEX_TEST_VAULT_PATH,configDir:process.env.KPLEX_TEST_CONFIG_DIR});
const directory=process.argv[3];assert(directory&&isAbsolute(directory),'Explicit absolute private backup directory required');
assert(!resolve(directory).startsWith(resolve(target.vault))&&!resolve(directory).startsWith(resolve(process.cwd())),'Keep private backups outside vault/Git');
const names=['plugins/k-plex/main.js','plugins/k-plex/manifest.json','plugins/k-plex/styles.css','plugins/k-plex/data.json','workspace.json','community-plugins.json','appearance.json','app.json','types.json'];
/** Hash content without emitting note paths or payloads into shared logs. */
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
/** CLI calls always target the validated vault and retain existing console transport/process deadlines. */
function cli(command,...args){const r=spawnNativeSync(obsidianCliExecutable(),[`vault=${name}`,command,...args],{encoding:'utf8',timeout:15000,killSignal:'SIGKILL',maxBuffer:4*1024*1024});if(r.error||r.status!==0||/^Error:/m.test(r.stdout))throw r.error??new Error(r.stderr||r.stdout);return r.stdout.trim()}
/** Decode an explicit bounded maintenance result. No private result is printed. */
function evaluate(code){const raw=cli('eval',`code=${code}`);return JSON.parse(raw.slice(raw.indexOf('{')))}
/** Inventory only content outside the configuration tree; reject symlink traversal. */
function inventory(){const rows=[];function visit(path){for(const entry of readdirSync(path,{withFileTypes:true})){const absolute=join(path,entry.name);if(absolute===target.config)continue;assert(!entry.isSymbolicLink(),'No symlink fixture traversal');if(entry.isDirectory())visit(absolute);else if(entry.isFile())rows.push([relative(target.vault,absolute).replaceAll('\\','/'),hash(readFileSync(absolute))])}}visit(target.vault);return rows.sort((a,b)=>a[0].localeCompare(b[0]))}
assert.equal(resolve(cli('vault','info=path').replace(/^path\s+/,'')),target.vault,'CLI path mismatch before backup or restoration');
if(process.argv[2]==='capture-window'){
 const baseline=JSON.parse(readFileSync(join(directory,'baseline.json'),'utf8'));assert(!baseline.state.window,'Window state already captured');
 const state=evaluate('JSON.stringify((()=>{const win=require("@electron/remote").getCurrentWindow();return{bounds:win.getBounds(),maximized:win.isMaximized(),minimized:win.isMinimized()}})())');
 baseline.state.window=state;writeFileSync(join(directory,'baseline.json'),JSON.stringify(baseline));console.log(JSON.stringify({windowStateCaptured:true}));
}else if(process.argv[2]==='capture'){
 assert(!existsSync(directory),'Never overwrite an existing backup');mkdirSync(directory,{recursive:true});
 const state=evaluate('JSON.stringify({layout:app.workspace.getLayout(),enabled:!!app.plugins.plugins["k-plex"]})');
 const entries=names.map((name,index)=>{const path=join(target.config,name),exists=existsSync(path);if(exists)writeFileSync(join(directory,String(index)),readFileSync(path));return{name,index,exists}});
 const content=inventory();writeFileSync(join(directory,'baseline.json'),JSON.stringify({entries,state,content}));
 console.log(JSON.stringify({captured:true,configurationFiles:entries.filter(entry=>entry.exists).length,contentFiles:content.length,directory}));
}else if(process.argv[2]==='restore'){
 const baseline=JSON.parse(readFileSync(join(directory,'baseline.json'),'utf8'));
 const active=evaluate('JSON.stringify({controller:!!window.kplexIndexingProbe,enabled:!!app.plugins.plugins["k-plex"]})');assert.equal(active.controller,false,'Native controller must finish cleanup before outer restoration');
 if(active.enabled)cli('plugin:disable','id=k-plex');
 for(const entry of baseline.entries){const path=join(target.config,entry.name);assert(names.includes(entry.name),'Unrecognized restore path');if(entry.exists)writeFileSync(path,readFileSync(join(directory,String(entry.index))));else if(existsSync(path))rmSync(path)}
 if(baseline.state.enabled)cli('plugin:enable','id=k-plex');
 evaluate(`(()=>{if(window.kplexWuXingRestore)throw Error('Existing restoration');const c=window.kplexWuXingRestore={done:false};app.workspace.changeLayout(${JSON.stringify(baseline.state.layout)}).then(()=>c.done=true,error=>{c.error=String(error);c.done=true});return JSON.stringify({started:true})})()`);
 const end=Date.now()+30000;let result;
 do{await new Promise(resolve=>setTimeout(resolve,250));result=evaluate('JSON.stringify({done:window.kplexWuXingRestore?.done,error:window.kplexWuXingRestore?.error})')}while(!result.done&&Date.now()<end);
 assert(result.done&&!result.error,'Live layout restoration failed');evaluate('delete window.kplexWuXingRestore;JSON.stringify({clean:true})');
 if(baseline.state.window)evaluate(`(()=>{const state=${JSON.stringify(baseline.state.window)},win=require('@electron/remote').getCurrentWindow();win.restore();win.setBounds(state.bounds);if(state.maximized)win.maximize();if(state.minimized)win.minimize();return JSON.stringify({windowRestored:true})})()`);
 await new Promise(resolve=>setTimeout(resolve,1500));
 for(const entry of baseline.entries){const path=join(target.config,entry.name);if(entry.exists)writeFileSync(path,readFileSync(join(directory,String(entry.index))));else if(existsSync(path))rmSync(path)}
 await new Promise(resolve=>setTimeout(resolve,1500));
 for(const entry of baseline.entries){const path=join(target.config,entry.name);assert(entry.exists?readFileSync(path).equals(readFileSync(join(directory,String(entry.index)))):!existsSync(path),'Configuration restoration mismatch: '+entry.name)}
 assert.deepEqual(inventory(),baseline.content,'Content inventory changed');
 const receipt={restored:true,configurationFiles:baseline.entries.filter(entry=>entry.exists).length,contentFiles:baseline.content.length,contentDigest:hash(JSON.stringify(baseline.content)),completedAt:new Date().toISOString()};writeFileSync(join(directory,'restoration.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt));
}else throw Error('Choose capture, capture-window or restore');
