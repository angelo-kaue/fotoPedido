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
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;

      // Draw image
      ctx.drawImage(img, 0, 0);

      // Draw elegant repeating watermark pattern
      ctx.save();
      const fontSize = Math.max(canvas.width / 18, 16);
      ctx.font = `600 ${fontSize}px sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Tiled diagonal watermark for full coverage
      const spacingX = fontSize * 8;
      const spacingY = fontSize * 5;
      ctx.rotate(-Math.PI / 6);

      const diagonal = Math.sqrt(canvas.width ** 2 + canvas.height ** 2);
      for (let y = -diagonal; y < diagonal * 2; y += spacingY) {
        for (let x = -diagonal; x < diagonal * 2; x += spacingX) {
          ctx.fillText(watermarkText, x, y);
        }
      }
      ctx.restore();

      // Bottom-right branding badge
      ctx.save();
      const badgeSize = Math.max(canvas.width / 12, 28);
      const margin = badgeSize * 0.6;
      const bx = canvas.width - margin - badgeSize / 2;
      const by = canvas.height - margin - badgeSize / 2;

      // Circle background
      ctx.beginPath();
      ctx.arc(bx, by, badgeSize / 2 + 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fill();

      // Camera lens icon
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = Math.max(2, badgeSize / 14);
      ctx.beginPath();
      ctx.arc(bx, by, badgeSize / 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(bx, by, badgeSize / 7, 0, Math.PI * 2);
      ctx.stroke();

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
