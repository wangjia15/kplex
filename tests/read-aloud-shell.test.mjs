/** Real Chromium DOM checks for the modeless reader; finite speaker/native-control boundaries do not claim audible host acceptance. */
import assert from "node:assert/strict";
import { build } from "esbuild";
import { readFileSync } from "node:fs";
import test from "node:test";
import { chromiumHarness } from "./support/browserTypeScript.mjs";
import { nativeColorControls, nativeDomHelpers } from "./support/nativeColorControls.mjs";

const controls = nativeColorControls.replace("export class ButtonComponent{}", `export class ButtonComponent {
 constructor(parent){this.buttonEl=parent.createEl('button',{attr:{type:'button'}})}
 setButtonText(value){this.buttonEl.textContent=value;return this}setIcon(value){this.buttonEl.dataset.icon=value;return this}
 setTooltip(value){this.buttonEl.setAttribute('aria-label',value);return this}setCta(){return this}
 setDisabled(value){this.buttonEl.disabled=value;return this}onClick(run){this.buttonEl.addEventListener('click',run);return this}
}`).replace("export const Platform={}", "export const Platform={isDesktop:true}");
const compiled = await build({ stdin: { contents: 'export * from "./src/ui/ReadAloudModal";export * from "./src/lang";', resolveDir: process.cwd() },
  bundle: true, write: false, format: "iife", globalName: "sourceModules", platform: "browser", plugins: [{ name: "native-reader-boundary", setup(b) {
    b.onResolve({ filter: /^obsidian$/ }, () => ({ path: "obsidian", namespace: "native" }));
    b.onLoad({ filter: /.*/, namespace: "native" }, () => ({ contents: controls }));
    b.onResolve({ filter: /\/edgeTts$/ }, () => ({ path: "edge", namespace: "speech" }));
    b.onLoad({ filter: /.*/, namespace: "speech" }, () => ({ contents: "export const synthesizeEdgeSpeech=(...args)=>window.synthesize(...args);" }));
  } }] });
const css = readFileSync("styles.css", "utf8");

/** Own one browser/profile per case, retaining the production DOM/drag/slider/session logic. */
async function scenario(code, viewport) {
  const host = await chromiumHarness(compiled.outputFiles[0].text);
  try {
    if (viewport) await host.command("Emulation.setDeviceMetricsOverride", { width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: false });
    await host.evaluate(`(()=>{${nativeDomHelpers}
      document.head.createEl('style',{text:${JSON.stringify(css)}});
      window.notices=[];window.calls=[];window.utterances=[];window.saves=[];
      const speech=new EventTarget();Object.assign(speech,{
        getVoices:()=>[{name:'Local voice',voiceURI:'local:voice',lang:'en-US'}],
        speak:u=>{calls.push(['speak',u.text,u.rate,u.voice?.voiceURI]);utterances.push(u);u.onstart?.()},
        cancel:()=>calls.push(['cancel']),pause:()=>calls.push(['pause']),resume:()=>calls.push(['resume'])});
      Object.defineProperty(window,'speechSynthesis',{configurable:true,value:speech});
      window.SpeechSynthesisUtterance=class {constructor(text){this.text=text}};
      window.synthesize=()=>{throw Error('Unrequested Edge network')};
      window.check=(value,message)=>{if(!value)throw Error(message)};
      window.turn=()=>new Promise(resolve=>setTimeout(resolve,0));
      window.reader=(text='First paragraph.\\n\\nSecond paragraph.\\n\\nThird paragraph.',engine='system')=>{
        const reader=new sourceModules.ReadAloudModal({},text,'Synthetic note',{readAloudEngine:engine,readAloudLanguage:'en-US'},'en',sourceModules.createTranslator('en'),()=>calls.push(['closed']),document,async next=>saves.push({...next}));reader.open();return reader};
      window.button=(m,label)=>[...m.modalEl.querySelectorAll('button')].find(el=>el.getAttribute('aria-label')===label);
      return true})()`);
    return await host.evaluate(code);
  } finally { await host.cleanup(); }
}

test("floating reader permits editor focus, navigates paragraphs and keeps replacement/paused speech fenced", async () => {
  assert.equal(await scenario(`(async()=>{
    const m=reader(),editor=document.body.createEl('textarea');editor.value='Editable note';editor.focus();editor.setSelectionRange(0,8);
    check(document.activeElement===editor&&editor.selectionEnd===8,'Modeless editor selection');
    check(calls.length===0&&m.contentEl.textContent.includes("device's speech service"),'Disclosure without playback');
    check(button(m,'Previous paragraph').disabled&&!button(m,'Next paragraph').disabled,'Initial paragraph boundaries');
    button(m,'Next paragraph').click();check(calls.length===0&&m.contentEl.textContent.includes('Second paragraph.'),'Idle seek sends nothing');
    button(m,'Play').click();await turn();check(utterances.at(-1).text==='Second paragraph.','Start selected paragraph');
    const old=utterances.at(-1);button(m,'Next paragraph').click();await turn();check(old.onend===null&&utterances.at(-1).text==='Third paragraph.','Replace cancels previous paragraph');
    check(button(m,'Next paragraph').disabled,'Last paragraph boundary');
    button(m,'Pause').click();button(m,'Previous paragraph').click();await turn();
    check(m.player.state==='paused'&&utterances.at(-1).text==='Third paragraph.','Paused navigation cannot start new utterance');
    button(m,'Resume').click();await turn();check(utterances.at(-1).text==='Second paragraph.','Resume selected paragraph');
    utterances.at(-1).onend();await turn();check(utterances.at(-1).text==='Third paragraph.','Natural paragraph advancement');
    button(m,'Stop').click();await turn();check(m.player.state==='idle','Stop idle');
    button(m,'Play').click();await turn();const play=button(m,'Play');m.close();m.close();play.click();await turn();
    check(!m.modalEl.isConnected&&calls.filter(x=>x[0]==='closed').length===1&&utterances.at(-1).onend===null,'Idempotent close and inert old controls');
    return true})()`), true);
});

test("shared drag moves and clamps the floating reader while controls do not start dragging", async () => {
  assert.equal(await scenario(`(()=>{
    const m=reader(),header=m.modalEl.querySelector('.kplex-read-aloud-header'),r=m.modalEl.getBoundingClientRect();
    header.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:7,button:0,clientX:r.x+20,clientY:r.y+10}));
    document.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,cancelable:true,pointerId:7,clientX:-1000,clientY:-1000}));
    document.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:7}));
    const moved=m.modalEl.getBoundingClientRect();check(m.modalEl.classList.contains('is-positioned')&&moved.x>=16&&moved.y>=16&&moved.x!==r.x,'Drag viewport clamp');
    const close=button(m,'Close');close.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:8,button:0}));
    document.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerId:8,clientX:100,clientY:100}));
    check(m.modalEl.getBoundingClientRect().x===moved.x,'Interactive header control excluded');
    m.close();return true})()`), true);
});

test("voice/rate controls preserve defaults on mount, save changes and retire their native listeners", async () => {
  assert.equal(await scenario(`(async()=>{
    const m=reader();button(m,'Voice and speed').click();check(saves.length===0,'Opening settings does not write defaults');
    const settings=m.modalEl.querySelector('.kplex-read-aloud-settings'),selects=settings.querySelectorAll('select'),range=settings.querySelector('input[type=range]');
    check(range.min==='0.5'&&range.max==='2'&&range.step==='0.05'&&settings.querySelector('output').textContent==='1.00×','Bounded visible rate');
    range.value='1.5';range.dispatchEvent(new Event('input',{bubbles:true}));await turn();
    selects[2].value='zh-CN-YunxiNeural';selects[2].dispatchEvent(new Event('change',{bubbles:true}));
    selects[3].value='local:voice';selects[3].dispatchEvent(new Event('change',{bubbles:true}));await turn();
    button(m,'Play').click();await turn();check(utterances.at(-1).rate===1.5&&utterances.at(-1).voice.voiceURI==='local:voice','Actual native utterance receives preferences');
    const old=utterances.at(-1);range.value='1.75';range.dispatchEvent(new Event('input',{bubbles:true}));await turn();
    check(old.onend===null&&utterances.at(-1).rate===1.75&&utterances.at(-1).text===old.text,'System speed restarts only the current paragraph');
    button(m,'Pause').click();const spoken=utterances.length;range.value='2';range.dispatchEvent(new Event('input',{bubbles:true}));await turn();
    check(m.player.state==='paused'&&utterances.length===spoken,'System speed change preserves pause');button(m,'Resume').click();await turn();check(utterances.at(-1).rate===2,'Resumed native speed');
    const count=saves.length;m.close();range.value='2';range.dispatchEvent(new Event('input'));selects[3].dispatchEvent(new Event('change'));speechSynthesis.dispatchEvent(new Event('voiceschanged'));await turn();
    check(saves.length===count,'Retired controls/listeners inert');return true})()`), true);
});

test("caller-owned document receives the floating reader and retires playback on its own pagehide", async () => {
  assert.equal(await scenario(`(async()=>{
    const frame=document.body.createEl('iframe'),owner=frame.contentDocument,view=frame.contentWindow;
    for(const name of ['createEl','createDiv','createSpan','setText','empty','addClass'])view.HTMLElement.prototype[name]=HTMLElement.prototype[name];
    const m=new sourceModules.ReadAloudModal({},'Owned document text','Synthetic',{readAloudEngine:'system',readAloudLanguage:'en-US'},'en',sourceModules.createTranslator('en'),undefined,owner);
    m.open();check(m.modalEl.ownerDocument===owner&&owner.body.contains(m.modalEl)&&!document.body.contains(m.modalEl),'Exact invoking document');
    button(m,'Play').click();await turn();view.dispatchEvent(new view.Event('pagehide'));await turn();
    check(!m.modalEl.isConnected&&utterances.at(-1).onend===null,'Owner retirement cancels main-window speech');frame.remove();return true})()`), true);
});

test("narrow viewport keeps expanded settings inside the draggable reader without horizontal page overflow", async () => {
  assert.equal(await scenario(`(()=>{
    const m=reader();button(m,'Voice and speed').click();const r=m.modalEl.getBoundingClientRect();
    check(r.left>=16&&r.right<=innerWidth-16&&r.top>=16&&r.bottom<=innerHeight-16,'Expanded narrow surface bounds');
    check(document.documentElement.scrollWidth<=innerWidth&&m.modalEl.scrollWidth<=m.modalEl.clientWidth,'No horizontal scroll');
    const header=m.modalEl.querySelector('.kplex-read-aloud-header');
    header.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:9,button:0,clientX:r.x+20,clientY:r.y+10}));
    document.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,cancelable:true,pointerId:9,clientX:r.x+40,clientY:r.y+50}));
    document.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerId:9}));
    const moved=m.modalEl.getBoundingClientRect();check(moved.right<=innerWidth-16&&moved.bottom<=innerHeight-16,'Dragged settings remain in viewport');m.close();return true})()`, { width: 375, height: 540 }), true);
});

test("Edge disclosure precedes requests and owning-window teardown cancels a reader", async () => {
  assert.equal(await scenario(`(async()=>{
    const m=reader('Private synthetic text','edge');check(m.contentEl.textContent.includes('sends this text to Microsoft Edge TTS')&&calls.length===0,'Remote disclosure precedes Play');m.close();
    const local=reader();button(local,'Play').click();await turn();button(local,'Voice and speed').click();
    let requests=0;window.synthesize=()=>{requests++;throw Error('Unexpected request')};
    const engine=local.modalEl.querySelector('select');engine.value='edge';engine.dispatchEvent(new Event('change',{bubbles:true}));await turn();
    check(requests===0&&local.player.state==='idle'&&local.contentEl.textContent.includes('sends this text to Microsoft Edge TTS'),'Engine switch waits for Play after disclosure');
    engine.value='system';engine.dispatchEvent(new Event('change',{bubbles:true}));button(local,'Play').click();await turn();window.dispatchEvent(new Event('pagehide'));await turn();
    check(!local.modalEl.isConnected&&local.contentEl.textContent===''&&utterances.at(-1).onend===null&&calls.some(x=>x[0]==='cancel'),'Page teardown stops owned speech and releases content');return true})()`), true);
});
