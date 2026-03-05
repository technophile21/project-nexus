import type { ReactNode } from 'react';

interface IconButtonProps {
  icon: ReactNode;
  label?: string;
  variant?: 'default' | 'ghost' | 'primary';
  size?: 'sm' | 'md';
  title?: string;
  onClick: () => void;
  disabled?: boolean;
}

const VARIANTS = {
  default: 'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-gray-300 hover:text-gray-100 hover:bg-gray-700 disabled:opacity-40 text-xs font-medium transition-colors',
  ghost:   'flex items-center gap-1.5 px-2 py-1 rounded text-gray-400 hover:text-gray-200 disabled:opacity-40 text-xs transition-colors',
  primary: 'flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium transition-colors',
};

const SIZES = {
  sm: '[&_svg]:w-3 [&_svg]:h-3',
  md: '[&_svg]:w-[13px] [&_svg]:h-[13px]',
};

export function IconButton({
  icon,
  label,
  variant = 'default',
  size = 'md',
  title,
  onClick,
  disabled = false,
}: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title ?? label}
      aria-label={title ?? label}
      className={`${VARIANTS[variant]} ${SIZES[size]}`}
    >
      {icon}
      {label && <span>{label}</span>}
    </button>
  );
}
