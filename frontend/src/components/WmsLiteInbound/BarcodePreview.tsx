import React, { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

// jsbarcode renders real 1D symbologies (Code128, Code39, EAN13, ...) onto
// an <svg>. It has no QR renderer, so a QR-configured label honestly shows
// the encoded value as text instead of a fake barcode graphic — no striped
// placeholder pretending to be a real 2D code.
const JSBARCODE_FORMATS: Record<string, string> = {
  Code128: "CODE128",
  Code39: "CODE39",
  EAN13: "EAN13",
};

interface BarcodePreviewProps {
  value: string;
  symbology: string;
  width?: number;
  height?: number;
}

const BarcodePreview = ({ value, symbology, width = 2, height = 60 }: BarcodePreviewProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const format = JSBARCODE_FORMATS[symbology];

  useEffect(() => {
    if (!svgRef.current || !format || !value) return;
    try {
      JsBarcode(svgRef.current, value, {
        format,
        width,
        height,
        displayValue: true,
        fontSize: 12,
        margin: 6,
      });
    } catch {
      // Invalid value for this symbology (e.g. non-numeric for EAN13) —
      // leave the SVG empty rather than throwing during render.
    }
  }, [value, format, width, height]);

  if (!format) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 border border-dashed border-neutral-300 rounded-lg py-4 px-3 bg-neutral-50">
        <span className="text-[10px] text-neutral-400">{symbology} preview not supported by this renderer</span>
        <code className="text-xs font-mono font-semibold text-neutral-700">{value}</code>
      </div>
    );
  }

  return <svg ref={svgRef} />;
};

export default BarcodePreview;
