'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-toastify';
import { FaBookmark } from 'react-icons/fa';
import { Property } from '@/lib/types';
import { useLocalCollection } from '@/lib/powersync/useLocalCollection';

interface BookmarkButtonProps {
  property: Property;
}

const BookmarkButton: React.FC<BookmarkButtonProps> = ({ property }) => {
  const { user } = useAuth();
  const userId = user?.id;
  const localCollection = useLocalCollection(property._id, userId);

  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (localCollection.enabled) return;
    if (!userId) {
      setLoading(false);
      return;
    }

    const checkBookmarkStatus = async () => {
      try {
        const res = await fetch('/api/bookmarks/check', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            propertyId: property._id,
          }),
        });

        if (res.status === 200) {
          const data = await res.json();
          setIsBookmarked(Boolean(data.data?.isBookmarked ?? data.isBookmarked));
        }
      } catch (error) {
        console.error('Bookmark status check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkBookmarkStatus();
  }, [localCollection.enabled, property._id, userId]);

  const handleClick = async () => {
    if (!userId) {
      toast.error('You need to sign in to bookmark a property');
      return;
    }

    try {
      if (localCollection.enabled) {
        const isSaved = await localCollection.toggle();
        toast.success(isSaved ? 'Bookmark saved locally and queued for sync.' : 'Property removed from saved list.');
        return;
      }

      const res = await fetch('/api/bookmarks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyId: property._id,
        }),
      });

      if (res.status === 200) {
        const data = await res.json();
        const result = data.data || data;
        toast.success(result.message);
        setIsBookmarked(Boolean(result.isBookmarked));
      }
    } catch (error) {
      console.error('Bookmark toggle failed:', error);
      toast.error('Something went wrong');
    }
  };

  const effectiveLoading = localCollection.enabled ? localCollection.loading : loading;
  const effectiveBookmarked = localCollection.enabled ? localCollection.isSaved : isBookmarked;

  if (effectiveLoading) return <div className='p-2 animate-pulse bg-slate-200 rounded-full h-10 w-full' />;

  return effectiveBookmarked ? (
    <button
      onClick={handleClick}
      className='bg-red-500 hover:bg-red-600 text-white font-black uppercase text-[10px] tracking-widest w-full py-3 px-4 rounded-xl flex items-center justify-center transition-all'
    >
      <FaBookmark className='mr-2' /> Remove Bookmark
    </button>
  ) : (
    <button
      onClick={handleClick}
      className='bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[10px] tracking-widest w-full py-3 px-4 rounded-xl flex items-center justify-center transition-all shadow-lg shadow-blue-600/20'
    >
      <FaBookmark className='mr-2' /> Bookmark Property
    </button>
  );
};

export default BookmarkButton;
