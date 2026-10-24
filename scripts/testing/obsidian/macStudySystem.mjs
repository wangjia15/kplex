/**
 * Read-only native system facts for the test harness. This self-contained function is serialized
 * into Obsidian and uses its existing Electron main-process bridge. It installs no listeners,
 * changes no policy and returns fixed labels only; unsupported reads never imply AC or unlocked.
 */
export function captureMacStudySystem(remote) {
  const result={powerSupported:false,onBattery:null,idleState:'unknown',thermalState:'unknown'};
  let monitor;
  try{monitor=remote.powerMonitor;}catch{return result;}
  try {
    const value=monitor?.isOnBatteryPower?.();
    if(typeof value==='boolean'){result.powerSupported=true;result.onBattery=value;}
  }catch{ /* Preserve unsupported power without substituting AC. */ }
  try {
    const value=monitor?.getSystemIdleState?.(10);
    if(['active','idle','locked','unknown'].includes(value))result.idleState=value;
  }catch{ /* Unknown cannot certify an unlocked session. */ }
  try {
    const value=monitor?.getCurrentThermalState?.();
    if(['unknown','nominal','fair','serious','critical'].includes(value))result.thermalState=value;
  }catch{ /* Thermal coverage is explicit context, not a reason to change host policy. */ }
  return result;
}
