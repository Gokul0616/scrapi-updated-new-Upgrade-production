import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Play } from 'lucide-react';
import { Button } from './ui/button';

/**
 * Position-aware Image Gallery Modal (Notion-style)
 * Shows images and videos in a modal that appears near the click position
 */
export function ImageGalleryModal({ 
  images = [], 
  videos = [], 
  initialIndex = 0, 
  onClose, 
  clickPosition = null 
}) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const [showVideos, setShowVideos] = useState(false);
  const [modalPosition, setModalPosition] = useState({ top: 0, left: 0 });
  const modalRef = useRef(null);

  const allMediaItems = [...images, ...videos.map(v => ({ type: 'video', url: v }))];
  const currentItem = allMediaItems[currentIndex];
  const isVideo = currentItem?.type === 'video';

  // Calculate modal position based on click position
  useEffect(() => {
    if (clickPosition && modalRef.current) {
      const modalWidth = 800;
      const modalHeight = 600;
      const padding = 20;

      let top = clickPosition.y - modalHeight / 2;
      let left = clickPosition.x - modalWidth / 2;

      // Ensure modal stays within viewport
      if (top < padding) top = padding;
      if (left < padding) left = padding;
      if (top + modalHeight > window.innerHeight - padding) {
        top = window.innerHeight - modalHeight - padding;
      }
      if (left + modalWidth > window.innerWidth - padding) {
        left = window.innerWidth - modalWidth - padding;
      }

      setModalPosition({ top, left });
    } else {
      // Center if no click position
      setModalPosition({
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      });
    }
  }, [clickPosition]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') handlePrevious();
      if (e.key === 'ArrowRight') handleNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, allMediaItems.length]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : allMediaItems.length - 1));
    setIsZoomed(false);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < allMediaItems.length - 1 ? prev + 1 : 0));
    setIsZoomed(false);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!allMediaItems || allMediaItems.length === 0) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center"
      onClick={handleBackdropClick}
      data-testid="image-gallery-modal-backdrop"
    >
      <div
        ref={modalRef}
        className="relative bg-background border border-border rounded-lg shadow-2xl max-w-4xl w-full mx-4 animate-in fade-in duration-200"
        style={clickPosition ? modalPosition : {}}
        data-testid="image-gallery-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {showVideos ? 'Videos' : 'Images'}
            </span>
            <span className="text-xs text-muted-foreground">
              {currentIndex + 1} / {allMediaItems.length}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {videos.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowVideos(!showVideos);
                  setCurrentIndex(showVideos ? 0 : images.length);
                }}
              >
                <Play className="h-4 w-4 mr-1" />
                {showVideos ? 'Show Images' : 'Show Videos'}
              </Button>
            )}
            
            {!isVideo && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsZoomed(!isZoomed)}
                data-testid="zoom-toggle-button"
              >
                {isZoomed ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              data-testid="close-modal-button"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="relative bg-muted/30" style={{ height: '500px' }}>
          {/* Navigation Buttons */}
          {allMediaItems.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-background/90 hover:bg-background shadow-lg"
                onClick={handlePrevious}
                data-testid="previous-button"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-background/90 hover:bg-background shadow-lg"
                onClick={handleNext}
                data-testid="next-button"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}

          {/* Image/Video Display */}
          <div className="w-full h-full flex items-center justify-center overflow-hidden p-4">
            {isVideo ? (
              <video
                key={currentItem.url}
                controls
                className="max-w-full max-h-full rounded"
                data-testid="video-player"
              >
                <source src={currentItem.url} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            ) : (
              <img
                src={typeof currentItem === 'string' ? currentItem : currentItem?.url}
                alt={`Product ${currentIndex + 1}`}
                className={`max-w-full max-h-full object-contain transition-transform duration-200 rounded ${
                  isZoomed ? 'scale-150 cursor-zoom-out' : 'cursor-zoom-in'
                }`}
                onClick={() => setIsZoomed(!isZoomed)}
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/800x600?text=Image+Not+Available';
                }}
                data-testid="gallery-image"
              />
            )}
          </div>
        </div>

        {/* Thumbnail Strip */}
        {allMediaItems.length > 1 && (
          <div className="border-t p-4 bg-muted/20">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {allMediaItems.map((item, index) => {
                const itemIsVideo = item?.type === 'video';
                const itemUrl = typeof item === 'string' ? item : item?.url;
                
                return (
                  <button
                    key={index}
                    onClick={() => {
                      setCurrentIndex(index);
                      setIsZoomed(false);
                    }}
                    className={`relative flex-shrink-0 w-20 h-20 rounded border-2 transition-all overflow-hidden ${
                      index === currentIndex
                        ? 'border-primary ring-2 ring-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                    data-testid={`thumbnail-${index}`}
                  >
                    {itemIsVideo ? (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <Play className="h-6 w-6 text-muted-foreground" />
                      </div>
                    ) : (
                      <img
                        src={itemUrl}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/80?text=N/A';
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Image Thumbnail Cell Component
 * Shows first image as thumbnail in table with click to open gallery
 */
export function ImageThumbnailCell({ images = [], videos = [], rowIndex }) {
  const [showModal, setShowModal] = useState(false);
  const [clickPosition, setClickPosition] = useState(null);
  const cellRef = useRef(null);

  const handleClick = (e) => {
    e.stopPropagation();
    
    // Get click position relative to viewport
    const rect = cellRef.current?.getBoundingClientRect();
    if (rect) {
      setClickPosition({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      });
    }
    
    setShowModal(true);
  };

  const totalMedia = images.length + videos.length;

  if (totalMedia === 0) {
    return <span className="text-muted-foreground text-xs">No media</span>;
  }

  const firstImage = images[0];

  return (
    <>
      <div 
        ref={cellRef}
        className="relative group cursor-pointer"
        onClick={handleClick}
        data-testid={`image-thumbnail-cell-${rowIndex}`}
      >
        <div className="relative w-24 h-24 rounded border overflow-hidden transition-all group-hover:ring-2 group-hover:ring-primary">
          {firstImage ? (
            <img
              src={firstImage}
              alt="Product"
              className="w-full h-full object-cover transition-transform group-hover:scale-110"
              onError={(e) => {
                e.target.src = 'https://via.placeholder.com/96?text=No+Image';
              }}
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <Play className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          
          {/* Media count badge */}
          <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
            {totalMedia}
          </div>
          
          {/* Hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
            <span className="text-white opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium">
              Click to view
            </span>
          </div>
        </div>
        
        <div className="mt-1 text-xs text-muted-foreground text-center">
          {images.length > 0 && `${images.length} image${images.length !== 1 ? 's' : ''}`}
          {images.length > 0 && videos.length > 0 && ' • '}
          {videos.length > 0 && `${videos.length} video${videos.length !== 1 ? 's' : ''}`}
        </div>
      </div>

      {showModal && (
        <ImageGalleryModal
          images={images}
          videos={videos}
          onClose={() => setShowModal(false)}
          clickPosition={clickPosition}
        />
      )}
    </>
  );
}
