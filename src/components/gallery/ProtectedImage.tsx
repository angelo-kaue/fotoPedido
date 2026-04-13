import { useState, useRef, useEffect, useCallback } from 'react';

interface ProtectedImageProps {
  src: string | null;
  alt: string;
  watermarkText: string;
  className?: string;
  onClick?: () => void;
  onLoad?: () => void;
}

const ProtectedImage = ({ src, alt, watermarkText, className, onClick, onLoad }: ProtectedImageProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);
  const onLoadRef = useRef(onLoad);
  onLoadRef.current = onLoad;

  const draw = useCallback(() => {
    if (!src || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      canvas.width = w;
      canvas.height = h;

      // Always clear first
      ctx.clearRect(0, 0, w, h);

      // Draw photo
      ctx.drawImage(img, 0, 0);

      const diag = Math.sqrt(w * w + h * h);

      // ===== LAYER 2: Dense diagonal grid (draw FIRST, behind center) =====
      ctx.save();
      const gridFontSize = Math.max(14, w * 0.10);
      const gridSpacing = Math.max(40, w * 0.15);
      ctx.font = `900 ${gridFontSize}px "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Rotate entire context for diagonal pattern
      ctx.translate(w / 2, h / 2);
      ctx.rotate(-20 * Math.PI / 180);

      const cols = Math.ceil(diag / gridSpacing) + 2;
      const rows = Math.ceil(diag / gridSpacing) + 2;

      for (let row = -rows; row <= rows; row++) {
        for (let col = -cols; col <= cols; col++) {
          const x = col * gridSpacing;
          const y = row * gridSpacing;
          ctx.fillText('FotoPedido', x, y);
        }
      }
      ctx.restore();

      // ===== LAYER 1: Center watermark (dominant brand) =====
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(-20 * Math.PI / 180);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      let fontSize = w * 0.40;
      ctx.font = `900 ${fontSize}px "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
      const maxTextWidth = w * 0.85;
      const measured = ctx.measureText('FotoPedido');
      if (measured.width > maxTextWidth) {
        fontSize = fontSize * (maxTextWidth / measured.width);
        ctx.font = `900 ${fontSize}px "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
      }

      // Strong shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = Math.max(8, fontSize / 6);
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;

      // Black stroke
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.lineWidth = Math.max(2, fontSize / 30);
      ctx.strokeText('FotoPedido', 0, 0);

      // White fill at 78% opacity
      ctx.fillStyle = 'rgba(255, 255, 255, 0.78)';
      ctx.fillText('FotoPedido', 0, 0);
      ctx.restore();

      // ===== LAYER 3: Strong corner labels =====
      ctx.save();
      const labelSize = Math.max(18, w * 0.04);
      ctx.font = `800 ${labelSize}px "Segoe UI", Arial, sans-serif`;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetX = 1;
      ctx.shadowOffsetY = 1;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      const pad = labelSize * 1.2;

      // Top-left
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('PREVIEW', pad, pad);

      // Top-right
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText('PREVIEW', w - pad, pad);

      // Bottom-left
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText('NÃO COPIE', pad, h - pad);

      // Bottom-right
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText('NÃO COPIE', w - pad, h - pad);

      ctx.restore();

      setLoaded(true);
      onLoadRef.current?.();
    };
    img.onerror = () => setLoaded(false);
    img.src = src;
  }, [src]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      className={`${className || ''} ${loaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
      style={{ userSelect: 'none', WebkitUserDrag: 'none' } as React.CSSProperties}
      onClick={onClick}
      onContextMenu={(e) => e.preventDefault()}
      draggable={false}
    />
  );
};

export default ProtectedImage;
