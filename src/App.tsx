/**
 * Interfaz del juego: decide qué pantalla se ve según el estado de la partida.
 *
 *   App ─ <GameProvider>          (estado y lógica, ver Context/GameProvider.tsx)
 *          └─ Game                (marco común: navegación, luz ambiente, temporizador)
 *               ├─ Intro          status 'loading' | 'ready'   → portada
 *               ├─ Stage          status 'playing'             → partida
 *               ├─ Results        status 'finished'            → resultado
 *               └─ (error)        status 'error'               → no cargó la API
 *
 * Ninguna pantalla recibe el estado por props: cada una lo lee con useGame(),
 * que por dentro usa useContext. Por eso GameProvider tiene que envolver a Game.
 */

import { useEffect, useState, type CSSProperties, type SubmitEvent } from 'react'
import './App.css'
import GameProvider from './Context/GameProvider'
import { DIFFICULTIES, POINTS_HIT, POINTS_MISS, useGame, type Difficulty } from './Context/GameContext'
import DifficultyPicker from './components/DifficultyPicker'
import Flag from './components/Flag'
import GuessForm from './components/GuessForm'
import Leaderboard from './components/Leaderboard'
import NewGameButton from './components/NewGameButton'
import ScoreBoard from './components/ScoreBoard'
import Timer from './components/Timer'
import { spanishName } from './utils/country'
import type { LeaderboardEntry } from './components/Leaderboard'

/** Cada cuánto cambia la bandera de muestra de la portada */
const ATTRACT_MS = 3600

/** Puntuaciones de un modo; las antiguas sin dificultad cuentan como 'medio' */
const entriesFor = (entries: LeaderboardEntry[], difficulty: Difficulty) =>
    entries.filter(e => (e.difficulty ?? 'medio') === difficulty)

/** Logotipo de la barra de navegación */
const Brand = () => (
    <span className="brand" translate="no">
        <svg className="brand__mark" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 3v18" />
            <path d="M5 4h12l-3 4 3 4H5" />
        </svg>
        GuessTheFlag
    </span>
)

/** Portada: reglas, botón de empezar y una bandera viva que va cambiando */
const Intro = ({ onColor }: { onColor: (rgb: string) => void }) =>
{
    const { status, flags, difficulty, leaderboard, setDifficulty, startGame } = useGame()
    // Ajustes del modo elegido (tiempo, partículas...). Ver DIFFICULTIES en GameContext.ts
    const config = DIFFICULTIES[difficulty]
    // `seed` fija la bandera inicial de muestra; `tick` avanza cada ATTRACT_MS y elige la siguiente
    const [seed] = useState(() => Math.floor(Math.random() * 1000))
    const [tick, setTick] = useState(0)

    // Temporizador de la bandera de muestra; la función que devuelve lo cancela al salir de la portada
    useEffect(() =>
    {
        const id = setInterval(() => setTick(t => t + 1), ATTRACT_MS)
        return () => clearInterval(id)
    }, [])

    // La API devuelve las banderas en orden alfabético. Saltando de 97 en 97 (con % para
    // dar la vuelta a la lista) se ven banderas "al azar" pero sin repetir enseguida.
    const attractFlag = flags.length ? flags[(seed + tick * 97) % flags.length] : null

    return (
        <main className="intro">
            <section className="intro__hero">
                <div className="intro__copy">
                    <h1 className="intro__title">Adivina la bandera.</h1>
                    <p className="intro__text">
                        Reconoce todas las banderas que puedas antes de que se acabe el tiempo. Cada acierto
                        suma {POINTS_HIT} puntos y cada fallo resta {POINTS_MISS}.
                    </p>
                    <DifficultyPicker value={difficulty} onChange={setDifficulty} disabled={status !== 'ready'} />
                    <NewGameButton
                        onClick={startGame}
                        disabled={status !== 'ready'}
                        label={status === 'ready' ? 'Nueva partida' : 'Cargando banderas…'}
                    />
                </div>

                {/* Mientras no hay banderas se muestra un recuadro gris animado (skeleton) */}
                <div className="intro__visual">
                    {attractFlag
                        ? <Flag
                            src={attractFlag.flag}
                            transition="soft"
                            onColor={onColor}
                            // Si esta imagen no carga, se pasa a la siguiente
                            onLoadError={() => setTick(t => t + 1)}
                            label="Bandera de muestra"
                            particles={config.particles}
                        />
                        : <div className="flag-skeleton" aria-hidden="true" />}
                </div>
            </section>

            <section className="intro__ranking">
                <Leaderboard entries={entriesFor(leaderboard, difficulty)} mode={config.label} />
            </section>
        </main>
    )
}

/**
 * Pantalla de partida. Todo sale de useGame(): la bandera actual, el marcador
 * y el último intento (lastGuess), que decide el mensaje y las animaciones.
 */
const Stage = ({ onColor }: { onColor: (rgb: string) => void }) =>
{
    const { difficulty, currentFlag, choices, score, hits, misses, lastGuess, guess, skip, replaceFlag } = useGame()
    const config = DIFFICULTIES[difficulty]

    // Cambia en cada fallo: la bandera tiembla y la barra de respuesta se sacude
    const missKey = lastGuess?.outcome === 'miss' ? lastGuess.id : 0
    // Cambio de puntos para el "+10"/"−1" flotante del marcador
    const change = lastGuess
        ? { id: lastGuess.id, delta: lastGuess.outcome === 'hit' ? POINTS_HIT : -POINTS_MISS }
        : null

    // Mensaje de feedback según el resultado del último intento
    let message = ''
    if (lastGuess?.outcome === 'hit') message = `Correcto, era ${lastGuess.country}.`
    if (lastGuess?.outcome === 'miss') message = `«${lastGuess.answer}» no es correcto.`
    if (lastGuess?.outcome === 'skip') message = `Era ${lastGuess.country}.`

    // Por si el estado aún no tiene bandera (primer instante tras pulsar empezar)
    if (!currentFlag) return null

    return (
        <main className={`stage${config.answer === 'choices' ? ' stage--choices' : ''}`}>
            <div className="stage__hud">
                <ScoreBoard score={score} hits={hits} misses={misses} change={change} />
            </div>

            <div className="stage__flag">
                <Flag
                    src={currentFlag.flag}
                    missKey={missKey}
                    onColor={onColor}
                    onLoadError={replaceFlag}
                    particles={config.particles}
                />
            </div>

            {/* key={lastGuess?.id}: al cambiar, React recrea el <p> y se repite su animación de entrada.
                role="status": los lectores de pantalla leen el mensaje en voz alta. */}
            <p
                key={lastGuess?.id}
                className={`stage__feedback stage__feedback--${lastGuess?.outcome ?? 'none'}`}
                role="status"
            >
                {message}
            </p>

            <div className="stage__prompt">
                {/* En modo fácil, key={currentFlag.flag} recrea el formulario con cada bandera:
                    así las opciones tachadas de la bandera anterior se olvidan. */}
                {config.answer === 'choices'
                    ? <GuessForm key={currentFlag.flag} choices={choices} onGuess={guess} onSkip={skip} shakeKey={missKey} />
                    : <GuessForm onGuess={guess} onSkip={skip} shakeKey={missKey} />}
            </div>
        </main>
    )
}

/** Pantalla final: puntuación, guardar nombre en el ranking y volver a jugar */
const Results = ({ onColor }: { onColor: (rgb: string) => void }) =>
{
    const { difficulty, score, hits, misses, currentFlag, leaderboard, saveScore, startGame, goHome } = useGame()
    const config = DIFFICULTIES[difficulty]
    /** Nombre escrito en el campo */
    const [name, setName] = useState('')
    /** true cuando ya se guardó: oculta el formulario para no guardar dos veces */
    const [saved, setSaved] = useState(false)

    const handleSave = (e: SubmitEvent<HTMLFormElement>) =>
    {
        e.preventDefault()
        saveScore(name)
        setSaved(true)
    }

    return (
        <main className="results">
            <section className="results__main">
                <h1 className="results__title">Se acabó el tiempo.</h1>

                <p className="results__score">
                    {/* El "−" (U+2212) es el signo menos tipográfico, más ancho que el guion "-" */}
                    <span className="results__number">{score < 0 ? `−${Math.abs(score)}` : score}</span>
                    <span className="results__unit">puntos</span>
                </p>

                <p className="results__summary">
                    {hits} {hits === 1 ? 'acierto' : 'aciertos'} y {misses} {misses === 1 ? 'fallo' : 'fallos'} en
                    modo {config.label.toLowerCase()}.
                    {currentFlag && <> La última bandera era {spanishName(currentFlag)}.</>}
                </p>

                {saved ? (
                    <p className="results__saved" role="status">Guardado en el ranking.</p>
                ) : (
                    <form className="save" onSubmit={handleSave}>
                        <label className="save__label" htmlFor="player-name">Tu nombre para el ranking</label>
                        <div className="save__bar">
                            <input
                                id="player-name"
                                name="player-name"
                                className="save__input"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                maxLength={20}
                                autoComplete="nickname"
                                autoFocus
                            />
                            <button className="save__button" type="submit">Guardar</button>
                        </div>
                    </form>
                )}

                <div className="results__actions">
                    <NewGameButton onClick={startGame} />
                    <button className="results__change" type="button" onClick={goHome}>
                        Cambiar dificultad
                    </button>
                </div>
            </section>

            <aside className="results__aside">
                {currentFlag && (
                    <figure className="results__flag">
                        <Flag
                            src={currentFlag.flag}
                            transition="soft"
                            onColor={onColor}
                            label={`Bandera de ${spanishName(currentFlag)}`}
                        />
                        <figcaption>{spanishName(currentFlag)}</figcaption>
                    </figure>
                )}
                <Leaderboard entries={entriesFor(leaderboard, difficulty)} mode={config.label} />
            </aside>
        </main>
    )
}

/**
 * Marco común a todas las pantallas. Guarda el color medio de la bandera
 * visible (glow) para teñir la luz de fondo, y monta el Timer solo durante
 * la partida.
 */
const Game = () =>
{
    const { status, difficulty, gameId, endGame } = useGame()
    // Color de la luz de fondo como "r g b". Las pantallas con banderas lo actualizan
    // mediante onColor; empieza en el amarillo de acento. Se pasa al CSS como variable --glow.
    const [glow, setGlow] = useState('233 211 123')

    return (
        <div className="shell" data-screen={status} style={{ '--glow': glow } as CSSProperties}>
            <div className="shell__glow" aria-hidden="true" />

            <header className="nav">
                <Brand />
                {/* key={gameId}: cada partida nueva crea un Timer nuevo, que empieza otra vez desde el total */}
                {status === 'playing' && <Timer key={gameId} seconds={DIFFICULTIES[difficulty].seconds} onTimeUp={endGame} />}
            </header>

            {/* Solo una pantalla a la vez, según el estado de la partida */}
            {(status === 'loading' || status === 'ready') && <Intro onColor={setGlow} />}
            {status === 'playing' && <Stage onColor={setGlow} />}
            {status === 'finished' && <Results onColor={setGlow} />}
            {status === 'error' && (
                <main className="error">
                    <h1 className="error__title">No se pudieron cargar las banderas.</h1>
                    <p className="error__text">Revisa tu conexión y vuelve a cargar la página.</p>
                </main>
            )}
        </div>
    )
}

/** Raíz de la app: el Provider debe envolver a Game para que useGame() funcione dentro */
function App() {
  return (
    <GameProvider>
      <Game />
    </GameProvider>
  )
}

export default App
