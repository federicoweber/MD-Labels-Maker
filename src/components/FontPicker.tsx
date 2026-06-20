import { useMemo, useRef, useState } from 'react';

interface FontPickerProps {
  value: string;
  families: string[];
  onChange: (family: string) => void;
  loading?: boolean;
}

const MAX_RESULTS = 100;

/** Searchable combobox over the Google Fonts list. */
export default function FontPicker({ value, families, onChange, loading }: FontPickerProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<number | undefined>(undefined);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q
      ? families.filter((f) => f.toLowerCase().includes(q))
      : families;
    return matches.slice(0, MAX_RESULTS);
  }, [query, families]);

  function select(family: string) {
    onChange(family);
    setQuery('');
    setOpen(false);
  }

  return (
    <div className="font-picker">
      <input
        type="text"
        className="font-picker__input"
        placeholder={loading ? 'Loading fonts…' : 'Search fonts…'}
        value={open ? query : value}
        disabled={loading}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setQuery('');
          setOpen(true);
        }}
        onBlur={() => {
          blurTimer.current = window.setTimeout(() => setOpen(false), 150);
        }}
      />
      {open && results.length > 0 && (
        <ul className="font-picker__list">
          {results.map((family) => (
            <li key={family}>
              <button
                type="button"
                className="font-picker__option"
                // Fire before input blur so the selection registers.
                onMouseDown={(e) => {
                  e.preventDefault();
                  window.clearTimeout(blurTimer.current);
                  select(family);
                }}
              >
                {family}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
