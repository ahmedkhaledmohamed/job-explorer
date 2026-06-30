"use client";

export function BarChart({
  data,
}: {
  data: Array<{ week: string; count: number }>;
}) {
  if (data.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-400">
        No data yet
      </div>
    );
  }

  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex items-end gap-2 h-48">
      {data.map((item) => {
        const heightPercent = (item.count / maxCount) * 100;
        const weekLabel = new Date(item.week).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });

        return (
          <div
            key={item.week}
            className="flex flex-1 flex-col items-center gap-1"
          >
            <span className="text-xs font-medium text-gray-600">
              {item.count}
            </span>
            <div
              className="w-full rounded-t bg-blue-500 transition-all min-h-[4px]"
              style={{ height: `${Math.max(heightPercent, 2)}%` }}
            />
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {weekLabel}
            </span>
          </div>
        );
      })}
    </div>
  );
}
