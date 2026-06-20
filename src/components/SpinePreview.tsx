import type { LabelData } from '@/lib/types';
import { PREVIEW_PX_PER_MM as S, type SizePreset } from '@/lib/dimensions';

/** Spine preview. Caption is derived from title (+ artist when shown). */
export default function SpinePreview({ data, size }: { data: LabelData; size: SizePreset }) {
  const W = size.width * S;
  const H = size.height * S;
  const caption =
    data.showArtist && data.artist
      ? `${data.album || 'Title'} - ${data.artist}`
      : data.album || 'Title';
  return (
    <div
      className="flex items-center justify-center overflow-hidden"
      style={{ width: W, height: H, background: data.bgColor, boxShadow: 'inset 0 0 0 1.5px #000' }}
    >
      <span
        className="truncate"
        style={{
          fontFamily: data.fontFamily,
          fontSize: size.height * 0.66 * S,
          fontWeight: 700,
          color: data.textColor,
        }}
      >
        {caption}
      </span>
    </div>
  );
}
