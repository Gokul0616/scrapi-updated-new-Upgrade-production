import React, { useState, useRef, useEffect } from 'react';
import { 
  Facebook, 
  Instagram, 
  Twitter, 
  Linkedin, 
  Youtube, 
  Music, 
  Send,
  MessageCircle,
  Plus,
  X
} from 'lucide-react';
import { Button } from './ui/button';

// Social media icon mapping
const SOCIAL_ICONS = {
  facebook: { icon: Facebook, color: '#1877F2', name: 'Facebook' },
  instagram: { icon: Instagram, color: '#E4405F', name: 'Instagram' },
  twitter: { icon: Twitter, color: '#1DA1F2', name: 'Twitter' },
  linkedin: { icon: Linkedin, color: '#0A66C2', name: 'LinkedIn' },
  youtube: { icon: Youtube, color: '#FF0000', name: 'YouTube' },
  tiktok: { icon: Music, color: '#000000', name: 'TikTok' },
  pinterest: { icon: Plus, color: '#E60023', name: 'Pinterest' },
  snapchat: { icon: MessageCircle, color: '#FFFC00', name: 'Snapchat' },
  whatsapp: { icon: MessageCircle, color: '#25D366', name: 'WhatsApp' },
  telegram: { icon: Send, color: '#26A5E4', name: 'Telegram' }
};

// Position-aware Modal Component (Notion-style)
const PositionAwareModal = ({ isOpen, onClose, triggerRef, children }) => {
  const modalRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0, openAbove: false });

  useEffect(() => {
    if (isOpen && triggerRef.current && modalRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const modalHeight = 300; // Approximate modal height
      const modalWidth = 320; // Modal width
      
      const spaceBelow = window.innerHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;
      
      // Determine if we should open above or below
      const openAbove = spaceBelow < modalHeight && spaceAbove > spaceBelow;
      
      // Calculate position
      let top, left;
      
      if (openAbove) {
        // Open above the trigger
        top = triggerRect.top - modalHeight - 8;
      } else {
        // Open below the trigger
        top = triggerRect.bottom + 8;
      }
      
      // Center horizontally relative to trigger, but keep within viewport
      left = triggerRect.left + (triggerRect.width / 2) - (modalWidth / 2);
      
      // Ensure modal stays within viewport horizontally
      if (left < 16) left = 16;
      if (left + modalWidth > window.innerWidth - 16) {
        left = window.innerWidth - modalWidth - 16;
      }
      
      // Ensure modal stays within viewport vertically
      if (top < 16) top = 16;
      if (top + modalHeight > window.innerHeight - 16) {
        top = window.innerHeight - modalHeight - 16;
      }
      
      setPosition({ top, left, openAbove });
    }
  }, [isOpen, triggerRef]);

  useEffect(() => {
    if (isOpen) {
      // Close on escape key
      const handleEscape = (e) => {
        if (e.key === 'Escape') onClose();
      };
      
      // Close on click outside
      const handleClickOutside = (e) => {
        if (modalRef.current && !modalRef.current.contains(e.target) && 
            triggerRef.current && !triggerRef.current.contains(e.target)) {
          onClose();
        }
      };
      
      document.addEventListener('keydown', handleEscape);
      document.addEventListener('mousedown', handleClickOutside);
      
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" />
      
      {/* Modal */}
      <div
        ref={modalRef}
        className="fixed z-50 bg-background border rounded-lg shadow-2xl"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
          width: '320px',
          maxHeight: '300px'
        }}
      >
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold text-sm">All Social Media Links</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto max-h-[252px]">
          {children}
        </div>
      </div>
    </>
  );
};

// Main SocialMediaLinks Component
export const SocialMediaLinks = ({ socialMedia, maxVisible = 5, size = 'default', showAll = false }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const moreButtonRef = useRef(null);

  if (!socialMedia || typeof socialMedia !== 'object') {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  // Filter out empty/null values and get array of social media entries
  const socialEntries = Object.entries(socialMedia).filter(([_, url]) => url);

  if (socialEntries.length === 0) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }

  // If showAll is true, display all links without More button
  if (showAll) {
    const iconSize = size === 'small' ? 'h-4 w-4' : size === 'large' ? 'h-6 w-6' : 'h-5 w-5';

    const renderSocialIcon = (platform, url) => {
      const socialConfig = SOCIAL_ICONS[platform.toLowerCase()] || {
        icon: Plus,
        color: '#666666',
        name: platform
      };

      const Icon = socialConfig.icon;

      return (
        <a
          key={platform}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-all duration-200 hover:scale-105"
          title={`${socialConfig.name}: ${url}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="flex items-center justify-center rounded-full p-1.5 transition-transform group-hover:rotate-6"
            style={{
              backgroundColor: `${socialConfig.color}15`,
              color: socialConfig.color
            }}
          >
            <Icon className={iconSize} strokeWidth={2} />
          </div>
        </a>
      );
    };

    return (
      <div className="flex items-center gap-1 flex-nowrap overflow-x-auto pb-2">
        {/* Display all social media icons horizontally */}
        {socialEntries.map(([platform, url]) => renderSocialIcon(platform, url))}
      </div>
    );
  }

  // Default behavior with More button
  const visibleLinks = socialEntries.slice(0, maxVisible);
  const hiddenLinks = socialEntries.slice(maxVisible);
  const hasMore = hiddenLinks.length > 0;

  const iconSize = size === 'small' ? 'h-4 w-4' : size === 'large' ? 'h-6 w-6' : 'h-5 w-5';

  const renderSocialIcon = (platform, url, showLabel = false) => {
    const socialConfig = SOCIAL_ICONS[platform.toLowerCase()] || {
      icon: Plus,
      color: '#666666',
      name: platform
    };

    const Icon = socialConfig.icon;

    return (
      <a
        key={platform}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group inline-flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-all duration-200 hover:scale-105"
        title={`${socialConfig.name}: ${url}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-center rounded-full p-1.5 transition-transform group-hover:rotate-6"
          style={{
            backgroundColor: `${socialConfig.color}15`,
            color: socialConfig.color
          }}
        >
          <Icon className={iconSize} strokeWidth={2} />
        </div>
        {showLabel && (
          <span className="text-sm font-medium">{socialConfig.name}</span>
        )}
      </a>
    );
  };

  return (
    <div className="flex items-center gap-1 flex-nowrap">
      {/* Visible social media icons */}
      {visibleLinks.map(([platform, url]) => renderSocialIcon(platform, url))}

      {/* More button if there are hidden links */}
      {hasMore && (
        <>
          <Button
            ref={moreButtonRef}
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setIsModalOpen(true);
            }}
            className="h-9 px-3 text-xs font-medium"
          >
            +{hiddenLinks.length} More
          </Button>

          {/* Position-aware Modal */}
          <PositionAwareModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            triggerRef={moreButtonRef}
          >
            <div className="p-2">
              {socialEntries.map(([platform, url]) => (
                <div key={platform}>
                  {renderSocialIcon(platform, url, true)}
                </div>
              ))}
            </div>
          </PositionAwareModal>
        </>
      )}
    </div>
  );
};
