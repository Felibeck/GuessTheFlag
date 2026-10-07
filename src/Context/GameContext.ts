/**
 * Definición del contexto del juego: tipos, constantes y el hook useGame().
 *
 * ¿Qué es un contexto? Una forma de compartir datos con muchos componentes sin
 * pasarlos por props de padre a hijo. Funciona en tres piezas:
 *   1. createContext()  → crea el "canal" (aquí, GameContext).
 *   2. <GameContext.Provider value={...}> → publica los datos (en GameProvider.tsx).
 *   3. useContext(GameContext) → cualquier componente de dentro los lee
 *      (aquí envuelto en useGame() para no repetirlo y para avisar si falta el Provider).
 *
 * Este archivo solo describe la forma de los datos; la lógica está en GameProvider.tsx.
 */

import { createContext, useContext } from 'react'
import type { LeaderboardEntry } from '../components/Leaderboard'

/** Una bandera tal como llega de la API */
export interface FlagData {
    /** Nombre del país en inglés */
    name: string
    /** URL de la imagen */
    flag: string
    /** Código ISO de dos letras, p. ej. "AR" */
    iso2: string
}

/** En qué pantalla está el juego (ver el diagrama en GameProvider.tsx) */
export type GameStatus = 'loading' | 'error' | 'ready' | 'playing' | 'finished'

/** Resultado del último intento: lo usa la partida para el mensaje y las animaciones */
export interface GuessResult {
    /** Crece con cada intento: sirve para relanzar animaciones aunque el resultado se repita */
    id: number
    /** 'hit' = acierto, 'miss' = fallo, 'skip' = pasó de bandera */
    outcome: 'hit' | 'miss' | 'skip'
    /** Lo que escribió o eligió el jugador (vacío si pasó) */
    answer: string
    /** Nombre del país de la bandera evaluada */
    country: string
}

/** Puntos por acierto */
export const POINTS_HIT = 10
/** Puntos que se restan por fallo o por pasar */
export const POINTS_MISS = 1

/** Los tres modos. Se usan como clave en DIFFICULTIES y se guardan en localStorage */
export type Difficulty = 'facil' | 'medio' | 'dificil'

/** Los ajustes de un modo */
export interface DifficultyConfig {
    /** Nombre que ve el jugador */
    label: string
    /** Duración de la partida en segundos */
    seconds: number
    /** 'choices': elegir entre 4 países; 'text': escribir el nombre */
    answer: 'choices' | 'text'
    /** Partículas del mosaico: menos partículas = bandera más pixelada */
    particles: number
    /** Frase que explica el modo, bajo el selector de la portada */
    description: string
}

/** Ajustes de cada modo. Para cambiar tiempos o pixelación, edita aquí */
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

/** Orden en que aparecen en el selector */
export const DIFFICULTY_ORDER: Difficulty[] = ['facil', 'medio', 'dificil']

/** Todo lo que useGame() devuelve: el estado de la partida y las acciones para cambiarlo */
export interface GameContextValue {
    /** En qué pantalla está el juego */
    status: GameStatus
    /** Todas las banderas cargadas de la API */
    flags: FlagData[]
    /** Modo elegido */
    difficulty: Difficulty
    /** La bandera que se está adivinando (null si no hay partida) */
    currentFlag: FlagData | null
    /** Opciones del modo fácil (nombres en español); vacío en los demás modos */
    choices: string[]
    /** Puntos de la partida */
    score: number
    hits: number
    misses: number
    /** Último intento (null al empezar). De aquí salen el mensaje y las animaciones */
    lastGuess: GuessResult | null
    /** Cambia en cada partida: úsalo como `key` del Timer para reiniciarlo */
    gameId: number
    /** Ranking con las puntuaciones de todos los modos */
    leaderboard: LeaderboardEntry[]
    // Acciones (su explicación está en GameProvider.tsx)
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
