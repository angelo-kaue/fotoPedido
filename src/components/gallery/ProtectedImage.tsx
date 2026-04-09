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

      // Draw watermark
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(-Math.PI / 6);
      ctx.font = `bold ${Math.max(canvas.width / 10, 24)}px sans-serif`;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(watermarkText, 0, 0);
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
