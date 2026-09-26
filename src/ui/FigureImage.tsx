import { useEffect, useState } from "react";
import type { SectionFigure } from "../index/SectionExpansion";
import type { PdfCropResolver } from "../index/PdfCropRenderer";

/**
 * Source for a section figure. Image attachments and web images are ready immediately; a PDF++
 * rectangular annotation is rendered from the PDF page on demand and cached by the resolver.
 */
export function useFigureSrc(figure: SectionFigure, crops: PdfCropResolver): string | null {
  const crop = figure.crop;
  const cropKey = crop ? `${crop.path}${crop.mtime}${crop.region.page}${crop.region.rect.join(",")}` : "";
  const [src, setSrc] = useState<string | null>(() => figure.src || (crop ? crops.peek(crop) : null));

  useEffect(() => {
    if (figure.src) {
      setSrc(figure.src);
      return;
    }
    if (!crop) {
      setSrc(null);
      return;
    }
    const cached = crops.peek(crop);
    setSrc(cached);
    if (cached) return;
    let active = true;
    void crops.resolve(crop).then((url) => { if (active) setSrc(url); });
    return () => { active = false; };
    // The crop key covers the identity of a region render; figure.src covers ordinary images.
  }, [figure.src, cropKey, crop, crops]);

  return src;
}

/** The figure image itself, with a quiet placeholder while a PDF region is still rendering. */
export function FigureImage({ figure, crops, className }: {
  figure: SectionFigure;
  crops: PdfCropResolver;
  className?: string;
}) {
  const src = useFigureSrc(figure, crops);
  if (!src) return <span className={`kplex-figure-image-pending${className ? ` ${className}` : ""}`} aria-hidden="true" />;
  return <img
    className={className}
    src={src}
    alt={figure.caption ? "" : (figure.alt || "Figure")}
    loading="lazy"
    decoding="async"
    draggable={false}
  />;
}
