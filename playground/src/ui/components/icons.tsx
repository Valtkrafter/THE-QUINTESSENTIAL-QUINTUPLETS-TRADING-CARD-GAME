// Small line icons, drawn here so the game needs no icon library. All share one 24px grid and inherit the text colour.

import type { ReactNode } from 'react';

interface IconProps {
  readonly size?: number;
}

function Icon({ size = 20, children }: IconProps & { readonly children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );
}

export function BinderIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="5" y="3.5" width="14" height="17" rx="2.2" />
      <path d="M9 3.5v17" />
      <path d="M12.5 8.5h3.5M12.5 12h3.5" />
    </Icon>
  );
}

export function DexIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="4" width="6.5" height="6.5" rx="1.6" />
      <rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6" />
      <rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6" />
      <path d="m16.75 14 1.1 2.35 2.4.3-1.8 1.65.5 2.45-2.2-1.25-2.2 1.25.5-2.45-1.8-1.65 2.4-.3Z" />
    </Icon>
  );
}

export function ShowcaseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 20.5h16" />
      <path d="M5.5 20.5V8.2L12 4l6.5 4.2v12.3" />
      <path d="m12 9.2.95 1.95 2.15.3-1.55 1.5.35 2.15L12 14.1l-1.9 1 .35-2.15-1.55-1.5 2.15-.3Z" />
    </Icon>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </Icon>
  );
}

export function LabIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9.5 3.5h5M10.5 3.5v5.8L5.2 18a1.8 1.8 0 0 0 1.55 2.7h10.5A1.8 1.8 0 0 0 18.8 18l-5.3-8.7V3.5" />
      <path d="M8.2 14.5h7.6" />
    </Icon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="10.8" cy="10.8" r="6.3" />
      <path d="m15.6 15.6 4.4 4.4" />
    </Icon>
  );
}

export function FilterIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 6h16M7 12h10M10 18h4" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </Icon>
  );
}

export function FlipIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 12a8 8 0 0 1 13.6-5.7L20 8.7" />
      <path d="M20 4v4.7h-4.7" />
      <path d="M20 12a8 8 0 0 1-13.6 5.7L4 15.3" />
      <path d="M4 20v-4.7h4.7" />
    </Icon>
  );
}

export function ArrowLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </Icon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

export function SparkleIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9Z" />
      <path d="m18.5 16 .7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7Z" />
    </Icon>
  );
}

export function SkipIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="m5 6 7 6-7 6ZM13 6l7 6-7 6Z" />
    </Icon>
  );
}

export function PacksIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7 3.5h10l1.5 3.2v13.8h-13V6.7Z" />
      <path d="M5.5 6.7h13" />
      <path d="m12 10.6.95 1.95 2.15.3-1.55 1.5.35 2.15L12 17.4l-1.9 1 .35-2.15-1.55-1.5 2.15-.3Z" />
    </Icon>
  );
}
