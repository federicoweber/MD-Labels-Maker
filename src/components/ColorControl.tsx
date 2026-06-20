import { useEffect, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { bestTextColor, hexToRgb, rgbToHex } from '@/lib/colors';

interface ColorControlProps {
  value: string;
  onChange: (hex: string) => void;
  coverDataUrl: string | null;
  palette: string[];
  /** 'bg' → Cover / Pick / Custom. 'text' → Grays / Cover / Custom. */
  kind?: 'bg' | 'text';
}

const GRAYS = ['#000000', '#3f3f3f', '#808080', '#bfbfbf', '#ffffff'];

const rgbLabel = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  return `${r}R ${g}G ${b}B`;
};

/** WipEout team-select style swatch bars. */
function SwatchBars({
  colors,
  value,
  onChange,
}: {
  colors: string[];
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      {colors.map((hex) => {
        const selected = value.toLowerCase() === hex.toLowerCase();
        return (
          <button
            key={hex}
            type="button"
            onClick={() => onChange(hex)}
            className="notch-tr flex h-7 items-center px-2 text-[11px] tracking-wide transition-transform hover:translate-x-0.5"
            style={{ background: hex, color: bestTextColor(hex), fontFamily: 'var(--font-display)' }}
          >
            <span className="mr-1 w-3">{selected ? '▶' : ''}</span>
            {rgbLabel(hex)}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Colour control. A swatch button opens a tabbed popover. Background uses
 * Cover / Pick / Custom; text uses Grays / Cover / Custom.
 */
export default function ColorControl({
  value,
  onChange,
  coverDataUrl,
  palette,
  kind = 'bg',
}: ColorControlProps) {
  const isText = kind === 'text';
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="notch-tr flex h-9 w-full items-center px-3 text-sm tracking-wide transition-transform hover:translate-x-0.5 focus-visible:outline-none"
          style={{ background: value, color: bestTextColor(value) }}
        >
          {rgbLabel(value)}
        </button>
      </PopoverTrigger>
      <PopoverContent className="notch-tr w-64 p-3" align="start">
        <Tabs defaultValue={isText ? 'grays' : 'cover'}>
          <TabsList className="w-full">
            {isText && (
              <TabsTrigger value="grays" className="flex-1">
                Grays
              </TabsTrigger>
            )}
            <TabsTrigger value="cover" className="flex-1">
              Cover
            </TabsTrigger>
            {!isText && (
              <TabsTrigger value="pick" className="flex-1">
                Pick
              </TabsTrigger>
            )}
            <TabsTrigger value="custom" className="flex-1">
              Custom
            </TabsTrigger>
          </TabsList>

          {isText && (
            <TabsContent value="grays" className="pt-3">
              <SwatchBars colors={GRAYS} value={value} onChange={onChange} />
            </TabsContent>
          )}

          <TabsContent value="cover" className="pt-3">
            {palette.length > 0 ? (
              <SwatchBars colors={palette} value={value} onChange={onChange} />
            ) : (
              <p className="text-xs text-muted-foreground">Drop a cover to sample colours.</p>
            )}
          </TabsContent>

          {!isText && (
            <TabsContent value="pick" className="pt-3">
              {coverDataUrl ? (
                <Eyedropper coverDataUrl={coverDataUrl} onPick={onChange} />
              ) : (
                <p className="text-xs text-muted-foreground">Drop a cover to eyedrop from it.</p>
              )}
            </TabsContent>
          )}

          <TabsContent value="custom" className="space-y-2 pt-3">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="size-9 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
              />
              <Input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="font-mono"
                aria-label="Hex colour"
              />
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

function Eyedropper({
  coverDataUrl,
  onPick,
}: {
  coverDataUrl: string;
  onPick: (hex: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = new Image();
    img.onload = () => {
      const maxW = 232;
      const scale = Math.min(maxW / img.width, 1);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
    };
    img.src = coverDataUrl;
  }, [coverDataUrl]);

  function sample(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * canvas.width);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * canvas.height);
    const [r, g, b] = ctx.getImageData(x, y, 1, 1).data;
    onPick(rgbToHex({ r, g, b }));
  }

  return (
    <canvas
      ref={canvasRef}
      onClick={sample}
      className="w-full cursor-crosshair rounded-md border border-border"
    />
  );
}
