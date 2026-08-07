import { Shimmer } from "@/components/ui/data-display";

/**
 * Shown the instant a navigation starts, for every screen in the app.
 *
 * Without this file the App Router has nothing to swap in while a dynamic
 * page renders on the server, so a tap on the sidebar left the old screen
 * sitting there, unchanged and unresponsive, until the response came back.
 * That silence is most of what "slow" felt like - the work was not much
 * slower than it is now, it just never acknowledged the tap.
 *
 * It also earns the prefetch: Next will pull this shell down for links in
 * the viewport, so by the time someone clicks, the frame is already local.
 */
export default function Loading() {
  return (
    <div className="animate-in-up">
      <div className="mb-5 space-y-2.5">
        <Shimmer className="h-7 w-56" />
        <Shimmer className="h-3.5 w-72 opacity-60" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="surface edge-lit h-[15.5rem] p-5">
            <Shimmer className="h-2.5 w-24 opacity-70" />
            <Shimmer className="mt-4 h-10 w-32" />
            <Shimmer className="mt-3 h-3 w-40 opacity-60" />
            <div className="mt-7 space-y-2.5">
              <Shimmer className="h-3 w-full opacity-50" />
              <Shimmer className="h-3 w-4/5 opacity-40" />
              <Shimmer className="h-3 w-2/3 opacity-30" />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="surface edge-lit p-5">
            <Shimmer className="h-3.5 w-32" />
            <div className="mt-5 space-y-4">
              {[0, 1, 2, 3].map((r) => (
                <div key={r} className="flex items-center gap-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <Shimmer className="h-3 w-28" />
                    <Shimmer className="h-2.5 w-44 opacity-50" />
                  </div>
                  <Shimmer className="h-3.5 w-12 opacity-60" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
