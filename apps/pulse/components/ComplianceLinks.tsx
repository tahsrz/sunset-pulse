import React from 'react';

// These disclosures keep their existing ownership; page drafts cannot remove them.
const links = [
  {
    href: 'https://www.trec.texas.gov/forms/consumer-protection-notice',
    label: 'TREC Consumer Notice',
    external: true,
  },
  { href: '/iabs', label: 'IABS Interactive', external: false },
  {
    href: 'https://www.dropbox.com/scl/fi/xjnnszs2h24nq95tvdmts/Information-About-Brokerage-Services.pdf?rlkey=uwn66iikqswvjscfr86dos7tk&e=1&st=bp3w9yw4&dl=0',
    label: 'IABS PDF',
    external: true,
  },
];

export function ComplianceLinks() {
  return (
    <>
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          target={link.external ? '_blank' : undefined}
          rel={link.external ? 'noopener noreferrer' : undefined}
          className="text-sm font-semibold text-slate-300 transition hover:text-white"
        >
          {link.label}
        </a>
      ))}
    </>
  );
}
