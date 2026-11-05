import React, {useId} from 'react';
import styles from './GuidedJourney.module.css';

type Choice<T extends string>={value:T;label:string;description?:string};
type Props<T extends string>={legend:string;options:readonly Choice<T>[];value:T|undefined;onChange(value:T):void;multiple?:false};
export default function JourneyChoiceGroup<T extends string>({legend,options,value,onChange}:Props<T>) {
  const id=useId();
  return <fieldset className={styles.choices}>
    <legend className={styles.srOnly}>{legend}</legend>
    {options.map(option=><label key={option.value} className={styles.choice} data-selected={value===option.value}>
      <input type="radio" name={id} value={option.value} checked={value===option.value} onChange={()=>onChange(option.value)}
        aria-labelledby={`${id}-${option.value}-title`} aria-describedby={option.description?`${id}-${option.value}-description`:undefined}/>
      <span><span id={`${id}-${option.value}-title`} className={styles.choiceTitle}>{option.label}</span>{option.description?<span id={`${id}-${option.value}-description`} className={styles.choiceDescription}>{option.description}</span>:null}</span>
      <span className={styles.choiceCheck} aria-hidden="true">{value===option.value?'✓':''}</span>
    </label>)}
  </fieldset>;
}
