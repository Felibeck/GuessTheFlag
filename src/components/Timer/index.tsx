/**
 * <Timer>: cuenta atrás de la partida (número + barra bajo la navegación).
 * Resta 1 cada segundo con setInterval y llama a onTimeUp al llegar a 0.
 * No tiene función "reiniciar": el padre le cambia la key y React lo crea de
 * nuevo desde cero (ver Game en App.tsx: key={gameId}).
 */

import { useEffect, useRef, useState } from 'react'
import './Timer.css'

interface TimerProps {
    /** Duración total en segundos */
    seconds: number
    /** false pausa la cuenta atrás */
    running?: boolean
    /** Se llama una vez cuando llega a 0 */
    onTimeUp?: () => void
}

/** Con estos segundos o menos, el reloj se pone en color de acento y parpadea */
const URGENT_AT = 10

/** 75 pasa a "1:15" */
const format = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/** Para reiniciarlo, cambia su `key` desde el padre. */
const Timer = ({ seconds, running = true, onTimeUp }: TimerProps) =>
{
    /** Segundos que quedan */
    const [remaining, setRemaining] = useState(seconds)
    // Se guarda en un ref para usar siempre la versión más reciente sin reiniciar el intervalo
    const onTimeUpRef = useRef(onTimeUp)
    const finished = remaining <= 0

    // Sin dependencias: se ejecuta tras cada render para tener siempre el callback más reciente
    useEffect(() =>
    {
        onTimeUpRef.current = onTimeUp
    })

    // Mientras corra y no haya terminado, resta 1 cada segundo. La función que devuelve
    // cancela el intervalo (al pausar, al terminar o al quitar el componente).
    useEffect(() =>
    {
        if (!running || finished) return

        const id = setInterval(() => setRemaining(r => r - 1), 1000)
        return () => clearInterval(id)
    }, [running, finished])

    // Al llegar a 0, avisa una sola vez
    useEffect(() =>
    {
        if (finished) onTimeUpRef.current?.()
    }, [finished])

    // Fracción de barra que queda (de 1 a 0). El "- 1" hace que la barra llegue a vacío
    // justo al llegar a 0 gracias a su transición de 1 s, en lugar de quedarse un segundo atrás.
    const progress = seconds > 0 ? Math.max(0, remaining - 1) / seconds : 0
    const urgent = remaining <= URGENT_AT

    return (
        <div className={`timer${urgent ? ' timer--urgent' : ''}`}>
            <span className="timer__value" role="timer" aria-label={`Quedan ${remaining} segundos`}>
                {format(remaining)}
            </span>
            <div className="timer__track" aria-hidden="true">
                {/* Se encoge con scaleX (más fluido que animar el ancho) */}
                <span className="timer__bar" style={{ transform: `scaleX(${progress})` }} />
            </div>
        </div>
    )
}

export default Timer;
