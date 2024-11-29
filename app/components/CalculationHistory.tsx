'use client'

import { FC } from 'react'
import styles from './CalculationHistory.module.css'

interface CalculationHistoryProps {
  history: string[]
}

const CalculationHistory: FC<CalculationHistoryProps> = ({ history }) => {
  return (
    <div className={styles.history}>
      {history.map((calculation, index) => (
        <div key={index} className={styles.historyItem}>
          {calculation}
        </div>
      ))}
    </div>
  )
}

export default CalculationHistory 