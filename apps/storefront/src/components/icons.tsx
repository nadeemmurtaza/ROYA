import type { SVGProps } from 'react';

/** The design's line icons: 1.2px strokes on a 24px grid. Decorative unless a parent labels them. */
function Icon({ children, size = 20, ...rest }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

type P = SVGProps<SVGSVGElement> & { size?: number };

export const SearchIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-4-4" />
  </Icon>
);
export const AccountIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
  </Icon>
);
export const HeartIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />
  </Icon>
);
export const BagIcon = (p: P) => (
  <Icon {...p}>
    <path d="M5 8h14l-1 13H6L5 8z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </Icon>
);
export const MenuIcon = (p: P) => (
  <Icon {...p}>
    <path d="M3 7h18M3 12h18M3 17h12" />
  </Icon>
);
export const CloseIcon = (p: P) => (
  <Icon {...p}>
    <path d="M5 5l14 14M19 5L5 19" />
  </Icon>
);
export const PauseIcon = (p: P) => (
  <Icon strokeWidth="1.3" {...p}>
    <path d="M9 5v14M15 5v14" />
  </Icon>
);
export const PlayIcon = (p: P) => (
  <Icon strokeWidth="1.3" {...p}>
    <path d="M7 4l13 8-13 8z" />
  </Icon>
);
/** Points to the reader's "previous"; flipped by CSS in RTL. */
export const ChevronLeft = (p: P) => (
  <Icon strokeWidth="1.3" className="flip-rtl" {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Icon>
);
export const ChevronRight = (p: P) => (
  <Icon strokeWidth="1.3" className="flip-rtl" {...p}>
    <path d="M9 5l7 7-7 7" />
  </Icon>
);
export const SunIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4" />
  </Icon>
);
export const MoonIcon = (p: P) => (
  <Icon {...p}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />
  </Icon>
);
export const ArrowIcon = (p: P) => (
  <Icon className="flip-rtl" {...p}>
    <path d="M4 12h16M14 6l6 6-6 6" />
  </Icon>
);
export const PlusIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);
export const MinusIcon = (p: P) => (
  <Icon {...p}>
    <path d="M5 12h14" />
  </Icon>
);
export const CheckIcon = (p: P) => (
  <Icon {...p}>
    <path d="M5 12.5l4.5 4.5L19 7" />
  </Icon>
);
