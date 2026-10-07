import type { Difficulty } from '../../Context/GameContext'
import './Leaderboard.css'

export interface LeaderboardEntry {
    name: string
    score: number
    /** Las entradas antiguas no lo tienen: cuentan como modo medio */
    difficulty?: Difficulty
}

interface LeaderboardProps {
    entries: LeaderboardEntry[]
    /** Nombre del modo que se está mostrando, p. ej. "Fácil" */
    mode?: string
}

const Leaderboard = ({ entries, mode }: LeaderboardProps) =>
{
    const sorted = [...entries].sort((a, b) => b.score - a.score)

    return (
        <section className="ranking" aria-labelledby="ranking-title">
            <h2 id="ranking-title" className="ranking__title">
                Ranking
                {mode && <span className="ranking__mode">{mode}</span>}
            </h2>

            {sorted.length === 0 ? (
                <p className="ranking__empty">Todavía no hay partidas guardadas. Juega una y pon tu nombre aquí.</p>
            ) : (
                <ol className="ranking__list">
                    {sorted.map((entry, i) => (
                        <li key={`${entry.name}-${i}`} className="ranking__row">
                            <span className="ranking__place">{i + 1}</span>
                            <span className="ranking__name">{entry.name}</span>
                            <span className="ranking__score">{entry.score}</span>
                        </li>
                    ))}
                </ol>
            )}
        </section>
    )
}

export default Leaderboard;
