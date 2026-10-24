/** Device policy uses production portable owners; no host or index is needed to select it. */
import assert from 'node:assert/strict';
import test from 'node:test';
import {loadPortableModules} from './support/portableTypeScript.mjs';
const {exports:m}=loadPortableModules(['src/core/plex/startupIndexPreferences.ts']);
const expected={indexBeforeViewDesktop:true,indexBeforeViewTablet:false,indexBeforeViewMobile:false,
  indexingModeDesktop:'eager',indexingModeTablet:'on-demand',indexingModeMobile:'on-demand'};

test('fresh and upgrade device defaults validate each field without copying the retired global mode',()=>{
  assert.deepEqual(m.sanitizeStartupIndexPreferences({}),expected);
  for(const indexingMode of ['eager','on-demand'])assert.deepEqual(m.sanitizeStartupIndexPreferences({indexingMode}),expected);
  for(const key of Object.keys(expected))for(const value of [null,0,1,'false',[],{}])
    assert.equal(m.sanitizeStartupIndexPreferences({[key]:value})[key],expected[key]);
});

for(const [device,suffix,stored] of [['desktop','Desktop','desktop'],['tablet','Tablet','tablet'],['phone','Mobile','mobile']])
  for(const enabled of [false,true])for(const mode of ['eager','on-demand'])test(`${device}: admission=${enabled}, strategy=${mode} are captured once per session`,()=>{
    const key='indexBeforeView'+suffix,modeKey='indexingMode'+suffix,other=mode==='eager'?'on-demand':'eager';
    const prefs={indexBeforeViewDesktop:!enabled,indexBeforeViewTablet:!enabled,indexBeforeViewMobile:!enabled,
      indexingModeDesktop:other,indexingModeTablet:other,indexingModeMobile:other,[key]:enabled,[modeKey]:mode};
    assert.deepEqual(m.sanitizeStartupIndexPreferences(prefs),prefs,'Every explicit device value survives migration');
    const selected=m.startupIndexPolicy(prefs,device);prefs[key]=!enabled;prefs[modeKey]=other;
    assert.deepEqual(selected,{device:stored,beforeView:enabled,mode});
    assert.deepEqual(m.startupIndexPolicy(prefs,device),{device:stored,beforeView:!enabled,mode:other},'Only a new session reads saved changes');
  });
