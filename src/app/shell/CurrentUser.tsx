import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// Lets the host platform (this app is meant to be embedded as an <iframe>) tell
// us who's logged in, so "Hi <name>" and newly AI-created drafts' creator/
// activity fields reflect the real signed-in user instead of a fixed demo name.
//
// Two ways in, either works alone or together:
//   1. URL query param — the host sets the iframe src per-session:
//        <iframe src="https://bi-ai-src.vercel.app/?user=Jane%20Doe">
//      Read once on load. Simplest option; no host-side JS needed beyond the src.
//   2. postMessage — the host calls, any time after the iframe has loaded:
//        iframe.contentWindow.postMessage(
//          { type: "bi-ideation:set-user", name: "Jane Doe" },
//          "https://bi-ai-src.vercel.app"
//        );
//      Useful if the host is itself an SPA and can't easily control the iframe's
//      src, or wants to update the name after the fact (e.g. session refresh)
//      without reloading the iframe.
//
// No origin check is enforced on the receiving end since the display name isn't
// sensitive and the host origin isn't known in advance (any page can embed this
// app). Don't extend this channel to pass anything sensitive without adding one.
const DEFAULT_USER_NAME = "Dilip";
const MESSAGE_TYPE = "bi-ideation:set-user";

function readUserFromUrl(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("user") ?? params.get("username");
    return raw && raw.trim() ? raw.trim() : null;
  } catch {
    return null;
  }
}

const CurrentUserContext = createContext<string>(DEFAULT_USER_NAME);

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [name, setName] = useState<string>(() => readUserFromUrl() ?? DEFAULT_USER_NAME);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const data = e.data as { type?: string; name?: string } | undefined;
      if (data?.type === MESSAGE_TYPE && typeof data.name === "string" && data.name.trim()) {
        setName(data.name.trim());
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return <CurrentUserContext.Provider value={name}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser(): string {
  return useContext(CurrentUserContext);
}
