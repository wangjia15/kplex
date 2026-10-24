/** Native input adapter for the existing ontology string matcher. The caller supplies eligible
 * physical fields and owns assignment; this adapter only renders bounded native suggestions. */
import {AbstractInputSuggest,type App} from 'obsidian';
import {fuzzyFilterStrings} from './FuzzySearchInput';
import {ontologyFieldDetail,ontologyFieldViews} from './features/ontologyPresentation';
import {normalizeFieldName} from '../core/contracts/fieldName';
import type {OntologyConfiguration} from '../core/contracts/ontologyConfiguration';
import type {Translator} from '../lang';

export class OntologyPartnerSuggest extends AbstractInputSuggest<string> {
  /** Attach one native input; no vault or graph inventory is acquired. */
  constructor(app:App,input:HTMLInputElement,private readonly fields:()=>readonly string[],private readonly choose:(field:string)=>void,private readonly configuration?:()=>OntologyConfiguration,private readonly translate?:Translator){super(app,input);this.limit=24;}
  /** Reuse the composer matcher against the current reciprocal-role eligibility projection. */
  protected getSuggestions(query:string):string[]{return fuzzyFilterStrings(this.fields(),query,this.limit);}
  /** Native rows use the owning document and physical field spelling. */
  renderSuggestion(field:string,element:HTMLElement):void {
    element.createDiv({text:field,cls:'suggestion-title'});
    if(this.configuration&&this.translate){const view=ontologyFieldViews(this.configuration()).find(/** Locate the selectable physical field without changing its identity. */ item=>item.key===normalizeFieldName(field));element.createDiv({text:ontologyFieldDetail(view,this.translate),cls:'suggestion-note'});}
  }
  /** Accept only a still-eligible native choice; closing cannot retarget another editor. */
  selectSuggestion(field:string):void {if(this.fields().includes(field)){this.setValue(field);this.choose(field);}this.close();}
}
