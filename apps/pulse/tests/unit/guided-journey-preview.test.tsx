import {afterEach,expect,it,vi} from 'vitest';
import Preview from '@/app/seller-plan/preview/page';
import {isLightweightGlobalSurface,isMinimalChromeSurface} from '@/lib/navigation/focusedSurfaces';
vi.mock('next/navigation',()=>({notFound:()=>{throw new Error('NOT_FOUND');}}));
afterEach(()=>vi.unstubAllEnvs());
it('does not publish the prototype in production',()=>{
  vi.stubEnv('NODE_ENV','production');expect(()=>Preview()).toThrow('NOT_FOUND');
});
it('renders the local preview with focused chrome without changing the live seller route',()=>{
  vi.stubEnv('NODE_ENV','development');expect(Preview()).toBeTruthy();
  expect(isMinimalChromeSurface('/seller-plan/preview')).toBe(true);expect(isLightweightGlobalSurface('/seller-plan/preview')).toBe(true);
  expect(isMinimalChromeSurface('/seller-plan')).toBe(false);expect(isMinimalChromeSurface('/seller-plan/preview-other')).toBe(false);
});
