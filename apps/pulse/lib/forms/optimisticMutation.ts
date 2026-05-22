export type OptimisticMutationStatus = 'idle' | 'pending' | 'success' | 'error';

export type OptimisticMutationState = {
  status: OptimisticMutationStatus;
  message: string;
  submittedAt?: number;
};

export type OptimisticServerAction = (
  previousState: OptimisticMutationState,
  formData: FormData
) => Promise<OptimisticMutationState>;
