import { trpc } from "@/lib/trpc";
import { shouldRetry, retryDelay } from "@/lib/queryRetry";
import { PHONE_REQUIRED_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetry,
      retryDelay,
      staleTime: 30_000,
    },
    mutations: {
      retry: false,
    },
  },
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;
  const isPhoneRequired = error.message === PHONE_REQUIRED_ERR_MSG;

  if (isPhoneRequired) {
    // Dispatch a custom event so the Navbar can open LoginModal with a phone-required message.
    // This avoids a hard redirect and keeps the user on the current page.
    window.dispatchEvent(new CustomEvent("avodanow:phone-required"));
    return;
  }

  if (!isUnauthorized) return;

  // Navigate to home (role selection) instead of Manus OAuth portal.
  // Our auth is OTP/email-based — the OAuth portal is not relevant for end users.
  const currentPath = window.location.pathname;
  if (currentPath !== "/") {
    window.location.href = "/";
  }
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <div className="desktop-wrapper">
        <div id="mobile-root" className="mobile-wrapper">
          <App />
        </div>
      </div>
    </QueryClientProvider>
  </trpc.Provider>
);
