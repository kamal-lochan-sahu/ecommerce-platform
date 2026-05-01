import { useState } from "react";
import { ZoomIn } from "lucide-react";
import { clsx } from "clsx";

export default function ProductImages({ images = [], name = "" }) {
  const [active, setActive]   = useState(0);
  const [zoomed, setZoomed]   = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top)  / rect.height) * 100;
    setMousePos({ x, y });
  };

  const allImages = images.length > 0
    ? images
    : Array(4).fill("https://placehold.co/600x600/f3f4f6/6366f1?text=Product");

  return (
    <div className="flex flex-col-reverse sm:flex-row gap-3">
      {/* Thumbnails */}
      <div className="flex sm:flex-col gap-2 overflow-x-auto sm:overflow-y-auto sm:max-h-[500px]">
        {allImages.map((img, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            className={clsx(
              "flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all",
              active === i
                ? "border-primary shadow-md scale-105"
                : "border-gray-100 hover:border-gray-300"
            )}
          >
            <img src={img} alt={`${name} ${i+1}`} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      {/* Main Image */}
      <div
        className="relative flex-1 aspect-square rounded-2xl overflow-hidden bg-gray-50 cursor-zoom-in"
        onMouseEnter={() => setZoomed(true)}
        onMouseLeave={() => setZoomed(false)}
        onMouseMove={handleMouseMove}
      >
        <img
          src={allImages[active]}
          alt={name}
          className={clsx(
            "w-full h-full object-cover transition-transform duration-200",
            zoomed ? "scale-150" : "scale-100"
          )}
          style={zoomed ? {
            transformOrigin: `${mousePos.x}% ${mousePos.y}%`
          } : {}}
        />
        {!zoomed && (
          <div className="absolute bottom-3 right-3 bg-black/40 text-white rounded-lg
                          p-1.5 flex items-center gap-1 text-xs backdrop-blur-sm">
            <ZoomIn size={13} /> Zoom
          </div>
        )}
      </div>
    </div>
  );
}
