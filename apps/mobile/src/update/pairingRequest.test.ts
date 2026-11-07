import { expect, it } from 'vitest';
import { shapePairingRequest } from './pairingRequest';
it('shapes pairing request with the fixed app package and normalized code',()=>{expect(shapePairingRequest(' ab12cd34 ',{model:'m',manufacturer:'x',os_version:'Android 1',app_version:'0.2.0',install_id:'id'})).toEqual({pairing_code:'AB12CD34',device:{model:'m',manufacturer:'x',os_version:'Android 1',app_version:'0.2.0',install_id:'id',app_package:'com.jae1e.voicelifecompanion'}});});
