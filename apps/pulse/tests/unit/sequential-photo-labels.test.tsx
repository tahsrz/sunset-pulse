import React from 'react';
import '@testing-library/jest-dom/vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import SequentialPhotoLabels from '@/components/marketing/SequentialPhotoLabels';
afterEach(cleanup);
it('reveals stable decorative labels in order without creating controls',()=>{
  const labels=[{id:'one',text:'Pricing Review',anchor:'upperRight' as const},{id:'two',text:'Home Preparation',anchor:'middleLeft' as const},{id:'three',text:'Move Planning',anchor:'lowerRight' as const}];
  const {container,rerender}=render(<SequentialPhotoLabels labels={labels}/>);
  expect(container.firstElementChild).toHaveAttribute('aria-hidden','true');
  const first=screen.getByText('Pricing Review');expect(first).toHaveStyle({animationDelay:'180ms'});
  expect(screen.getByText('Home Preparation')).toHaveStyle({animationDelay:'320ms'});
  expect(screen.getByText('Move Planning')).toHaveStyle({animationDelay:'460ms'});
  rerender(<SequentialPhotoLabels labels={labels}/>);expect(screen.getByText('Pricing Review')).toBe(first);
  expect(container.querySelector('button,a,input,[aria-live]')).toBeNull();
});
