/**
 * useGoogleAuth — Google OAuth2 Token Flow
 *
 * WHY CHANGED:
 * - GSI One Tap (google.accounts.id) with ux_mode="popup" requires COOP header
 * - COOP "same-origin-allow-popups" blocks other Google iframes → postMessage errors
 * - Without COOP, GSI popup can't send credential back → main page redirects to Google → loop
 *
 * SOLUTION: google.accounts.oauth2.initTokenClient()
 * - Opens a standard OAuth2 popup (no COOP needed)
 * - No FedCM, no redirect, no postMessage issues
 * - Returns access_token → sent to backend /users/google/verify as { idToken: access_token }
 * - Backend already supports access_token (tries userinfo endpoint first per the comment)
 */

const GOOGLE_CLIENT_ID =
  "256106414119-mmscg4cq29qu5itfgkccs6g35ujnv0qq.apps.googleusercontent.com";

import { useState, useEffect, useRef, useCallback } from "react";

// Module-level: script sirf ek baar load ho
let _scriptLoaded = false;
let _scriptLoading = false;
let _onLoadCallbacks = [];

function loadGsiScript(onReady) {
  if (_scriptLoaded && window.google?.accounts?.oauth2) {
    onReady();
    return;
  }
  _onLoadCallbacks.push(onReady);
  if (_scriptLoading) return;
  _scriptLoading = true;

  const existing = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
  if (existing) {
    existing.addEventListener("load", () => {
      _scriptLoaded = true;
      _onLoadCallbacks.forEach(cb => { try { cb(); } catch {} });
      _onLoadCallbacks = [];
    });
    return;
  }

  const script = document.createElement("script");
  script.src = "https://accounts.google.com/gsi/client";
  script.async = true;
  script.defer = true;
  script.onload = () => {
    _scriptLoaded = true;
    _onLoadCallbacks.forEach(cb => { try { cb(); } catch {} });
    _onLoadCallbacks = [];
  };
  document.head.appendChild(script);
}

export function useGoogleAuth(onCredential) {
  const [gsiReady, setGsiReady] = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [gError, setGError]     = useState("");
  const mountedRef      = useRef(true);
  const tokenClientRef  = useRef(null);
  const callbackRef     = useRef(onCredential);
  callbackRef.current   = onCredential;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Load script and initialize OAuth2 token client
  useEffect(() => {
    const initClient = () => {
      if (!window.google?.accounts?.oauth2) return;

      // google.accounts.oauth2.initTokenClient — standard OAuth2 popup
      // No COOP needed, no FedCM, no redirect loop
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: "openid email profile",
        callback: async (tokenResponse) => {
          if (!mountedRef.current) return;

          // tokenResponse.access_token — send to backend
          if (tokenResponse?.error) {
            setGLoading(false);
            setGError(
              tokenResponse.error === "access_denied"
                ? "Google login cancel kar diya."
                : `Google error: ${tokenResponse.error}`
            );
            return;
          }

          if (!tokenResponse?.access_token) {
            setGLoading(false);
            setGError("Google se token nahi mila. Dobara try karo.");
            return;
          }

          // Pass access_token to the page's handler (Login/Register)
          // We wrap it like GSI credential response for API compatibility
          try {
            await callbackRef.current({ credential: tokenResponse.access_token });
          } catch {
            // Error already handled in callbackRef
          }
        },
        error_callback: (err) => {
          if (!mountedRef.current) return;
          setGLoading(false);
          if (err?.type === "popup_closed") {
            // User closed popup — not an error
            setGError("");
          } else {
            setGError("Google popup band ho gaya ya block hua. Dobara try karo.");
          }
        },
      });

      if (mountedRef.current) setGsiReady(true);
    };

    loadGsiScript(initClient);

    // If already loaded
    if (_scriptLoaded && window.google?.accounts?.oauth2) initClient();
  }, []);

  const handleGoogleClick = useCallback(() => {
    if (!gsiReady || !tokenClientRef.current) {
      setGError("Google SDK load ho raha hai, ek second ruko.");
      return;
    }
    if (gLoading) return;

    setGError("");
    setGLoading(true);

    // Safety timeout
    const timeoutId = setTimeout(() => {
      if (mountedRef.current) {
        setGLoading(false);
        setGError("Google sign-in timeout. Dobara try karo.");
      }
    }, 60000);

    // Store timeout so callback can clear it
    tokenClientRef.current._timeoutId = timeoutId;

    // requestAccessToken opens a standard Google OAuth popup
    // No redirect, no COOP needed, works on localhost
    tokenClientRef.current.requestAccessToken({ prompt: "select_account" });
  }, [gsiReady, gLoading]);

  const clearLoading = useCallback(() => {
    if (mountedRef.current) setGLoading(false);
    if (tokenClientRef.current?._timeoutId) {
      clearTimeout(tokenClientRef.current._timeoutId);
    }
  }, []);

  return { gsiReady, gLoading, gError, handleGoogleClick, clearLoading };
}