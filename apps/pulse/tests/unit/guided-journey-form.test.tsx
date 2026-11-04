import React from 'react';
import '@testing-library/jest-dom/vitest';
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import GuidedJourneyPrototype from '@/components/lead-capture/journey/GuidedJourneyPrototype';

const next=()=>fireEvent.click(screen.getByRole('button',{name:'Next →'}));
function choose(label:string){fireEvent.click(screen.getByRole('radio',{name:label}));next();}
function buyerToReview(){
  choose('Find a Home');choose('Just Starting');choose('Yes');choose('I’m Open to Either');choose('No');choose('Not Yet');
  expect(screen.getByRole('heading',{level:1})).toHaveTextContent('Does this look right?');
}
beforeEach(()=>{vi.stubGlobal('fetch',vi.fn());});
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllGlobals();});

describe('guided journey local interaction',()=>{
  it('validates the current step and does not send a request for local navigation',()=>{
    render(<GuidedJourneyPrototype/>);next();expect(screen.getByRole('alert')).toHaveTextContent('Choose what');
    choose('Sell My Home');expect(screen.getByRole('heading',{level:1})).toHaveTextContent('Which home');
    fireEvent.click(screen.getByRole('button',{name:'Use a Fictional Sample Home'}));next();
    fireEvent.click(screen.getByRole('checkbox',{name:'This Is the Home I Mean'}));next();next();
    expect(screen.getByRole('heading',{level:1})).toHaveTextContent('Would you like to add');
    fireEvent.click(screen.getByRole('button',{name:'← Back'}));expect(screen.getByLabelText('Bedrooms')).toHaveValue(3);
    expect(fetch).not.toHaveBeenCalled();
  });
  it('routes newly required edit answers before returning to review',()=>{
    render(<GuidedJourneyPrototype/>);buyerToReview();
    fireEvent.click(screen.getByRole('button',{name:'Edit Have you been pre-approved for a mortgage?'}));
    fireEvent.click(screen.getByRole('radio',{name:'Yes'}));
    fireEvent.click(screen.getByRole('button',{name:'Back to Review'}));
    expect(screen.getByRole('heading',{level:1})).toHaveTextContent('How much were you pre-approved');
    fireEvent.change(screen.getByLabelText('Approximate Amount in Dollars'),{target:{value:'450000'}});
    fireEvent.click(screen.getByRole('button',{name:'Back to Review'}));
    expect(screen.getByRole('heading',{level:1})).toHaveTextContent('Does this look right?');
    expect(screen.getByText('$450,000.00')).toBeVisible();expect(fetch).not.toHaveBeenCalled();
  });
  it('shows deliberate loading/error, preserves contact and completes without a live write',()=>{
    vi.useFakeTimers();render(<GuidedJourneyPrototype/>);buyerToReview();next();
    fireEvent.change(screen.getByLabelText('Your Name'),{target:{value:'Taylor Example'}});
    fireEvent.change(screen.getByLabelText('Email'),{target:{value:'taylor@example.test'}});
    fireEvent.click(screen.getByRole('checkbox',{name:'I’d Like a Response About My Request.'}));
    fireEvent.change(screen.getByLabelText('Final Step Response'),{target:{value:'error'}});
    fireEvent.click(screen.getByRole('button',{name:'Preview My Request'}));
    const loading=screen.getByRole('button',{name:'Loading…'});expect(loading).toBeDisabled();
    fireEvent.click(loading);act(()=>{vi.advanceTimersByTime(800);});
    expect(screen.getByRole('alert')).toHaveTextContent('Preview error');expect(screen.getByLabelText('Email')).toHaveValue('taylor@example.test');
    fireEvent.change(screen.getByLabelText('Final Step Response'),{target:{value:'loading'}});
    fireEvent.click(screen.getByRole('button',{name:'Preview My Request'}));act(()=>{vi.advanceTimersByTime(800);});
    expect(screen.getByRole('heading',{level:1})).toHaveTextContent('Your next move, in view.');
    expect(screen.getByText('No request was sent here.',{exact:false})).toBeVisible();expect(fetch).not.toHaveBeenCalled();
  });
  it('clears pending simulation on unmount',()=>{
    vi.useFakeTimers();const {unmount}=render(<GuidedJourneyPrototype/>);buyerToReview();next();
    fireEvent.change(screen.getByLabelText('Your Name'),{target:{value:'Taylor Example'}});
    fireEvent.change(screen.getByLabelText('Email'),{target:{value:'taylor@example.test'}});
    fireEvent.click(screen.getByRole('checkbox',{name:'I’d Like a Response About My Request.'}));
    fireEvent.change(screen.getByLabelText('Final Step Response'),{target:{value:'loading'}});
    const baseline=vi.getTimerCount();
    fireEvent.click(screen.getByRole('button',{name:'Preview My Request'}));expect(vi.getTimerCount()).toBe(baseline+1);
    unmount();expect(vi.getTimerCount()).toBeLessThanOrEqual(baseline);
  });
});
