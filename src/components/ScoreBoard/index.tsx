/**
 * <ScoreBoard>: marcador de la partida.
 * El número "rueda" hasta el valor nuevo escribiendo directamente en el DOM
 * (textContent) en cada fotograma, en lugar de usar estado de React: así no se
 * re-renderiza el componente 60 veces por segundo.
 * Al lado aparece un "+10" o "−1" flotante, que se reinicia gracias a key={change.id}.
 */

import { useEffect, useLayoutEffect, useRef } from 'react'
import './ScoreBoard.css'

interface ScoreBoardProps {
    score: number
    /** Número de aciertos */
    hits: number
    /** Número de fallos (incluye las veces que se pasa) */
    misses: number
    /** Último cambio de puntos; `id` relanza la animación aunque el valor se repita */
    change?: { id: number; delta: number } | null
}

/** Duración de la animación del número (milisegundos) */
const ROLL_MS = 450

/** Signo menos tipográfico para negativos */
const format = (n: number) => (n < 0 ? `−${Math.abs(n)}` : String(n))

const ScoreBoard = ({ score, hits, misses, change }: ScoreBoardProps) =>
{
    /** El <span> del número: se escribe directamente, sin pasar por React */
    const valueRef = useRef<HTMLSpanElement>(null)
    /** El número que se ve ahora mismo (a mitad de animación no coincide con `score`) */
    const shownRef = useRef(score)

    // Pone el número inicial antes del primer pintado. El <span> está vacío en el JSX
    // porque lo gestiona el efecto de abajo; así no hay un parpadeo vacío.
    useLayoutEffect(() =>
    {
        if (valueRef.current && !valueRef.current.textContent) valueRef.current.textContent = format(shownRef.current)
    }, [])

    // Cada vez que cambia el marcador, el número rueda desde el valor mostrado hasta el nuevo
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
            // p va de 0 a 1 de forma lineal; esta curva (ease-out cúbica) arranca rápido y frena al final
            const eased = 1 - Math.pow(1 - p, 3)
            const value = Math.round(from + (score - from) * eased)
            el.textContent = format(value)
            shownRef.current = value
            if (p < 1) raf = requestAnimationFrame(step)
        }
        raf = requestAnimationFrame(step)

        // Si el marcador cambia otra vez a mitad de animación, se cancela la anterior
        return () => cancelAnimationFrame(raf)
    }, [score])

    return (
        <section className="score" aria-label="Marcador">
            <div className="score__main">
                {/* aria-hidden: el número cambia 60 veces por segundo al animarse; los lectores
                    de pantalla leen en su lugar el texto oculto de abajo (sr-only) */}
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
