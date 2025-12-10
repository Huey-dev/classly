'use client';

import Link from 'next/link';
import { useEffect } from 'react';

export type DropdownItem = { label: string; href?: string; onClick?: () => void; danger?: boolean };

export function ProfileDropdown({
  open,
  onClose,
  items,
}: {
  open: boolean;
  onClose: () => void;
  items: DropdownItem[];
}) {
  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden animate-in fade-in zoom-in duration-150">
      <div className="py-1">
        {items.map((item, idx) => (
          item.href ? (
            <Link
              key={idx}
              href={item.href}
              className={`block px-4 py-2 text-sm ${item.danger ? 'text-red-600' : 'text-slate-800 dark:text-slate-200'} hover:bg-slate-50 dark:hover:bg-slate-800`}
              onClick={onClose}
            >
              {item.label}
            </Link>
          ) : (
            <button
              key={idx}
              type="button"
              onClick={() => {
                item.onClick?.();
                onClose();
              }}
              className={`w-full text-left px-4 py-2 text-sm ${item.danger ? 'text-red-600' : 'text-slate-800 dark:text-slate-200'} hover:bg-slate-50 dark:hover:bg-slate-800`}
            >
              {item.label}
            </button>
          )
        ))}
      </div>
    </div>
  );
}
