import { useState, useRef, useEffect } from 'react';

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

  useEffect(() => {
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

      // Clear completely
      ctx.clearRect(0, 0, w, h);

      // Draw image
      ctx.drawImage(img, 0, 0);

      // --- 1. Diagonal dashed grid overlay ---
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = Math.max(1, w / 800);
      ctx.setLineDash([Math.max(4, w / 100), Math.max(6, w / 60)]);
      const spacing = Math.max(60, w / 8);
      const diag = Math.sqrt(w * w + h * h);
      // Forward diagonals
      for (let offset = -diag; offset < diag; offset += spacing) {
        ctx.beginPath();
        ctx.moveTo(offset, 0);
        ctx.lineTo(offset + h, h);
        ctx.stroke();
      }
      // Backward diagonals
      for (let offset = -diag; offset < diag; offset += spacing) {
        ctx.beginPath();
        ctx.moveTo(w - offset, 0);
        ctx.lineTo(w - offset - h, h);
        ctx.stroke();
      }
      ctx.restore();

      // --- 2. Center branded text ---
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(-20 * Math.PI / 180);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Dynamic font size: 35% of width, but cap so it fits
      let fontSize = w * 0.35;
      ctx.font = `900 ${fontSize}px "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
      let measured = ctx.measureText('FotoPedido');
      // Shrink if too wide (accounting for rotation)
      const maxTextWidth = w * 0.85;
      if (measured.width > maxTextWidth) {
        fontSize = fontSize * (maxTextWidth / measured.width);
        ctx.font = `900 ${fontSize}px "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
      }

      // Shadow for contrast
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = Math.max(4, fontSize / 10);
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      // Stroke
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = Math.max(1, fontSize / 40);
      ctx.strokeText('FotoPedido', 0, 0);

      // Fill
      ctx.fillStyle = 'rgba(255, 255, 255, 0.70)';
      ctx.fillText('FotoPedido', 0, 0);
      ctx.restore();

      // --- 3. Anti-copy labels ---
      ctx.save();
      const labelSize = Math.max(12, w / 50);
      ctx.font = `700 ${labelSize}px "Segoe UI", Arial, sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.40)';

      // Top-right
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText('PREVIEW', w - labelSize * 0.8, labelSize * 0.8);

      // Bottom-left
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText('#NOCOPY', labelSize * 0.8, h - labelSize * 0.8);
      ctx.restore();

      setLoaded(true);
      onLoad?.();
    };
    img.onerror = () => {
      setLoaded(false);
    };
    img.src = src;
  }, [src, watermarkText, onLoad]);

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
