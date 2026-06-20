import type { LabelData } from '@/lib/types';
import { SPINE, PREVIEW_PX_PER_MM as S } from '@/lib/dimensions';

const W = SPINE.width * S;
const H = SPINE.height * S;

/** Spine preview (60×3mm scaled). Caption is derived from artist + album. */
export default function SpinePreview({ data }: { data: LabelData }) {
  const caption = [data.album || 'Title', data.artist || 'Artist'].join(' - ');
  return (
    <div
      className="flex items-center justify-center overflow-hidden shadow-xl"
      style={{ width: W, height: H, background: data.bgColor }}
    >
      <span
        className="truncate"
        style={{
          fontFamily: data.fontFamily,
          fontSize: SPINE.textSize * S,
          fontWeight: 700,
          color: data.textColor,
        }}
      >
        {caption}
      </span>
    </div>
  );
}
