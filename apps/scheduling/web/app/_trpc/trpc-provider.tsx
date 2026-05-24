"use client";

import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "./query-client";
import { trpc } from "./trpc";
import { trpcClient } from "./trpc-client";

type Props = {
  children: any;
};

export const TrpcProvider = ({ children }: Props) => {
  const TrpcProviderComponent = (trpc as any).Provider;
  return (
    <TrpcProviderComponent client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children as any}</QueryClientProvider>
    </TrpcProviderComponent>
  );
};
