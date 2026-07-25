// One icon family app-wide: Phosphor (bold weight), per the design system.
// Exported names are Ditdah-semantic so call sites don't care about the library.
// DotIcon / DashIcon are NOT icons, they're the app's core Morse glyphs, and
// stay hand-drawn on purpose.
import {
  ArrowsLeftRight,
  BookOpen,
  Broadcast,
  DiceFive,
  Ear,
  Eye,
  Flame,
  Gear,
  Hash,
  Headphones,
  MapTrifold,
  PencilSimple,
  Question,
  Radio,
  RocketLaunch,
  SpeakerHigh,
  Translate,
  X,
} from '@phosphor-icons/react';

const W = 'bold' as const; // global weight, do not mix weights per family rule

export function GearIcon() {
  return <Gear size={24} weight="fill" aria-hidden="true" />;
}

export function HelpIcon() {
  return <Question size={24} weight="fill" aria-hidden="true" />;
}

export function CloseIcon() {
  return <X size={22} weight={W} aria-hidden="true" />;
}

// ---- Morse glyphs (not icons, the product's core symbols) ----

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

// ---- Mode & action icons ----

export function PencilIcon() {
  return <PencilSimple size={28} weight={W} aria-hidden="true" />;
}

export function HashIcon() {
  return <Hash size={28} weight={W} aria-hidden="true" />;
}

export function HeadphonesIcon() {
  return <Headphones size={28} weight={W} aria-hidden="true" />;
}

export function EarIcon() {
  return <Ear size={28} weight={W} aria-hidden="true" />;
}

export function RadioIcon() {
  return <Radio size={28} weight={W} aria-hidden="true" />;
}

export function AntennaIcon() {
  return <Broadcast size={28} weight={W} aria-hidden="true" />;
}

export function RocketIcon() {
  return <RocketLaunch size={28} weight={W} aria-hidden="true" />;
}

export function MapIcon() {
  return <MapTrifold size={28} weight={W} aria-hidden="true" />;
}

export function EyeIcon() {
  return <Eye size={28} weight={W} aria-hidden="true" />;
}

export function TranslateIcon() {
  return <Translate size={28} weight={W} aria-hidden="true" />;
}

export function SwapIcon({ size = 16 }: { size?: number }) {
  return <ArrowsLeftRight size={size} weight={W} aria-hidden="true" />;
}

export function BookIcon({ size = 18 }: { size?: number }) {
  return <BookOpen size={size} weight={W} aria-hidden="true" />;
}

export function DiceIcon({ size = 18 }: { size?: number }) {
  return <DiceFive size={size} weight={W} aria-hidden="true" />;
}

export function SpeakerIcon({ size = 18 }: { size?: number }) {
  return <SpeakerHigh size={size} weight={W} aria-hidden="true" />;
}

export function FlameIcon({ size = 18 }: { size?: number }) {
  return <Flame size={size} weight={W} aria-hidden="true" />;
}
