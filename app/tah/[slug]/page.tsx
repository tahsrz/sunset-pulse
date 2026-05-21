import { notFound } from 'next/navigation';
import { TahCartridgeView } from '@/components/tah/TahCartridgeView';
import { getTahCartridgeViewData } from '@/lib/ai/brain/tah_page_data';
import { getPulseCartridge, listPulseCartridges } from '@/lib/ai/brain/pulse_query';

export const dynamic = 'force-dynamic';

type TahCartridgePageProps = {
  params: {
    slug: string;
  };
};

export function generateStaticParams() {
  return listPulseCartridges().map(cartridge => ({ slug: cartridge.slug }));
}

export async function generateMetadata({ params }: TahCartridgePageProps) {
  const cartridge = getPulseCartridge(params.slug);
  if (!cartridge) {
    return {
      title: 'TAH Cartridge Not Found | Sunset Pulse'
    };
  }

  return {
    title: `${cartridge.title} | Sunset Pulse TAH`,
    description: `Robot-readable context page for the ${cartridge.name} Sunset Pulse cartridge.`
  };
}

export default async function TahCartridgePage({ params }: TahCartridgePageProps) {
  const data = await getTahCartridgeViewData(params.slug);
  if (!data) notFound();

  return <TahCartridgeView data={data} />;
}
