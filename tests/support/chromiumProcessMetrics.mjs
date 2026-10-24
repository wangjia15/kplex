/** Test-only process CPU snapshots through the owned browser root, never a global browser target. */
import { readFile } from 'node:fs/promises';
import { basename, dirname, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';

/** Resolve only this disposable harness root and close its short-lived metrics socket independently. */
export async function chromiumProcessSnapshot(browser) {
  const identity=browser.identity(),profile=resolve(identity.profile);
  if(!Number.isSafeInteger(identity.pid)||identity.pid<=0||!profile.startsWith(resolve(tmpdir())+sep)
    ||basename(profile)!=='profile'||!basename(dirname(profile)).startsWith('kplex-source-idb-'))throw Error('Unowned Chromium metrics target');
  const [port,path]=String(await readFile(profile+'/DevToolsActivePort','utf8')).trim().split(/\r?\n/);
  if(!/^[1-9][0-9]{0,4}$/.test(port)||Number(port)>65535||!/^\/devtools\/browser\/[a-zA-Z0-9-]+$/.test(path))throw Error('Invalid owned browser endpoint');
  const socket=new WebSocket(`ws://127.0.0.1:${port}${path}`);let timer;
  try{
    const result=await new Promise((resolve,reject)=>{
      timer=setTimeout(()=>reject(Error('Owned browser metrics deadline')),5000);
      socket.addEventListener('error',()=>reject(Error('Owned browser metrics socket failed')),{once:true});
      socket.addEventListener('open',()=>socket.send(JSON.stringify({id:1,method:'SystemInfo.getProcessInfo',params:{}})),{once:true});
      socket.addEventListener('message',event=>{let message;try{message=JSON.parse(event.data);}catch(error){reject(error);return;}if(message.id!==1)return;if(message.error)reject(Error(JSON.stringify(message.error)));else resolve(message.result);});
    });
    const processes=result.processInfo.map(item=>({id:item.id,type:item.type,cpuTime:item.cpuTime}));
    if(!processes.some(item=>Number(item.id)===identity.pid&&item.type==='browser'))throw Error('Browser metrics root PID mismatch');
    return {supported:true,rootPid:identity.pid,processes};
  }catch(error){return {supported:false,rootPid:identity.pid,error:String(error.stack??error)};}
  finally{clearTimeout(timer);socket.close();}
}
