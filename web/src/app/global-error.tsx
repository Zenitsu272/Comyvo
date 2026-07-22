"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body>
        <main style={{ maxWidth: 560, margin: "15vh auto", padding: 24, fontFamily: "system-ui" }}>
          <p style={{ color: "#087f5b", fontWeight: 700 }}>COMYVO</p>
          <h1>Something went wrong</h1>
          <p>We could not complete that request. Your account and ride data are still safe.</p>
          <button onClick={reset} style={{ padding: "12px 18px", borderRadius: 10, border: 0, background: "#111", color: "white", fontWeight: 700 }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
