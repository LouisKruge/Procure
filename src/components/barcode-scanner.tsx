"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Camera, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Camera-based scanning for phones. Hardware scanners do not need this -
 * they type into the focused field as a keyboard wedge, which the search
 * inputs already handle.
 */
export function ScanButton({
  onScan,
  label = "Scan",
}: {
  onScan: (code: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stopRef = useRef<(() => void) | null>(null);

  // Reset the panel state as the dialog opens rather than inside the effect,
  // so opening does not trigger a second render pass before the camera starts.
  function openScanner() {
    setError(null);
    setStarting(true);
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const reader = new BrowserMultiFormatReader();

    (async () => {
      try {
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: "environment" } },
          videoRef.current!,
          (result) => {
            if (result && !cancelled) {
              // Short vibration confirms the read without needing to look up.
              navigator.vibrate?.(60);
              onScan(result.getText());
              setOpen(false);
            }
          },
        );
        stopRef.current = () => controls.stop();
        if (!cancelled) setStarting(false);
      } catch (e) {
        if (cancelled) return;
        setStarting(false);
        setError(
          e instanceof Error && /permission|NotAllowed/i.test(e.message)
            ? "Camera access was blocked. Allow it in your browser settings, or type the code instead."
            : "Could not start the camera. Type the code instead.",
        );
      }
    })();

    return () => {
      cancelled = true;
      stopRef.current?.();
      stopRef.current = null;
    };
  }, [open, onScan]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={openScanner}
        aria-label={label}
        title={label}
      >
        <Camera />
      </Button>

      <Dialog
        open={open}
        onOpenChange={(v) => (v ? openScanner() : setOpen(false))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan barcode</DialogTitle>
            <DialogDescription>
              Hold the label steady inside the frame.
            </DialogDescription>
          </DialogHeader>

          <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-black">
            <video
              ref={videoRef}
              className="size-full object-cover"
              muted
              playsInline
            />
            {starting ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="size-8 animate-spin text-white/80" />
              </div>
            ) : null}
            <div className="pointer-events-none absolute inset-x-6 top-1/2 h-0.5 -translate-y-1/2 bg-out/80" />
          </div>

          {error ? (
            <p className="rounded-lg bg-out-subtle px-3 py-2 text-sm font-medium text-out">
              {error}
            </p>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
