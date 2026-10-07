import { render } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { AuthProvider } from "../providers/AuthProvider";
import { createQueryClient, QueryProvider } from "../providers/QueryProvider";

/** Renders a screen or component inside the app providers. */
export function renderWithProviders(ui: ReactElement) {
  return render(
    // gcTime Infinity: no garbage-collection timer, which would keep Jest running for minutes
    // after the tests (TanStack Query testing guide).
    <QueryProvider client={createQueryClient({ gcTime: Infinity })}>
      <AuthProvider>{ui}</AuthProvider>
    </QueryProvider>,
  );
}

export function jsonResponse(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), { status });
}
