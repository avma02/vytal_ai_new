/**
 * useWebSocket — real-time updates hook (auto-reconnects).
 *
 *   useWebSocket()                      → staff dashboards: authenticates with the JWT in localStorage
 *   useWebSocket({ sessionId })         → public voice-registration page: receives ONLY the
 *                                         registration produced by this browser's own call
 *
 * Exposes:
 *   latestPatient  – last `new_patient` payload (admins + the calling session)
 *   assignedCount  – increments each time an admin assigns a patient to this doctor
 *   wsConnected    – boolean
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { API_BASE_URL } from "../services/api";

const WS_BASE = API_BASE_URL.replace(/^http/, "ws") + "/ws/updates";
const RECONNECT_DELAY_MS = 2000;
const POLICY_VIOLATION = 1008; // server refused us (bad/expired token) — do not retry

function buildUrl(sessionId) {
  if (sessionId) return `${WS_BASE}?session=${encodeURIComponent(sessionId)}`;
  const token = localStorage.getItem("vytalai_token");
  return token ? `${WS_BASE}?token=${encodeURIComponent(token)}` : null;
}

export function useWebSocket({ sessionId } = {}) {
  const [latestPatient, setLatestPatient] = useState(null);
  const [assignedCount, setAssignedCount] = useState(0);
  const [wsConnected,   setWsConnected]   = useState(false);
  const wsRef       = useRef(null);
  const timerRef    = useRef(null);
  const shouldRecon = useRef(true);

  const connect = useCallback(() => {
    if (!shouldRecon.current) return;
    const url = buildUrl(sessionId);
    if (!url) return; // not logged in and no session → nothing to listen to

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setWsConnected(true);

    ws.onmessage = (e) => {
      if (e.data === "pong") return;
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "new_patient")           setLatestPatient(msg.patient);
        else if (msg.type === "patient_assigned") setAssignedCount((n) => n + 1);
      } catch (err) {
        console.warn("WS parse error:", err);
      }
    };

    ws.onerror = () => { /* onclose handles retry */ };

    ws.onclose = (ev) => {
      setWsConnected(false);
      if (ev.code === POLICY_VIOLATION) { shouldRecon.current = false; return; }
      if (shouldRecon.current) timerRef.current = setTimeout(connect, RECONNECT_DELAY_MS);
    };
  }, [sessionId]);

  useEffect(() => {
    shouldRecon.current = true;
    connect();

    // Keep-alive ping every 25 seconds (proxies drop idle sockets)
    const ping = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send("ping");
    }, 25_000);

    return () => {
      shouldRecon.current = false;
      clearInterval(ping);
      clearTimeout(timerRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { latestPatient, assignedCount, wsConnected };
}
