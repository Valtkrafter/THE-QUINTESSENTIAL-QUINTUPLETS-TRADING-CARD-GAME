// "Your slabs": the display case of everything that came back from the graders, best score first, with the count of each score.

import { useMemo } from 'react';
import { Link } from 'wouter';
import { cardById } from '../../cards/catalog';
import { gradeBand, gradeLabel, populationReport, slabValue, slabsOf } from '../../domain/grading';
import { useSave } from '../../state/app';
import { formatGrade, formatYen } from '../format';
import { text } from '../text';
import { bandStyle } from './bandStyle';
import { SlabFlat } from './SlabFlat';
import styles from './GradingScreen.module.css';

export function Slabs() {
  const save = useSave();
  const slabs = useMemo(() => slabsOf(save.collection), [save.collection]);
  const report = useMemo(() => populationReport(save.collection), [save.collection]);

  if (slabs.length === 0) {
    return (
      <div className={styles.emptyCase}>
        <span className={styles.ghostCase} aria-hidden="true" />
        <p>{text.grading.slabs.none}</p>
      </div>
    );
  }
  const total = slabs.reduce((sum, copy) => sum + slabValue(copy), 0);
  const most = Math.max(...report.map((row) => row.count));
  const best = slabs[0]?.grade?.overall ?? 1;

  return (
    <>
      <section className={styles.stats} aria-label={text.grading.slabs.summary(slabs.length, total)}>
        <div>
          <small>{text.grading.slabs.count}</small>
          <strong>{slabs.length}</strong>
        </div>
        <div>
          <small>{text.grading.slabs.worthTotal}</small>
          <strong>{formatYen(total)}</strong>
        </div>
        <div style={bandStyle(gradeBand(best).id)}>
          <small>{text.grading.slabs.best}</small>
          <strong className={styles.bestScore}>
            {formatGrade(best)} <span>{gradeLabel(best)}</span>
          </strong>
        </div>
      </section>

      <section className={styles.report} aria-label={text.grading.slabs.report}>
        <h2>{text.grading.slabs.report}</h2>
        <p>{text.grading.slabs.reportNote}</p>
        <ul>
          {report.map((row) => (
            <li key={row.overall} style={bandStyle(gradeBand(row.overall).id)}>
              <strong>{formatGrade(row.overall)}</strong>
              <span>{gradeLabel(row.overall)}</span>
              <i className={styles.bar} aria-hidden="true">
                <b style={{ width: `${(row.count / most) * 100}%` }} />
              </i>
              <output>{row.count}</output>
            </li>
          ))}
        </ul>
      </section>

      <ul className={styles.cases}>
        {slabs.map((copy) => {
          const card = cardById(copy.cardId);
          const grade = copy.grade;
          if (card === undefined || grade === null) {
            return null;
          }
          return (
            <li key={copy.uid} style={bandStyle(gradeBand(grade.overall).id)}>
              <Link href={`/card/${copy.uid}`} className={styles.caseLink} aria-label={`${card.name.en}, score ${formatGrade(grade.overall)}, ${gradeLabel(grade.overall)}`}>
                <SlabFlat copy={copy} />
              </Link>
              <p>{text.grading.slabs.worth(slabValue(copy))}</p>
            </li>
          );
        })}
      </ul>
    </>
  );
}
