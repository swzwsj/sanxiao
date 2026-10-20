import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export function DemoDialog({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose?: () => void; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>('button:not([disabled])');
    first?.focus();
    return () => previous?.focus();
  }, []);
  return <div className="demo-modal-backdrop">
    <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className={`demo-dialog ${wide ? 'demo-dialog-wide' : ''}`} onKeyDown={event => {
      if (event.key === 'Escape' && onClose) onClose();
      if (event.key !== 'Tab') return;
      const elements = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input, video[controls], [tabindex="0"]') ?? []);
      if (!elements.length) return;
      const first = elements[0], last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }}>
      <div className="demo-dialog-heading"><h2>{title}</h2>{onClose && <button className="demo-icon-button" aria-label="关闭" onClick={onClose}><X size={18} /></button>}</div>
      {children}
    </div>
  </div>;
}
