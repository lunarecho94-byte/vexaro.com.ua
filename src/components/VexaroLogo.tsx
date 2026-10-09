'use client';

import React from 'react';
import Image from 'next/image';

interface VexaroLogoProps {
  variant?: 'header' | 'footer' | 'emblem' | 'full';
  animated?: boolean;
  className?: string;
}

export function VexaroLogo({
  variant = 'header',
  animated = true,
  className = '',
}: VexaroLogoProps) {
  if (variant === 'emblem') {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        {/* Ambient neon radial backlight */}
        {animated && (
          <div className="absolute -inset-2 rounded-full bg-lime-400/20 blur-md pointer-events-none animate-pulse" />
        )}
        <div
          className={`relative transition-transform duration-300 ${
            animated ? 'animate-vexaro-glow group-hover:scale-110' : ''
          }`}
        >
          <img
            src="/images/vexaro-emblem.png"
            alt="VEXARO Emblem"
            className="h-10 w-10 object-contain drop-shadow-[0_0_8px_rgba(163,230,53,0.5)]"
          />
        </div>
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`relative flex flex-col items-center ${className}`}>
        {animated && (
          <div className="absolute inset-0 bg-lime-400/10 blur-xl pointer-events-none rounded-2xl animate-pulse" />
        )}
        <div
          className={`relative overflow-hidden transition-all duration-300 ${
            animated ? 'animate-vexaro-glow group-hover:scale-105' : ''
          }`}
        >
          <img
            src="/images/vexaro-full.png"
            alt="VEXARO Logo"
            className="h-20 w-auto object-contain drop-shadow-[0_0_12px_rgba(163,230,53,0.4)]"
          />
          {animated && (
            <div className="pointer-events-none absolute inset-0 -translate-x-full animate-vexaro-shimmer bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          )}
        </div>
      </div>
    );
  }

  if (variant === 'footer') {
    return (
      <div className={`group relative inline-flex items-center gap-3 ${className}`}>
        {/* Animated emblem */}
        <div className="relative">
          <div className="absolute -inset-1 rounded-full bg-lime-400/15 blur-sm opacity-70 group-hover:opacity-100 transition-opacity" />
          <img
            src="/images/vexaro-emblem.png"
            alt="VEXARO"
            className="relative h-9 w-9 object-contain drop-shadow-[0_0_8px_rgba(163,230,53,0.4)] transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6"
          />
        </div>

        {/* Brand wordmark */}
        <div className="flex flex-col">
          <span className="text-lg font-black tracking-widest text-foreground transition-colors group-hover:text-lime-400">
            VEXARO
          </span>
          <span className="text-[9px] tracking-widest text-muted uppercase -mt-0.5 font-medium">
            Sneakers for your story
          </span>
        </div>
      </div>
    );
  }

  // Default: 'header' variant
  return (
    <div className={`group relative inline-flex items-center gap-2.5 sm:gap-3 py-1 ${className}`}>
      {/* Dynamic neon aura behind emblem */}
      <div className="relative flex items-center justify-center">
        {animated && (
          <div className="absolute -inset-1.5 rounded-full bg-lime-400/25 blur-md opacity-60 transition-all duration-500 group-hover:opacity-100 group-hover:scale-125" />
        )}

        {/* Orbit Emblem with breathing glow and hover rotation */}
        <div
          className={`relative transition-all duration-300 ${
            animated ? 'animate-vexaro-glow group-hover:scale-110 group-hover:-rotate-3' : ''
          }`}
        >
          <img
            src="/images/vexaro-emblem.png"
            alt="VEXARO"
            className="h-9 w-9 sm:h-10 sm:w-10 object-contain drop-shadow-[0_0_10px_rgba(163,230,53,0.55)]"
          />
        </div>
      </div>

      {/* Brand text & tagline with shimmer effect */}
      <div className="relative flex flex-col justify-center overflow-hidden">
        <div className="relative flex items-center gap-1.5">
          <span className="text-xl sm:text-2xl font-black tracking-[0.18em] text-foreground transition-all duration-300 group-hover:text-lime-400">
            VEXARO
          </span>
          {/* Subtle neon dot indicator */}
          <span className="h-1.5 w-1.5 rounded-full bg-lime-400 shadow-[0_0_6px_#a3e635] animate-pulse" />
        </div>

        <span className="text-[8.5px] sm:text-[9.5px] font-semibold tracking-[0.22em] text-muted uppercase transition-colors group-hover:text-foreground/90">
          Sneakers for your story
        </span>

        {/* Shimmer sweep effect */}
        {animated && (
          <div className="pointer-events-none absolute inset-0 -translate-x-full animate-vexaro-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        )}
      </div>
    </div>
  );
}
