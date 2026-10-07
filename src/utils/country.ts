import type { FlagData } from '../Context/GameContext'

export const normalize = (text: string) =>
    text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[’‘]/g, "'")
        .toLowerCase()
        .trim()

const spanishNames = new Intl.DisplayNames(['es'], { type: 'region' })

/** Nombre en español según el código ISO; si no existe, el original de la API */
export const spanishName = (flag: FlagData) =>
{
    try {
        return spanishNames.of(flag.iso2) ?? flag.name
    } catch {
        return flag.name
    }
}

/** Nombres válidos para una bandera: el original (inglés) y el español */
export const acceptedNames = (flag: FlagData) =>
    [flag.name, spanishName(flag)].map(normalize)

/** Cuatro opciones en español: la correcta y tres países al azar, desordenadas */
export const makeChoices = (flags: FlagData[], correct: FlagData, count = 4) =>
{
    const answer = spanishName(correct)
    const options = new Set([answer])

    for (let tries = 0; options.size < count && tries < 50; tries++) {
        const other = flags[Math.floor(Math.random() * flags.length)]
        if (other) options.add(spanishName(other))
    }

    const list = [...options]
    for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[list[i], list[j]] = [list[j], list[i]]
    }
    return list
}

export const pickRandom =(flags: FlagData[], previous?: FlagData | null) =>
{
    if (flags.length <= 1) return flags[0] ?? null

    let next: FlagData
    do {
        next = flags[Math.floor(Math.random() * flags.length)]
    } while (next === previous)

    return next
}
