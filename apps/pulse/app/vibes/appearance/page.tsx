import { Suspense } from 'react';
import { ThemeDirectory } from './ThemeDirectory';
export default function AppearancePage() { return <Suspense fallback={<p className="p-8">Loading themes…</p>}><ThemeDirectory /></Suspense>; }
