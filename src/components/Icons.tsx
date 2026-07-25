import type { ReactNode } from 'react';

export function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
      <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm9.4 4-.1 1.2 2 1.6-2 3.4-2.4-1a7.6 7.6 0 0 1-2 1.2l-.4 2.6h-4l-.4-2.6a7.6 7.6 0 0 1-2-1.2l-2.4 1-2-3.4 2-1.6L4.6 12l.1-1.2-2-1.6 2-3.4 2.4 1c.6-.5 1.3-.9 2-1.2L11.5 3h4l.4 2.6c.7.3 1.4.7 2 1.2l2.4-1 2 3.4-2 1.6.1 1.2z" />
    </svg>
  );
}

export function HelpIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm.1 15.5a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6zm1.9-6.1c-.9.7-1 .9-1 1.6v.4h-1.9v-.5c0-1.4.5-2 1.5-2.8.7-.5.9-.8.9-1.4 0-.7-.5-1.1-1.3-1.1-.7 0-1.3.4-1.6 1.2l-1.7-.7C9.3 7.3 10.5 6.5 12 6.5c1.9 0 3.2 1.1 3.2 2.7 0 1-.4 1.6-1.2 2.2z" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
      <path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L12 14.8l-6.3 6.3-1.4-1.4L10.6 12 4.3 5.7l1.4-1.4L12 9.2l6.3-6.3z" />
    </svg>
  );
}

export function DotIcon() {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden="true">
      <circle cx="20" cy="20" r="11" fill="currentColor" />
    </svg>
  );
}

export function DashIcon() {
  return (
    <svg viewBox="0 0 40 40" width="100%" height="100%" aria-hidden="true">
      <rect x="6" y="15" width="28" height="10" rx="5" fill="currentColor" />
    </svg>
  );
}

// ---- Mode & action icons (Lucide-style: stroke 2, round caps, 24-box) ----
// One consistent stroked family per the design system — no emoji as icons.

function S({ children, size = 24 }: { children: ReactNode; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function PencilIcon() {
  return (
    <S>
      <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </S>
  );
}

export function HashIcon() {
  return (
    <S>
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </S>
  );
}

export function HeadphonesIcon() {
  return (
    <S>
      <path d="M3 14v-2a9 9 0 0 1 18 0v2" />
      <rect x="3" y="14" width="4" height="6" rx="2" />
      <rect x="17" y="14" width="4" height="6" rx="2" />
    </S>
  );
}

export function EarIcon() {
  return (
    <S>
      <path d="M6 8.5a6 6 0 0 1 12 0c0 4.5-4 4.6-4 8a3 3 0 0 1-6 0" />
      <path d="M10 8.5a2.5 2.5 0 0 1 5 0c0 1.5-1 2-2 3" />
    </S>
  );
}

export function RadioIcon() {
  return (
    <S>
      <circle cx="12" cy="12" r="2" />
      <path d="M7.8 7.8a6 6 0 0 0 0 8.4M16.2 7.8a6 6 0 0 1 0 8.4" />
      <path d="M4.9 4.9a10 10 0 0 0 0 14.2M19.1 4.9a10 10 0 0 1 0 14.2" />
    </S>
  );
}

export function AntennaIcon() {
  return (
    <S>
      <path d="M12 7v14" />
      <path d="m7 21 5-6 5 6" />
      <circle cx="12" cy="5" r="2" />
      <path d="M8.5 1.5a5 5 0 0 0 0 7M15.5 1.5a5 5 0 0 1 0 7" />
    </S>
  );
}

export function RocketIcon() {
  return (
    <S>
      <path d="M4.5 16.5c-1.5 1.3-2 5-2 5s3.7-.5 5-2c.7-.8.7-2 0-2.8a2.1 2.1 0 0 0-3 -.2Z" />
      <path d="m12 15-3-3a22 22 0 0 1 2-3.9A12.9 12.9 0 0 1 22 2c0 2.7-.9 7.5-6 11a22.4 22.4 0 0 1-4 2Z" />
      <path d="M9 12H4s.6-3.3 2-4.5c1.6-1.3 4 0 4 0M12 15v5s3.3-.6 4.5-2c1.3-1.6 0-4 0-4" />
    </S>
  );
}

export function MapIcon() {
  return (
    <S>
      <path d="M14.1 6.1 9.9 4 4.6 6.2A1 1 0 0 0 4 7.1v11.4a1 1 0 0 0 1.4.9l4.5-1.9 4.2 2.1 5.3-2.2a1 1 0 0 0 .6-.9V5.1a1 1 0 0 0-1.4-.9Z" />
      <path d="M9.9 4v13.5M14.1 6.1v13.5" />
    </S>
  );
}

export function EyeIcon() {
  return (
    <S>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </S>
  );
}

export function SwapIcon({ size = 16 }: { size?: number }) {
  return (
    <S size={size}>
      <path d="M16 3h5v5" />
      <path d="M21 3 10 14" />
      <path d="M8 21H3v-5" />
      <path d="m3 21 11-11" />
    </S>
  );
}

export function TranslateIcon() {
  return (
    <S>
      <path d="m5 8 6 6M4 14l6-6 2-3M2 5h12" />
      <path d="M7 2h1" />
      <path d="m22 22-5-10-5 10M14 18h6" />
    </S>
  );
}

export function BookIcon({ size = 18 }: { size?: number }) {
  return (
    <S size={size}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15Z" />
      <path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5" />
    </S>
  );
}

export function DiceIcon({ size = 18 }: { size?: number }) {
  return (
    <S size={size}>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="8.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="8.5" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" stroke="none" />
    </S>
  );
}

export function SpeakerIcon({ size = 18 }: { size?: number }) {
  return (
    <S size={size}>
      <path d="M11 5 6 9H2v6h4l5 4V5Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18.4 5.6a9 9 0 0 1 0 12.8" />
    </S>
  );
}

export function FlameIcon({ size = 18 }: { size?: number }) {
  return (
    <S size={size}>
      <path d="M12 2s-5 4.5-5 10a5 5 0 0 0 10 0c0-2-1-4-2-5.5 0 1.5-.5 2.5-1.5 3C13 8 13 4.5 12 2Z" />
    </S>
  );
}
