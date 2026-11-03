import React from 'react';
import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';

const loader=vi.hoisted(()=>vi.fn());
vi.mock('@/lib/home/loadAtlasExperience',()=>({loadAtlasExperience:loader}));
import {HomeHero} from '@/components/home/HomeDynamicSections';
const ready={default:()=> <div>Atlas ready</div>};

beforeEach(()=>{loader.mockReset().mockResolvedValue(ready);});
afterEach(()=>{cleanup();vi.restoreAllMocks();});

describe('homepage Atlas launcher',()=>{
  it('defers the import, closes with focus restored and makes a fresh attempt on reopening',async()=>{
    render(<HomeHero/>);expect(loader).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button',{name:'Open Atlas View'}));await screen.findByText('Atlas ready');
    fireEvent.click(screen.getByRole('button',{name:'Close Atlas experience'}));
    expect(screen.getByRole('button',{name:'Open Atlas View'})).toHaveFocus();
    expect(screen.queryByText('Atlas ready')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button',{name:'Open Atlas View'}));await screen.findByText('Atlas ready');
    expect(loader).toHaveBeenCalledTimes(2);
  });
  it.each(['retry','reopen'])('recovers a rejected import through %s',async(action)=>{
    vi.spyOn(console,'error').mockImplementation(()=>{});
    loader.mockRejectedValueOnce(new Error('Temporary chunk failure'));
    render(<HomeHero/>);fireEvent.click(screen.getByRole('button',{name:'Open Atlas View'}));
    expect(await screen.findByRole('alert')).toHaveTextContent('The Atlas view could not open.');
    expect(screen.getByRole('link',{name:'Open Atlas'})).toHaveAttribute('href','/atlas');
    if(action==='retry') fireEvent.click(screen.getByRole('button',{name:'Retry Atlas View'}));
    else {fireEvent.click(screen.getByRole('button',{name:'Close Atlas experience'}));fireEvent.click(screen.getByRole('button',{name:'Open Atlas View'}));}
    await screen.findByText('Atlas ready');expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(loader).toHaveBeenCalledTimes(2);
  });
  it('keeps the launcher closed if an earlier pending import resolves after closing',async()=>{
    let resolve!:(value:typeof ready)=>void;
    loader.mockImplementationOnce(()=>new Promise(done=>{resolve=done;}));
    render(<HomeHero/>);fireEvent.click(screen.getByRole('button',{name:'Open Atlas View'}));
    fireEvent.click(screen.getByRole('button',{name:'Close Atlas experience'}));
    await act(async()=>resolve(ready));
    expect(screen.queryByText('Atlas ready')).not.toBeInTheDocument();
    expect(screen.getByRole('button',{name:'Open Atlas View'})).toHaveFocus();
  });
});
