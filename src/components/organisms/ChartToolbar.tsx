import { ChartLegend } from '../molecules/ChartLegend';
import { IconButton } from '../atoms/IconButton';

interface ChartToolbarProps {
  title: string;
  exporting: boolean;
  onExport: () => void;
}

const ExportIcon = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
    <path d="M8 1v9M5 7l3 3 3-3M2 12v1a2 2 0 002 2h8a2 2 0 002-2v-1" />
  </svg>
);

export function ChartToolbar({ title, exporting, onExport }: ChartToolbarProps) {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700 shrink-0 bg-gray-900">
      <h1 className="text-base font-semibold text-gray-100 tracking-wide">{title}</h1>
      <div className="flex items-center gap-4">
        <ChartLegend />
        <IconButton
          icon={<ExportIcon />}
          label={exporting ? 'Exporting…' : 'Export PNG'}
          variant="primary"
          onClick={onExport}
          disabled={exporting}
        />
      </div>
    </div>
  );
}
