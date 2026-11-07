import { beforeEach, describe, expect, it, vi } from 'vitest';
const spies=vi.hoisted(()=>({restore:vi.fn(),routine:vi.fn(),wire:vi.fn()}));
vi.mock('./instance',()=>({restoreWork:spies.restore}));
vi.mock('../routine/instance',()=>({wireRoutineController:spies.routine}));
vi.mock('../session/wire',()=>({wireModeSessions:spies.wire}));
import { restoreWorkSession } from './bootstrap';
describe('hidden mode bootstrap',()=>{beforeEach(()=>vi.clearAllMocks());it('does not restore or wire any session when hidden modes are off',()=>{restoreWorkSession(false);expect(spies.restore).not.toHaveBeenCalled();expect(spies.routine).not.toHaveBeenCalled();expect(spies.wire).not.toHaveBeenCalled();});it('restores controllers only when hidden modes are enabled',()=>{restoreWorkSession(true);expect(spies.restore).toHaveBeenCalledOnce();expect(spies.routine).toHaveBeenCalledOnce();expect(spies.wire).toHaveBeenCalledOnce();});});
