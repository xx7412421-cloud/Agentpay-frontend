"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/apiClient";
import { Badge } from "@/components/Badge";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useToast } from "@/components/ToastProvider";

type AdminPauseAction = "pause" | "resume";

const actionCopy: Record<
  AdminPauseAction,
  { title: string; description: string; endpoint: string; success: string }
> = {
  pause: {
    title: "Pause all writes?",
    description:
      "New write requests will be refused until an admin resumes the protocol.",
    endpoint: "/api/v1/admin/pause",
    success: "Admin writes paused.",
  },
  resume: {
    title: "Resume writes?",
    description:
      "Write requests will be accepted again after the backend confirms the change.",
    endpoint: "/api/v1/admin/unpause",
    success: "Admin writes resumed.",
  },
};

export default function AdminPage() {
  const [paused, setPaused] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<AdminPauseAction | null>(
    null
  );
  const [submittingAction, setSubmittingAction] =
    useState<AdminPauseAction | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    try {
      const body = await apiGet<{ paused: boolean }>("/api/v1/admin/status");
      setPaused(body.paused);
      return body.paused;
    } catch (err) {
      setError((err as Error).message);
      return null;
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const requestToggle = () => {
    if (paused === null || submittingAction) return;
    setPendingAction(paused ? "resume" : "pause");
  };

  const confirmToggle = async () => {
    if (!pendingAction) return;

    const stillMatches =
      (pendingAction === "pause" && paused === false) ||
      (pendingAction === "resume" && paused === true);

    if (!stillMatches) {
      setPendingAction(null);
      toast.push("Admin status changed before confirmation. Refreshed status.");
      await load();
      return;
    }

    const action = pendingAction;
    setPendingAction(null);
    setSubmittingAction(action);
    setError(null);

    try {
      await apiPost(actionCopy[action].endpoint, {});
      await load();
      toast.push(actionCopy[action].success);
    } catch (err) {
      const message = (err as Error).message;
      setError(message);
      toast.push(message, "error");
    } finally {
      setSubmittingAction(null);
    }
  };

  const activeAction = pendingAction ?? submittingAction;
  const toggleLabel =
    submittingAction === "pause"
      ? "Pausing..."
      : submittingAction === "resume"
        ? "Resuming..."
        : paused
          ? "Resume writes"
          : "Pause all writes";

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex min-h-[60vh] max-w-xl flex-col gap-6 p-8 focus:outline-none"
    >
      <ConfirmDialog
        open={pendingAction !== null}
        title={activeAction ? actionCopy[activeAction].title : ""}
        description={activeAction ? actionCopy[activeAction].description : ""}
        confirmLabel={
          activeAction === "pause" ? "Pause all writes" : "Resume writes"
        }
        onConfirm={confirmToggle}
        onCancel={() => setPendingAction(null)}
      />
      <h1 className="text-3xl font-semibold tracking-tight">Admin</h1>
      {paused === null && !error && <p>Loading status...</p>}
      {paused !== null && (
        <section className="flex items-center justify-between rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex flex-col gap-1">
            <p>
              Status: <strong>{paused ? "Paused" : "Live"}</strong>
            </p>
            <Badge
              variant={
                submittingAction ? "warning" : paused ? "danger" : "ok"
              }
            >
              {submittingAction
                ? "Updating"
                : paused
                  ? "Writes paused"
                  : "Writes enabled"}
            </Badge>
          </div>
          <button
            type="button"
            onClick={requestToggle}
            disabled={submittingAction !== null}
            aria-disabled={submittingAction !== null}
            className="rounded-full bg-black px-5 py-2 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:cursor-not-allowed disabled:bg-zinc-500"
          >
            {toggleLabel}
          </button>
        </section>
      )}
      {error && (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      )}
    </main>
  );
}
