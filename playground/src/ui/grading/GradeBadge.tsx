import { gradeBand } from '../../domain/grading';
import type { Grade } from '../../domain/ownership';
import { cx, formatGrade } from '../format';
import { bandStyle } from './bandStyle';
import styles from './GradeBadge.module.css';

export interface GradeBadgeProps {
  readonly grade: Grade;
  /** `small` is the score alone, for a corner of a card; `large` adds the word of its band. */
  readonly size?: 'small' | 'large';
}

/** The score of a graded card in the colour of its band. */
export function GradeBadge({ grade, size = 'small' }: GradeBadgeProps) {
  const band = gradeBand(grade.overall);
  return (
    <span className={cx(styles.badge, size === 'large' && styles.large)} style={bandStyle(band.id)} role="img" aria-label={`Score ${formatGrade(grade.overall)}, ${band.label}`}>
      <strong>{formatGrade(grade.overall)}</strong>
      {size === 'large' && <span>{band.label}</span>}
    </span>
  );
}
