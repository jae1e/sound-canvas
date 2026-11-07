import Constants from 'expo-constants';
import { AppState } from 'react-native';
import { create } from 'zustand';
import VcUpdate from '../../modules/vc-update/src/VcUpdateModule';
import { initialState, reduceUpdate, checkDue, type Event } from './core';
import { getPairing } from './pairing';

type Updater = typeof initialState & { versionName:string;versionCode:number;gitSha:string;lastCheckMs:number|null };
export const useUpdater = create<Updater>(()=>({...initialState,versionName:'',versionCode:0,gitSha:String(Constants.expoConfig?.extra?.gitSha??'dev'),lastCheckMs:null}));
let takeRecording=false;
export function setUpdateRecording(recording:boolean){takeRecording=recording;}
const send=(e:Event)=>useUpdater.setState(s=>({...reduceUpdate(s,e)}));
export async function checkForUpdate(silent=false){const c=await getPairing();if(!c?.token)return;send({t:'check'});if(useUpdater.getState().phase!=='checking')return;const ctl=new AbortController();const timer=setTimeout(()=>ctl.abort(),8000);try{const r=await fetch(`${c.url.replace(/\/+$/,'')}/v1/app/latest?version_code=${useUpdater.getState().versionCode}`,{headers:{Authorization:`Bearer ${c.token}`},signal:ctl.signal});const build=r.status===404?null:r.ok?await r.json():(()=>{throw Error(`HTTP ${r.status}`)})();useUpdater.setState({lastCheckMs:Date.now()});send({t:'checked',build});}catch(e){send({t:'checkFailed',silent,message:(e as Error).message});}finally{clearTimeout(timer);}}
export function maybeAutoCheck(){const s=useUpdater.getState();if(checkDue(s.lastCheckMs,Date.now()))void checkForUpdate(true);}
export async function startUpdate(){const s=useUpdater.getState();const canInstall=await VcUpdate.canInstallPackages().catch(()=>false);send({t:'start',recording:takeRecording,canInstall});if(useUpdater.getState().phase==='needsPermission'){await VcUpdate.openInstallPermissionSettings();return;}if(useUpdater.getState().phase!=='downloading'||!s.build)return;const c=await getPairing();if(!c?.token)return;const sub=VcUpdate.addListener('onDownload',e=>{if(e.id==='app-update'&&e.state==='running')send({t:'progress',bytes:e.bytes,totalBytes:e.totalBytes,atMs:Date.now()});});try{const path=await VcUpdate.downloadFile('app-update',`${c.url.replace(/\/+$/,'')}/v1/app/apk/${s.build.sha256}`,{Authorization:`Bearer ${c.token}`},`voice-coach-${s.build.version_code}.apk`,s.build.sha256);send({t:'downloaded'});await VcUpdate.installApk(path);}catch(e){if(useUpdater.getState().phase!=='available')send({t:'fail',message:(e as Error).message});}finally{sub.remove();}}
export async function cancelUpdate(){send({t:'cancel'});await VcUpdate.cancelDownload('app-update').catch(()=>undefined);await VcUpdate.cleanupUpdates(true).catch(()=>undefined);}
export function startUpdater(){void VcUpdate.cleanupUpdates(false).catch(()=>undefined);void VcUpdate.getAppInfo().then(i=>useUpdater.setState({versionName:i.versionName,versionCode:i.versionCode})).then(maybeAutoCheck).catch(()=>undefined);const sub=AppState.addEventListener('change',s=>{if(s==='active'){const u=useUpdater.getState();if(u.phase==='needsPermission')void VcUpdate.canInstallPackages().then(ok=>{if(ok){send({t:'permissionGranted'});void startUpdate();}});maybeAutoCheck();}});return()=>sub.remove();}
