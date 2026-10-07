/**
 * El "cerebro" del juego. Guarda todo el estado (banderas, puntos, dificultad,
 * ranking...) y las acciones que lo cambian (adivinar, pasar, empezar...).
 * Lo publica a través de GameContext para que cualquier componente lo use con useGame().
 *
 * Ciclo de una partida:
 *   loading ──(API responde)──▶ ready ──startGame()──▶ playing ──endGame()──▶ finished
 *                  │                                     ▲                       │
 *                  └──(falla)──▶ error                   └──── startGame() ──────┘
 *   goHome() vuelve de finished a ready (para cambiar la dificultad).
 *
 * Persistencia: el ranking y la última dificultad se guardan en localStorage,
 * siempre dentro de try/catch porque el navegador puede bloquearlo (modo privado).
 */

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { LeaderboardEntry } from '../components/Leaderboard'
import { getAllFlags } from '../services/flagApi'
import { acceptedNames, makeChoices, normalize, pickRandom, spanishName } from '../utils/country'
import GameContext, {
    DIFFICULTIES,
    POINTS_HIT,
    POINTS_MISS,
    type Difficulty,
    type FlagData,
    type GameStatus,
    type GuessResult,
} from './GameContext'

/** Claves con las que se guardan los datos en localStorage */
const STORAGE_KEY = 'guesstheflag:leaderboard'
const DIFFICULTY_KEY = 'guesstheflag:difficulty'
/** Puntuaciones que se conservan por cada dificultad */
const MAX_ENTRIES = 10

/** Lee el ranking guardado; si no hay nada o está roto, empieza vacío */
const loadLeaderboard = (): LeaderboardEntry[] =>
{
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? JSON.parse(raw) : []
    } catch {
        return []
    }
}

/** Lee la última dificultad; si no hay o no es válida, 'medio' */
const loadDifficulty = (): Difficulty =>
{
    try {
        const saved = localStorage.getItem(DIFFICULTY_KEY)
        return saved && saved in DIFFICULTIES ? saved as Difficulty : 'medio'
    } catch {
        return 'medio'
    }
}

/**
 * Envuelve la app (ver App.tsx). Los datos y acciones del final se publican en el
 * contexto; `children` es todo lo que va dentro.
 */
const GameProvider = ({ children }: { children: ReactNode }) =>
{
    // Estado. Pasar una función a useState (loadDifficulty, loadLeaderboard) la ejecuta
    // solo la primera vez, en lugar de leer localStorage en cada render.
    /** Todas las banderas disponibles (se van quitando las que no cargan) */
    const [flagList, setFlagList] = useState<FlagData[]>([])
    const [difficulty, setDifficultyState] = useState<Difficulty>(loadDifficulty)
    /** La bandera que se está adivinando */
    const [currentFlag, setCurrentFlag] = useState<FlagData | null>(null)
    /** Opciones a elegir (solo modo fácil) */
    const [choices, setChoices] = useState<string[]>([])
    const [score, setScore] = useState(0)
    const [hits, setHits] = useState(0)
    const [misses, setMisses] = useState(0)
    const [status, setStatus] = useState<GameStatus>('loading')
    /** Último intento: de aquí salen el mensaje, el "+10"/"−1" y el temblor */
    const [lastGuess, setLastGuess] = useState<GuessResult | null>(null)
    /** Identifica la partida en curso; al cambiar se reinicia el Timer (ver Game en App.tsx) */
    const [gameId, setGameId] = useState(0)
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(loadLeaderboard)

    // Al montar: pide las banderas a la API una sola vez ([] = sin dependencias)
    useEffect(() =>
    {
        const loadFlags = async () =>
        {
            try {
                const data: FlagData[] = await getAllFlags()
                // Se descartan entradas sin nombre o sin imagen
                setFlagList(data.filter(f => f.name && f.flag))
                setStatus('ready')
            } catch {
                setStatus('error')
            }
        }

        loadFlags()
    }, [])

    // Las acciones van en useCallback para que conserven la misma referencia entre
    // renders mientras no cambien sus dependencias (las del array del final).

    /**
     * Pasa a una bandera nueva (distinta de `previous`) y, si el modo es fácil,
     * prepara sus 4 opciones. Recibe la lista como parámetro porque a veces se
     * llama justo después de modificarla (replaceFlag) y el estado aún no se actualizó.
     */
    const nextFlag = useCallback((list: FlagData[], previous: FlagData | null) =>
    {
        const next = pickRandom(list, previous)
        setCurrentFlag(next)
        setChoices(next && DIFFICULTIES[difficulty].answer === 'choices' ? makeChoices(list, next) : [])
    }, [difficulty])

    /** Cambia el modo y lo recuerda para la próxima visita */
    const setDifficulty = useCallback((value: Difficulty) =>
    {
        setDifficultyState(value)
        try {
            localStorage.setItem(DIFFICULTY_KEY, value)
        } catch {
            // sin almacenamiento: se recuerda solo en esta visita
        }
    }, [])

    /** Pone el marcador a cero, elige bandera y arranca el reloj (gameId nuevo = Timer nuevo) */
    const startGame = useCallback(() =>
    {
        // Se reinicia todo lo de la partida anterior
        setScore(0)
        setHits(0)
        setMisses(0)
        setLastGuess(null)
        nextFlag(flagList, currentFlag)
        setGameId(id => id + 1)
        setStatus('playing')
    }, [flagList, currentFlag, nextFlag])

    /** Comprueba una respuesta: acierto suma y cambia de bandera; fallo resta y se queda */
    const guess = useCallback((answer: string) =>
    {
        // Defensa: ignorar respuestas fuera de partida (p. ej. justo al acabarse el tiempo)
        if (status !== 'playing' || !currentFlag) return

        // normalize() deja el texto sin tildes ni mayúsculas, y acceptedNames()
        // devuelve los nombres válidos (inglés y español) ya normalizados
        const correct = acceptedNames(currentFlag).includes(normalize(answer))
        const result: GuessResult = {
            id: Date.now(),
            outcome: correct ? 'hit' : 'miss',
            answer,
            country: spanishName(currentFlag),
        }

        setLastGuess(result)

        // Si acierta: puntos y bandera nueva. Si falla: se queda en la misma para reintentar.
        // (setScore(s => s + 10) usa el valor más reciente, no el de este render.)
        if (correct) {
            setScore(s => s + POINTS_HIT)
            setHits(h => h + 1)
            nextFlag(flagList, currentFlag)
        } else {
            setScore(s => s - POINTS_MISS)
            setMisses(m => m + 1)
        }
    }, [status, currentFlag, flagList, nextFlag])

    /** Pasar cuenta como fallo y enseña la respuesta */
    const skip = useCallback(() =>
    {
        if (status !== 'playing' || !currentFlag) return

        setLastGuess({ id: Date.now(), outcome: 'skip', answer: '', country: spanishName(currentFlag) })
        setScore(s => s - POINTS_MISS)
        setMisses(m => m + 1)
        nextFlag(flagList, currentFlag)
    }, [status, currentFlag, flagList, nextFlag])

    /** La bandera actual no carga: se descarta y se pasa a otra sin penalizar */
    const replaceFlag = useCallback(() =>
    {
        const remaining = flagList.filter(f => f !== currentFlag)
        setFlagList(remaining)
        nextFlag(remaining, currentFlag)
    }, [currentFlag, flagList, nextFlag])

    /** Fin de la partida. Lo llama el Timer al llegar a 0 */
    const endGame = useCallback(() => setStatus('finished'), [])

    /** Vuelve a la portada (desde la pantalla de resultados) */
    const goHome = useCallback(() => setStatus('ready'), [])

    /** Añade la puntuación al ranking del modo actual y lo guarda en localStorage */
    const saveScore = useCallback((name: string) =>
    {
        // Sin nombre se guarda como "Anónimo"
        const entry: LeaderboardEntry = { name: name.trim() || 'Anónimo', score, difficulty }

        setLeaderboard(prev =>
        {
            // El ranking es una sola lista con todos los modos. Se separan las entradas de
            // este modo, se añade la nueva, se ordenan y se recortan a las 10 mejores, y se
            // vuelven a juntar con las de los demás modos. (`?? 'medio'`: las entradas
            // antiguas, sin dificultad, cuentan como medio.)
            const sameMode = [...prev.filter(e => (e.difficulty ?? 'medio') === difficulty), entry]
                .sort((a, b) => b.score - a.score)
                .slice(0, MAX_ENTRIES)
            const next = [...prev.filter(e => (e.difficulty ?? 'medio') !== difficulty), ...sameMode]

            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
            } catch {
                // sin almacenamiento: el ranking vive solo en memoria
            }
            return next
        })
    }, [score, difficulty])

    // Todo lo que se comparte con el resto de la app: lo que devuelve useGame()
    return (
        <GameContext.Provider
            value={{
                status, flags: flagList, difficulty, currentFlag, choices, score, hits, misses, lastGuess, gameId,
                leaderboard, setDifficulty, guess, skip, replaceFlag, endGame, saveScore, startGame, goHome,
            }}
        >
            {children}
        </GameContext.Provider>
    )
}

export default GameProvider;
