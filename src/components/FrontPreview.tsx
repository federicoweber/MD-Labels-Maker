import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  GripVertical,
  MoveHorizontal,
  MoveVertical,
} from 'lucide-react';
import type { LabelData } from '@/lib/types';
import { TrackEditor } from '@/components/TracklistPreview';
import QrOverlay from '@/components/QrOverlay';
import {
  FRONT,
  PREVIEW_PX_PER_MM as S,
  frontCoverSize,
  standardCoverGeometry,
  type SizePreset,
} from '@/lib/dimensions';
import { frontTextBlockHeight } from '@/lib/text';
import { readImageFile, withAlpha } from '@/lib/utils';

interface Props {
  data: LabelData;
  size: SizePreset;
  update: (patch: Partial<LabelData>) => void;
  onCover: (dataUrl: string | null) => void;
  onCover2: (dataUrl: string | null) => void;
}

/** Album/artist sit smaller when overlaid on covers in double mode. */
const DOUBLE_TEXT_SCALE = 0.72;

function alignmentHighlight(hex: string): string {
  const raw = hex.replace('#', '');
  const value = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const n = Number.parseInt(value, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance < 0.5 ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.14)';
}

/**
 * Editable front-label preview. In single mode the cover sits on top with a
 * text band below; in double-album mode two stacked covers each carry their own
 * album/artist overlaid on the image. The hidden SVG twin exports.
 */
export default function FrontPreview({ data, size, update, onCover, onCover2 }: Props) {
  const [pageDragging, setPageDragging] = useState(false);
  const [alignmentHighlightTarget, setAlignmentHighlightTarget] = useState<
    'cover' | 'title' | 'artist' | null
  >(null);
  const freeCoverRef = useRef<HTMLDivElement>(null);
  const titlePanelRef = useRef<HTMLDivElement>(null);
  const artistPanelRef = useRef<HTMLDivElement>(null);

  const snapTextPanel = (panel: 'title' | 'artist', direction: 'top' | 'center' | 'bottom') => {
    const current = panel === 'title' ? titlePanelRef.current : artistPanelRef.current;
    const other = panel === 'title' ? artistPanelRef.current : titlePanelRef.current;
    const cover = freeCoverRef.current;
    if (!current || !cover) return;
    const currentRect = current.getBoundingClientRect();
    const coverRect = cover.getBoundingClientRect();
    const otherRect = other?.getBoundingClientRect();
    const offset = panel === 'title' ? data.fullHeightTitleOffset : data.fullHeightArtistOffset;
    let delta: number;
    if (direction === 'center') {
      delta = coverRect.top + coverRect.height / 2 - (currentRect.top + currentRect.height / 2);
    } else if (panel === 'title') {
      delta = direction === 'top'
        ? coverRect.top - currentRect.top
        : (otherRect?.top ?? coverRect.bottom) - currentRect.bottom;
    } else {
      delta = direction === 'top'
        ? (otherRect?.bottom ?? coverRect.top) - currentRect.top
        : coverRect.bottom - currentRect.bottom;
    }
    const value = Math.max(-size.height, Math.min(size.height, offset + delta / S));
    if (panel === 'title') update({ fullHeightTitleOffset: value });
    else update({ fullHeightArtistOffset: value });
  };

  // Detect a file being dragged anywhere on the page to prompt "DROP".
  useEffect(() => {
    const hasFiles = (e: DragEvent) => e.dataTransfer?.types?.includes('Files');
    const on = (e: DragEvent) => {
      if (hasFiles(e)) setPageDragging(true);
    };
    const off = (e: DragEvent) => {
      if (!e.relatedTarget) setPageDragging(false);
    };
    const end = () => setPageDragging(false);
    window.addEventListener('dragover', on);
    window.addEventListener('dragenter', on);
    window.addEventListener('dragleave', off);
    window.addEventListener('drop', end);
    return () => {
      window.removeEventListener('dragover', on);
      window.removeEventListener('dragenter', on);
      window.removeEventListener('dragleave', off);
      window.removeEventListener('drop', end);
    };
  }, []);

  const W = size.width * S;
  const H = size.height * S;
  const freeScale = Math.min(1, Math.max(0.5, data.fullHeightScale));
  const portrait = size.height >= size.width;
  const PAD = FRONT.padding * S;
  // The standard cover remains square and gives way to the uncapped text
  // block. Shared geometry keeps this editable preview identical to its SVG.
  const hideText = data.doubleHideText;
  const fullSideMm = frontCoverSize(size);
  const textMaxWmm = (portrait ? size.width : size.width - fullSideMm) - 2 * FRONT.padding;
  const textBlockMm = hideText ? 0 : frontTextBlockHeight(data, textMaxWmm);
  // Unlike the twin, an empty-but-shown year still reserves its row so the
  // Year input has somewhere to live while you type.
  const metaRowMm = data.showYear || data.discTotal > 1;
  const bottomAnchorMm = metaRowMm
    ? size.height - FRONT.padding - data.yearSize - 0.8
    : size.height - FRONT.padding * 0.7;
  const coverHmm = portrait
    ? Math.max(6, bottomAnchorMm - textBlockMm - FRONT.padding * 0.6)
    : fullSideMm;
  const coverGeo = standardCoverGeometry(size, coverHmm, data.coverPadding);
  const cover = coverGeo.zoneSide * S;
  const coverSidePx = coverGeo.side * S;
  const chamfer = data.showChamfer ? FRONT.chamfer : 0;
  const CH = chamfer * S;
  const CLIP = `polygon(${CH}px 0, 100% 0, 100% 100%, 0 100%, 0 ${CH}px)`;

  return (
    <div
      className="relative select-none"
      style={{ width: W, height: H, background: data.bgColor, clipPath: CLIP }}
    >
      {data.doubleAlbum ? (
        <>
          <CoverSlot
            src={data.coverDataUrl}
            onCover={onCover}
            pageDragging={pageDragging}
            contain
            style={{ position: 'absolute', top: 0, left: 0, width: W, height: H / 2 }}
          >
            {!data.doubleHideText && (
              <OverlayText
                data={data}
                album={data.album}
                artist={data.artist}
                onAlbum={(v) => update({ album: v })}
                onArtist={(v) => update({ artist: v })}
                pad={PAD}
              />
            )}
          </CoverSlot>
          <CoverSlot
            src={data.coverDataUrl2}
            onCover={onCover2}
            pageDragging={pageDragging}
            contain
            style={{ position: 'absolute', top: H / 2, left: 0, width: W, height: H / 2 }}
          >
            {!data.doubleHideText && (
              <OverlayText
                data={data}
                album={data.album2}
                artist={data.artist2}
                onAlbum={(v) => update({ album2: v })}
                onArtist={(v) => update({ artist2: v })}
                pad={PAD}
              />
            )}
          </CoverSlot>
        </>
      ) : data.fullHeight ? (
        <CoverSlot
          rootRef={freeCoverRef}
          src={data.coverDataUrl}
          onCover={onCover}
          pageDragging={pageDragging}
          imgStyle={{
            position: 'absolute',
            width: Math.max(W, H) * freeScale,
            height: Math.max(W, H) * freeScale,
            maxWidth: 'none',
            left: (W - Math.max(W, H) * freeScale) * data.fullHeightAlign,
            top: (H - Math.max(W, H) * freeScale) * data.fullHeightVerticalAlign,
          }}
          style={{ position: 'absolute', top: 0, left: 0, width: W, height: H }}
        >
          {alignmentHighlightTarget === 'cover' && (
            <div
              className="pointer-events-none absolute inset-0 z-[1]"
              style={{ background: alignmentHighlight(data.bgColor) }}
            />
          )}
          {data.coverDataUrl &&
            (Math.max(W, H) * freeScale !== W || Math.max(W, H) * freeScale !== H) && (
            <AlignControls
              horizontal={data.fullHeightAlign}
              vertical={data.fullHeightVerticalAlign}
              horizontalShift={Math.max(W, H) * freeScale - W}
              verticalShift={Math.max(W, H) * freeScale - H}
              onHorizontalChange={(v) => update({ fullHeightAlign: v })}
              onVerticalChange={(v) => update({ fullHeightVerticalAlign: v })}
              onHighlight={(active) => setAlignmentHighlightTarget(active ? 'cover' : null)}
            />
          )}
          {(data.frontTracklist || data.showQr || !data.doubleHideText) && (
            <div
              className="group/band pointer-events-none absolute right-0 left-0 z-20 flex flex-col"
              style={{
                top: `${data.fullHeightTextY * 100}%`,
                transform: `translateY(-${data.fullHeightTextY * 100}%)`,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {(data.showQr || data.frontTracklist) && (
                <BandControls
                  y={data.fullHeightTextY}
                  containerH={H}
                  onChange={(v) => update({ fullHeightTextY: v })}
                />
              )}
              {data.showQr && (
                <QrOverlay data={data} sizeMm={size.width} className="pointer-events-auto self-end" />
              )}
              {data.frontTracklist && <TracksOverlay data={data} update={update} />}
              {!data.doubleHideText && (
                <div
                  className="flex flex-col justify-end"
                  style={{
                    gap: data.titleArtistGap * S,
                  }}
                >
                  <div
                    ref={titlePanelRef}
                    className="group/block pointer-events-auto relative"
                    style={{
                      padding: `${PAD * 0.4}px ${PAD}px`,
                      background: withAlpha(data.bgColor, data.textBgOpacity),
                      transform: `translateY(${data.fullHeightTitleOffset * S}px)`,
                    }}
                  >
                    {alignmentHighlightTarget === 'title' && (
                      <div
                        className="pointer-events-none absolute inset-0 z-10"
                        style={{ background: alignmentHighlight(data.bgColor) }}
                      />
                    )}
                    <TextBlockControls
                      offset={data.fullHeightTitleOffset}
                      maxMm={size.height}
                      onChange={(v) => update({ fullHeightTitleOffset: v })}
                      onTop={() => snapTextPanel('title', 'top')}
                      onCenter={() => snapTextPanel('title', 'center')}
                      onBottom={() => snapTextPanel('title', 'bottom')}
                      onHighlight={(active) => setAlignmentHighlightTarget(active ? 'title' : null)}
                    />
                    <AutoTextarea
                      value={data.album}
                      placeholder="Album"
                      onChange={(v) => update({ album: v })}
                      style={{
                        fontFamily: data.titleFont,
                        fontSize: data.titleSize * S,
                        fontWeight: 700,
                        color: data.textColor,
                        opacity: data.titleOpacity,
                        lineHeight: data.lineHeight,
                        letterSpacing: `${data.letterSpacing}em`,
                      }}
                    />
                  </div>
                  {(data.showArtist || data.showYear || data.discTotal > 1) && (
                    <div
                      ref={artistPanelRef}
                      className="group/block pointer-events-auto relative flex flex-col"
                      style={{
                        padding: `${PAD * 0.4}px ${PAD}px ${
                          PAD * 0.7 -
                          0.2 *
                            ((data.showYear || data.discTotal > 1
                              ? data.yearSize
                              : data.artistSize) *
                              S)
                        }px`,
                        background: withAlpha(data.bgColor, data.textBgOpacity),
                        transform: `translateY(${data.fullHeightArtistOffset * S}px)`,
                      }}
                    >
                      {alignmentHighlightTarget === 'artist' && (
                        <div
                          className="pointer-events-none absolute inset-0 z-10"
                          style={{ background: alignmentHighlight(data.bgColor) }}
                        />
                      )}
                      <TextBlockControls
                        offset={data.fullHeightArtistOffset}
                        maxMm={size.height}
                        onChange={(v) => update({ fullHeightArtistOffset: v })}
                        onTop={() => snapTextPanel('artist', 'top')}
                        onCenter={() => snapTextPanel('artist', 'center')}
                        onBottom={() => snapTextPanel('artist', 'bottom')}
                        onHighlight={(active) => setAlignmentHighlightTarget(active ? 'artist' : null)}
                      />
                      {data.showArtist && (
                        <AutoTextarea
                          value={data.artist}
                          placeholder="Artist"
                          onChange={(v) => update({ artist: v })}
                          style={{
                            fontFamily: data.artistFont,
                            fontSize: data.artistSize * S,
                            color: data.textColor,
                            opacity: data.artistOpacity,
                            lineHeight: data.lineHeight,
                            letterSpacing: `${data.letterSpacing}em`,
                          }}
                        />
                      )}
                  {(data.showYear || data.discTotal > 1) && (
                    <div
                      className="flex items-baseline justify-between"
                      style={{ marginTop: 0.8 * S }}
                    >
                      {data.showYear ? (
                        <input
                          className="label-field bg-transparent p-0 outline-none"
                          style={{
                            width: 70,
                            fontFamily: data.yearFont,
                            fontSize: data.yearSize * S,
                            color: data.textColor,
                            opacity: data.artistOpacity,
                            lineHeight: 1,
                          }}
                          value={data.year}
                          placeholder="Year"
                          onChange={(e) => update({ year: e.target.value })}
                        />
                      ) : (
                        <span />
                      )}
                      {data.discTotal > 1 && (
                        <span
                          style={{
                            fontFamily: data.yearFont,
                            fontSize: data.yearSize * S,
                            color: data.textColor,
                            opacity: data.artistOpacity,
                            lineHeight: 1,
                          }}
                        >
                          {data.discNumber}/{data.discTotal}
                        </span>
                      )}
                    </div>
                  )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CoverSlot>
      ) : (
        <>
          <CoverSlot
            src={data.coverDataUrl}
            onCover={onCover}
            pageDragging={pageDragging}
            contain
            style={{
              position: 'absolute',
              top: coverGeo.y * S,
              left: coverGeo.x * S,
              width: coverSidePx,
              height: coverSidePx,
            }}
          />
          {data.frontTracklist && (
            <TracksOverlay
              data={data}
              update={update}
              style={{
                position: 'absolute',
                left: coverGeo.x * S,
                top: (coverGeo.y + coverGeo.side) * S,
                width: coverSidePx,
                transform: 'translateY(-100%)',
                maxHeight: coverSidePx,
              }}
            />
          )}
          {data.showQr && (
            <QrOverlay
              data={data}
              sizeMm={coverGeo.side}
              className="absolute"
              style={{
                left: coverGeo.x * S,
                top: coverGeo.y * S,
              }}
            />
          )}

          {!hideText && (
            <div
              className="absolute flex flex-col justify-end"
              style={{
                top: portrait ? cover : 0,
                // Anchor the artist's last BASELINE where the twin puts it:
                // the trimmed box ends ~0.2em below the baseline (descent).
                bottom:
                  ((metaRowMm ? FRONT.padding + data.yearSize + 0.8 : FRONT.padding * 0.7) -
                    0.2 * (data.showArtist ? data.artistSize : data.titleSize)) *
                  S,
                left: portrait ? 0 : cover,
                width: portrait ? W : W - cover,
                padding: `0 ${PAD}px`,
                gap: data.titleArtistGap * S,
              }}
            >
              <AutoTextarea
                value={data.album}
                placeholder="Album"
                onChange={(v) => update({ album: v })}
                style={{
                  fontFamily: data.titleFont,
                  fontSize: data.titleSize * S,
                  fontWeight: 700,
                  color: data.textColor,
                  opacity: data.titleOpacity,
                  lineHeight: data.lineHeight,
                  letterSpacing: `${data.letterSpacing}em`,
                }}
              />
              {data.showArtist && (
                <AutoTextarea
                  value={data.artist}
                  placeholder="Artist"
                  onChange={(v) => update({ artist: v })}
                  style={{
                    fontFamily: data.artistFont,
                    fontSize: data.artistSize * S,
                    color: data.textColor,
                    opacity: data.artistOpacity,
                    lineHeight: data.lineHeight,
                    letterSpacing: `${data.letterSpacing}em`,
                  }}
                />
              )}
            </div>
          )}

          {data.showYear && (
            <input
              className="label-field absolute bg-transparent p-0 outline-none"
              style={{
                left: (portrait ? 0 : cover) + PAD,
                bottom: (FRONT.padding - 0.2 * data.yearSize) * S,
                width: 70,
                fontFamily: data.yearFont,
                fontSize: data.yearSize * S,
                color: data.textColor,
                opacity: data.artistOpacity,
                lineHeight: 1,
              }}
              value={data.year}
              placeholder="Year"
              onChange={(e) => update({ year: e.target.value })}
            />
          )}
          {data.discTotal > 1 && (
            <span
              className="absolute"
              style={{
                right: PAD,
                bottom: (FRONT.padding - 0.2 * data.yearSize) * S,
                fontFamily: data.yearFont,
                fontSize: data.yearSize * S,
                color: data.textColor,
                opacity: data.artistOpacity,
                lineHeight: 1,
              }}
            >
              {data.discNumber}/{data.discTotal}
            </span>
          )}
        </>
      )}

      {/* Free-layout artwork is full bleed; an outline reads as an image border. */}
      {!data.fullHeight && (
        <svg
          className="pointer-events-none absolute inset-0"
          style={{ width: W, height: H }}
          viewBox={`0 0 ${size.width} ${size.height}`}
          preserveAspectRatio="none"
          aria-hidden
        >
          <path
            d={`M ${chamfer},0 H ${size.width} V ${size.height} H 0 V ${chamfer} Z`}
            fill="none"
            stroke="#000"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}

    </div>
  );
}

/** Hover drag handle for independently nudging a free-layout text block. */
function TextBlockControls({
  offset,
  maxMm,
  onChange,
  onTop,
  onCenter,
  onBottom,
  onHighlight,
}: {
  offset: number;
  maxMm: number;
  onChange: (v: number) => void;
  onTop: () => void;
  onCenter: () => void;
  onBottom: () => void;
  onHighlight: (active: boolean) => void;
}) {
  const drag = useRef<{ y: number; offset: number } | null>(null);
  const clamp = (v: number) => Math.max(-maxMm, Math.min(maxMm, v));
  const snap = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };
  return (
    <div
      className="absolute top-1/2 right-1 z-20 flex -translate-y-1/2 touch-none items-center gap-1 rounded-full bg-black/70 px-2 py-1.5 text-white opacity-0 transition-opacity group-hover/block:opacity-100"
      onMouseEnter={() => onHighlight(true)}
      onMouseLeave={() => onHighlight(false)}
    >
      <button
        type="button"
        aria-label="Snap block to top"
        className="grid size-6 place-items-center rounded-full hover:bg-white/20"
        onClick={(e) => snap(e, onTop)}
      >
        <ChevronUp className="size-4" />
      </button>
      <button
        type="button"
        aria-label="Center block vertically"
        className="grid size-6 place-items-center rounded-full hover:bg-white/20"
        onClick={(e) => snap(e, onCenter)}
      >
        <MoveVertical className="size-4" />
      </button>
      <button
        type="button"
        aria-label="Snap block to bottom"
        className="grid size-6 place-items-center rounded-full hover:bg-white/20"
        onClick={(e) => snap(e, onBottom)}
      >
        <ChevronDown className="size-4" />
      </button>
      <button
        type="button"
        aria-label="Drag block vertically"
        className="grid size-7 cursor-ns-resize place-items-center rounded-full bg-white/15 hover:bg-white/25"
        onPointerDown={(e) => {
          drag.current = { y: e.clientY, offset };
          e.currentTarget.setPointerCapture(e.pointerId);
          e.stopPropagation();
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          onChange(clamp(drag.current.offset + (e.clientY - drag.current.y) / S));
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        title="Drag to move this text block"
      >
        <GripVertical className="size-4" />
      </button>
    </div>
  );
}

/**
 * Full-height mode: hover controls (on the text band) to move the band up and
 * down the cover. The pill is a vertical drag surface (click it without
 * dragging to centre); the chevrons snap to the top and bottom. `y` is 0 at
 * the label's top edge, 1 at the bottom.
 */
function BandControls({
  y,
  containerH,
  onChange,
}: {
  y: number;
  containerH: number;
  onChange: (v: number) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y0: number; start: number; range: number } | null>(null);
  const moved = useRef(false);
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const snap = (e: React.MouseEvent, v: number) => {
    e.stopPropagation();
    onChange(v);
  };
  return (
    <div
      ref={root}
      className="pointer-events-auto absolute top-1/2 left-1 flex -translate-y-1/2 cursor-ns-resize touch-none flex-col items-center rounded-full bg-black/60 px-1 py-1.5 text-white opacity-0 transition-opacity group-hover/band:opacity-100"
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        const band = root.current?.parentElement;
        const range = containerH - (band?.offsetHeight ?? 0);
        if (range <= 0) return;
        drag.current = { y0: e.clientY, start: y, range };
        moved.current = false;
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        const dy = e.clientY - drag.current.y0;
        if (Math.abs(dy) > 3) moved.current = true;
        if (moved.current) onChange(clamp(drag.current.start + dy / drag.current.range));
      }}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
      onClick={(e) => {
        // A plain click on the grip (no drag) centres the text vertically.
        if ((e.target as HTMLElement).closest('button')) return;
        if (!moved.current) onChange(0.5);
        moved.current = false;
      }}
    >
      <button
        type="button"
        aria-label="Move text to the top"
        onClick={(e) => snap(e, 0)}
        className="grid size-5 place-items-center rounded-full hover:bg-white/20"
      >
        <ChevronUp className="size-3.5" />
      </button>
      <MoveVertical className="size-3.5 opacity-70" aria-hidden />
      <button
        type="button"
        aria-label="Move text to the bottom"
        onClick={(e) => snap(e, 1)}
        className="grid size-5 place-items-center rounded-full hover:bg-white/20"
      >
        <ChevronDown className="size-3.5" />
      </button>
    </div>
  );
}

/**
 * Editable numbered tracks superimposed on the cover art, on a translucent
 * bgColor panel that shares the text band's opacity.
 */
function TracksOverlay({
  data,
  update,
  style,
}: {
  data: LabelData;
  update: (patch: Partial<LabelData>) => void;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="pointer-events-auto"
      style={{
        padding: `${FRONT.padding * 0.6 * S}px ${FRONT.padding * S}px`,
        background: withAlpha(data.bgColor, data.textBgOpacity),
        overflow: 'hidden',
        ...style,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <TrackEditor
        value={data.tracklist}
        onChange={(v) => update({ tracklist: v })}
        cols={1}
        style={{
          fontFamily: data.trackFont,
          fontSize: data.trackSize * S,
          color: data.textColor,
          opacity: data.trackOpacity,
          lineHeight: data.lineHeight,
          letterSpacing: `${data.letterSpacing}em`,
          minHeight: data.trackSize * S * data.lineHeight,
        }}
      />
    </div>
  );
}

/** A cover area that accepts a dropped image, with a drop-target overlay. */
function CoverSlot({
  src,
  onCover,
  pageDragging,
  style,
  imgStyle,
  contain,
  rootRef,
  children,
}: {
  src: string | null;
  onCover: (dataUrl: string | null) => void;
  pageDragging: boolean;
  style: React.CSSProperties;
  imgStyle?: React.CSSProperties;
  contain?: boolean;
  rootRef?: React.RefObject<HTMLDivElement | null>;
  children?: React.ReactNode;
}) {
  return (
    <div
      ref={rootRef}
      className="group overflow-hidden"
      style={style}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (f?.type.startsWith('image/')) void readImageFile(f).then(onCover);
      }}
    >
      {src && (
        <img
          src={src}
          alt=""
          className={`size-full ${contain ? 'object-contain' : 'object-cover'}`}
          style={imgStyle}
        />
      )}
      <div
        className={`pointer-events-none absolute inset-0 flex items-center justify-center transition-opacity ${
          src && !pageDragging ? 'opacity-0' : 'opacity-100'
        }`}
        style={{ background: src ? 'rgba(18,16,12,0.6)' : '#3f3d39', color: '#cfc9bd' }}
      >
        <svg
          className="absolute inset-0 size-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden
        >
          <line x1="0" y1="0" x2="100" y2="100" stroke="#8a857c" strokeWidth="0.6" strokeDasharray="3 2" />
          <line x1="100" y1="0" x2="0" y2="100" stroke="#8a857c" strokeWidth="0.6" strokeDasharray="3 2" />
        </svg>
        <span className="relative tracking-wide" style={{ fontSize: 3 * S }}>
          {pageDragging ? 'DROP' : 'COVER'}
        </span>
      </div>
      {children}
    </div>
  );
}

/**
 * Free-layout mode: independent horizontal and vertical alignment controls.
 * This layer sits below the text panels, so hovering text never reveals or
 * captures the artwork controls.
 */
function AlignControls({
  horizontal,
  vertical,
  horizontalShift,
  verticalShift,
  onHorizontalChange,
  onVerticalChange,
  onHighlight,
}: {
  horizontal: number;
  vertical: number;
  horizontalShift: number;
  verticalShift: number;
  onHorizontalChange: (v: number) => void;
  onVerticalChange: (v: number) => void;
  onHighlight: (active: boolean) => void;
}) {
  const horizontalDrag = useRef<{ x: number; align: number } | null>(null);
  const verticalDrag = useRef<{ y: number; align: number } | null>(null);
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const set = (e: React.MouseEvent, change: (v: number) => void, v: number) => {
    e.stopPropagation();
    change(clamp(v));
  };
  return (
    <div
      className="group/artwork pointer-events-none absolute inset-0"
      onMouseEnter={() => onHighlight(true)}
      onMouseLeave={() => onHighlight(false)}
    >
      {/* Hover surface stays below text; the revealed controls rise above it. */}
      <div className="pointer-events-auto absolute inset-0 z-10" />
      {Math.abs(horizontalShift) > 0.01 && (
        <div className="pointer-events-none absolute top-1/2 left-1/2 z-30 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full bg-black/70 px-2 py-1.5 text-white opacity-0 transition-opacity group-hover/artwork:pointer-events-auto group-hover/artwork:opacity-100">
        <button
          type="button"
          aria-label="Align cover left"
          onClick={(e) => set(e, onHorizontalChange, 0)}
          className="grid size-5 place-items-center rounded-full hover:bg-white/20"
        >
          <ChevronLeft className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label="Centre cover"
          onClick={(e) => set(e, onHorizontalChange, 0.5)}
          className="grid size-5 place-items-center rounded-full hover:bg-white/20"
        >
          <MoveHorizontal className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label="Align cover right"
          onClick={(e) => set(e, onHorizontalChange, 1)}
          className="grid size-5 place-items-center rounded-full hover:bg-white/20"
        >
          <ChevronRight className="size-3.5" />
        </button>
        <button
          type="button"
          aria-label="Drag cover horizontally"
          className="grid size-7 cursor-ew-resize touch-none place-items-center rounded-full bg-white/15 hover:bg-white/25"
          onPointerDown={(e) => {
            horizontalDrag.current = { x: e.clientX, align: horizontal };
            e.currentTarget.setPointerCapture(e.pointerId);
            e.stopPropagation();
          }}
          onPointerMove={(e) => {
            if (!horizontalDrag.current) return;
            const dx = e.clientX - horizontalDrag.current.x;
            onHorizontalChange(clamp(horizontalDrag.current.align - dx / horizontalShift));
          }}
          onPointerUp={() => (horizontalDrag.current = null)}
          onPointerCancel={() => (horizontalDrag.current = null)}
          title="Drag cover left or right"
        >
          <GripVertical className="size-4" />
        </button>
        </div>
      )}
      {Math.abs(verticalShift) > 0.01 && (
        <div className="pointer-events-none absolute top-1/2 right-2 z-30 flex -translate-y-1/2 flex-col items-center gap-1 rounded-full bg-black/70 px-1.5 py-2 text-white opacity-0 transition-opacity group-hover/artwork:pointer-events-auto group-hover/artwork:opacity-100">
          <button
            type="button"
            aria-label="Align cover top"
            onClick={(e) => set(e, onVerticalChange, 0)}
            className="grid size-5 place-items-center rounded-full hover:bg-white/20"
          >
            <ChevronUp className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label="Centre cover vertically"
            onClick={(e) => set(e, onVerticalChange, 0.5)}
            className="grid size-5 place-items-center rounded-full hover:bg-white/20"
          >
            <MoveVertical className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label="Align cover bottom"
            onClick={(e) => set(e, onVerticalChange, 1)}
            className="grid size-5 place-items-center rounded-full hover:bg-white/20"
          >
            <ChevronDown className="size-3.5" />
          </button>
          <button
          type="button"
          aria-label="Drag cover vertically"
          className="grid size-7 cursor-ns-resize touch-none place-items-center rounded-full bg-white/15 hover:bg-white/25"
          onPointerDown={(e) => {
            verticalDrag.current = { y: e.clientY, align: vertical };
            e.currentTarget.setPointerCapture(e.pointerId);
            e.stopPropagation();
          }}
          onPointerMove={(e) => {
            if (!verticalDrag.current) return;
            const dy = e.clientY - verticalDrag.current.y;
            onVerticalChange(clamp(verticalDrag.current.align - dy / verticalShift));
          }}
          onPointerUp={() => (verticalDrag.current = null)}
          onPointerCancel={() => (verticalDrag.current = null)}
          title="Drag cover up or down"
          >
            <GripVertical className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Album + artist overlaid over the bottom of a cover (double-album mode) on a
 * solid background band with adjustable opacity. Text sits smaller here.
 */
function OverlayText({
  data,
  album,
  artist,
  onAlbum,
  onArtist,
  pad,
}: {
  data: LabelData;
  album: string;
  artist: string;
  onAlbum: (v: string) => void;
  onArtist: (v: string) => void;
  pad: number;
}) {
  return (
    <div
      className="absolute right-0 bottom-0 left-0 flex flex-col justify-end"
      style={{
        // Bottom trimmed to land the artist baseline at the twin's anchor.
        padding: `${pad}px ${pad}px ${pad * 0.7 - 0.2 * data.artistSize * DOUBLE_TEXT_SCALE * S}px`,
        gap: data.titleArtistGap * S,
        background: withAlpha(data.bgColor, data.textBgOpacity),
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <AutoTextarea
        value={album}
        placeholder="Album"
        onChange={onAlbum}
        style={{
          fontFamily: data.titleFont,
          fontSize: data.titleSize * DOUBLE_TEXT_SCALE * S,
          fontWeight: 700,
          color: data.textColor,
          opacity: data.titleOpacity,
          lineHeight: data.lineHeight,
          letterSpacing: `${data.letterSpacing}em`,
        }}
      />
      <AutoTextarea
        value={artist}
        placeholder="Artist"
        onChange={onArtist}
        style={{
          fontFamily: data.artistFont,
          fontSize: data.artistSize * DOUBLE_TEXT_SCALE * S,
          color: data.textColor,
          opacity: data.artistOpacity,
          lineHeight: data.lineHeight,
          letterSpacing: `${data.letterSpacing}em`,
        }}
      />
    </div>
  );
}

/**
 * A transparent, auto-growing textarea that blends into the label. The CSS
 * half-leading above the first and below the last line is trimmed away with
 * negative margins, so the box height equals the SVG twin's baseline math
 * (fontSize + (n−1) × fontSize × lineHeight) and print matches the preview.
 */
function AutoTextarea({
  value,
  placeholder,
  onChange,
  style,
}: {
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
  style: React.CSSProperties;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value, style.fontSize, style.fontFamily, style.lineHeight]);

  const fontPx = typeof style.fontSize === 'number' ? style.fontSize : 0;
  const lh = typeof style.lineHeight === 'number' ? style.lineHeight : 1.2;
  const trim = ((lh - 1) / 2) * fontPx;

  return (
    <textarea
      ref={ref}
      rows={1}
      className="label-field w-full resize-none overflow-hidden bg-transparent p-0 outline-none"
      style={{ ...style, marginTop: -trim, marginBottom: -trim }}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
