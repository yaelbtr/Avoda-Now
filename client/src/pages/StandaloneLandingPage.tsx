import { useEffect, useMemo, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useUserMode } from "@/contexts/UserModeContext";
import henidmanLandingHtml from "@/landingPage/HenidmanLandingPage.html?raw";
import henidmanLandingScriptUrl from "@/landingPage/henidmanLandingPage.js?url";
import workerImageUrl from "@/assets/worker.png";
import systemLogoUrl from "@/assets/full logo1.svg";

const LANDING_PAGES = {
  henidman: {
    title: "AvodaGo - דף נחיתה לנותני שירות",
    html: henidmanLandingHtml,
    assets: {
      "assets/avodago-logo.png": systemLogoUrl,
      "assets/avodago-logo-light.png": systemLogoUrl,
      "assets/worker.png": workerImageUrl,
      "../assets/worker.png": workerImageUrl,
      "assets/henidman-landing.js": henidmanLandingScriptUrl,
    },
  },
} as const;

const CAMPAIGN_ROLE_SELECTED_KEY = "avoda_now_campaign_role_selected";

type LandingPageSlug = keyof typeof LANDING_PAGES;
type LandingRuntimeData = {
  liveWorkersCount: number;
};

function getLandingSlug(pathname: string): LandingPageSlug | null {
  const slug = decodeURIComponent(pathname.replace(/^\/lp\/?/, "").split("/")[0] ?? "");
  return slug in LANDING_PAGES ? (slug as LandingPageSlug) : null;
}

function formatNumber(value: number) {
  return value.toLocaleString("he-IL");
}

function buildStandaloneHtml(slug: LandingPageSlug, runtimeData: LandingRuntimeData) {
  const page = LANDING_PAGES[slug];
  const htmlWithAssets = Object.entries(page.assets).reduce(
    (html, [assetPath, assetUrl]) => html.replaceAll(assetPath, assetUrl),
    page.html,
  );

  return htmlWithAssets.replaceAll(
    "{{LIVE_WORKERS_COUNT}}",
    formatNumber(runtimeData.liveWorkersCount),
  );
}

export default function StandaloneLandingPage() {
  const [location, navigate] = useLocation();
  const { setUserMode } = useUserMode();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const slug = getLandingSlug(location);
  const heroStatsQuery = trpc.live.heroStats.useQuery(undefined, {
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
  });
  const liveWorkersCount = heroStatsQuery.data?.registeredWorkers ?? 1247;

  const srcDoc = useMemo(
    () => (slug ? buildStandaloneHtml(slug, { liveWorkersCount }) : ""),
    [slug, liveWorkersCount],
  );

  useEffect(() => {
    if (!slug) return;

    let isMounted = true;

    const onMessage = (event: MessageEvent) => {
      const iframeWindow = iframeRef.current?.contentWindow;
      if (!iframeWindow || event.source !== iframeWindow) return;
      if (event.origin !== "null" && event.origin !== window.location.origin) return;

      const messageType =
        typeof event.data === "object" && event.data !== null && "type" in event.data
          ? String((event.data as { type?: unknown }).type ?? "")
          : "";

      if (messageType !== "avodago:worker-join") return;

      void (async () => {
        try {
          try {
            sessionStorage.setItem(CAMPAIGN_ROLE_SELECTED_KEY, "1");
          } catch {}
          await setUserMode("worker");
        } finally {
          if (isMounted) navigate("/");
        }
      })();
    };

    window.addEventListener("message", onMessage);

    return () => {
      isMounted = false;
      window.removeEventListener("message", onMessage);
    };
  }, [slug, navigate, setUserMode]);

  if (!slug) {
    return (
      <main dir="rtl" className="flex min-h-dvh items-center justify-center bg-[#faf9f5] px-6 text-center">
        <div>
          <h1 className="text-2xl font-bold text-[#1b1c1a]">דף הנחיתה לא נמצא</h1>
          <p className="mt-2 text-sm text-[#46483d]">בדקו שהקישור נכון ונסו שוב.</p>
        </div>
      </main>
    );
  }

  return (
    <main
      dir="rtl"
      className="flex min-h-dvh items-stretch justify-center bg-[#efe9dc] px-0 sm:px-4 sm:py-4"
    >
      <div
        className="w-full overflow-hidden bg-[#fdfcf8] sm:max-w-[430px] sm:rounded-[28px] sm:shadow-[0_24px_80px_rgba(37,42,21,0.18)]"
      >
        <iframe
          ref={iframeRef}
          title={LANDING_PAGES[slug].title}
          srcDoc={srcDoc}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation"
          style={{
            width: "100%",
            height: "100dvh",
            border: 0,
            display: "block",
            background: "#fdfcf8",
          }}
        />
      </div>
    </main>
  );
}
