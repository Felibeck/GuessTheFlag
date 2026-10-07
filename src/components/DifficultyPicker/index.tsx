import type { CSSProperties } from 'react'
import { DIFFICULTIES, DIFFICULTY_ORDER, type Difficulty } from '../../Context/GameContext'
import './DifficultyPicker.css'

interface DifficultyPickerProps {
    value: Difficulty
    onChange: (difficulty: Difficulty) => void
    disabled?: boolean
}

/** Interruptor de tres posiciones: una píldora se desliza bajo el modo elegido */
const DifficultyPicker = ({ value, onChange, disabled = false }: DifficultyPickerProps) =>
{
    const index = DIFFICULTY_ORDER.indexOf(value)
    const config = DIFFICULTIES[value]

    return (
        <fieldset className="difficulty" disabled={disabled}>
            <legend className="difficulty__legend">Dificultad</legend>

            <div className="difficulty__track" style={{ '--index': index } as CSSProperties}>
                <span className="difficulty__thumb" aria-hidden="true" />
                {DIFFICULTY_ORDER.map(level => (
                    <label key={level} className="difficulty__option">
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

            <p className="difficulty__hint" aria-live="polite">
                {config.description} {config.seconds} segundos.
            </p>
        </fieldset>
    )
}

export default DifficultyPicker;
