/** Legacy Classic backdrop labels stay with its physical area interpretation. */
import type {Translator} from "../../../lang";
/** Shared chrome never assumes that every view has parent/child/lateral areas. */
export function ClassicAreaLabels({translate}: {translate: Translator}) { return <>
  <div className="kplex-zone-label zone-parent">{translate("app.zoneParents")}</div>
  <div className="kplex-zone-label zone-left">{translate("app.zoneFriendsPrevious")}</div>
  <div className="kplex-zone-label zone-right">{translate("app.zoneChallengersNext")}</div>
  <div className="kplex-zone-label zone-child">{translate("app.zoneChildren")}</div>
</>; }
