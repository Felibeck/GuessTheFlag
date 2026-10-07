/**
 * <GuessForm>: donde el jugador responde.
 * - Modo texto (medio y difícil): campo + "Pasar" + "Adivinar", en una sola píldora.
 * - Modo opciones (fácil): cuatro botones, también con las teclas 1 a 4.
 * El componente no sabe si la respuesta es correcta: solo llama a onGuess() y
 * el GameProvider decide. Si falla, el padre cambia shakeKey y la barra se sacude.
 */

import { useEffect, useRef, useState, type SubmitEvent } from 'react'
import './GuessForm.css'

interface GuessFormProps {
    /** Se llama con la respuesta del jugador (texto escrito u opción elegida) */
    onGuess: (guess: string) => void
    /** Si se pasa, aparece el botón "Pasar" */
    onSkip?: () => void
    disabled?: boolean
    /** Cambia su valor para sacudir la barra (respuesta incorrecta) */
    shakeKey?: number
    /** Si llega, se responde eligiendo una opción en lugar de escribir (modo fácil) */
    choices?: string[]
}

/** Sacudida horizontal de la barra al fallar (Web Animations API, ver el efecto de abajo) */
const SHAKE: Keyframe[] = [
    { transform: 'translateX(0)' },
    { transform: 'translateX(-8px)' },
    { transform: 'translateX(6px)' },
    { transform: 'translateX(-3px)' },
    { transform: 'translateX(0)' },
]

/** Botón "Pasar": al apuntarlo, la etiqueta sube y deja ver el coste ("−1 punto") */
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
    /** Texto escrito (modo texto) */
    const [guess, setGuess] = useState('')
    /** Opciones ya probadas y falladas (modo fácil): salen tachadas y desactivadas */
    const [discarded, setDiscarded] = useState<string[]>([])
    /** Elemento que se sacude (la barra o el grupo de opciones) */
    const barRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Cada vez que llega un shakeKey nuevo (= un fallo), sacude la barra.
    // Con "movimiento reducido" activado en el sistema no se anima.
    useEffect(() =>
    {
        if (!shakeKey || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
        barRef.current?.animate(SHAKE, { duration: 320, easing: 'ease-out' })
    }, [shakeKey])

    /** Elige una opción (modo fácil): la marca como descartada y envía la respuesta */
    const pick = (choice: string) =>
    {
        if (disabled || discarded.includes(choice)) return
        setDiscarded(prev => [...prev, choice])
        onGuess(choice)
    }

    // Atajos de teclado 1-4. El listener se registra una sola vez y lee `pick` desde un
    // ref que se actualiza en cada render: así siempre usa el `discarded` más reciente
    // sin tener que quitar y volver a poner el listener.
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
            // Ignorar combinaciones como Ctrl+1 (cambiar de pestaña)
            if (e.altKey || e.ctrlKey || e.metaKey) return
            // La tecla "1" elige choices[0], la "2" choices[1]... Otras teclas dan undefined
            const choice = choices[Number(e.key) - 1]
            if (choice) pickRef.current(choice)
        }

        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    }, [choices])

    /** Envía el texto escrito (Enter o botón Adivinar) */
    const handleSubmit = (e: SubmitEvent<HTMLFormElement>) =>
    {
        e.preventDefault() // evita que el navegador recargue la página al enviar el formulario

        const value = guess.trim()
        if (!value) return

        onGuess(value)
        setGuess('')
    }

    /** Pasa de bandera: limpia el campo y devuelve el foco para seguir escribiendo */
    const handleSkip = () =>
    {
        onSkip?.()
        setGuess('')
        inputRef.current?.focus()
    }

    // Modo fácil: cuatro botones en lugar del campo de texto
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

    // Modo texto (medio y difícil)
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
