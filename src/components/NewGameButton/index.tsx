/**
 * <NewGameButton>: el botón de empezar partida (portada y resultados).
 * Las cuatro esquinas son <span> decorativos que se acercan al pasar el cursor.
 */

import './NewGameButton.css'

interface NewGameButtonProps {
    onClick: () => void
    disabled?: boolean
    /** Texto del botón; por defecto "Nueva partida" */
    label?: string
}

/** Visor: cuatro esquinas que se cierran sobre la etiqueta al apuntar */
const NewGameButton = ({ onClick, disabled = false, label = 'Nueva partida' }: NewGameButtonProps) =>
{
    // Los cuatro span (tl, tr, bl, br = arriba/abajo, izquierda/derecha) se colocan en las
    // esquinas con CSS. aria-hidden: son solo decoración.
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
