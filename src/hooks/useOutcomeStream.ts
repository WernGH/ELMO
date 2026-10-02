"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { UnifiedOutcomeWorkspace } from "@/services/agentic/outcome.service";

interface UseOutcomeStreamOptions {
  outcomeId?: string;
  organizationId?: string;
  enabled?: boolean;
}

export function useOutcomeStream({
  outcomeId,
  organizationId = "11111111-1111-1111-1111-111111111111",
  enabled = true,
}: UseOutcomeStreamOptions) {
  const [workspace, setWorkspace] = useState<UnifiedOutcomeWorkspace | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const fetchWorkspace = useCallback(async () => {
    if (!outcomeId) return;
    try {
      const res = await fetch(
        `/api/outcomes/${outcomeId}?workspace=true&organizationId=${organizationId}`
      );
      const json = await res.json();
      if (json.success && json.data) {
        setWorkspace(json.data);
      }
    } catch (err: any) {
      console.warn("[useOutcomeStream] Initial fetch error:", err);
    }
  }, [outcomeId, organizationId]);

  useEffect(() => {
    if (!outcomeId || !enabled) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setConnected(false);
      return;
    }

    // Always fetch once immediately
    fetchWorkspace();

    // Check if EventSource is supported in browser
    if (typeof window === "undefined" || !window.EventSource) {
      return;
    }

    const sseUrl = `/api/outcomes/${outcomeId}/stream?organizationId=${organizationId}`;
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.onopen = () => {
      setConnected(true);
      setError(null);
    };

    es.addEventListener("workspace", (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed) {
          setWorkspace(parsed);
        }
      } catch (err) {
        console.warn("[useOutcomeStream] Parse error", err);
      }
    });

    es.onerror = (err) => {
      setConnected(false);
      // EventSource automatically retries, so we don't break immediately
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
      setConnected(false);
    };
  }, [outcomeId, organizationId, enabled, fetchWorkspace]);

  return {
    workspace,
    connected,
    error,
    refresh: fetchWorkspace,
  };
}
