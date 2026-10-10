import type { ButtonHTMLAttributes, ChangeEvent, CSSProperties, ReactNode } from 'react';
import { Link } from 'wouter';
import { cx } from '../format';
import styles from './controls.module.css';

export type ButtonKind = 'default' | 'primary' | 'quiet' | 'danger';

function kindClass(kind: ButtonKind): string | undefined {
  return kind === 'default' ? undefined : styles[kind];
}

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'type'> {
  readonly kind?: ButtonKind;
  readonly iconOnly?: boolean;
}

export function Button({ kind = 'default', iconOnly = false, children, ...rest }: ButtonProps) {
  return (
    <button type="button" className={cx(styles.button, kindClass(kind), iconOnly && styles.iconOnly)} {...rest}>
      {children}
    </button>
  );
}

export interface LinkButtonProps {
  readonly href: string;
  readonly kind?: ButtonKind;
  readonly children: ReactNode;
}

/** A link that looks like a button, for moving to another screen. */
export function LinkButton({ href, kind = 'default', children }: LinkButtonProps) {
  return (
    <Link href={href} className={cx(styles.button, kindClass(kind))}>
      {children}
    </Link>
  );
}

export interface ChipProps {
  readonly pressed: boolean;
  readonly onToggle: () => void;
  readonly color?: string;
  readonly children: ReactNode;
}

/** A toggle in the shape of a small pill. `color` tints it and adds a dot. */
export function Chip({ pressed, onToggle, color, children }: ChipProps) {
  const style: CSSProperties | undefined = color === undefined ? undefined : ({ '--chip-color': color } as CSSProperties);
  return (
    <button type="button" className={styles.chip} aria-pressed={pressed} onClick={onToggle} style={style}>
      {color !== undefined && <span className={styles.chipDot} />}
      {children}
    </button>
  );
}

export interface SearchFieldProps {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly placeholder: string;
  readonly label: string;
  readonly icon: ReactNode;
}

export function SearchField({ value, onChange, placeholder, label, icon }: SearchFieldProps) {
  return (
    <label className={styles.field}>
      {icon}
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={label}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
      />
    </label>
  );
}

export interface SelectFieldProps<T extends string> {
  readonly value: T;
  readonly options: readonly { readonly value: T; readonly label: string }[];
  readonly onChange: (value: T) => void;
  readonly label: string;
}

export function SelectField<T extends string>({ value, options, onChange, label }: SelectFieldProps<T>) {
  const handle = (event: ChangeEvent<HTMLSelectElement>) => {
    const chosen = options.find((option) => option.value === event.target.value);
    if (chosen !== undefined) {
      onChange(chosen.value);
    }
  };
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <select value={value} onChange={handle}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export interface ToggleProps {
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly children: ReactNode;
}

export function Toggle({ checked, onChange, children }: ToggleProps) {
  return (
    <label className={styles.toggle}>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{children}</span>
    </label>
  );
}

export interface ProgressBarProps {
  readonly value: number;
  readonly max: number;
  readonly from?: string;
  readonly to?: string;
  readonly label: string;
}

export function ProgressBar({ value, max, from, to, label }: ProgressBarProps) {
  const percent = max <= 0 ? 0 : Math.min(100, (value / max) * 100);
  const style = {
    ...(from === undefined ? {} : { '--progress-from': from }),
    ...(to === undefined ? {} : { '--progress-to': to }),
  } as CSSProperties;
  return (
    <div className={styles.progress} role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label} style={style}>
      <div className={styles.progressFill} style={{ width: `${percent}%` }} />
    </div>
  );
}

export function Pill({ children }: { readonly children: ReactNode }) {
  return <span className={styles.pill}>{children}</span>;
}

export interface SegmentedProps<T extends string> {
  readonly value: T;
  readonly options: readonly { readonly value: T; readonly label: string }[];
  readonly onChange: (value: T) => void;
  readonly label: string;
}

/** A row of exclusive choices. */
export function Segmented<T extends string>({ value, options, onChange, label }: SegmentedProps<T>) {
  return (
    <div className={styles.segmented} role="group" aria-label={label}>
      {options.map((option) => (
        <button key={option.value} type="button" aria-pressed={option.value === value} onClick={() => onChange(option.value)}>
          {option.label}
        </button>
      ))}
    </div>
  );
}
