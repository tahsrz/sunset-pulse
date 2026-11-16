'use client';

import React, { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, MapPin, Search } from 'lucide-react';
import { SELLER_ADDRESS_DRAFT_KEY } from '@/lib/marketing/sellerAddressDraft';

const moveOptions = {
  sell: {
    label: 'Sell a home',
    blurb: 'Get help setting a price, getting your home ready, and planning your move on your timeline.',
    fieldLabel: 'Your home address',
    placeholder: 'Your home address',
    action: 'Continue',
  },
  buy: {
    label: 'Buy a home',
    blurb: 'Explore North Texas homes and get a local agent’s help from your first tour through closing.',
    fieldLabel: 'Address, city, or ZIP code',
    placeholder: 'Address, city, or ZIP',
    action: 'Search homes',
  },
};
const tabOrder = ['sell', 'buy'] as const;
type MoveIntent = (typeof tabOrder)[number];

export default function HomeMoveTabs({ sellerPlanHref }: { sellerPlanHref: string }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<MoveIntent>('sell');
  const tabs = useRef<Partial<Record<MoveIntent, HTMLButtonElement>>>({});

  function handleTabKeys(event: KeyboardEvent<HTMLButtonElement>) {
    let nextTab: MoveIntent;
    switch (event.key) {
      case 'Home':
        nextTab = 'sell';
        break;
      case 'End':
        nextTab = 'buy';
        break;
      case 'ArrowLeft':
      case 'ArrowRight':
        nextTab = activeTab === 'sell' ? 'buy' : 'sell';
        break;
      default:
        return;
    }
    event.preventDefault();
    setActiveTab(nextTab);
    tabs.current[nextTab]?.focus();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>, intent: MoveIntent) {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem(`home-move-address-${intent}`) as HTMLInputElement;
    const address = input.value.trim();
    if (!address) {
      input.setCustomValidity('Enter an address to continue.');
      input.reportValidity();
      return;
    }

    if (intent === 'buy') {
      router.push(`/properties/search-results?${new URLSearchParams({ location: address })}`);
      return;
    }

    // The public consultation request stores contact details and intent only.
    try {
      sessionStorage.setItem(SELLER_ADDRESS_DRAFT_KEY, address);
    } catch {
      // The consultation is still available when session storage is disabled.
    }
    router.push(sellerPlanHref);
  }

  return (
    <div className="mt-6 max-w-xl sm:mt-8">
      <div role="tablist" aria-label="Buy or sell a home" className="flex gap-1 border-b border-white/15">
        {tabOrder.map((intent) => (
          <button
            key={intent}
            ref={(element) => { if (element) tabs.current[intent] = element; }}
            id={`home-move-tab-${intent}`}
            type="button"
            role="tab"
            aria-selected={activeTab === intent}
            aria-controls={`home-move-panel-${intent}`}
            tabIndex={activeTab === intent ? 0 : -1}
            onClick={() => setActiveTab(intent)}
            onKeyDown={handleTabKeys}
            className="min-h-11 flex-1 border-b-2 border-transparent px-2 text-sm font-bold text-slate-300 hover:text-white aria-selected:border-teal-300 aria-selected:text-teal-100 sm:flex-none sm:px-5"
          >
            {moveOptions[intent].label}
          </button>
        ))}
      </div>
      {tabOrder.map((intent) => {
        const option = moveOptions[intent];
        const fieldId = `home-move-address-${intent}`;
        return (
          <div key={intent} id={`home-move-panel-${intent}`} role="tabpanel" aria-labelledby={`home-move-tab-${intent}`} hidden={activeTab !== intent} className="pt-4">
            <p className="mb-4 text-sm leading-6 text-slate-300">{option.blurb}</p>
            <form onSubmit={(event) => handleSubmit(event, intent)} className="flex min-w-0 items-center gap-1 rounded-xl border border-white/20 bg-[#07131a] p-1 focus-within:border-teal-300">
              <MapPin aria-hidden="true" size={19} className="ml-2 shrink-0 text-teal-200 sm:ml-3" />
              <label htmlFor={fieldId} className="sr-only">{option.fieldLabel}</label>
              <input
                id={fieldId}
                type="text"
                required
                maxLength={240}
                autoComplete={intent === 'sell' ? 'street-address' : 'off'}
                placeholder={option.placeholder}
                onInput={(event) => event.currentTarget.setCustomValidity('')}
                className="min-h-11 min-w-0 flex-1 border-0 bg-transparent px-1 text-base text-white placeholder:text-slate-400 focus:ring-0 sm:px-2"
              />
              <button type="submit" aria-label={option.action} title={option.action} className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg bg-teal-300 text-slate-950 hover:bg-teal-200">
                {intent === 'sell' ? <ArrowRight aria-hidden="true" size={19} /> : <Search aria-hidden="true" size={19} />}
              </button>
            </form>
          </div>
        );
      })}
    </div>
  );
}
