import { useState } from "react";
import { ZoomIn, ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/thumbs";

export default function ProductImages({ images = [], name = "" }) {
  const [active, setActive]   = useState(0);
  const [zoomed, setZoomed]   = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [swiper, setSwiper] = useState(null);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top)  / rect.height) * 100;
    setMousePos({ x, y });
  };

  const allImages = images.length > 0
    ? images
    : Array(4).fill("https://placehold.co/600x600/f3f4f6/6366f1?text=Product");

  const handleThumbClick = (i) => {
    setActive(i);
    swiper?.slideTo(i);
  };

  return (
    <div className="flex flex-col-reverse sm:flex-row gap-3">
      {/* Thumbnails */}
      <div className="flex sm:flex-col gap-2 overflow-x-auto sm:overflow-y-auto sm:max-h-[500px] scrollbar-hide py-1">
        {allImages.map((img, i) => (
          <button
            key={i}
            onClick={() => handleThumbClick(i)}
            className={clsx(
              "flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all",
              active === i
                ? "border-primary shadow-md scale-105"
                : "border-gray-100 hover:border-gray-300"
            )}
          >
            <img src={img} alt={`${name} ${i+1}`} className="w-full h-full object-cover" />
          </button>
        ))}
      </div>

      {/* Main Image with Swiper for Touch Support */}
      <div className="relative flex-1 aspect-square rounded-2xl overflow-hidden bg-gray-50 group">
        <Swiper
          modules={[Navigation]}
          onSwiper={setSwiper}
          onSlideChange={(s) => setActive(s.activeIndex)}
          className="w-full h-full"
        >
          {allImages.map((img, i) => (
            <SwiperSlide key={i}>
              <div 
                className="w-full h-full cursor-zoom-in"
                onMouseEnter={() => setZoomed(true)}
                onMouseLeave={() => setZoomed(false)}
                onMouseMove={handleMouseMove}
              >
                <img
                  src={img}
                  alt={name}
                  className={clsx(
                    "w-full h-full object-cover transition-transform duration-200",
                    zoomed && active === i ? "scale-150" : "scale-100"
                  )}
                  style={zoomed && active === i ? {
                    transformOrigin: `${mousePos.x}% ${mousePos.y}%`
                  } : {}}
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Custom Navigation Arrows (visible on hover) */}
        <button 
          onClick={() => swiper?.slidePrev()}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/80 
                     backdrop-blur-sm rounded-full flex items-center justify-center 
                     text-gray-800 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronLeft size={20} />
        </button>
        <button 
          onClick={() => swiper?.slideNext()}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/80 
                     backdrop-blur-sm rounded-full flex items-center justify-center 
                     text-gray-800 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <ChevronRight size={20} />
        </button>

        {!zoomed && (
          <div className="absolute bottom-3 right-3 bg-black/40 text-white rounded-lg
                          p-1.5 flex items-center gap-1 text-xs backdrop-blur-sm z-10">
            <ZoomIn size={13} /> Zoom
          </div>
        )}
      </div>
    </div>
  );
}
