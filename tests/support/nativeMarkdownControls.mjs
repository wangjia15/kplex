/** Finite native Markdown API/lifecycle boundary for browser tests. It intentionally does not
 * parse or render Markdown: tests inject a controlled native completion, and real Obsidian owns
 * syntax/rendering acceptance in the exact-build disposable-vault lane. */
export const nativeMarkdownControls = `
export class Component {
 loaded=false;children=new Set();callbacks=[];
 constructor(){(window.testMarkdownComponents??=[]).push(this)}
 load(){if(this.loaded)return;this.loaded=true;for(const child of this.children)child.load()}
 unload(){if(!this.loaded)return;this.loaded=false;for(const child of this.children)child.unload();this.children.clear();for(const callback of this.callbacks.splice(0))callback()}
 addChild(child){this.children.add(child);if(this.loaded)child.load();return child}
 removeChild(child){this.children.delete(child);child.unload();return child}
 register(callback){this.callbacks.push(callback)}
 registerEvent(){}
 registerDomEvent(element,event,callback,options){element.addEventListener(event,callback,options);this.register(()=>element.removeEventListener(event,callback,options))}
}
export const MarkdownRenderer={render:async(app,source,element,path,component)=>{
 if(typeof window.testNativeMarkdownRender!=='function')throw Error('Finite native Markdown completion was not configured');
 await window.testNativeMarkdownRender(app,source,element,path,component);
}};
`;
