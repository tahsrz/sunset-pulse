import {afterEach,expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import Preview from '@/app/seller-plan/preview/page';
import Start from '@/app/seller-plan/start/page';
import {isLightweightGlobalSurface,isMinimalChromeSurface} from '@/lib/navigation/focusedSurfaces';
vi.mock('next/navigation',()=>({notFound:()=>{throw new Error('NOT_FOUND');}}));
vi.mock('server-only',()=>({}));
afterEach(()=>vi.unstubAllEnvs());
it('does not publish the prototype in production',()=>{
  vi.stubEnv('NODE_ENV','production');expect(()=>Preview()).toThrow('NOT_FOUND');
});
it('gates the guided entry and passes only sanitized attribution to the form',async()=>{
  vi.stubEnv('SELLER_GUIDED_INTAKE_ENABLED',undefined);
  const searchParams=Promise.resolve({utm_source:'local',utm_content:'name@example.test',requestKind:'pricing_review'});
  await expect(Start({searchParams})).rejects.toThrow('NOT_FOUND');
  vi.stubEnv('SELLER_GUIDED_INTAKE_ENABLED','true');
  const page=await Start({searchParams});
  expect(page.props).toEqual({campaign:{source:'local'},pricingReview:true});
  const markup=new DOMParser().parseFromString(renderToStaticMarkup(page),'text/html');
  expect(markup.querySelectorAll('fieldset[disabled] input[type="radio"]')).toHaveLength(2);
  expect(markup.querySelector('button[type="submit"][disabled]')).not.toBeNull();
  expect(isMinimalChromeSurface('/seller-plan/start')).toBe(true);
  expect(isLightweightGlobalSurface('/seller-plan/start')).toBe(true);
});
it('renders the local preview with focused chrome without changing the live seller route',()=>{
  vi.stubEnv('NODE_ENV','development');expect(Preview()).toBeTruthy();
  expect(isMinimalChromeSurface('/seller-plan/preview')).toBe(true);expect(isLightweightGlobalSurface('/seller-plan/preview')).toBe(true);
  expect(isMinimalChromeSurface('/seller-plan')).toBe(false);expect(isMinimalChromeSurface('/seller-plan/preview-other')).toBe(false);
});
