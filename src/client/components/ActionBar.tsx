import { RefreshCw, FileText, ExternalLink } from 'lucide-react';

export function ActionBar({ onReload }: { onReload: () => void }) {
  return (
    <div
      className="cm-fade-up flex items-center justify-between px-5 py-3 border-t border-line"
      style={{ animationDelay: '0.7s' }}
    >
      <button
        onClick={onReload}
        className="group inline-flex items-center gap-1.5 text-[11px] text-bone-200 hover:text-bone-50 transition-colors"
      >
        <RefreshCw size={12} strokeWidth={1.8} className="group-hover:rotate-180 transition-transform duration-500" />
        <span className="tracking-wide">Reload config</span>
      </button>

      <div className="flex items-center gap-4">
        <a href="#" className="group inline-flex items-center gap-1.5 text-[11px] text-bone-300 hover:text-bone-50 transition-colors">
          <FileText size={12} strokeWidth={1.8} />
          <span>Wiki</span>
        </a>
        <a href="#" className="group inline-flex items-center gap-1.5 text-[11px] text-bone-300 hover:text-bone-50 transition-colors">
          <ExternalLink size={12} strokeWidth={1.8} />
          <span>Docs</span>
        </a>
      </div>
    </div>
  );
}
