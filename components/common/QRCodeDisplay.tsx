"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download, Copy, Check, QrCode } from "lucide-react";

interface QRCodeDisplayProps {
  url: string;
  title?: string;
  size?: number;
}

export function QRCodeDisplay({ url, title = "Form Access", size = 220 }: QRCodeDisplayProps) {
  const [svgString, setSvgString] = useState<string>("");
  const [pngDataUrl, setPngDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!url) return;

    // Generate SVG string for crisp vector rendering
    QRCode.toString(
      url,
      {
        type: "svg",
        color: {
          dark: "#ffffff",
          light: "#09090b",
        },
        margin: 1,
        width: size,
      },
      (err, svg) => {
        if (!err && svg) setSvgString(svg);
      }
    );

    // Generate high-res PNG for download
    QRCode.toDataURL(
      url,
      {
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
        margin: 2,
        width: 800,
      },
      (err, dataUri) => {
        if (!err && dataUri) setPngDataUrl(dataUri);
      }
    );
  }, [url, size]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownloadPng = () => {
    if (!pngDataUrl) return;
    const a = document.createElement("a");
    a.href = pngDataUrl;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, "_")}_qr.png`;
    a.click();
  };

  const handleDownloadSvg = () => {
    if (!svgString) return;
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, "_")}_qr.svg`;
    a.click();
    URL.revokeObjectURL(blobUrl);
  };

  return (
    <div className="flex flex-col items-center bg-zinc-950 border border-zinc-800 rounded-2xl p-6 text-zinc-100 max-w-sm w-full">
      <div className="flex items-center gap-2 mb-4 w-full justify-between">
        <div className="flex items-center gap-2">
          <QrCode className="w-5 h-5 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-200">Unique QR Code</span>
        </div>
        <span className="text-xs text-zinc-500 font-mono">Scan & Submit</span>
      </div>

      {/* QR Code Container */}
      <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl shadow-inner flex items-center justify-center mb-5">
        {svgString ? (
          <div
            className="w-[200px] h-[200px] [&>svg]:w-full [&>svg]:h-full"
            dangerouslySetInnerHTML={{ __html: svgString }}
          />
        ) : (
          <div className="w-[200px] h-[200px] flex items-center justify-center text-zinc-600 text-xs">
            Generating code...
          </div>
        )}
      </div>

      {/* URL preview with copy button */}
      <div className="flex items-center w-full bg-zinc-900/90 border border-zinc-800/80 rounded-lg p-1.5 mb-4 text-xs font-mono">
        <input
          type="text"
          readOnly
          value={url}
          className="bg-transparent border-none text-zinc-400 focus:outline-none flex-1 px-2 select-all truncate"
        />
        <button
          onClick={handleCopy}
          title="Copy URL"
          className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      {/* Download action buttons */}
      <div className="grid grid-cols-2 gap-2 w-full">
        <button
          onClick={handleDownloadPng}
          className="flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-200 hover:text-white transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>PNG Format</span>
        </button>
        <button
          onClick={handleDownloadSvg}
          className="flex items-center justify-center gap-1.5 text-xs font-medium py-2 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-200 hover:text-white transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>SVG Vector</span>
        </button>
      </div>
    </div>
  );
}
