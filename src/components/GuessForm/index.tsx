import { useEffect, useRef, useState, type SubmitEvent } from 'react'
import './GuessForm.css'

interface GuessFormProps {
    onGuess: (guess: string) => void
    onSkip?: () => void
    disabled?: boolean
    /** Cambia su valor para sacudir la barra (respuesta incorrecta) */
    shakeKey?: number
    /** Si llega, se responde eligiendo una opción en lugar de escribir (modo fácil) */
    choices?: string[]
}

const SHAKE: Keyframe[] = [
    { transform: 'translateX(0)' },
    { transform: 'translateX(-8px)' },
    { transform: 'translateX(6px)' },
    { transform: 'translateX(-3px)' },
    { transform: 'translateX(0)' },
]

const SkipButton = ({ onSkip, disabled }: { onSkip: () => void; disabled: boolean }) => (
    <button className="guess__skip" type="button" onClick={onSkip} disabled={disabled}>
        <span className="guess__skip-track">
            <span>Pasar</span>
            <span aria-hidden="true">−1 punto</span>
        </span>
    </button>
)

/** Para empezar con las opciones limpias en cada bandera, cambia su `key` desde el padre. */
const GuessForm = ({ onGuess, onSkip, disabled = false, shakeKey = 0, choices }: GuessFormProps) =>
{
    const [guess, setGuess] = useState('')
    const [discarded, setDiscarded] = useState<string[]>([])
    const barRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() =>
    {
        if (!shakeKey || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
        barRef.current?.animate(SHAKE, { duration: 320, easing: 'ease-out' })
    }, [shakeKey])

    const pick = (choice: string) =>
    {
        if (disabled || discarded.includes(choice)) return
        setDiscarded(prev => [...prev, choice])
        onGuess(choice)
    }

    // Atajos 1-4 para las opciones
    const pickRef = useRef(pick)
    useEffect(() =>
    {
        pickRef.current = pick
    })

    useEffect(() =>
    {
        if (!choices) return

        const handleKey = (e: KeyboardEvent) =>
        {
            if (e.altKey || e.ctrlKey || e.metaKey) return
            const choice = choices[Number(e.key) - 1]
            if (choice) pickRef.current(choice)
        }

        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [choices])

    const handleSubmit = (e: SubmitEvent<HTMLFormElement>) =>
    {
        e.preventDefault()

        const value = guess.trim()
        if (!value) return

        onGuess(value)
        setGuess('')
    }

    const handleSkip = () =>
    {
        onSkip?.()
        setGuess('')
        inputRef.current?.focus()
    }

    if (choices) {
        return (
            <div className="guess" role="group" aria-labelledby="choices-label">
                <p className="guess__label" id="choices-label">¿De qué país es esta bandera?</p>

                <div className="choices" ref={barRef}>
                    {choices.map((choice, i) => (
                        <button
                            key={choice}
                            className="choice"
                            type="button"
                            onClick={() => pick(choice)}
                            disabled={disabled || discarded.includes(choice)}
                            aria-keyshortcuts={String(i + 1)}
                        >
                            <span className="choice__key" aria-hidden="true">{i + 1}</span>
                            <span className="choice__name">{choice}</span>
                        </button>
                    ))}
                </div>

                {onSkip && (
                    <div className="guess__actions">
                        <SkipButton onSkip={handleSkip} disabled={disabled} />
                    </div>
                )}
            </div>
        )
    }

    return (
        <form className="guess" onSubmit={handleSubmit}>
            <label className="guess__label" htmlFor="guess-input">
                ¿De qué país es esta bandera?
            </label>
            <div className="guess__bar" ref={barRef}>
                <input
                    ref={inputRef}
                    id="guess-input"
                    name="guess"
                    className="guess__input"
                    type="text"
                    value={guess}
                    onChange={e => setGuess(e.target.value)}
                    placeholder="España, Japan, Brasil…"
                    autoComplete="off"
                    autoCapitalize="words"
                    spellCheck={false}
                    autoFocus
                    disabled={disabled}
                />

                {onSkip && <SkipButton onSkip={handleSkip} disabled={disabled} />}

                <button className="guess__submit" type="submit" disabled={disabled || !guess.trim()}>
                    Adivinar
                </button>
            </div>
        </form>
    )
}

export default GuessForm;
