/**
 * <DifficultyPicker>: selector de dificultad de la portada.
 * Por dentro son tres <input type="radio"> nativos (accesibles con teclado y
 * lectores de pantalla) ocultos visualmente; lo que se ve son sus <label>.
 * La píldora blanca se mueve con la variable CSS --index (0, 1 o 2).
 */

import type { CSSProperties } from 'react'
import { DIFFICULTIES, DIFFICULTY_ORDER, type Difficulty } from '../../Context/GameContext'
import './DifficultyPicker.css'

interface DifficultyPickerProps {
    /** Modo seleccionado */
    value: Difficulty
    /** Se llama al elegir otro modo */
    onChange: (difficulty: Difficulty) => void
    /** Bloquea el selector (mientras cargan las banderas) */
    disabled?: boolean
}

/** Interruptor de tres posiciones: una píldora se desliza bajo el modo elegido */
const DifficultyPicker = ({ value, onChange, disabled = false }: DifficultyPickerProps) =>
{
    // Posición (0, 1 o 2) del modo elegido: el CSS la usa para mover la píldora
    const index = DIFFICULTY_ORDER.indexOf(value)
    const config = DIFFICULTIES[value]

    return (
        // <fieldset> agrupa los controles; con disabled se desactivan todos de golpe
        <fieldset className="difficulty" disabled={disabled}>
            <legend className="difficulty__legend">Dificultad</legend>

            {/* style: pasa `index` al CSS como la variable --index */}
            <div className="difficulty__track" style={{ '--index': index } as CSSProperties}>
                {/* La píldora que se desliza: solo decoración (aria-hidden) */}
                <span className="difficulty__thumb" aria-hidden="true" />
                {DIFFICULTY_ORDER.map(level => (
                    <label key={level} className="difficulty__option">
                        {/* Radio nativo oculto (sr-only): se maneja con teclado y flechas y los lectores
                            de pantalla lo anuncian. Todos comparten name="difficulty": solo uno activo. */}
                        <input
                            className="sr-only"
                            type="radio"
                            name="difficulty"
                            value={level}
                            checked={level === value}
                            onChange={() => onChange(level)}
                        />
                        {DIFFICULTIES[level].label}
                    </label>
                ))}
            </div>

            {/* aria-live: los lectores de pantalla anuncian la descripción al cambiar de modo */}
            <p className="difficulty__hint" aria-live="polite">
                {config.description} {config.seconds} segundos.
            </p>
        </fieldset>
    )
}

export default DifficultyPicker;
