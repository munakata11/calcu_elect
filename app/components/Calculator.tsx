'use client'

import { useState, useEffect } from 'react'
import CalculationHistory from './CalculationHistory'
import styles from './Calculator.module.css'

export default function Calculator() {
  const [display, setDisplay] = useState<string>('')
  const [history, setHistory] = useState<string[]>([])
  const [currentCalculation, setCurrentCalculation] = useState<string>('')
  const [isCalculating, setIsCalculating] = useState(false)
  const [pendingSquare, setPendingSquare] = useState(false)

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === '=') {
        if (pendingSquare) {
          calculateSquare()
        } else {
          calculate()
        }
      } else if (/[\d+\-*/.()]/.test(e.key)) {
        if (/[\d.]/.test(e.key)) {
          handleNumber(e.key)
        } else if (/[+\-*/]/.test(e.key)) {
          handleOperator(e.key)
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [display, currentCalculation, pendingSquare])

  const handleNumber = (num: string) => {
    if (pendingSquare) {
      setPendingSquare(false)
      setDisplay('')
      setCurrentCalculation('')
    }
    if (display === '' || display === '0') {
      setDisplay(num)
      setCurrentCalculation(num)
    } else {
      setDisplay(display + num)
      setCurrentCalculation(currentCalculation + num)
    }
  }

  const handleOperator = (operator: string) => {
    if (pendingSquare) {
      calculateSquare()
    }
    setDisplay(display + operator)
    setCurrentCalculation(currentCalculation + operator)
  }

  const handleSquare = () => {
    const currentValue = display
    setDisplay(`${currentValue}^2`)
    setCurrentCalculation(`${currentValue}^2`)
    setPendingSquare(true)
  }

  const calculateSquare = () => {
    try {
      const baseValue = display.replace('^2', '')
      const currentValue = eval(baseValue)
      const result = currentValue * currentValue
      const calculationResult = `${currentValue}^2 = ${result}`
      setHistory(prev => [...prev, calculationResult])
      setDisplay(result.toString())
      setCurrentCalculation(result.toString())
      setPendingSquare(false)
    } catch (error) {
      setDisplay('Error')
      setCurrentCalculation('')
      setPendingSquare(false)
    }
  }

  const calculate = () => {
    if (pendingSquare) {
      calculateSquare()
      return
    }
    try {
      const result = eval(display)
      if (!isCalculating && (display.includes('+') || display.includes('-') || 
          display.includes('*') || display.includes('/'))) {
        const calculationResult = `${display} = ${result}`
        setHistory(prev => [...prev, calculationResult])
      }
      setDisplay(result.toString())
      setCurrentCalculation(result.toString())
      setIsCalculating(false)
    } catch (error) {
      setDisplay('Error')
      setCurrentCalculation('')
      setIsCalculating(false)
    }
  }

  const clear = () => {
    setDisplay('')
    setCurrentCalculation('')
    setIsCalculating(false)
    setPendingSquare(false)
  }

  return (
    <div className={styles.calculator}>
      <div 
        className={styles.display} 
        data-empty={display === ''}
      >
        {display || 'ŒvŽZŽ®‚ð“ü—Í‚µ‚Ä‚­‚¾‚³‚¢... AI‚ÅŒvŽZ‚µ‚Ü‚·'}
      </div>
      <CalculationHistory history={history} />
      <div className={styles.buttons}>
        <button 
          className={styles.button} 
          onClick={handleSquare}
        >
          x?
        </button>
      </div>
    </div>
  )
} 