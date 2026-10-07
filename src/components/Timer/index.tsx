import { useEffect, useRef, useState } from 'react'
import './Timer.css'

interface TimerProps {
    seconds: number
    running?: boolean
    onTimeUp?: () => void
}

const URGENT_AT = 10

const format = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/** Para reiniciarlo, cambia su `key` desde el padre. */
const Timer = ({ seconds, running = true, onTimeUp }: TimerProps) =>
{
    const [remaining, setRemaining] = useState(seconds)
    const onTimeUpRef = useRef(onTimeUp)
    const finished = remaining <= 0

    useEffect(() =>
    {
        onTimeUpRef.current = onTimeUp
    })

    useEffect(() =>
    {
        if (!running || finished) return

        const id = setInterval(() => setRemaining(r => r - 1), 1000)
        return () => clearInterval(id)
    }, [running, finished])

    useEffect(() =>
    {
        if (finished) onTimeUpRef.current?.()
    }, [finished])

    const progress = seconds > 0 ? Math.max(0, remaining - 1) / seconds : 0
    const urgent = remaining <= URGENT_AT

    return (
        <div className={`timer${urgent ? ' timer--urgent' : ''}`}>
            <span className="timer__value" role="timer" aria-label={`Quedan ${remaining} segundos`}>
                {format(remaining)}
            </span>
            <div className="timer__track" aria-hidden="true">
                <span className="timer__bar" style={{ transform: `scaleX(${progress})` }} />
            </div>
        </div>
    )
}

export default Timer;
