import { describe, expect, it } from 'vitest';
import { initialState, reduceUpdate, resolveVersionCode, versionCodeFromMs, type Build } from './core';

const build: Build={version_code:4,version_name:'0.2.1',git_sha:'abc',sha256:'d'.repeat(64),bytes:2_000_000,built_ms:1,notes:'',newer:true};
describe('update logic',()=>{
 it('derives minute version codes and accepts explicit positive codes',()=>{const ms=Date.UTC(2026,0,1)+120_000;expect(versionCodeFromMs(ms)).toBe(2);expect(resolveVersionCode('9',ms)).toBe(9);expect(resolveVersionCode('0',ms)).toBe(2);});
 it('checks, gates recording, tracks download speed, cancels and installs',()=>{let s=reduceUpdate(initialState,{t:'check'});s=reduceUpdate(s,{t:'checked',build});s=reduceUpdate(s,{t:'start',recording:true,canInstall:true});expect(s.error).toBe('RECORDING');s=reduceUpdate({...s,phase:'available'},{t:'start',recording:false,canInstall:true});s=reduceUpdate(s,{t:'progress',bytes:1_000_000,totalBytes:2_000_000,atMs:1000});s=reduceUpdate(s,{t:'progress',bytes:2_000_000,totalBytes:2_000_000,atMs:2000});expect(s.speedBps).toBeGreaterThan(0);s=reduceUpdate(s,{t:'downloaded'});expect(s.phase).toBe('installing');});
 it('shows the unpaired state instead of leaving an update check idle',()=>{let s=reduceUpdate(initialState,{t:'check'});s=reduceUpdate(s,{t:'notPaired'});expect(s.phase).toBe('unpaired');expect(s.error).toBeNull();});
 it('exposes update check errors, including HTTP and timeout failures',()=>{for(const message of ['HTTP 503','TIMEOUT','NETWORK']){let s=reduceUpdate(initialState,{t:'check'});s=reduceUpdate(s,{t:'checkFailed',silent:false,message});expect(s.phase).toBe('error');expect(s.error).toBe(message);}});
});
