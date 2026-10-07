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

const STORAGE_KEY = 'guesstheflag:leaderboard'
const DIFFICULTY_KEY = 'guesstheflag:difficulty'
const MAX_ENTRIES = 10

const loadLeaderboard = (): LeaderboardEntry[] =>
{
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? JSON.parse(raw) : []
    } catch {
        return []
    }
}

const loadDifficulty = (): Difficulty =>
{
    try {
        const saved = localStorage.getItem(DIFFICULTY_KEY)
        return saved && saved in DIFFICULTIES ? saved as Difficulty : 'medio'
    } catch {
        return 'medio'
    }
}

const GameProvider = ({ children }: { children: ReactNode }) =>
{
    const [flagList, setFlagList] = useState<FlagData[]>([])
    const [difficulty, setDifficultyState] = useState<Difficulty>(loadDifficulty)
    const [currentFlag, setCurrentFlag] = useState<FlagData | null>(null)
    const [choices, setChoices] = useState<string[]>([])
    const [score, setScore] = useState(0)
    const [hits, setHits] = useState(0)
    const [misses, setMisses] = useState(0)
    const [status, setStatus] = useState<GameStatus>('loading')
    const [lastGuess, setLastGuess] = useState<GuessResult | null>(null)
    const [gameId, setGameId] = useState(0)
    const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(loadLeaderboard)

    useEffect(() =>
    {
        const loadFlags = async () =>
        {
            try {
                const data: FlagData[] = await getAllFlags()
                setFlagList(data.filter(f => f.name && f.flag))
                setStatus('ready')
            } catch {
                setStatus('error')
            }
        }

        loadFlags()
    }, [])

    /** Pasa a una bandera nueva (y prepara sus opciones si el modo es fácil) */
    const nextFlag = useCallback((list: FlagData[], previous: FlagData | null) =>
    {
        const next = pickRandom(list, previous)
        setCurrentFlag(next)
        setChoices(next && DIFFICULTIES[difficulty].answer === 'choices' ? makeChoices(list, next) : [])
    }, [difficulty])

    const setDifficulty = useCallback((value: Difficulty) =>
    {
        setDifficultyState(value)
        try {
            localStorage.setItem(DIFFICULTY_KEY, value)
        } catch {
            // sin almacenamiento: se recuerda solo en esta visita
        }
    }, [])

    const startGame = useCallback(() =>
    {
        setScore(0)
        setHits(0)
        setMisses(0)
        setLastGuess(null)
        nextFlag(flagList, currentFlag)
        setGameId(id => id + 1)
        setStatus('playing')
    }, [flagList, currentFlag, nextFlag])

    const guess = useCallback((answer: string) =>
    {
        if (status !== 'playing' || !currentFlag) return

        const correct = acceptedNames(currentFlag).includes(normalize(answer))
        const result: GuessResult = {
            id: Date.now(),
            outcome: correct ? 'hit' : 'miss',
            answer,
            country: spanishName(currentFlag),
        }

        setLastGuess(result)

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

    const endGame = useCallback(() => setStatus('finished'), [])

    const goHome = useCallback(() => setStatus('ready'), [])

    const saveScore = useCallback((name: string) =>
    {
        const entry: LeaderboardEntry = { name: name.trim() || 'Anónimo', score, difficulty }

        setLeaderboard(prev =>
        {
            // Se guardan las mejores de cada modo por separado
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
