'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Smartphone, Monitor } from 'lucide-react';

interface AppViewportContextType {
  isMobileShell: boolean;
  isDesktopScreen: boolean;
  phonePreviewEnabled: boolean;
  setPhonePreviewEnabled: (enabled: boolean) => void;
}

const AppViewportContext = createContext<AppViewportContextType>({
  isMobileShell: false,
  isDesktopScreen: false,
  phonePreviewEnabled: false,
  setPhonePreviewEnabled: () => {},
});

export const useAppViewport = () => useContext(AppViewportContext);

export interface AppViewportProps {
  children: React.ReactNode;
}

export const AppViewport: React.FC<AppViewportProps> = ({ children }) => {
  const [isDesktopScreen, setIsDesktopScreen] = useState(false);
  const [phonePreviewEnabled, setPhonePreviewEnabled] = useState(false);

  useEffect(() => {
    const checkScreen = () => {
      const isDesktop = window.innerWidth >= 768;
      setIsDesktopScreen(isDesktop);
    };

    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  // Mobile shell is active if either the screen is real mobile (<768px) OR user turned on Phone Preview on desktop
  const isMobileShell = !isDesktopScreen || phonePreviewEnabled;

  return (
    <AppViewportContext.Provider
      value={{
        isMobileShell,
        isDesktopScreen,
        phonePreviewEnabled,
        setPhonePreviewEnabled,
      }}
    >
      {/* Root Container locked to 100dvh */}
      <div className="w-screen h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#050507] flex flex-col items-center justify-center relative overscroll-none select-none">
        {/* Desktop Mode Toggle Badge (Only on desktop screens >= 768px) */}
        {isDesktopScreen && (
          <div className="fixed top-3 right-4 z-50 flex items-center gap-1.5 p-1 rounded-2xl bg-zinc-900/90 border border-white/10 shadow-2xl backdrop-blur-md text-xs font-mono">
            <button
              onClick={() => setPhonePreviewEnabled(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                !phonePreviewEnabled
                  ? 'bg-amber-500 text-black font-black shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
              title="Full Desktop Layout"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Desktop</span>
            </button>
            <button
              onClick={() => setPhonePreviewEnabled(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition ${
                phonePreviewEnabled
                  ? 'bg-amber-500 text-black font-black shadow-md'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
              title="Native Phone View Bezel Preview"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Phone View</span>
            </button>
          </div>
        )}

        {/* Outer Presentation Stage: Centered Smartphone Bezel or Full Screen */}
        {isDesktopScreen && phonePreviewEnabled ? (
          <div className="relative w-full max-w-[430px] h-[min(92dvh,880px)] rounded-[48px] p-3 bg-gradient-to-b from-[#1c1c24] via-[#0d0d12] to-[#1c1c24] shadow-[0_25px_70px_rgba(0,0,0,0.85)] border border-[#2e2e3d] flex flex-col items-center justify-center transition-all duration-300">
            {/* Outer Bezel Volume & Speaker Buttons Accent */}
            <div className="absolute -left-[3px] top-28 w-[3px] h-12 bg-[#2a2a38] rounded-l-sm" />
            <div className="absolute -left-[3px] top-44 w-[3px] h-12 bg-[#2a2a38] rounded-l-sm" />
            <div className="absolute -right-[3px] top-32 w-[3px] h-16 bg-[#2a2a38] rounded-r-sm" />

            {/* Simulated Dynamic Island Pill */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 w-28 h-5 rounded-full bg-black border border-white/10 flex items-center justify-end px-2 pointer-events-none shadow-inner">
              <div className="w-2.5 h-2.5 rounded-full bg-[#0a0a14] border border-[#1a1a2e]" />
            </div>

            {/* Inner Display Area (100% of phone glass) */}
            <div className="w-full h-full rounded-[40px] overflow-hidden bg-[#08080a] relative flex flex-col border border-white/5 shadow-inner">
              {children}
            </div>
          </div>
        ) : (
          /* Edge-to-Edge Screen (Mobile <768px or Full Desktop mode) */
          <div className="w-full h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#08080a] relative flex flex-col">
            {children}
          </div>
        )}
      </div>
    </AppViewportContext.Provider>
  );
};

export default AppViewport;
