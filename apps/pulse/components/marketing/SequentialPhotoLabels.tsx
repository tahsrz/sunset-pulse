import React from 'react';
import styles from './SequentialPhotoLabels.module.css';

export type PhotoLabel = { id:string; text:string; anchor:'upperRight'|'middleLeft'|'lowerRight' };
export default function SequentialPhotoLabels({labels}:{labels:readonly PhotoLabel[]}) {
  return <div className={styles.labels} aria-hidden="true">
    {labels.map((label,index)=><span key={label.id} className={`${styles.anchor} ${styles[label.anchor]}`}>
      <span className={styles.label} style={{animationDelay:`${180+index*140}ms`}}>{label.text}</span>
    </span>)}
  </div>;
}
