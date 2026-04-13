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

      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0);

      const font = '"Segoe UI", "Helvetica Neue", Arial, sans-serif';

      // ===== LAYER 1: 4 sparse quadrant watermarks (drawn first, behind center) =====
      ctx.save();
      const sparseSize = Math.max(14, w * 0.17);
      ctx.font = `900 ${sparseSize}px ${font}`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 4;

      const positions = [
        { x: w * 0.25, y: h * 0.25 },  // top-left quadrant
        { x: w * 0.75, y: h * 0.25 },  // top-right quadrant
        { x: w * 0.25, y: h * 0.75 },  // bottom-left quadrant
        { x: w * 0.75, y: h * 0.75 },  // bottom-right quadrant
      ];

      for (const pos of positions) {
        ctx.save();
        ctx.translate(pos.x, pos.y);
        ctx.rotate(-20 * Math.PI / 180);
        ctx.fillText('FotoPedido', 0, 0);
        ctx.restore();
      }
      ctx.restore();

      // ===== LAYER 2: Center watermark (dominant brand) =====
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(-20 * Math.PI / 180);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      let fontSize = w * 0.35;
      ctx.font = `900 ${fontSize}px ${font}`;
      const maxTextWidth = w * 0.85;
      const measured = ctx.measureText('FotoPedido');
      if (measured.width > maxTextWidth) {
        fontSize = fontSize * (maxTextWidth / measured.width);
        ctx.font = `900 ${fontSize}px ${font}`;
      }

      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = Math.max(6, fontSize / 8);
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
      ctx.lineWidth = Math.max(1.5, fontSize / 40);
      ctx.strokeText('FotoPedido', 0, 0);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.68)';
      ctx.fillText('FotoPedido', 0, 0);
      ctx.restore();

      // ===== LAYER 3: Corner labels =====
      ctx.save();
      const labelSize = Math.max(16, w * 0.035);
      ctx.font = `700 ${labelSize}px ${font}`;
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 3;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      const pad = labelSize * 1.2;

      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('PREVIEW', pad, pad);

      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText('PREVIEW', w - pad, pad);

      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText('NÃO COPIE', pad, h - pad);

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
