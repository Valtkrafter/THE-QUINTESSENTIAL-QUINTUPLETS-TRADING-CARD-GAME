'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { hapticLightTap } from '../../utils/haptics';

export interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  maxHeight?: string; // default '88dvh'
  className?: string;
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  children,
  title,
  maxHeight = '90dvh',
  className = '',
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Handle Drag-to-dismiss gesture: pull down > 120px OR flick velocity > 350px/s
  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 350) {
      hapticLightTap();
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end select-none">
          {/* Dark Backdrop Dimmer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => {
              hapticLightTap();
              onClose();
            }}
            className="absolute inset-0 bg-black/75 backdrop-blur-sm cursor-pointer"
          />

          {/* Bottom Sheet Drawer Surface */}
          <motion.div
            ref={drawerRef}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            style={{ maxHeight }}
            className={`relative z-10 w-full rounded-t-[32px] bg-[#0c0c12] border-t border-[#23232e] shadow-[0_-12px_40px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden pb-[calc(env(safe-area-inset-bottom,0px)+12px)] ${className}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Pill Handle Bar */}
            <div className="w-full flex flex-col items-center pt-2.5 pb-1 touch-none cursor-grab active:cursor-grabbing shrink-0">
              <div className="w-12 h-1.5 bg-[#2a2a38] rounded-full hover:bg-zinc-600 transition" />
              {title && (
                <div className="mt-2 text-xs font-mono font-black uppercase tracking-wider text-zinc-300">
                  {title}
                </div>
              )}
            </div>

            {/* Scrollable Drawer Content */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2 no-scrollbar">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default MobileDrawer;
