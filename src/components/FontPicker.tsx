import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface FontPickerProps {
  value: string;
  families: string[];
  onChange: (family: string) => void;
  loading?: boolean;
}

const MAX_RESULTS = 80;

/** Searchable Google Fonts combobox (shadcn Command + Popover). */
export default function FontPicker({ value, families, onChange, loading }: FontPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q ? families.filter((f) => f.toLowerCase().includes(q)) : families;
    return matches.slice(0, MAX_RESULTS);
  }, [query, families]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={loading}
          className="w-full justify-between font-normal"
        >
          <span className="truncate">{loading ? 'Loading fonts…' : value}</span>
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search fonts…" value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>No fonts found.</CommandEmpty>
            {results.map((family) => (
              <CommandItem
                key={family}
                value={family}
                onSelect={() => {
                  onChange(family);
                  setOpen(false);
                }}
              >
                <Check className={cn(family === value ? 'opacity-100' : 'opacity-0')} />
                {family}
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
