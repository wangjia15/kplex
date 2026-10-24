/**
 * Self-contained native test storage controller. Exports/restores only one positively identified
 * disposable K-Plex database while its plugin is off. Private row streams preserve structured
 * values with V8 serialization; store schemas/counts/digests are verified outside measured work.
 * A blocked deletion remains owned and prevents activation until its actual terminal event.
 * The serialized controller independently rejects vault and Git evidence destinations.
 */
export function createMacStudyStorage(app,expected) {
  const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),v8=require('node:v8');
  let busy=false,closed=false;
  const production="Zsolt's Brain (2025)";
  /** Use the base structured serializer: DefaultSerializer rehomes typed views in its transport
   * buffer and can lose shared backing identity. No Node host objects are accepted from IDB. */
  function encodeValue(value) {
    const serializer=new v8.Serializer();serializer.writeHeader();serializer.writeValue(value);
    return serializer.releaseBuffer();
  }
  /** Preserve the already-retained format-2 seed's default transport; its value digest still owns
   * acceptance. New exports explicitly select native structured encoding with shared buffers. */
  function decodeValue(buffer,encoding='v8-structured') {
    if(encoding==='v8-default')return v8.deserialize(buffer);
    if(encoding!=='v8-structured')throw Error('Unsupported checkpoint encoding');
    const deserializer=new v8.Deserializer(buffer);deserializer.readHeader();return deserializer.readValue();
  }
  /** Hash a private stream with bounded memory, outside the measured indexing interval. */
  function fileDigest(file) {
    const fd=fs.openSync(file,'r'),buffer=Buffer.alloc(1024*1024),hash=crypto.createHash('sha256');
    try{for(let bytes;(bytes=fs.readSync(fd,buffer,0,buffer.length,null))>0;)hash.update(buffer.subarray(0,bytes));return hash.digest('hex');}
    finally{fs.closeSync(fd);}
  }
  /** Hash structured values rather than V8's noncanonical byte encoding. Preserve ordering,
   * typed bytes, holes and shared/cyclic references; unsupported storage values fail closed. */
  function valueDigest(value) {
    const seen=new Map();
    /** Produce a deterministic, explicitly typed representation of one native cloned value. */
    function encode(item) {
      if(item===null)return ['null'];
      const type=typeof item;
      if(type==='undefined')return ['undefined'];
      if(type==='number')return ['number',Object.is(item,-0)?'-0':String(item)];
      if(type==='bigint'||type==='string'||type==='boolean')return [type,String(item)];
      if(type!=='object')throw Error('Unsupported checkpoint value');
      if(seen.has(item))return ['reference',seen.get(item)];
      const identity=seen.size;seen.set(item,identity);
      const tag=Object.prototype.toString.call(item);
      if(tag==='[object Date]')return ['date',identity,item.getTime()];
      if(tag==='[object ArrayBuffer]')return ['buffer',identity,Buffer.from(item).toString('base64')];
      if(ArrayBuffer.isView(item))return ['view',identity,tag,item.byteOffset,item.byteLength,encode(item.buffer)];
      if(tag==='[object Map]')return ['map',identity,Array.from(item,/** Preserve insertion order and key/value reference identities. */ pair=>[encode(pair[0]),encode(pair[1])])];
      if(tag==='[object Set]')return ['set',identity,Array.from(item,encode)];
      if(tag==='[object Array]') {
        const entries=[];for(let n=0;n<item.length;n++)entries.push(n in item?encode(item[n]):['hole']);
        const extras=Object.keys(item).filter(/** Preserve non-index enumerable properties too. */ key=>String(Number(key))!==key||!Number.isSafeInteger(Number(key))||Number(key)<0||Number(key)>=item.length);
        return ['array',identity,entries,extras.map(/** Preserve original property order. */ key=>[key,encode(item[key])])];
      }
      if(tag!=='[object Object]')throw Error('Unsupported checkpoint object type');
      return ['object',identity,Object.keys(item).map(/** Property order remains part of the receipt. */ key=>[key,encode(item[key])])];
    }
    return crypto.createHash('sha256').update(JSON.stringify(encode(value))).digest('hex');
  }
  /** Reauthorize identity at each operation; no active plugin or wildcard/origin reset is allowed. */
  function guard() {
    const name=app.vault.getName(),root=app.vault.adapter.getBasePath();
    const db='k-plex-index-v1-'+Buffer.from(name,'utf8').toString('hex').slice(0,96);
    if(closed||busy||!['kplex-test-brain-mac','kplex-test-small'].includes(name)||name===production
      ||name!==expected.name||root!==expected.path||db!==expected.databaseName
      ||app.plugins.plugins['k-plex'])throw Error('Storage identity/lifetime refused');
    return db;
  }
  /** Enumerate without creating a database, including reused test-name state. */
  async function inspect() {
    const name=guard(),all=await indexedDB.databases();
    return {exists:all.some(/** Match only the exact guarded database. */ row=>row.name===name),
      version:all.find(/** Read the exact selected version only. */ row=>row.name===name)?.version??null};
  }
  /** Open an existing database only. Reject creation/upgrades and close timed-out late handles. */
  function open(name) {
    return new Promise(/** Own the open request and all late events. */ (resolve,reject)=>{
      let ended=false;
      const request=indexedDB.open(name),timer=window.setTimeout(/** Refuse late connection adoption. */ ()=>{
        ended=true;reject(Error('Existing database open timed out'));
      },10000);
      request.onupgradeneeded=/** Never manufacture an empty database as a checkpoint. */ ()=>request.transaction.abort();
      request.onsuccess=/** Adopt exactly one timely handle. */ ()=>{
        window.clearTimeout(timer);if(ended)request.result.close();else{ended=true;resolve(request.result);}
      };
      request.onerror=/** Preserve open failure without retrying another database. */ ()=>{
        window.clearTimeout(timer);if(!ended){ended=true;reject(request.error??Error('Database open failed'));}
      };
    });
  }
  /** Require private evidence outside both vaults and every Git ancestor. This controller is
   * serialized into Obsidian without module imports, so direct calls repeat the outer Git guard.
   * Never follow a symlink file or overwrite an export. */
  function receiptFile(file,writing=false) {
    if(!path.isAbsolute(file))throw Error('Absolute receipt path required');
    const parent=fs.realpathSync(path.dirname(file));
    for(const root of [expected.path,expected.production]) {
      const rel=path.relative(root,parent);
      if(!rel||(!path.isAbsolute(rel)&&rel!=='..'&&!rel.startsWith('..'+path.sep)))throw Error('Receipt inside vault refused');
    }
    for(let current=parent;;current=path.dirname(current)) {
      if(fs.existsSync(path.join(current,'.git')))throw Error('Private receipt inside Git refused');
      if(current===path.dirname(current))break;
    }
    if(fs.existsSync(file)) {
      const s=fs.lstatSync(file);
      if(writing||s.isSymbolicLink()||s.nlink!==1)throw Error('Receipt overwrite/alias refused');
    }
    return file;
  }
  /** Describe native stores/indexes without modifying schema. */
  function schema(db) {
    const names=Array.from(db.objectStoreNames),tx=db.transaction(names,'readonly');
    return {version:db.version,stores:names.map(/** Preserve store/index contracts. */ name=>{
      const store=tx.objectStore(name);
      if(store.autoIncrement)throw Error('Auto-increment generator checkpoints are unsupported');
      return {name,keyPath:store.keyPath,autoIncrement:store.autoIncrement,indexes:Array.from(store.indexNames).map(/** Preserve index key paths and uniqueness. */ name=>{
        const index=store.index(name);return {name,keyPath:index.keyPath,unique:index.unique,multiEntry:index.multiEntry};
      })};
    })};
  }
  /** Stream keys and complete values in native key order through one consistent readonly transaction. */
  function scan(db,fd=null) {
    return new Promise(/** Transaction completion, rather than cursor end, acknowledges the capture. */ (resolve,reject)=>{
      const names=Array.from(db.objectStoreNames),tx=db.transaction(names,'readonly'),rows={};
      for(const name of names) {
        const hash=crypto.createHash('sha256');let count=0;
        const request=tx.objectStore(name).openCursor();
        request.onsuccess=/** Write one bounded row and retain only its digest/count. */ ()=>{
          const cursor=request.result;
          if(!cursor){rows[name]={count,sha256:hash.digest('hex')};return;}
          try {
            hash.update(valueDigest([cursor.key,cursor.value])+'\n');count++;
            if(fd!==null) {
              const line=Buffer.from(JSON.stringify([name,encodeValue([cursor.key,cursor.value]).toString('base64')])+'\n');
              for(let offset=0;offset<line.length;) {
                const written=fs.writeSync(fd,line,offset,line.length-offset);
                if(written<=0)throw Error('Checkpoint stream write made no progress');offset+=written;
              }
            }
            cursor.continue();
          }catch(error){tx.abort();reject(error);}
        };
      }
      tx.oncomplete=/** Publish in schema order, independent of concurrent cursor completion order. */ ()=>resolve(Object.fromEntries(names.map(/** Select each completed digest deterministically. */ name=>[name,rows[name]])));
      tx.onabort=tx.onerror=/** Reject partial exports. */ ()=>reject(tx.error??Error('Checkpoint scan aborted'));
    });
  }
  /** Export a new private checkpoint, then independently rescan and compare every store digest. */
  async function checkpoint(file) {
    const name=guard();receiptFile(file,true);busy=true;let db,fd;
    try {
      db=await open(name);const layout=schema(db);
      fd=fs.openSync(file,'wx',0o600);
      const rows=await scan(db,fd);fs.closeSync(fd);fd=undefined;
      const verified=await scan(db);
      if(JSON.stringify(rows)!==JSON.stringify(verified)) {
        fs.writeFileSync(file+'.failed.json',JSON.stringify({rows,verified}),{flag:'wx',mode:0o600});
        throw Error('Checkpoint readback mismatch');
      }
      const metadata={format:2,encoding:'v8-structured',name,path:expected.path,layout,rows,fileSha256:fileDigest(file)};
      await verifyStream(file,metadata,metadata.encoding);
      metadata.decodedVerified=true;
      fs.writeFileSync(file+'.json',JSON.stringify(metadata),{flag:'wx',mode:0o600});
      return metadata;
    } finally {if(fd!==undefined)fs.closeSync(fd);db?.close();busy=false;}
  }
  /** Read at most one 64 MiB ASCII frame, including native snapshot chunks observed above
   * the original 32 MiB limit. Scan each input chunk once; never collect the whole database. */
  function lineReader(fd) {
    let rest='',offset=0,ended=false;const buffer=Buffer.alloc(65536),limit=64*1024*1024;
    return /** Consume one complete record synchronously inside the active transaction callback. */ ()=>{
      const parts=[];let length=0;
      while(true) {
        const index=rest.indexOf('\n',offset),end=index>=0?index:rest.length;
        length+=end-offset;
        if(length>limit)throw Error('Checkpoint row bound exceeded');
        if(end>offset)parts.push(rest.slice(offset,end));
        offset=end;
        if(index>=0){offset++;return parts.join('');}
        if(ended){if(length)throw Error('Truncated checkpoint');return null;}
        const bytes=fs.readSync(fd,buffer,0,buffer.length,null);
        rest=bytes?buffer.subarray(0,bytes).toString('utf8'):'';offset=0;
        if(!bytes)ended=true;
      }
    };
  }
  /** Verify decoded transport against the original native-value digests before clearing anything.
   * This also rejects legacy default encoding if it rehomes a stored typed-array backing buffer. */
  async function verifyStream(file,meta,encoding) {
    const fd=fs.openSync(file,'r'),next=lineReader(fd),rows={};
    let batchRows=0,batchBytes=0;
    for(const store of meta.layout.stores)rows[store.name]={count:0,hash:crypto.createHash('sha256')};
    try {
      for(let line;(line=next())!==null;) {
        const [store,payload]=JSON.parse(line),row=rows[store];
        if(!row)throw Error('Unknown checkpoint store');
        row.hash.update(valueDigest(decodeValue(Buffer.from(payload,'base64'),encoding))+'\n');row.count++;
        batchRows++;batchBytes+=line.length;
        if(batchRows>=512||batchBytes>=1024*1024) {
          batchRows=0;batchBytes=0;
          await new Promise(/** Yield only outside a live IDB transaction; busy ownership remains held. */ resolve=>window.setTimeout(resolve,0));
        }
      }
      const verified=Object.fromEntries(meta.layout.stores.map(/** Preserve the native schema's digest order. */ store=>[store.name,{count:rows[store.name].count,sha256:rows[store.name].hash.digest('hex')}]));
      if(JSON.stringify(verified)!==JSON.stringify(meta.rows))throw Error('Decoded checkpoint digest mismatch; no stores were cleared');
    } finally {fs.closeSync(fd);}
  }
  /** Restore a verified compatible checkpoint, preserving exact keys. Compare every store first;
   * only changed stores are replaced, together in one transaction, then all values are rescanned. */
  async function restore(file) {
    const name=guard();receiptFile(file);receiptFile(file+'.json');busy=true;let db,fd;
    try {
      const meta=JSON.parse(fs.readFileSync(file+'.json','utf8'));
      if(meta.format!==2||meta.name!==name||meta.path!==expected.path||meta.fileSha256!==fileDigest(file))throw Error('Checkpoint format/identity/digest mismatch');
      const encoding=meta.encoding??'v8-default';
      if(!['v8-default','v8-structured'].includes(encoding))throw Error('Unsupported checkpoint encoding');
      await verifyStream(file,meta,encoding);
      db=await open(name);
      if(JSON.stringify(schema(db))!==JSON.stringify(meta.layout))throw Error('Checkpoint schema mismatch');
      const before=await scan(db),dirty=new Set(Object.keys(meta.rows).filter(/** Reuse only stores whose entire key/value digest and count already match. */ store=>JSON.stringify(before[store])!==JSON.stringify(meta.rows[store])));
      if(!dirty.size)return {verified:true,rows:before,method:'verified-identical',importStats:{peakRequests:0,peakEncodedBytes:0,largestEncodedRow:0},changedStores:[]};
      fd=fs.openSync(file,'r');const next=lineReader(fd),importStats={peakRequests:0,peakEncodedBytes:0,largestEncodedRow:0};
      await new Promise(/** Keep clear and insertion in one atomic transaction. */ (resolve,reject)=>{
        const names=Array.from(db.objectStoreNames),tx=db.transaction(names,'readwrite');
        let remaining=dirty.size;
        let pending=0,pendingBytes=0,held=null,ended=false;
        /** Keep at most 64 requests / four MiB of encoded rows in flight. A single bounded
         * oversized row is admitted alone. This imports fixtures only, outside measured work. */
        function insert() {
          try {
            while(!ended&&pending<64) {
              const line=held??next();held=null;
              if(line===null){ended=true;return;}
              const bytes=Buffer.byteLength(line);
              importStats.largestEncodedRow=Math.max(importStats.largestEncodedRow,bytes);
              if(pending&&pendingBytes+bytes>4*1024*1024){held=line;return;}
              const [store,payload]=JSON.parse(line);
              if(!names.includes(store))throw Error('Unknown checkpoint store');
              if(!dirty.has(store))continue;
              const [key,value]=decodeValue(Buffer.from(payload,'base64'),encoding);
              const target=tx.objectStore(store),request=target.keyPath===null?target.put(value,key):target.put(value);
              pending++;pendingBytes+=bytes;
              importStats.peakRequests=Math.max(importStats.peakRequests,pending);
              importStats.peakEncodedBytes=Math.max(importStats.peakEncodedBytes,pendingBytes);
              request.onsuccess=/** Release one request's accounting, then refill the bounded window. */ ()=>{
                pending--;pendingBytes-=bytes;insert();
              };
            }
          }catch(error){tx.abort();reject(error);}
        }
        for(const name of dirty)tx.objectStore(name).clear().onsuccess=/** Start only after all changed-store clears were processed. */ ()=>{if(--remaining===0)insert();};
        tx.oncomplete=/** Commit is the only restoration success. */ ()=>resolve();
        tx.onabort=tx.onerror=/** No partial restored state is accepted. */ ()=>reject(tx.error??Error('Checkpoint restore aborted'));
      });
      fs.closeSync(fd);fd=undefined;
      const verified=await scan(db);
      if(JSON.stringify(verified)!==JSON.stringify(meta.rows))throw Error('Restored store digest mismatch');
      return {verified:true,rows:verified,method:'atomic-changed-stores',changedStores:Array.from(dirty),importStats};
    } finally {if(fd!==undefined)fs.closeSync(fd);db?.close();busy=false;}
  }
  /** Delete only this exact test database; a blocked request retains busy ownership until terminal. */
  async function reset() {
    const name=guard();busy=true;
    return new Promise(/** Never resolve a blocked request and allow a late destructive event. */ (resolve,reject)=>{
      const request=indexedDB.deleteDatabase(name);let blocked=false;
      request.onblocked=/** Expose blockage while keeping activation fenced. */ ()=>{blocked=true;};
      request.onsuccess=/** Release ownership only when deletion truly completed. */ ()=>{busy=false;resolve({deleted:true,blocked});};
      request.onerror=/** Failed deletion remains a failed setup, without a retry. */ ()=>{busy=false;reject(request.error??Error('Test database deletion failed'));};
    });
  }
  return {inspect,checkpoint,restore,reset,valueDigest,encodeValue,decodeValue,get busy(){return busy;},
    /** Close only an idle tool; a pending deletion must first reach its terminal event. */
    close(){if(busy)throw Error('Storage operation still owned');closed=true;}};
}
