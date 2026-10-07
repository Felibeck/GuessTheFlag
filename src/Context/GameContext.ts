import { createContext, useContext } from 'react'
import type { LeaderboardEntry } from '../components/Leaderboard'

export interface FlagData {
    name: string
    flag: string
    iso2: string
}

export type GameStatus = 'loading' | 'error' | 'ready' | 'playing' | 'finished'

export interface GuessResult {
    /** Crece con cada intento: sirve para relanzar animaciones aunque el resultado se repita */
    id: number
    outcome: 'hit' | 'miss' | 'skip'
    answer: string
    /** Nombre del país de la bandera evaluada */
    country: string
}

export const POINTS_HIT = 10
export const POINTS_MISS = 1

export type Difficulty = 'facil' | 'medio' | 'dificil'

export interface DifficultyConfig {
    label: string
    seconds: number
    /** 'choices': elegir entre 4 países; 'text': escribir el nombre */
    answer: 'choices' | 'text'
    /** Partículas del mosaico: menos partículas = bandera más pixelada */
    particles: number
    description: string
}

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
    facil: {
        label: 'Fácil',
        seconds: 90,
        answer: 'choices',
        particles: 5200,
        description: 'Eliges entre cuatro países.',
    },
    medio: {
        label: 'Medio',
        seconds: 60,
        answer: 'text',
        particles: 5200,
        description: 'Escribes el nombre, en español o en inglés.',
    },
    dificil: {
        label: 'Difícil',
        seconds: 45,
        answer: 'text',
        particles: 700,
        description: 'Escribes el nombre y la bandera se ve pixelada.',
    },
}

export const DIFFICULTY_ORDER: Difficulty[] = ['facil', 'medio', 'dificil']

export interface GameContextValue {
    status: GameStatus
    flags: FlagData[]
    difficulty: Difficulty
    currentFlag: FlagData | null
    /** Opciones del modo fácil (nombres en español); vacío en los demás modos */
    choices: string[]
    score: number
    hits: number
    misses: number
    lastGuess: GuessResult | null
    /** Cambia en cada partida: úsalo como `key` del Timer para reiniciarlo */
    gameId: number
    leaderboard: LeaderboardEntry[]
    setDifficulty: (difficulty: Difficulty) => void
    guess: (answer: string) => void
    skip: () => void
    replaceFlag: () => void
    endGame: () => void
    saveScore: (name: string) => void
    startGame: () => void
    /** Vuelve a la portada (para cambiar de dificultad) */
    goHome: () => void
}

const GameContext = createContext<GameContextValue | null>(null)

export const useGame = () =>
{
    const ctx = useContext(GameContext)
    if (!ctx) throw new Error('useGame debe usarse dentro de <GameProvider>')
    return ctx
}

export default GameContext;
