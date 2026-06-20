import { cn } from '@/lib/utils';

/** The actual MiniDisc logo (Wikimedia Commons), inverted in dark mode. */
export default function MdLogo({ className }: { className?: string }) {
  return (
    <img
      src="/minidisc-logo.svg"
      alt="MiniDisc"
      className={cn('h-12 w-auto object-contain dark:invert', className)}
    />
  );
}
