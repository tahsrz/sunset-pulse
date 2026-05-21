'use client';

import React, { useOptimistic } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import type { OptimisticMutationState, OptimisticServerAction } from '@/lib/forms/optimisticMutation';
export type { OptimisticMutationState, OptimisticServerAction } from '@/lib/forms/optimisticMutation';

type OptimisticActionFormProps = {
  action: OptimisticServerAction;
  children: (state: OptimisticMutationState) => React.ReactNode;
  className?: string;
  idleMessage?: string;
  pendingMessage?: string;
  onOptimisticSubmit?: (formData: FormData) => Partial<OptimisticMutationState>;
};

const initialState: OptimisticMutationState = {
  status: 'idle',
  message: ''
};

export function OptimisticActionForm({
  action,
  children,
  className,
  idleMessage = '',
  pendingMessage = 'Working...',
  onOptimisticSubmit
}: OptimisticActionFormProps) {
  const [state, formAction] = useFormState(action, { ...initialState, message: idleMessage });
  const [optimisticState, setOptimisticState] = useOptimistic(
    state,
    (currentState, nextState: Partial<OptimisticMutationState>) => ({
      ...currentState,
      ...nextState
    })
  );

  const submitWithOptimism = async (formData: FormData) => {
    setOptimisticState({
      status: 'pending',
      message: pendingMessage,
      submittedAt: Date.now(),
      ...onOptimisticSubmit?.(formData)
    });

    await formAction(formData);
  };

  return (
    <form action={submitWithOptimism} className={className}>
      {children(optimisticState)}
    </form>
  );
}

export function OptimisticSubmitButton({
  idleLabel,
  pendingLabel,
  optimisticState,
  className,
  disabled = false
}: {
  idleLabel: string;
  pendingLabel: string;
  optimisticState: OptimisticMutationState;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  const isPending = pending || optimisticState.status === 'pending';

  return (
    <button
      type="submit"
      disabled={disabled || isPending}
      className={className}
    >
      {isPending ? pendingLabel : idleLabel}
    </button>
  );
}
