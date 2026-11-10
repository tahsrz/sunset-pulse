import {describe,expect,it} from 'vitest';
import {mapFailureDiagnostic} from '@/lib/explorer/mapDiagnostics';

describe('public map diagnostics',()=>{
  it('retains the underlying SDK error and redacts keys in request URLs',()=>{
    expect(mapFailureDiagnostic({error:new Error('Control failed at https://example.test/style?access_token=pk.fixture.key&key=private-value')}))
      .toEqual({message:'Control failed at https://example.test/style?access_token=[redacted]&key=[redacted]'});
  });
  it('omits event targets and bounds messages after redaction',()=>{
    expect(mapFailureDiagnostic({target:{accessToken:'private-value'}})).toEqual({message:'Map renderer or controls unavailable.'});
    expect(mapFailureDiagnostic(new Error('a'.repeat(500))).message).toHaveLength(300);
  });
});
