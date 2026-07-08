interface SkeletonProps {
  height?: number | string;
  width?: number | string;
  className?: string;
}

export function Skeleton({ height = 20, width = "100%", className = "" }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ height, width }}
      aria-hidden="true"
    />
  );
}

export function PoolCardSkeleton() {
  return (
    <div style={{ padding: "24px 28px", border: "1px solid var(--line)", borderRadius: 14, background: "var(--panel)" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <Skeleton height={29} width={100} />
        <Skeleton height={29} width={80} />
      </div>
      <Skeleton height={22} width="70%" />
      <div style={{ margin: "14px 0" }}>
        <Skeleton height={18} width="50%" />
        <div style={{ marginTop: 8 }}>
          <Skeleton height={18} width="40%" />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.6fr 0.9fr", gap: 8, marginBottom: 14 }}>
        <Skeleton height={56} />
        <Skeleton height={56} />
        <Skeleton height={56} />
      </div>
      <Skeleton height={1} width="100%" />
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14 }}>
        <Skeleton height={42} width={80} />
        <Skeleton height={42} width={100} />
      </div>
    </div>
  );
}
