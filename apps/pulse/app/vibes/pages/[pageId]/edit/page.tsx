import { Suspense } from 'react';
import { CmsPageEditorLoader } from './CmsPageEditorLoader';

export default async function CmsPageEditRoute({ params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params;
  return <Suspense fallback={<p className="p-8 text-sm text-slate-500">Loading editor…</p>}><CmsPageEditorLoader pageId={pageId} /></Suspense>;
}
