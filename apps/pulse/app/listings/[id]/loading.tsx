import React from 'react';

export default function ListingLoading() {
  return (
    <main className='bg-slate-50 min-h-screen pb-20'>
      {/* Header Image Skeleton */}
      <div className='w-full h-[400px] bg-slate-200 animate-pulse' />
      
      <section className='bg-white border-b border-slate-200'>
        <div className='container m-auto py-6 px-6 flex justify-between items-center'>
          <div className='h-4 w-32 bg-slate-100 rounded animate-pulse' />
          <div className='h-8 w-40 bg-green-50 rounded-full animate-pulse' />
        </div>
      </section>

      <div className='container m-auto py-10 px-6'>
        <div className='grid grid-cols-1 md:grid-cols-70/30 w-full gap-8'>
          <div className='space-y-6'>
            {/* Property Header Skeleton */}
            <div className='bg-white p-8 rounded-2xl shadow-sm border border-slate-100'>
              <div className='h-4 w-24 bg-slate-100 rounded mb-4 animate-pulse' />
              <div className='h-10 w-3/4 bg-slate-200 rounded mb-6 animate-pulse' />
              <div className='flex gap-4 mb-8'>
                <div className='h-6 w-20 bg-slate-100 rounded animate-pulse' />
                <div className='h-6 w-20 bg-slate-100 rounded animate-pulse' />
                <div className='h-6 w-20 bg-slate-100 rounded animate-pulse' />
              </div>
              <div className='space-y-2'>
                <div className='h-4 w-full bg-slate-50 rounded animate-pulse' />
                <div className='h-4 w-full bg-slate-50 rounded animate-pulse' />
                <div className='h-4 w-2/3 bg-slate-50 rounded animate-pulse' />
              </div>
            </div>

            {/* Gallery Skeleton */}
            <div className='mt-10'>
              <div className='h-8 w-48 bg-slate-200 rounded mb-6 animate-pulse' />
              <div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
                <div className='aspect-square bg-slate-100 rounded-xl animate-pulse' />
                <div className='aspect-square bg-slate-100 rounded-xl animate-pulse' />
                <div className='aspect-square bg-slate-100 rounded-xl animate-pulse' />
              </div>
            </div>
          </div>

          <aside className='space-y-6'>
            <div className='bg-white p-6 rounded-2xl shadow-sm border border-slate-100'>
              <div className='h-4 w-24 bg-slate-100 rounded mb-6 animate-pulse' />
              <div className='space-y-4'>
                <div className='h-12 w-full bg-slate-100 rounded-xl animate-pulse' />
                <div className='h-12 w-full bg-slate-100 rounded-xl animate-pulse' />
              </div>
            </div>

            <div className='bg-white p-6 rounded-2xl shadow-sm border border-slate-100'>
              <div className='h-4 w-24 bg-slate-100 rounded mb-6 animate-pulse' />
              <div className='h-48 w-full bg-slate-50 rounded-xl animate-pulse' />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
