"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  ClipboardList,
  Flashlight,
  FlashlightOff,
  ScanLine,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import {
  initialScanState,
  scanTicket,
  type ScanResult,
} from "@/app/actions/scanner";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import type { RecentCheckIn, ScannerEvent } from "@/lib/data/scanner";
import { scanVerdictFor } from "@/lib/scanner";
import { cn, formatDateTime, relativeTime } from "@/lib/utils";

type CameraDevice = { id: string; label: string };

type Html5QrcodeInstance = {
  start: (
    source: { facingMode?: string; deviceId?: { exact: string } },
    config: { fps: number; qrbox: { width: number; height: number } },
    onSuccess: (decodedText: string) => void,
    onFailure?: () => void,
  ) => Promise<void>;
  stop: () => Promise<void>;
  applyVideoConstraints?: (constraints: {
    advanced: Array<Record<string, unknown>>;
  }) => Promise<void>;
  getRunningTrack?: () => MediaStreamTrack | null;
};

export function ScannerConsole({
  events,
  recent,
  initialEventId = "",
}: {
  events: ScannerEvent[];
  recent: RecentCheckIn[];
  initialEventId?: string;
}) {
  const [state, formAction, pending] = useActionState(
    scanTicket,
    initialScanState,
  );
  const [eventId, setEventId] = useState(initialEventId);
  const [token, setToken] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [cameraId, setCameraId] = useState("");
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const readerRef = useRef<HTMLDivElement | null>(null);
  const scannerRef = useRef<Html5QrcodeInstance | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);

  const submitToken = useCallback(
    (value: string, method: "qr" | "manual") => {
      const formData = new FormData();
      formData.set("token", value.trim());
      formData.set("event_id", eventId);
      formData.set("method", method);
      formAction(formData);
    },
    [eventId, formAction],
  );

  const stopCamera = useCallback(async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;
    setCameraActive(false);
    setTorchOn(false);
    setTorchSupported(false);
    if (scanner) {
      try {
        await scanner.stop();
      } catch {
        // The camera may already have been released by the browser.
      }
    }
  }, []);

  useEffect(() => {
    return () => {
      void stopCamera();
    };
  }, [stopCamera]);

  useEffect(() => {
    if (state.status !== "idle" && resultRef.current) {
      resultRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [state]);

  async function startCamera(deviceId = cameraId) {
    setCameraError("");
    if (!readerRef.current) return;
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("scanner-reader", {
        verbose: false,
      }) as unknown as Html5QrcodeInstance;
      scannerRef.current = scanner;
      setCameraActive(true);
      const source = deviceId
        ? { deviceId: { exact: deviceId } }
        : { facingMode: "environment" };
      await scanner.start(
        source,
        { fps: 10, qrbox: { width: 260, height: 260 } },
        (decoded) => {
          setToken(decoded);
          void stopCamera().then(() => submitToken(decoded, "qr"));
        },
        () => {},
      );
      // Torch is only offered when the browser reports support on the track.
      try {
        const track = scanner.getRunningTrack?.() ?? null;
        const caps = (track?.getCapabilities?.() ?? {}) as Record<
          string,
          unknown
        >;
        setTorchSupported(typeof caps.torch === "boolean");
      } catch {
        setTorchSupported(false);
      }
      // Populate camera list for the picker (labels need prior permission).
      try {
        const list = await (
          Html5Qrcode as unknown as {
            getCameras: () => Promise<CameraDevice[]>;
          }
        ).getCameras();
        setCameras(list);
      } catch {
        setCameras([]);
      }
    } catch (error) {
      scannerRef.current = null;
      setCameraActive(false);
      setTorchOn(false);
      setCameraError(
        error instanceof Error
          ? `Camera unavailable: ${error.message}`
          : "Camera unavailable. Use manual code entry instead.",
      );
    }
  }

  async function toggleTorch() {
    const scanner = scannerRef.current;
    if (!scanner?.applyVideoConstraints) return;
    const next = !torchOn;
    try {
      await scanner.applyVideoConstraints({
        advanced: [{ torch: next }],
      });
      setTorchOn(next);
    } catch {
      setTorchSupported(false);
      setTorchOn(false);
    }
  }

  async function switchCamera(nextId: string) {
    setCameraId(nextId);
    await stopCamera();
    await startCamera(nextId);
  }

  const result: ScanResult | undefined = state.result;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-5">
        <section className="rounded-2xl border border-line bg-card p-5 shadow-card sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold text-ink">Check in a ticket</h2>
              <p className="mt-1 text-[11.5px] leading-5 text-muted">
                Scan the attendee&apos;s QR code or paste the code from their ticket.
                Every check-in is recorded against your account.
              </p>
            </div>
            <Badge tone="brand" className="text-[10px]">
              {events.length} assigned event{events.length === 1 ? "" : "s"}
            </Badge>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <Label htmlFor="scan-event">Event filter</Label>
              <Select
                id="scan-event"
                value={eventId}
                onChange={(event) => setEventId(event.target.value)}
                className="h-10 text-[12px]"
              >
                <option value="">All assigned events</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title} · {event.city}
                  </option>
                ))}
              </Select>
              <p className="mt-1.5 text-[10.5px] leading-4 text-muted">
                Choose a specific event to prevent accidentally checking in a ticket
                from another event. A mismatched ticket is always rejected.
              </p>
            </div>

            <div className="rounded-xl border border-line bg-surface p-3">
              <div
                ref={readerRef}
                id="scanner-reader"
                className={cn(
                  "w-full overflow-hidden rounded-lg bg-forest",
                  cameraActive ? "min-h-[240px]" : "hidden",
                )}
                aria-hidden={!cameraActive}
              />
              {!cameraActive ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <ScanLine className="h-7 w-7 text-accent-300" strokeWidth={1.6} />
                  <p className="mt-2 text-[12px] font-medium text-ink">
                    Camera is off
                  </p>
                  <p className="mt-1 max-w-sm text-[10.5px] leading-4 text-muted">
                    Camera access needs HTTPS and your browser&apos;s permission. Manual
                    entry works everywhere.
                  </p>
                </div>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {cameraActive ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void stopCamera()}
                    >
                      <CameraOff className="h-3.5 w-3.5" />
                      Stop camera
                    </Button>
                    {cameras.length > 1 ? (
                      <Select
                        value={cameraId}
                        onChange={(change) => void switchCamera(change.target.value)}
                        className="h-8 max-w-[190px] text-[11px]"
                        aria-label="Camera selection"
                      >
                        <option value="">Rear camera</option>
                        {cameras.map((camera) => (
                          <option key={camera.id} value={camera.id}>
                            {camera.label || `Camera ${camera.id.slice(0, 6)}`}
                          </option>
                        ))}
                      </Select>
                    ) : null}
                    {torchSupported ? (
                      <Button
                        type="button"
                        variant={torchOn ? "primary" : "outline"}
                        size="sm"
                        onClick={() => void toggleTorch()}
                        aria-pressed={torchOn}
                      >
                        {torchOn ? (
                          <FlashlightOff className="h-3.5 w-3.5" />
                        ) : (
                          <Flashlight className="h-3.5 w-3.5" />
                        )}
                        {torchOn ? "Torch off" : "Torch"}
                      </Button>
                    ) : null}
                  </>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void startCamera()}
                    disabled={events.length === 0}
                  >
                    <Camera className="h-3.5 w-3.5" />
                    Start camera
                  </Button>
                )}
              </div>
              {cameraError ? (
                <Alert tone="danger" className="mt-3 text-[11px]">
                  {cameraError}
                </Alert>
              ) : null}
            </div>

            <div className="relative flex items-center gap-3">
              <span className="h-px flex-1 bg-line" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                or enter manually
              </span>
              <span className="h-px flex-1 bg-line" />
            </div>

            <form
              action={formAction}
              onSubmit={(submitEvent) => {
                if (!token.trim()) submitEvent.preventDefault();
              }}
              className="space-y-3"
            >
              <input type="hidden" name="event_id" value={eventId} />
              <input type="hidden" name="method" value="manual" />
              <div>
                <Label htmlFor="scan-token">Ticket code</Label>
                <Input
                  id="scan-token"
                  name="token"
                  value={token}
                  onChange={(change) => setToken(change.target.value)}
                  placeholder="TKT-XXXX-XXXX-XXXX"
                  className="font-mono text-[12px]"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={200}
                  disabled={events.length === 0}
                />
              </div>
              <Button
                type="submit"
                loading={pending}
                disabled={events.length === 0 || !token.trim()}
                className="w-full sm:w-auto"
              >
                <CheckCircle2 className="h-4 w-4" />
                Check in ticket
              </Button>
            </form>

            {events.length === 0 ? (
              <Alert tone="warning">
                You are not assigned to any events yet. Ask the organizer to add you
                as a scanner from their Staff &amp; scanners page.
              </Alert>
            ) : null}
          </div>
        </section>

        <div ref={resultRef}>
          {result ? (
            <ScanVerdictBanner result={result} onScanNext={() => setToken("")} />
          ) : state.status === "error" && state.message ? (
            <Alert tone="danger">{state.message}</Alert>
          ) : null}
        </div>
      </div>

      <aside className="space-y-5">
        <section className="rounded-2xl border border-line bg-card p-5 shadow-card">
          <h2 className="flex items-center gap-2 text-[14px] font-semibold text-ink">
            <ClipboardList className="h-4 w-4 text-accent-300" />
            Recent check-ins
          </h2>
          <p className="mt-1 text-[11px] leading-5 text-muted">
            Latest scans on your assigned events. Live records only.
          </p>
          {recent.length === 0 ? (
            <p className="mt-4 rounded-xl border border-dashed border-line bg-surface p-4 text-[11.5px] leading-5 text-muted">
              No tickets have been checked in on these events yet.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {recent.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-line px-3 py-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[12px] font-semibold text-ink">
                        {entry.attendeeName}
                      </p>
                      <p className="mt-0.5 truncate font-mono text-[9.5px] text-muted">
                        {entry.ticketReference}
                      </p>
                    </div>
                    <Badge
                      tone={entry.method === "qr" ? "brand" : "neutral"}
                      className="text-[9px] uppercase"
                    >
                      {entry.method}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-[10px] text-muted">
                    {entry.eventTitle} · {entry.ticketTypeName}
                  </p>
                  <p className="mt-1 text-[9.5px] text-muted">
                    {relativeTime(entry.scannedAt)} by {entry.scannedByName}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-line bg-surface p-5 text-[11px] leading-5 text-muted">
          <p className="font-semibold text-ink">Scan rules</p>
          <ul className="mt-2 list-inside list-disc space-y-1">
            <li>Each ticket can only be checked in once.</li>
            <li>Cancelled and refunded tickets are always rejected.</li>
            <li>A ticket from another event is rejected even when the code is valid.</li>
            <li>Repeated attempts are rate limited to protect the door queue.</li>
          </ul>
        </section>
      </aside>
    </div>
  );
}

const VERDICTS = {
  valid: {
    label: "VALID TICKET",
    container: "border-success/30 bg-success/15",
    icon: "bg-success text-white",
    Icon: CheckCircle2,
  },
  duplicate: {
    label: "ALREADY CHECKED IN",
    container: "border-warning/30 bg-warning/15",
    icon: "bg-warning text-forest",
    Icon: TriangleAlert,
  },
  wrong_event: {
    label: "WRONG EVENT",
    container: "border-warning/30 bg-warning/15",
    icon: "bg-warning text-forest",
    Icon: TriangleAlert,
  },
  invalid: {
    label: "INVALID TICKET",
    container: "border-danger/30 bg-danger/15",
    icon: "bg-danger text-white",
    Icon: XCircle,
  },
} as const;

function ScanVerdictBanner({
  result,
  onScanNext,
}: {
  result: ScanResult;
  onScanNext: () => void;
}) {
  const verdict = VERDICTS[scanVerdictFor(result.code, result.success)];
  const Icon = verdict.Icon;
  const isValid = verdict.label === "VALID TICKET";

  return (
    <div className={cn("rounded-2xl border p-5 shadow-card", verdict.container)} role="alert">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
            verdict.icon,
          )}
        >
          <Icon className="h-6 w-6" strokeWidth={2.2} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-bold tracking-[0.08em] text-ink">
            {verdict.label}
          </p>
          <p className="mt-1 text-[12.5px] leading-5 text-ink/80">
            {result.message}
          </p>
          {result.code && !result.success ? (
            <p className="mt-1 font-mono text-[10px] text-muted">{result.code}</p>
          ) : null}
          <div className="mt-3 grid gap-1 text-[11.5px] text-ink/80 sm:grid-cols-2">
            {result.attendeeName ? (
              <p>
                <span className="font-semibold">Attendee:</span> {result.attendeeName}
              </p>
            ) : null}
            {result.ticketReference ? (
              <p className="font-mono">
                <span className="font-sans font-semibold">Ticket:</span>{" "}
                {result.ticketReference}
              </p>
            ) : null}
            {result.ticketType ? (
              <p>
                <span className="font-semibold">Type:</span> {result.ticketType}
              </p>
            ) : null}
            {result.eventTitle ? (
              <p>
                <span className="font-semibold">Event:</span> {result.eventTitle}
              </p>
            ) : null}
            {result.checkedInAt ? (
              <p>
                <span className="font-semibold">
                  {isValid ? "Checked in at:" : "Original check-in:"}
                </span>{" "}
                {formatDateTime(result.checkedInAt)}
              </p>
            ) : null}
            {result.scannedBy ? (
              <p>
                <span className="font-semibold">By:</span> {result.scannedBy}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      {isValid ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={onScanNext}
        >
          Scan next ticket
        </Button>
      ) : null}
    </div>
  );
}
