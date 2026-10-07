import { QueryClient, type QueryClientConfig, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { ApiRequestError } from "../lib/apiClient";

const MAX_RETRIES = 3;
const HTTP_CLIENT_ERROR_MIN = 400;
const HTTP_SERVER_ERROR_MIN = 500;

/** Retries network and server errors only: a 4xx answer will not change by asking again. */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  const isClientError =
    error instanceof ApiRequestError &&
    error.status >= HTTP_CLIENT_ERROR_MIN &&
    error.status < HTTP_SERVER_ERROR_MIN;
  return !isClientError && failureCount < MAX_RETRIES;
}

/** The app's query client; tests pass extra options (see renderWithProviders). */
export function createQueryClient(
  queries: NonNullable<QueryClientConfig["defaultOptions"]>["queries"] = {},
) {
  return new QueryClient({ defaultOptions: { queries: { retry: shouldRetry, ...queries } } });
}

type Props = { children: ReactNode; client?: QueryClient };

export function QueryProvider({ children, client }: Props) {
  // One client for the app's lifetime (created once, not on every render).
  const [queryClient] = useState(() => client ?? createQueryClient());
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
