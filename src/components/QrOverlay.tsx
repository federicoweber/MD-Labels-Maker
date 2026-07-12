import type { LabelData } from '@/lib/types';
import { PREVIEW_PX_PER_MM as S, FRONT } from '@/lib/dimensions';
import { qrPath, shareDataFor, shareUrl } from '@/lib/share';
import { QrGraphic } from '@/components/QrGraphic';

/**
 * A label's QR code for the interactive previews, in the label's own colours
 * (textColor modules on a bgColor backing at the text-background opacity),
 * mirroring the SVG twins. Clicking it opens the page it encodes.
 */
export default function QrOverlay({
  data,
  sizeMm,
  moduleMm = 0.3,
  padMm = FRONT.padding,
  className,
  style,
}: {
  data: LabelData;
  /** Side of the square, in mm. Omit to size from the module count instead. */
  sizeMm?: number;
  /** Printed module size when `sizeMm` is omitted (0.3mm suits modern phones). */
  moduleMm?: number;
  /** Quiet zone inside the box, in mm. */
  padMm?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const url = shareUrl(shareDataFor(data));
  const qr = qrPath(url);
  const side = sizeMm ?? qr.count * moduleMm + 2 * padMm;
  const box = side * S;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      title="Open the tracklist page this QR encodes"
      className={`block shrink-0 ${className ?? ''}`}
      style={{ width: box, height: box, ...style }}
    >
      <svg viewBox={`0 0 ${side} ${side}`} width={box} height={box} aria-hidden>
        <QrGraphic
          qr={qr}
          x={0}
          y={0}
          size={side}
          pad={padMm}
          bgColor={data.bgColor}
          textColor={data.textColor}
          bgOpacity={data.textBgOpacity}
        />
      </svg>
    </a>
  );
}
