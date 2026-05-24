import { captureReactException } from "@sentry/nextjs";
import React from "react";
import { ErrorBoundary } from "react-error-boundary";
const ErrorBoundaryAny = ErrorBoundary as any;

import { ErrorPage } from "./error-page";

export default function BookingPageErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundaryAny
      fallbackRender={({ error, resetErrorBoundary }: any) => (
        <ErrorPage reset={resetErrorBoundary} error={error} message={`${error}`} displayDebug={true} />
      )}
      onError={(error: any, info: any) => {
        console.error(error);
        captureReactException(error, info);
      }}>
      {children}
    </ErrorBoundaryAny>
  );
}
