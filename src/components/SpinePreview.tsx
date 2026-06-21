import type { LabelData } from '@/lib/types';
import { PREVIEW_PX_PER_MM as S, type SizePreset } from '@/lib/dimensions';

const caption = (album: string, artist: string, showArtist: boolean) =>
  showArtist && artist ? `${album || 'Album'} - ${artist}` : album || 'Album';

/** Spine preview. One caption, or two halves in double-album mode. */
export default function SpinePreview({ data, size }: { data: LabelData; size: SizePreset }) {
  const W = size.width * S;
  const H = size.height * S;
  const fontSize = size.height * 0.66 * (data.doubleAlbum ? 0.85 : 1) * S;
  const style = {
    fontFamily: data.titleFont,
    fontSize,
    fontWeight: 700,
    color: data.textColor,
    letterSpacing: `${data.letterSpacing}em`,
  } as const;
  return (
    <div
      className="flex items-center overflow-hidden"
      style={{ width: W, height: H, background: data.bgColor, boxShadow: 'inset 0 0 0 1px #000' }}
    >
      {data.doubleAlbum ? (
        <>
          <div className="flex min-w-0 flex-1 items-center justify-center">
            <span className="truncate px-1" style={style}>
              {caption(data.album, data.artist, true)}
            </span>
          </div>
          <div className="h-full w-px" style={{ background: data.textColor, opacity: 0.5 }} />
          <div className="flex min-w-0 flex-1 items-center justify-center">
            <span className="truncate px-1" style={style}>
              {caption(data.album2, data.artist2, true)}
            </span>
          </div>
        </>
      ) : (
        <div className="flex w-full items-center justify-center">
          <span className="truncate" style={style}>
            {caption(data.album, data.artist, data.showArtist)}
          </span>
        </div>
      )}
    </div>
  );
}
