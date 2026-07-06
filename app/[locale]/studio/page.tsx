"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusTimeline } from "@/components/studio/StatusTimeline";
import { ClipCandidateList } from "@/components/studio/ClipCandidateList";
import {
  createReelifyClient,
  errorMessage,
  formatMs,
  uploadVideo,
  type AuthMode,
  type ClipCandidate,
  type ProcessingJob,
  type Transcript,
  type UploadPhase,
  type UploadProgress,
} from "@/lib/reelifyApi";

// ── Env-derived config (NEXT_PUBLIC_* are inlined at build time) ───────────────
const AUTH_MODE: AuthMode = process.env.NEXT_PUBLIC_AUTH_MODE === "cognito" ? "cognito" : "dev";
const DEFAULT_API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8090";
const DEFAULT_WORKSPACE_ID = process.env.NEXT_PUBLIC_PILOT_WORKSPACE_ID || "ws_e2e";
const STORAGE_KEY = AUTH_MODE === "cognito" ? "reelify_pilot_token" : "reelify_pilot_user_id";

const TERMINAL_STATUSES = new Set<string>(["COMPLETED", "FAILED", "CANCELLED"]);

const PHASE_LABEL: Record<UploadPhase, string> = {
  "creating-session": "Creating upload session…",
  presigning: "Requesting presigned part URLs…",
  uploading: "Uploading parts to S3…",
  completing: "Finalizing multipart upload…",
  done: "Upload complete",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(2)} ${units[unit]}`;
}

export default function StudioPilotPage() {
  // Auth
  const [credentialInput, setCredentialInput] = useState("");
  const [credential, setCredential] = useState("");
  const [credentialSaved, setCredentialSaved] = useState(false);

  // Config (seeded from env, editable for pilot convenience)
  const [apiBase, setApiBase] = useState(DEFAULT_API_BASE);
  const [workspaceId, setWorkspaceId] = useState(DEFAULT_WORKSPACE_ID);

  // Upload / job / results
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);

  const [videoId, setVideoId] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [job, setJob] = useState<ProcessingJob | null>(null);
  const [polling, setPolling] = useState(false);

  const [resultsLoading, setResultsLoading] = useState(false);
  const [transcript, setTranscript] = useState<Transcript | null>(null);
  const [candidates, setCandidates] = useState<ClipCandidate[] | null>(null);

  const [error, setError] = useState<string | null>(null);

  // Load any previously stored credential on mount (client-only).
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setCredentialInput(stored);
        setCredential(stored);
        setCredentialSaved(true);
      }
    } catch {
      // Ignore storage access errors (private mode, etc.).
    }
  }, []);

  const client = useMemo(
    () => createReelifyClient({ baseUrl: apiBase, authMode: AUTH_MODE, credential }),
    [apiBase, credential]
  );

  const saveCredential = useCallback(() => {
    const trimmed = credentialInput.trim();
    setCredential(trimmed);
    try {
      if (trimmed) {
        window.localStorage.setItem(STORAGE_KEY, trimmed);
        setCredentialSaved(true);
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
        setCredentialSaved(false);
      }
    } catch {
      // Ignore storage access errors.
    }
  }, [credentialInput]);

  const clearCredential = useCallback(() => {
    setCredentialInput("");
    setCredential("");
    setCredentialSaved(false);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage access errors.
    }
  }, []);

  const loadResults = useCallback(
    async (vid: string) => {
      setResultsLoading(true);
      try {
        const [t, c] = await Promise.all([client.getTranscript(vid), client.getClipCandidates(vid)]);
        setTranscript(t);
        setCandidates(c.candidates);
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setResultsLoading(false);
      }
    },
    [client]
  );

  // Poll the processing job every 3s until it reaches a terminal state.
  useEffect(() => {
    if (!jobId || !polling) return;
    let cancelled = false;

    const tick = async () => {
      try {
        const result = await client.getProcessingJob(jobId);
        if (cancelled) return;
        setJob(result);
        setJobStatus(result.status);
        if (TERMINAL_STATUSES.has(result.status)) {
          setPolling(false);
          if (result.status === "COMPLETED") void loadResults(result.videoId);
        }
      } catch (err) {
        if (cancelled) return;
        setError(errorMessage(err));
        setPolling(false);
      }
    };

    void tick();
    const timer = window.setInterval(() => void tick(), 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [jobId, polling, client, loadResults]);

  const resetRun = useCallback(() => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploading(false);
    setProgress(null);
    setVideoId(null);
    setJobId(null);
    setJobStatus(null);
    setJob(null);
    setPolling(false);
    setResultsLoading(false);
    setTranscript(null);
    setCandidates(null);
    setError(null);
  }, []);

  const startFlow = useCallback(async () => {
    if (!credential) {
      setError(AUTH_MODE === "cognito" ? "Save a bearer token first." : "Save a dev user id first.");
      return;
    }
    if (!file) {
      setError("Choose a video file first.");
      return;
    }

    // Reset run-specific state but keep auth/config.
    setError(null);
    setProgress(null);
    setVideoId(null);
    setJobId(null);
    setJobStatus(null);
    setJob(null);
    setPolling(false);
    setTranscript(null);
    setCandidates(null);

    setUploading(true);
    try {
      const { session, completion } = await uploadVideo(client, workspaceId, file, setProgress);
      setVideoId(completion.videoId || session.videoId);
      setJobId(completion.processingJobId);
      setJobStatus(completion.processingStatus);
      setPolling(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  }, [client, credential, file, workspaceId]);

  const busy = uploading || polling;
  const percent =
    progress && progress.partsTotal > 0 ? Math.round((progress.partsDone / progress.partsTotal) * 100) : 0;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 text-gray-900">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        {/* Header */}
        <header className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-widest text-gray-500">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Studio · pilot
          </div>
          <h1 className="text-3xl font-black tracking-tight">Reelify Studio (pilot)</h1>
          <p className="text-sm text-gray-500">
            End-to-end exercise of the AWS backend: multipart upload → processing → transcript → clip
            candidates. Auth mode: <span className="font-mono font-semibold">{AUTH_MODE}</span>.
          </p>
        </header>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        {/* Auth + Config */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Auth</CardTitle>
              <CardDescription>
                {AUTH_MODE === "cognito"
                  ? "Cognito mode — stores a bearer token, sent as Authorization: Bearer."
                  : "Dev mode — stores a user id, sent as x-reelify-user."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400">
                {AUTH_MODE === "cognito" ? "Bearer token" : "Dev user id"}
              </label>
              <input
                type={AUTH_MODE === "cognito" ? "password" : "text"}
                value={credentialInput}
                onChange={(e) => setCredentialInput(e.target.value)}
                placeholder={AUTH_MODE === "cognito" ? "eyJ…" : "user_123"}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200"
              />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={saveCredential} disabled={busy}>
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={clearCredential} disabled={busy}>
                  Clear
                </Button>
                <span className="text-xs text-gray-400">
                  {credentialSaved ? "Stored in localStorage" : "Not saved"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Config</CardTitle>
              <CardDescription>Seeded from NEXT_PUBLIC_* env, editable for this session.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400">
                  API base
                </label>
                <input
                  type="text"
                  value={apiBase}
                  onChange={(e) => setApiBase(e.target.value)}
                  disabled={busy}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-xs focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:bg-gray-100"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-semibold uppercase tracking-widest text-gray-400">
                  Workspace id
                </label>
                <input
                  type="text"
                  value={workspaceId}
                  onChange={(e) => setWorkspaceId(e.target.value)}
                  disabled={busy}
                  className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-xs focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:bg-gray-100"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Upload video</CardTitle>
            <CardDescription>Pick a video, then run the full upload + processing flow.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              disabled={busy}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-md file:border-0 file:bg-gray-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-gray-700"
            />
            {file && (
              <p className="text-xs text-gray-500">
                <span className="font-medium text-gray-700">{file.name}</span> · {formatBytes(file.size)} ·{" "}
                {file.type || "unknown type"}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => void startFlow()} disabled={busy || !file || !credential}>
                {uploading ? "Uploading…" : polling ? "Processing…" : "Start upload"}
              </Button>
              {(jobId || file) && (
                <Button variant="outline" onClick={resetRun} disabled={uploading}>
                  Reset
                </Button>
              )}
            </div>

            {progress && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{PHASE_LABEL[progress.phase]}</span>
                  {progress.phase === "uploading" && (
                    <span className="font-mono">
                      {progress.partsDone}/{progress.partsTotal} parts
                    </span>
                  )}
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${progress.phase === "done" ? 100 : percent}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status */}
        {jobId && (
          <Card>
            <CardHeader>
              <CardTitle>Processing status</CardTitle>
              <CardDescription>
                Polling every 3s · job <span className="font-mono">{jobId}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <StatusTimeline status={jobStatus} updatedAt={job?.updatedAt} />
              <div className="grid grid-cols-1 gap-1 text-xs text-gray-500 sm:grid-cols-2">
                {videoId && (
                  <p>
                    Video: <span className="font-mono text-gray-700">{videoId}</span>
                  </p>
                )}
                {job?.pipelineVersion && (
                  <p>
                    Pipeline: <span className="font-mono text-gray-700">{job.pipelineVersion}</span>
                  </p>
                )}
              </div>
              {job?.lastError && (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {job.lastError}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {(resultsLoading || transcript || candidates) && (
          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
              <CardDescription>Transcript + scored clip candidates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {resultsLoading && <p className="text-sm text-gray-500">Loading results…</p>}

              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-900">Transcript</h3>
                {transcript ? (
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">
                        language: {transcript.language}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">
                        {transcript.wordCount} words
                      </span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">
                        {formatMs(transcript.durationMs)}
                      </span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">
                        {transcript.provider}/{transcript.model}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap rounded-md border border-gray-200 bg-white p-3 text-sm text-gray-700">
                      {transcript.text.slice(0, 500)}
                      {transcript.text.length > 500 ? "…" : ""}
                    </p>
                  </div>
                ) : (
                  !resultsLoading && <p className="text-sm text-gray-500">No transcript available.</p>
                )}
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-900">
                  Clip candidates{candidates ? ` (${candidates.length})` : ""}
                </h3>
                {candidates ? (
                  <ClipCandidateList candidates={candidates} />
                ) : (
                  !resultsLoading && <p className="text-sm text-gray-500">No clip candidates yet.</p>
                )}
              </section>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
