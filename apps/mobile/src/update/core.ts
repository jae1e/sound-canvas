export const VERSION_EPOCH_MS = Date.UTC(2026, 0, 1);
export function versionCodeFromMs(now: number): number { return Math.floor((now - VERSION_EPOCH_MS) / 60_000); }
export function resolveVersionCode(env: string | undefined, now: number): number { const n = Number(env); return Number.isInteger(n) && n > 0 ? n : versionCodeFromMs(now); }
export const CHECK_INTERVAL_MS = 3_600_000;
export function checkDue(last: number | null, now: number): boolean { return last === null || now - last >= CHECK_INTERVAL_MS || now < last; }
export type Build = { version_code: number; version_name: string; git_sha: string; sha256: string; bytes: number; built_ms: number; notes: string; newer: boolean };
export type Phase = 'idle'|'checking'|'upToDate'|'available'|'needsPermission'|'downloading'|'installing'|'error';
export type State = { phase: Phase; build: Build | null; bytes: number; totalBytes: number; speedBps: number; lastSampleMs: number|null; error: string|null };
export const initialState: State = { phase: 'idle', build: null, bytes: 0, totalBytes: 0, speedBps: 0, lastSampleMs: null, error: null };
export type Event = {t:'check'}|{t:'checked';build:Build|null}|{t:'checkFailed';silent:boolean;message:string}|{t:'start';recording:boolean;canInstall:boolean}|{t:'permissionGranted'}|{t:'progress';bytes:number;totalBytes:number;atMs:number}|{t:'downloaded'}|{t:'fail';message:string}|{t:'cancel'};
const busy: Phase[] = ['checking','downloading','installing'];
export function reduceUpdate(s: State, e: Event): State {
 switch(e.t) {
 case 'check': return busy.includes(s.phase)?s:{...s,phase:'checking',error:null};
 case 'checked': return s.phase!=='checking'?s:e.build?.newer?{...s,phase:'available',build:e.build}:{...s,phase:'upToDate',build:e.build};
 case 'checkFailed': return s.phase!=='checking'?s:e.silent?{...s,phase:s.build?.newer?'available':'idle'}:{...s,phase:'error',error:e.message};
 case 'start': if(!s.build?.newer||!['available','error','needsPermission'].includes(s.phase))return s; if(e.recording)return {...s,phase:'error',error:'RECORDING'}; return e.canInstall?{...s,phase:'downloading',error:null,bytes:0,totalBytes:s.build.bytes,speedBps:0,lastSampleMs:null}:{...s,phase:'needsPermission',error:null};
 case 'permissionGranted': return s.phase==='needsPermission'&&s.build?{...s,phase:'downloading',error:null,bytes:0,totalBytes:s.build.bytes,speedBps:0,lastSampleMs:null}:s;
 case 'progress': if(s.phase!=='downloading')return s; { const v=s.lastSampleMs!==null&&e.atMs>s.lastSampleMs&&e.bytes>=s.bytes?((e.bytes-s.bytes)*1000)/(e.atMs-s.lastSampleMs):0; return {...s,bytes:e.bytes,totalBytes:e.totalBytes||s.totalBytes,speedBps:v?(s.speedBps?s.speedBps*.7+v*.3:v):s.speedBps,lastSampleMs:e.atMs}; }
 case 'downloaded': return s.phase==='downloading'?{...s,phase:'installing'}:s;
 case 'fail': return {...s,phase:'error',error:e.message};
 case 'cancel': return ['downloading','needsPermission'].includes(s.phase)?{...s,phase:'available',error:null}:s;
 }
}
export const formatMb = (n:number) => (n/1_000_000).toFixed(1);
export const downloadPercent = (n:number,total:number) => total>0?Math.min(100,Math.floor(n/total*100)):0;
