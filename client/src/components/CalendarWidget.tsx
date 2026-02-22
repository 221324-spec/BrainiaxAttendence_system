

export default function CalendarWidget() {
  // Simple placeholder calendar for overview layout; could be replaced with full calendar lib
  const days = ['Su','Mo','Tu','We','Th','Fr','Sa'];
  const grid = Array.from({ length: 35 }).map((_, i) => ({ day: i + 1, muted: i < 3 || i > 26 }));
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold">January 2024</h4>
        <div className="text-xs text-gray-400">Events</div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-xs text-gray-400 mb-2">{days.map((d) => <div key={d} className="text-center">{d}</div>)}</div>
      <div className="grid grid-cols-7 gap-1">
        {grid.map((c, i) => (
          <div key={i} className={`h-8 flex items-center justify-center rounded ${c.muted ? 'text-gray-500/40' : 'text-gray-300'} bg-transparent`}>{c.day}</div>
        ))}
      </div>
    </div>
  );
}
