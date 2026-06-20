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
}

const rgbLabel = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  return `${r}R ${g}G ${b}B`;
};

/**
 * Background-colour control. A swatch button opens a tabbed popover for picking
 * a colour from the cover (WipEout team-select style swatch bars), eyedropping
 * any pixel, or choosing a freeform colour.
 */
export default function ColorControl({ value, onChange, coverDataUrl, palette }: ColorControlProps) {
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
        <Tabs defaultValue="cover">
          <TabsList className="w-full">
            <TabsTrigger value="cover" className="flex-1">
              Cover
            </TabsTrigger>
            <TabsTrigger value="pick" className="flex-1">
              Pick
            </TabsTrigger>
            <TabsTrigger value="custom" className="flex-1">
              Custom
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cover" className="pt-3">
            {palette.length > 0 ? (
              <div className="flex flex-col gap-1">
                {palette.map((hex) => {
                  const selected = value.toLowerCase() === hex.toLowerCase();
                  return (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => onChange(hex)}
                      className="notch-tr flex h-7 items-center px-2 text-[11px] tracking-wide transition-transform hover:translate-x-0.5"
                      style={{
                        background: hex,
                        color: bestTextColor(hex),
                        fontFamily: 'var(--font-display)',
                      }}
                    >
                      <span className="mr-1 w-3">{selected ? '▶' : ''}</span>
                      {rgbLabel(hex)}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Drop a cover to sample colours.</p>
            )}
          </TabsContent>

          <TabsContent value="pick" className="pt-3">
            {coverDataUrl ? (
              <Eyedropper coverDataUrl={coverDataUrl} onPick={onChange} />
            ) : (
              <p className="text-xs text-muted-foreground">Drop a cover to eyedrop from it.</p>
            )}
          </TabsContent>

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
