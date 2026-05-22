import { useState, useEffect } from 'react';
import { supabase, toggleCollection, addPropertyComment, subscribeToPropertyComments, logEvent } from '@/lib/supabase';
import { toast } from 'react-toastify';

export const usePropertyInteraction = (propId: string, userId: string, userName: string, property: any) => {
  const [isInCollection, setIsInCollection] = useState(false);
  const [comments, setComments] = useState<any[]>([]);

  useEffect(() => {
    if (!propId || !userId) return;

    const checkCollection = async () => {
      const { data } = await supabase
        .from('collections')
        .select('*')
        .eq('user_id', userId)
        .eq('property_id', propId)
        .single();
      setIsInCollection(!!data);
    };

    const fetchComments = async () => {
      const { data } = await supabase
        .from('property_comments')
        .select('*')
        .eq('property_id', propId)
        .order('created_at', { ascending: true });
      if (data) setComments(data);
    };

    checkCollection();
    fetchComments();

    const sub = subscribeToPropertyComments(propId, (payload) => {
      setComments(prev => [...prev, payload.new]);
      toast.info(`New Feedback from ${payload.new.user_name || 'Consumer'}`);
    });

    return () => {
      if (sub) supabase.removeChannel(sub);
    };
  }, [propId, userId]);

  const handleToggleCollection = async () => {
    if (!userId) {
      toast.warn("Sign in to save properties.");
      return;
    }
    
    await toggleCollection(userId, propId);
    const wasIn = isInCollection;
    setIsInCollection(!wasIn);
    
    await logEvent({
      type: 'COLLECTION_SYNC',
      description: `${userName} ${wasIn ? 'removed' : 'added'} ${property?.name} to Pulse Folder.`,
      actorId: userId,
      actorName: userName,
      targetId: propId,
      severity: wasIn ? 'INFO' : 'LOW'
    });

    toast.success(wasIn ? "Removed from Pulse Folder" : "Added to Pulse Folder");
  };

  const submitComment = async (commentData: any) => {
    try {
      const savedComment = await addPropertyComment(commentData);
      
      await logEvent({
        type: 'SPATIAL_FEEDBACK',
        description: `${userName} dropped feedback on ${property?.name}: "${commentData.content.substring(0, 30)}..."`,
        actorId: userId,
        actorName: userName,
        targetId: savedComment.id,
        metadata: { property_name: property?.name, content: commentData.content },
        severity: 'INFO'
      });

      return savedComment;
    } catch (err) {
      toast.error("Feedback transmission failed.");
      throw err;
    }
  };

  return {
    isInCollection,
    comments,
    handleToggleCollection,
    submitComment
  };
};
