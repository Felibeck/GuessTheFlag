/**
 * Utilidades sobre países, sin React: comparar respuestas, traducir nombres,
 * elegir banderas al azar y preparar las opciones del modo fácil.
 */

import type { FlagData } from '../Context/GameContext'

/**
 * Deja un texto listo para comparar: sin tildes, en minúsculas y sin espacios
 * sobrantes. "  Perú " y "peru" dan lo mismo.
 * normalize('NFD') separa cada letra de su tilde ("é" → "e" + "´") y el
 * replace borra esas tildes sueltas (rango Unicode 0300-036f).
 */
export const normalize = (text: string) =>
    text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[’‘]/g, "'")
        .toLowerCase()
        .trim()

/** Traductor de códigos de país a nombres en español, incluido en el navegador (no hace falta librería) */
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

/**
 * Nombres válidos para una bandera: el original (inglés) y el español, ya normalizados.
 * Para comprobar una respuesta: acceptedNames(bandera).includes(normalize(respuesta)).
 */
export const acceptedNames = (flag: FlagData) =>
    [flag.name, spanishName(flag)].map(normalize)

/** Cuatro opciones en español: la correcta y tres países al azar, desordenadas */
export const makeChoices = (flags: FlagData[], correct: FlagData, count = 4) =>
{
    const answer = spanishName(correct)
    // Un Set no admite repetidos: si sale dos veces el mismo país, la segunda se ignora
    const options = new Set([answer])

    // Añade países al azar hasta tener `count`. El límite de 50 intentos evita un
    // bucle infinito si hubiera muy pocas banderas.
    for (let tries = 0; options.size < count && tries < 50; tries++) {
        const other = flags[Math.floor(Math.random() * flags.length)]
        if (other) options.add(spanishName(other))
    }

    const list = [...options]
    // Barajado de Fisher-Yates: intercambia cada posición con otra al azar
    for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[list[i], list[j]] = [list[j], list[i]]
    }
    return list
}

/** Bandera al azar, distinta de la anterior para que no se repita seguida */
export const pickRandom = (flags: FlagData[], previous?: FlagData | null) =>
{
    if (flags.length <= 1) return flags[0] ?? null

    // Repite el sorteo mientras salga la misma que la anterior
    let next: FlagData
    do {
        next = flags[Math.floor(Math.random() * flags.length)]
    } while (next === previous)

    return next
}
