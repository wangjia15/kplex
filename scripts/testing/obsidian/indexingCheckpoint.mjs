/**
 * Private, test-only offline IndexedDB checkpoint for identical PR201 measurement boundaries.
 * Inject this self-contained function with toString(). The caller must disable K-Plex first and
 * provide action, absolute owned TEMP path, databaseName and the explicit Small vaultPath.
 * Restore additionally requires the capture receipt's expectedSha256. No schema/database/vault
 * content is created or migrated. All stores, including durable facts, are restored atomically;
 * this is permitted only in the explicitly owned disposable Windows Small vault while offline.
 * V8 framing preserves supported clone values (Date/Map/Set/binary views), never JSON fact copies.
 * Format 2 hashes typed semantic graphs, because equal V8 values need not serialize identically.
 * Legacy format 1 is readable only with its expected raw file SHA: its original raw per-store
 * footer is authenticated and stable semantic digests are derived without rewriting the file.
 * Blob/File/host exotics, shared/resizable buffers, shared backing-store topology and autoIncrement
 * schemas fail closed. Nonenumerable data, built-in custom properties and nonzero RegExp lastIndex
 * are rejected because V8 can discard them. One distinct standalone binary view per record is
 * supported; V8 can introduce shared backing storage for multiple views. Receipts
 * contain only counts/digests/schema hash; the private file contains the raw schema/inventory/data.
 * Capture is exclusive and removes only its own incomplete file on failure. A failed post-commit
 * verification throws; it never reports rollback of an already committed restoration.
 */
export async function runIndexingCheckpoint(app, request) {
  const fs=require('node:fs'),paths=require('node:path'),os=require('node:os');
  const v8=require('node:v8'),crypto=require('node:crypto'),Buffer=require('node:buffer').Buffer;
  const MAX_FILE=512*1024*1024,MAX_FRAME=16*1024*1024,MAGIC=Buffer.from('KPX201C1');
  const action=request?.action,originalPath=request?.path,databaseName=request?.databaseName;
  const requestedVault=request?.vaultPath,expectedSha256=request?.expectedSha256;
  let db,fd,active,vaultRoot,invalid=false,created=false,complete=false;
  /** Reject cancellation, a changed vault or a re-enabled plugin before every storage boundary. */
  function guard() {
    if(invalid||request?.cancelled===true)throw Error('Checkpoint cancelled');
    if(app.vault.getName()!=='kplex-test-small'||app.plugins?.plugins?.['k-plex'])throw Error('Offline Small vault required');
  }
  /** Compare native Windows paths without treating case or separator spelling as different roots. */
  function normalized(value) { return paths.resolve(value).replace(/\\/g,'/').toLowerCase(); }
  /** Hash semantic clone data, not V8's representation-dependent string/reference wire choices. */
  function semanticDigest(value) { const hash=crypto.createHash('sha256');canonical(hash,value);return hash.digest('hex'); }
  /**
   * Append one bounded, self-delimiting typed graph to a hash. Object keys have canonical order;
   * Map/Set iteration and sparse array membership remain ordered data. References restart per
   * record and preserve object identity/cycles. Strings hash exact UTF-16 units, not lossy UTF-8.
   * Binary views hash their actual view type and visible bytes, independently of V8 buffer offsets.
   */
  function canonical(hash,value) {
    encoded(value);const refs=new WeakMap();let next=0;
    /** Emit an unambiguous grammar token containing only internal tags and numeric coordinates. */
    function token(text){hash.update(text,'ascii');}
    /** Stream exact UTF-16 code units with a length prefix and bounded temporary buffers. */
    function string(text){token('S'+text.length+':');for(let at=0;at<text.length;at+=4096)hash.update(Buffer.from(text.slice(at,at+4096),'utf16le'));token(';');}
    /** Preserve NaN, signed zero and infinities rather than JSON's numeric coercions. */
    function number(item){token('D'+(Number.isNaN(item)?'NaN':Object.is(item,-0)?'-0':String(item))+';');}
    /** Emit one graph node, including type tags for otherwise overlapping clone representations. */
    function visit(item){
      if(item===null){token('N;');return;}
      switch(typeof item){
        case'undefined':token('U;');return;
        case'boolean':token(item?'T;':'F;');return;
        case'number':number(item);return;
        case'bigint':token('I'+item.toString()+';');return;
        case'string':string(item);return;
      }
      if(refs.has(item)){token('R'+refs.get(item)+';');return;}
      const id=next++;refs.set(item,id);const tag=Object.prototype.toString.call(item);
      if(tag==='[object Date]'){token('Z'+id+'{');number(item.getTime());token('}');}
      else if(tag==='[object RegExp]'){token('G'+id+'{');string(item.source);string(item.flags);number(item.lastIndex);token('}');}
      else if(tag==='[object ArrayBuffer]'||ArrayBuffer.isView(item)){
        const bytes=tag==='[object ArrayBuffer]'?Buffer.from(item):Buffer.from(item.buffer,item.byteOffset,item.byteLength);
        token('B'+id+'{');string(tag);token(bytes.length+':');hash.update(bytes);token('}');
      }else if(tag==='[object Map]'){token('M'+id+':'+item.size+'{');for(const [key,entry]of item){visit(key);visit(entry);}token('}');}
      else if(tag==='[object Set]'){token('E'+id+':'+item.size+'{');for(const entry of item)visit(entry);token('}');}
      else{
        const array=Array.isArray(item),keys=Object.keys(item).sort();token((array?'A':'O')+id+':'+(array?item.length+':':'')+keys.length+'{');
        for(const key of keys){string(key);visit(Object.getOwnPropertyDescriptor(item,key).value);}token('}');
      }
    }
    visit(value);
  }
  /** Bound and reject clone types V8 could silently flatten or fail to preserve. */
  function encoded(value) {
    const seen=new WeakSet(),explicitBuffers=new WeakSet(),viewOwners=new WeakMap();let objects=0,estimate=0,views=0;
    /** Visit one graph, retaining only bounded temporary object identities, including cycles. */
    function visit(item) {
      if(typeof item==='string'){estimate+=item.length*2+16;}
      else if(item===null||['undefined','boolean','number','bigint'].includes(typeof item)){estimate+=16;}
      else {
        if(typeof item!=='object')throw Error('Unsupported checkpoint clone value');
        if(seen.has(item))return;seen.add(item);if(++objects>100000)throw Error('Checkpoint clone graph bound');
        const tag=Object.prototype.toString.call(item);estimate+=64;
        if(['[object Date]','[object RegExp]','[object Map]','[object Set]','[object ArrayBuffer]'].includes(tag)||ArrayBuffer.isView(item)){
          for(const key of Reflect.ownKeys(item)){
            if(tag==='[object RegExp]'&&key==='lastIndex')continue;
            if(ArrayBuffer.isView(item)&&typeof key==='string'&&Number.isInteger(Number(key))&&String(Number(key))===key&&Number(key)>=0&&Number(key)<item.length)continue;
            throw Error('Unsupported checkpoint built-in own property');
          }
          if(tag==='[object RegExp]'&&!Object.is(item.lastIndex,0))throw Error('Nonzero checkpoint RegExp lastIndex unsupported');
        }
        if(tag==='[object ArrayBuffer]'){
          if(viewOwners.has(item))throw Error('Shared checkpoint backing topology unsupported');explicitBuffers.add(item);
          if(item.resizable)throw Error('Resizable checkpoint buffer unsupported');estimate+=item.byteLength;
        }else if(ArrayBuffer.isView(item)){
          if(Object.prototype.toString.call(item.buffer)!=='[object ArrayBuffer]'||item.buffer.resizable)throw Error('Shared/resizable checkpoint view unsupported');
          if(explicitBuffers.has(item.buffer)||viewOwners.has(item.buffer))throw Error('Shared checkpoint backing topology unsupported');viewOwners.set(item.buffer,item);
          if(++views>1)throw Error('Multiple checkpoint binary views unsupported');
          estimate+=item.byteLength;
        }else if(tag==='[object Date]'||tag==='[object RegExp]'){
          if(tag==='[object RegExp]')estimate+=item.source.length*2;
        }else if(tag==='[object Map]'){for(const [key,entry]of item){visit(key);visit(entry);}}
        else if(tag==='[object Set]'){for(const entry of item)visit(entry);}
        else if(Array.isArray(item)||tag==='[object Object]'){
          const prototype=Object.getPrototypeOf(item);
          if(!Array.isArray(item)&&(!prototype||Object.getPrototypeOf(prototype)!==null
            ||Object.getOwnPropertyDescriptor(prototype,'constructor')?.value?.name!=='Object'))throw Error('Unsupported checkpoint object prototype');
          for(const key of Reflect.ownKeys(item)){
            if(typeof key!=='string')throw Error('Symbol checkpoint property unsupported');
            const descriptor=Object.getOwnPropertyDescriptor(item,key);
            if(!('value'in descriptor))throw Error('Accessor checkpoint property unsupported');
            if(!descriptor.enumerable&&!(Array.isArray(item)&&key==='length'))throw Error('Nonenumerable checkpoint property unsupported');
            estimate+=key.length*2;visit(descriptor.value);
          }
        }else throw Error('Unsupported checkpoint structured clone type');
      }
      if(estimate>MAX_FRAME)throw Error('Checkpoint frame estimate exceeds bound');
    }
    visit(value);const buffer=v8.serialize(value);
    if(buffer.length>MAX_FRAME)throw Error('Checkpoint frame exceeds bound');return buffer;
  }
  /** Read exact bytes at an explicit offset; truncated files never supply partial records. */
  function readAt(handle,length,position) {
    const buffer=Buffer.allocUnsafe(length);let offset=0;
    while(offset<length){const count=fs.readSync(handle,buffer,offset,length-offset,position+offset);if(!count)throw Error('Incomplete checkpoint file');offset+=count;}
    return buffer;
  }
  /** Hash the real current Vault-visible inventory without changing files or reading configuration. */
  function inventory() {
    guard();const files=[...app.vault.getFiles()].sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0),entries=[];
    let bytes=0;const buffer=Buffer.allocUnsafe(1024*1024);
    for(const file of files){
      const location=paths.resolve(vaultRoot,file.path),relative=paths.relative(vaultRoot,location);
      if(!relative||relative.startsWith('..')||paths.isAbsolute(relative)||normalized(fs.realpathSync(location))!==normalized(location))throw Error('Inventory path outside native vault');
      let handle;try{
        handle=fs.openSync(location,'r');const before=fs.fstatSync(handle);
        if(!before.isFile()||(bytes+=before.size)>MAX_FILE)throw Error('Checkpoint inventory bound/type');
        const hash=crypto.createHash('sha256');let count;
        while((count=fs.readSync(handle,buffer,0,buffer.length,null))>0)hash.update(buffer.subarray(0,count));
        const after=fs.fstatSync(handle);
        if(before.size!==after.size||before.mtimeMs!==after.mtimeMs||before.birthtimeMs!==after.birthtimeMs)throw Error('Inventory changed during read');
        entries.push({path:file.path,native:{size:file.stat.size,mtime:file.stat.mtime,ctime:file.stat.ctime},
          actual:{size:after.size,mtimeMs:after.mtimeMs,birthtimeMs:after.birthtimeMs},sha256:hash.digest('hex')});
      }finally{if(handle!==undefined)fs.closeSync(handle);}
    }
    return {entries,hash:semanticDigest(entries),files:entries.length,bytes};
  }
  /** Read every schema coordinate from the existing transaction; reject unpreservable generators. */
  function schema(transaction) {
    return {version:db.version,stores:[...db.objectStoreNames].sort().map(name=>{
      const store=transaction.objectStore(name);if(store.autoIncrement)throw Error('autoIncrement checkpoint unsupported');
      return {name,keyPath:store.keyPath,autoIncrement:store.autoIncrement,indexes:[...store.indexNames].sort().map(key=>{
        const index=store.index(key);return {name:key,keyPath:index.keyPath,unique:index.unique,multiEntry:index.multiEntry};
      })};
    })};
  }
  /** Run one bounded transaction; cancellation, version change and callback failures abort it. */
  function transaction(mode,work) {
    guard();return new Promise((resolve,reject)=>{
      const tx=db.transaction([...db.objectStoreNames],mode);active=tx;let failure;
      const timer=window.setTimeout(()=>fail(Error('Checkpoint transaction deadline')),180000);
      /** Abort before reporting any failed callback, preserving all-or-nothing restoration. */
      function fail(error){failure??=error;try{tx.abort();}catch{} }
      tx.oncomplete=()=>{window.clearTimeout(timer);active=null;failure?reject(failure):resolve();};
      tx.onabort=()=>{window.clearTimeout(timer);active=null;reject(failure??Error('Checkpoint transaction aborted'));};
      tx.onerror=()=>{failure??=Error('Checkpoint transaction request error');};
      try{work(tx,fail);}catch(error){fail(error);}
    });
  }
  /** Stream all primary-key ordered stores in one readonly transaction, with no async cursor gap. */
  async function scan(onRecord,expectedSchema) {
    const rows=[],hashes=[];
    await transaction('readonly',(tx,fail)=>{
      const current=schema(tx);if(expectedSchema&&semanticDigest(current)!==semanticDigest(expectedSchema))throw Error('Checkpoint schema changed');
      for(const store of current.stores){rows.push({count:0,sha256:null});hashes.push(crypto.createHash('sha256'));}
      /** Advance stores only from a cursor callback in the same still-active transaction. */
      function next(index){
        if(index===current.stores.length)return;
        const cursor=tx.objectStore(current.stores[index].name).openCursor();
        cursor.onerror=()=>fail(Error('Checkpoint cursor failed'));
        cursor.onsuccess=()=>{try{
          guard();const entry=cursor.result;if(!entry){next(index+1);return;}
          const pair=[entry.key,entry.value],payload=encoded(pair);canonical(hashes[index],pair);rows[index].count++;
          onRecord?.(index,payload);entry.continue();
        }catch(error){fail(error);}};
      }
      next(0);
    });
    for(let index=0;index<rows.length;index++)rows[index].sha256=hashes[index].digest('hex');return rows;
  }
  /** Open a bounded framed reader and hash the complete exact file bytes as they are consumed. */
  function reader(handle) {
    const size=fs.fstatSync(handle).size;
    if(size>MAX_FILE||size<MAGIC.length+9||!readAt(handle,MAGIC.length,0).equals(MAGIC))throw Error('Invalid checkpoint file');
    const hash=crypto.createHash('sha256').update(MAGIC);let position=MAGIC.length;
    return {
      /** Read one typed frame; no raw path or value escapes in the eventual receipt. */
      next(){
        guard();if(position+9>size)throw Error('Incomplete checkpoint frame');
        const header=readAt(handle,9,position),length=header.readUInt32LE(5);
        if(length>MAX_FRAME||position+9+length>size)throw Error('Checkpoint frame bound/truncation');
        const payload=readAt(handle,length,position+9);position+=9+length;hash.update(header);hash.update(payload);
        return {type:header[0],store:header.readUInt32LE(1),payload};
      },
      /** A footer must be terminal, with the originally bounded size still unchanged. */
      finish(){if(position!==size||fs.fstatSync(handle).size!==size)throw Error('Checkpoint trailing/changed data');return hash.digest('hex');},
    };
  }
  /** Preflight every frame and digest before any destructive transaction is admitted. */
  function inspectFile(handle) {
    const input=reader(handle),first=input.next();
    if(first.type!==1||first.store!==0)throw Error('Checkpoint header missing');
    const header=v8.deserialize(first.payload);encoded(header);
    if(![1,2].includes(header.format))throw Error('Checkpoint header format unsupported');
    const legacy=header.format===1,schemaHash=semanticDigest(header.schema),inventoryHash=semanticDigest(header.inventory);
    if(legacy&&!/^[a-f0-9]{64}$/.test(expectedSha256??''))throw Error('Legacy checkpoint requires authenticated raw SHA256');
    if(!legacy&&(header.schemaHash!==schemaHash||header.inventoryHash!==inventoryHash))throw Error('Checkpoint header invalid');
    if(!Array.isArray(header.schema.stores)||!header.schema.stores.length||header.schema.stores.length>64)throw Error('Checkpoint header store-count bound');
    const rows=header.schema.stores.map(()=>({count:0,sha256:null})),hashes=rows.map(()=>crypto.createHash('sha256'));
    const legacyHashes=legacy?rows.map(()=>crypto.createHash('sha256')):null;
    let store=0,previous;
    for(;;){
      const frame=input.next();
      if(frame.type===3){
        const footer=v8.deserialize(frame.payload);for(let n=0;n<rows.length;n++)rows[n].sha256=hashes[n].digest('hex');
        const storedRows=legacy?rows.map((row,n)=>({count:row.count,sha256:legacyHashes[n].digest('hex')})):rows;
        if(frame.store!==0||JSON.stringify(footer.rows)!==JSON.stringify(storedRows))throw Error('Checkpoint footer/digests invalid');
        const sha256=input.finish();if(expectedSha256&&sha256!==expectedSha256)throw Error('Checkpoint SHA256 mismatch');
        return {header,headerPayload:first.payload,schemaHash,inventoryHash,legacy,rows,sha256};
      }
      if(frame.type!==2||frame.store<store||frame.store>=rows.length)throw Error('Checkpoint record order invalid');
      const pair=v8.deserialize(frame.payload);if(!Array.isArray(pair)||pair.length!==2)throw Error('Checkpoint record invalid');encoded(pair);
      if(frame.store!==store){store=frame.store;previous=undefined;}
      if(previous!==undefined&&indexedDB.cmp(previous,pair[0])>=0)throw Error('Checkpoint keys not strictly ordered');
      previous=pair[0];canonical(hashes[store],pair);legacyHashes?.[store].update(frame.payload);rows[store].count++;
    }
  }
  try {
    guard();if(!['capture','restore','verify'].includes(action))throw Error('Unknown checkpoint action');
    if(require('node:process').platform!=='win32'||!paths.isAbsolute(requestedVault??'')
      ||normalized(requestedVault)!=='c:/obsidian/kplex-test-small')throw Error('Explicit native Small vault path required');
    vaultRoot=fs.realpathSync(app.vault.adapter.getBasePath());
    if(normalized(vaultRoot)!==normalized(requestedVault))throw Error('Native vault root mismatch');
    if(!paths.isAbsolute(originalPath??''))throw Error('Absolute private checkpoint path required');
    const parent=paths.dirname(originalPath),temp=fs.realpathSync(os.tmpdir()),relative=paths.relative(temp,parent);
    if(paths.dirname(relative)!=='.'||!/^kplex-pr201-resume[\w.-]*$/.test(relative)
      ||normalized(fs.realpathSync(parent))!==normalized(parent))throw Error('Existing owned TEMP checkpoint directory required');
    if(fs.existsSync(originalPath)&&fs.lstatSync(originalPath).isSymbolicLink())throw Error('Checkpoint symlink forbidden');
    const expectedName='k-plex-index-v1-'+Buffer.from('kplex-test-small','utf8').toString('hex');
    if(databaseName!==expectedName||typeof indexedDB.databases!=='function')throw Error('Existing Small database inventory required');
    const existing=(await indexedDB.databases()).find(item=>item.name===databaseName);
    if(!existing||!Number.isSafeInteger(existing.version)||existing.version<=0)throw Error('Checkpoint database absent');
    if(action==='restore'&&!/^[a-f0-9]{64}$/.test(expectedSha256??''))throw Error('Restore requires capture SHA256');
    db=await new Promise((resolve,reject)=>{
      let ended=false;const open=indexedDB.open(databaseName,existing.version);
      const timer=window.setTimeout(()=>{ended=true;reject(Error('Checkpoint database open deadline'));},20000);
      open.onupgradeneeded=()=>{invalid=true;open.transaction.abort();};
      open.onblocked=()=>{ended=true;window.clearTimeout(timer);reject(Error('Checkpoint database blocked'));};
      open.onerror=()=>{ended=true;window.clearTimeout(timer);reject(Error('Checkpoint database open failed'));};
      open.onsuccess=()=>{window.clearTimeout(timer);if(ended||invalid){open.result.close();if(!ended)reject(Error('Checkpoint upgrade refused'));}else{ended=true;resolve(open.result);}};
    });
    db.onversionchange=()=>{invalid=true;try{active?.abort();}catch{}db.close();};
    if(!db.objectStoreNames.length||db.objectStoreNames.length>64)throw Error('Checkpoint store-count bound');
    let currentSchema;
    await transaction('readonly',tx=>{currentSchema=schema(tx);});
    const currentInventory=inventory();let checkpoint;
    if(action==='capture'){
      fd=fs.openSync(originalPath,'wx',0o600);created=true;const hash=crypto.createHash('sha256');let bytes=0;
      /** Write complete bounded buffers synchronously while the readonly cursor remains active. */
      function write(buffer){
        if((bytes+=buffer.length)>MAX_FILE)throw Error('Checkpoint file exceeds bound');
        let offset=0;while(offset<buffer.length){const count=fs.writeSync(fd,buffer,offset,buffer.length-offset,null);if(!count)throw Error('Checkpoint file write incomplete');offset+=count;}hash.update(buffer);
      }
      /** Encode a frame header separately from its clone payload. */
      function frame(type,store,payload){if(payload.length>MAX_FRAME)throw Error('Checkpoint frame exceeds bound');const head=Buffer.alloc(9);head[0]=type;head.writeUInt32LE(store,1);head.writeUInt32LE(payload.length,5);write(head);write(payload);}
      const header={format:2,schema:currentSchema,schemaHash:semanticDigest(currentSchema),inventory:currentInventory.entries,inventoryHash:currentInventory.hash};
      write(MAGIC);frame(1,0,encoded(header));const rows=await scan((store,payload)=>frame(2,store,payload),currentSchema);
      if(inventory().hash!==currentInventory.hash)throw Error('Inventory changed during capture');
      frame(3,0,encoded({rows}));fs.fsyncSync(fd);checkpoint={header,schemaHash:header.schemaHash,inventoryHash:header.inventoryHash,legacy:false,rows,sha256:hash.digest('hex')};
    }else{
      fd=fs.openSync(originalPath,'r');if(!fs.fstatSync(fd).isFile())throw Error('Checkpoint must be a file');checkpoint=inspectFile(fd);
      if(checkpoint.schemaHash!==semanticDigest(currentSchema)||checkpoint.inventoryHash!==currentInventory.hash)throw Error('Checkpoint schema/inventory mismatch');
      if(action==='restore')await transaction('readwrite',(tx,fail)=>{
        const input=reader(fd),first=input.next();if(first.type!==1||!first.payload.equals(checkpoint.headerPayload))throw Error('Checkpoint header changed');
        let pending=0,pendingBytes=0,held,ended=false,clears=currentSchema.stores.length;
        /** Fill a bounded writer pipeline only from active request-success callbacks, never await. */
        function pump(){try{
          guard();while(!ended&&pending<256){
            const next=held??input.next();held=undefined;
            if(next.type===3){
              if(input.finish()!==checkpoint.sha256)throw Error('Checkpoint changed during restore');ended=true;break;
            }
            if(next.type!==2||next.store>=currentSchema.stores.length)throw Error('Checkpoint restore frame invalid');
            if(pending&&pendingBytes+next.payload.length>MAX_FRAME){held=next;break;}
            const [key,value]=v8.deserialize(next.payload),store=tx.objectStore(currentSchema.stores[next.store].name),bytes=next.payload.length;
            const put=store.keyPath===null?store.put(value,key):store.put(value);pending++;pendingBytes+=bytes;
            put.onerror=()=>fail(Error('Checkpoint restore request failed'));
            put.onsuccess=()=>{try{if(indexedDB.cmp(put.result,key)!==0)throw Error('Checkpoint inline key changed');put.onsuccess=null;put.onerror=null;pending--;pendingBytes-=bytes;pump();}catch(error){fail(error);}};
          }
        }catch(error){fail(error);}}
        for(const store of currentSchema.stores){const clear=tx.objectStore(store.name).clear();clear.onerror=()=>fail(Error('Checkpoint clear failed'));clear.onsuccess=()=>{if(--clears===0)pump();};}
      });
      const rows=await scan(undefined,currentSchema);
      if(JSON.stringify(rows)!==JSON.stringify(checkpoint.rows))throw Error('Checkpoint database digest verification failed');
      if(inventory().hash!==checkpoint.inventoryHash)throw Error('Checkpoint inventory verification failed');
    }
    guard();complete=true;
    return {action,sha256:checkpoint.sha256,schemaHash:checkpoint.schemaHash,inventoryHash:checkpoint.inventoryHash,legacyAuthenticated:checkpoint.legacy,
      inventoryFiles:currentInventory.files,inventoryBytes:currentInventory.bytes,version:currentSchema.version,
      stores:checkpoint.rows.map((row,index)=>({ordinal:index,count:row.count,sha256:row.sha256})),
      totalRecords:checkpoint.rows.reduce((sum,row)=>sum+row.count,0),fileBytes:fs.fstatSync(fd).size,
      limits:{fileBytes:MAX_FILE,frameBytes:MAX_FRAME,pendingRequests:256,pendingPayloadBytes:MAX_FRAME},
      semantics:'Private offline Small checkpoint; all stores verified. No source authority granted. Inventory excludes configuration. Post-commit verification failure does not undo a committed restore.'};
  }finally{
    try{if(active)active.abort();}catch{}
    try{db?.close();}finally{try{if(fd!==undefined)fs.closeSync(fd);}finally{if(created&&!complete)fs.unlinkSync(originalPath);}}
  }
}
