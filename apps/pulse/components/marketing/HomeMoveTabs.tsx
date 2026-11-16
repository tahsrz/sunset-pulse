'use client';

import React, { useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useRouter } from 'next/navigation';
import { SELLER_ADDRESS_DRAFT_KEY } from '@/lib/marketing/sellerAddressDraft';

const moveOptions = {
  both: {
    label: 'Buy & Sell',
    title: 'Move fast with a Pulse agent.',
    subtitle: "We've helped 1000+ customers sell their home without the stress.",
    blurb: 'Start with your current address so we can help you plan both moves.',
    fieldLabel: 'Your home address',
    placeholder: 'Enter your current address',
    action: 'Plan my move',
  },
  buy: {
    label: 'Buy a home',
    title: 'Find a place that feels like home.',
    subtitle: 'A local Pulse agent can guide you from your first tour through closing.',
    blurb: 'Tell us where you’d like to buy.',
    fieldLabel: 'Address, city, or ZIP code',
    placeholder: 'Address, city, or ZIP',
    action: 'Search homes',
  },
  sell: {
    label: 'Sell a home',
    title: 'Sell your home on your timeline.',
    subtitle: 'A Pulse agent can help you set a price, get your home ready, and plan what comes next.',
    blurb: 'Start with the address of the home you’re selling.',
    fieldLabel: 'Your home address',
    placeholder: 'Enter your home address',
    action: 'Start selling',
  },
};
const tabOrder = ['both', 'buy', 'sell'] as const;
type MoveIntent = (typeof tabOrder)[number];

export default function HomeMoveTabs({ sellerPlanHref }: { sellerPlanHref: string }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<MoveIntent>('both');
  const activeOption = moveOptions[activeTab];
  const tabs = useRef<Partial<Record<MoveIntent, HTMLButtonElement>>>({});

  function handleTabKeys(event: KeyboardEvent<HTMLButtonElement>, intent: MoveIntent) {
    const index = tabOrder.indexOf(intent);
    let nextTab: MoveIntent;
    switch (event.key) {
      case 'Home':
        nextTab = tabOrder[0];
        break;
      case 'End':
        nextTab = tabOrder[tabOrder.length - 1];
        break;
      case 'ArrowLeft':
        nextTab = tabOrder[(index + tabOrder.length - 1) % tabOrder.length];
        break;
      case 'ArrowRight':
        nextTab = tabOrder[(index + 1) % tabOrder.length];
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
    <div className="min-w-0 max-w-xl">
      <div aria-live="polite" aria-atomic="true">
        <h1 id="seller-acquisition-title" className="max-w-[17ch] font-serif text-[clamp(2.35rem,5vw,4rem)] !font-normal !normal-case leading-[1.04] tracking-[-0.035em]">
          {activeOption.title}
        </h1>
        <p className="mt-4 max-w-lg text-base leading-7 text-[#36455a] sm:text-lg">
          {activeOption.subtitle}
        </p>
      </div>
      <div role="tablist" aria-label="Buy or sell a home" className="mt-8 grid grid-cols-3 gap-1.5 sm:mt-10">
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
            onKeyDown={(event) => handleTabKeys(event, intent)}
            className="min-h-12 rounded-t-lg bg-[#f4fcfc] px-1.5 py-2 text-sm font-semibold text-[#52637a] hover:text-[#232c43] focus-visible:relative focus-visible:z-10 focus-visible:!outline-[#3b6270] aria-selected:bg-white aria-selected:text-[#232c43] sm:text-base"
          >
            {moveOptions[intent].label}
          </button>
        ))}
      </div>
      {tabOrder.map((intent) => {
        const option = moveOptions[intent];
        const fieldId = `home-move-address-${intent}`;
        return (
          <div key={intent} id={`home-move-panel-${intent}`} role="tabpanel" aria-labelledby={`home-move-tab-${intent}`} hidden={activeTab !== intent} className="rounded-b-xl bg-white px-3 py-5 sm:px-6 sm:py-6">
            <p className="mb-3 text-sm font-semibold leading-6 sm:text-base">{option.blurb}</p>
            <form onSubmit={(event) => handleSubmit(event, intent)} className="flex min-w-0 flex-col gap-1 rounded-md border border-[#aebbc9] p-1 focus-within:border-[#486a76] min-[375px]:flex-row">
              <label htmlFor={fieldId} className="sr-only">{option.fieldLabel}</label>
              <input
                id={fieldId}
                type="text"
                required
                maxLength={240}
                autoComplete={intent === 'buy' ? 'off' : 'street-address'}
                placeholder={option.placeholder}
                onInput={(event) => event.currentTarget.setCustomValidity('')}
                className="min-h-11 min-w-0 flex-1 rounded-sm border-0 bg-white px-2 text-base text-[#232c43] placeholder:text-[#65758a] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#3b6270] sm:px-3"
              />
              <button type="submit" className="min-h-11 shrink-0 rounded bg-[#b9412d] px-3 text-sm font-bold text-white hover:bg-[#9d3526] focus-visible:!outline-[#3b6270] sm:px-4">
                {option.action}
              </button>
            </form>
          </div>
        );
      })}
    </div>
  );
}
