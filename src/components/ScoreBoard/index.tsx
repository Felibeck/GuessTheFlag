import { useEffect, useLayoutEffect, useRef } from 'react'
import './ScoreBoard.css'

interface ScoreBoardProps {
    score: number
    hits: number
    misses: number
    /** Último cambio de puntos; `id` relanza la animación aunque el valor se repita */
    change?: { id: number; delta: number } | null
}

const ROLL_MS = 450

/** Signo menos tipográfico para negativos */
const format = (n: number) => (n < 0 ? `−${Math.abs(n)}` : String(n))

const ScoreBoard = ({ score, hits, misses, change }: ScoreBoardProps) =>
{
    const valueRef = useRef<HTMLSpanElement>(null)
    const shownRef = useRef(score)

    useLayoutEffect(() =>
    {
        if (valueRef.current && !valueRef.current.textContent) valueRef.current.textContent = format(shownRef.current)
    }, [])

    // El número rueda hasta el nuevo valor en lugar de saltar
    useEffect(() =>
    {
        const el = valueRef.current
        if (!el) return

        const from = shownRef.current
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (from === score || reduced) {
            el.textContent = format(score)
            shownRef.current = score
            return
        }

        const start = performance.now()
        let raf = 0
        const step = (now: number) =>
        {
            const p = Math.min(1, (now - start) / ROLL_MS)
            const eased = 1 - Math.pow(1 - p, 3)
            const value = Math.round(from + (score - from) * eased)
            el.textContent = format(value)
            shownRef.current = value
            if (p < 1) raf = requestAnimationFrame(step)
        }
        raf = requestAnimationFrame(step)

        return () => cancelAnimationFrame(raf)
    }, [score])

    return (
        <section className="score" aria-label="Marcador">
            <div className="score__main">
                <span className="score__value" ref={valueRef} aria-hidden="true" />
                <span className="score__unit">puntos</span>
                {change && (
                    <span
                        key={change.id}
                        className={`score__float ${change.delta > 0 ? 'score__float--up' : 'score__float--down'}`}
                        aria-hidden="true"
                    >
                        {change.delta > 0 ? `+${change.delta}` : `−${Math.abs(change.delta)}`}
                    </span>
                )}
            </div>
            <p className="score__stats">
                <span className="sr-only">{score} puntos. </span>
                {hits} {hits === 1 ? 'acierto' : 'aciertos'}, {misses} {misses === 1 ? 'fallo' : 'fallos'}
            </p>
        </section>
    )
}

export default ScoreBoard;
