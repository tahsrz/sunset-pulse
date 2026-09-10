import { cmsPageDraftSchema, type CmsPageDraft } from './pageSchema';
import type { HomepageSectionBlock } from './homepageSectionSchema';

/** Starter copy is inserted only by an explicit operator action, never during a read. */
export function createPlatformHomepageDraft(jamieUrl: string): CmsPageDraft {
  const section = (
    layout: HomepageSectionBlock['props']['layout'],
    heading: string,
    text: string,
    extra: Partial<HomepageSectionBlock['props']> = {},
  ): HomepageSectionBlock => ({
    blockId: crypto.randomUUID(),
    version: 1,
    type: 'sunset/section',
    props: {
      layout,
      eyebrow: '',
      heading,
      text,
      actionLabel: '',
      actionHref: '',
      items: [],
      ...extra,
    },
  });
  return cmsPageDraftSchema.parse({
    title: 'Find your next place in North Texas.',
    slug: 'home',
    excerpt:
      'Explore places, discover homes, and connect with the people and stories around Sunset.',
    presentation: {
      siteName: 'Sunset Pulse',
      homeLabel: 'Home',
      navigationLabel: 'Explore Sunset Pulse',
      navigationLinks: [
        { label: 'Explorer', href: '/explorer' },
        { label: 'Properties', href: '/properties' },
        { label: 'Order food', href: '/grill' },
      ],
      footerText: 'Sunset Pulse — places, people, and local perspective.',
      footerLinks: [
        { label: 'Ask Jamie', href: jamieUrl },
        { label: 'Atlas', href: '/atlas' },
        { label: 'World of Tah', href: '/worldoftah' },
      ],
    },
    seo: {
      title: 'Sunset Pulse | Explore North Texas',
      description:
        'Explore North Texas places, properties, local stories, and Sunset Gas & Grill.',
    },
    blocks: [
      section(
        'hero',
        'Start with a place. See what comes next.',
        'Open the Explorer for a different view of North Texas, or head straight to property search.',
        {
          eyebrow: 'Welcome to Sunset',
          actionLabel: 'Open the Explorer',
          actionHref: '/explorer',
        },
      ),
      section('destinations', 'Where would you like to go?', '', {
        items: [
          {
            title: 'Explore places',
            text: 'Find local context in the map and atlas.',
            linkLabel: 'Open Explorer',
            href: '/explorer',
          },
          {
            title: 'Find homes',
            text: 'Browse properties and follow the details that matter to you.',
            linkLabel: 'Browse properties',
            href: '/properties',
          },
          {
            title: 'Order food',
            text: 'Visit Sunset Gas & Grill to start an order.',
            linkLabel: 'Open the grill',
            href: '/grill',
          },
          {
            title: 'Ask Jamie',
            text: 'Get help navigating homes, places, and the tools on Sunset Pulse.',
            linkLabel: 'Ask Jamie',
            href: jamieUrl,
          },
        ],
      }),
      section(
        'story',
        'A little local perspective goes a long way.',
        'Sunset Pulse brings place discovery, property tools, and local stories together. Start with something familiar and follow your curiosity.',
        {
          eyebrow: 'Rooted in North Texas',
          actionLabel: 'Explore the atlas',
          actionHref: '/atlas',
        },
      ),
      section(
        'destinations',
        'More ways to explore',
        'The rest of Sunset Pulse is still here.',
        {
          items: [
            {
              title: 'Property management',
              text: 'Open the property listing tools.',
              linkLabel: 'List a property',
              href: '/properties/add',
            },
            {
              title: 'The interactive atlas',
              text: 'Choose a destination through the interactive platform map.',
              linkLabel: 'Explore the atlas',
              href: '/atlas',
            },
          ],
        },
      ),
      section('faq', 'A few useful answers', '', {
        items: [
          {
            title: 'Where can I search for properties?',
            text: 'Start with Properties to browse, or use IDX Search for its search tools.',
            linkLabel: 'Open IDX Search',
            href: '/idx',
          },
          {
            title: 'How do I order from the grill?',
            text: 'Open the grill page and follow its ordering flow.',
            linkLabel: 'Order food',
            href: '/grill',
          },
          {
            title: 'Can Jamie help me find my way around?',
            text: 'Jamie is available as a guide to the platform and local context.',
            linkLabel: 'Ask Jamie',
            href: jamieUrl,
          },
        ],
      }),
      section(
        'closing',
        'Follow your next question.',
        'A new neighborhood, a property, or a local stop — choose your starting point.',
        { actionLabel: 'Browse properties', actionHref: '/properties' },
      ),
    ],
  });
}
