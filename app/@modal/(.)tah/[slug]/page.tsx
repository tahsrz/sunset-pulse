import { notFound } from 'next/navigation';
import { TahInterceptModal } from '@/components/tah/TahInterceptModal';
import { TahCartridgeView } from '@/components/tah/TahCartridgeView';
import { getTahCartridgeViewData } from '@/lib/ai/brain/tah_page_data';

type InterceptedTahCartridgePageProps = {
  params: {
    slug: string;
  };
};

export default async function InterceptedTahCartridgePage({ params }: InterceptedTahCartridgePageProps) {
  const data = await getTahCartridgeViewData(params.slug);
  if (!data) notFound();

  return (
    <TahInterceptModal>
      <TahCartridgeView data={data} mode="modal" />
    </TahInterceptModal>
  );
}
