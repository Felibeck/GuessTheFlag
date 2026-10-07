import './NewGameButton.css'

interface NewGameButtonProps {
    onClick: () => void
    disabled?: boolean
    label?: string
}

/** Visor: cuatro esquinas que se cierran sobre la etiqueta al apuntar */
const NewGameButton = ({ onClick, disabled = false, label = 'Nueva partida' }: NewGameButtonProps) =>
{
    return (
        <button className="new-game" type="button" onClick={onClick} disabled={disabled}>
            <span className="new-game__corner new-game__corner--tl" aria-hidden="true" />
            <span className="new-game__corner new-game__corner--tr" aria-hidden="true" />
            <span className="new-game__corner new-game__corner--bl" aria-hidden="true" />
            <span className="new-game__corner new-game__corner--br" aria-hidden="true" />
            <span className="new-game__label">{label}</span>
        </button>
    )
}

export default NewGameButton;
