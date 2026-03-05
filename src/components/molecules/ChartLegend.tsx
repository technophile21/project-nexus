const MILESTONE_COLOR = '#eab308';

export function ChartLegend() {
  return (
    <div className="flex items-center gap-2 text-xs text-gray-400">
      <span className="inline-block w-3 h-3 rounded-sm bg-indigo-500" />
      <span>Hovered</span>
      <span className="inline-block w-3 h-3 rounded-sm bg-orange-500 ml-1" />
      <span>Depends on</span>
      <span className="inline-block w-3 h-3 rounded-sm bg-green-500 ml-1" />
      <span>Dependent</span>
      <span className="inline-block w-3 h-3 rounded-sm ml-1" style={{ backgroundColor: MILESTONE_COLOR }} />
      <span>Milestone</span>
    </div>
  );
}
