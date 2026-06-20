import { cn } from '@/lib/utils';

/** Small MiniDisc cartridge mark + wordmark, in the current text colour. */
export default function MdLogo({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2 text-foreground', className)}>
      <svg width="34" height="26" viewBox="0 0 34 26" fill="none" aria-hidden>
        {/* Cartridge with a chamfered top-left corner (matching the labels) */}
        <path d="M5 1 H33 V25 H1 V5 Z" stroke="currentColor" strokeWidth="2" />
        {/* Shutter */}
        <rect x="5" y="9" width="13" height="12" fill="currentColor" />
        {/* Disc hub */}
        <circle cx="25" cy="14" r="4.5" stroke="currentColor" strokeWidth="2" />
      </svg>
      <span className="text-lg leading-none tracking-[0.22em]">MINIDISC</span>
    </div>
  );
}
