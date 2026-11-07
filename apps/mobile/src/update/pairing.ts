import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
export const DEFAULT_SERVER_URL='http://100.84.83.35:8787';
export async function getPairing(){const url=await SecureStore.getItemAsync('vc.serverUrl')??DEFAULT_SERVER_URL;const token=await SecureStore.getItemAsync('vc.serverToken');return {url,token};}
import { shapePairingRequest } from './pairingRequest';
export { shapePairingRequest } from './pairingRequest';
export async function enroll(url:string,code:string){const installId=await SecureStore.getItemAsync('vc.installId')??`${Date.now()}-${Math.random().toString(36).slice(2)}`;await SecureStore.setItemAsync('vc.installId',installId);const device={model:'Android device',manufacturer:'Unknown',os_version:`${Platform.OS} ${String(Platform.Version)}`,app_version:Constants.expoConfig?.version??'0.2.0',install_id:installId};const response=await fetch(`${url.replace(/\/+$/,'')}/v1/enroll`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(shapePairingRequest(code,device))});if(!response.ok)throw Error(`HTTP ${response.status}`);const result=await response.json();await SecureStore.setItemAsync('vc.serverUrl',url);await SecureStore.setItemAsync('vc.serverToken',result.token);return result;}
