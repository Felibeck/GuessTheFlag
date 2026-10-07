/**
 * <Flag>: muestra una bandera como mosaico de partículas interactivo.
 *
 * Es el "puente" entre React y el motor de partículas (particleField.ts):
 * React no dibuja nada en el canvas, solo crea el motor una vez y le pasa
 * órdenes cuando cambian las props (nueva imagen, temblor, densidad...).
 * Los refs (useRef) guardan el motor y los callbacks sin provocar renders.
 *
 * Si la imagen no permite leer sus píxeles, se muestra un <img> normal.
 * Si la imagen no carga, avisa al padre con onLoadError para que cambie de bandera.
 */

import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { DEFAULT_PARTICLES, ParticleField, type Transition } from './particleField'
import './Flag.css'

interface FlagProps {
    /** URL de la imagen de la bandera */
    src: string
    /** Cómo entra una bandera nueva: 'strong' al acertar, 'soft' en la portada */
    transition?: Exclude<Transition, 'assemble' | 'none'>
    /** Cambia su valor para que la bandera tiemble (respuesta incorrecta) */
    missKey?: number
    /** Recibe el color medio de la bandera como "r g b" */
    onColor?: (rgb: string) => void
    /** La imagen no existe o no carga: el padre puede cambiar de bandera */
    onLoadError?: () => void
    /** Texto para lectores de pantalla. No debe revelar el país si es una adivinanza */
    label?: string
    /** Cuántas partículas forman la bandera: menos = más pixelada */
    particles?: number
}

/**
 * Descarga una imagen y la devuelve como promesa.
 * crossOrigin = 'anonymous' es imprescindible: sin él el navegador "mancha" el
 * canvas y no deja leer los píxeles de la imagen (ver ParticleField.sample).
 */
const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) =>
    {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.decoding = 'async'
        img.onload = () => resolve(img)
        img.onerror = reject
        img.src = src
    })

const Flag = ({
    src,
    transition = 'strong',
    missKey = 0,
    onColor,
    onLoadError,
    label = 'Bandera que debes adivinar',
    particles = DEFAULT_PARTICLES,
}: FlagProps) =>
{
    const wrapRef = useRef<HTMLDivElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    /** El motor de partículas (se crea una vez, ver el primer efecto) */
    const fieldRef = useRef<ParticleField | null>(null)
    /** true hasta que llega la primera imagen: esa entra con 'assemble' */
    const firstImageRef = useRef(true)
    const onColorRef = useRef(onColor)
    const onLoadErrorRef = useRef(onLoadError)
    /** true si hay que mostrar un <img> normal en vez del canvas */
    const [failed, setFailed] = useState(false)

    // Sin lista de dependencias: se ejecuta tras cada render y mantiene en los refs
    // la última versión de los callbacks. Así los efectos de abajo, que se crean una
    // sola vez, siempre llaman a la función actual sin tener que volver a ejecutarse.
    useEffect(() =>
    {
        onColorRef.current = onColor
        onLoadErrorRef.current = onLoadError
    })

    // 1) Al montar: crear el motor y vigilar el tamaño de la caja. Al desmontar, limpiar.
    useEffect(() =>
    {
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const field = new ParticleField(canvasRef.current!, reduced)
        field.onColor = rgb => onColorRef.current?.(rgb)
        field.onError = () => setFailed(true)
        fieldRef.current = field

        // ResizeObserver avisa cuando la caja cambia de tamaño (también la primera vez)
        const observer = new ResizeObserver(([entry]) => field.resize(entry.contentRect.width))
        observer.observe(wrapRef.current!)

        return () =>
        {
            observer.disconnect()
            field.destroy()
            fieldRef.current = null
        }
    }, [])

    // 2) Cada vez que cambia la bandera: descargar la imagen y pasársela al motor.
    // `cancelled` evita usar una imagen que llega tarde, cuando ya se pidió otra distinta.
    useEffect(() =>
    {
        let cancelled = false

        loadImage(src)
            .then(img =>
            {
                if (cancelled || !fieldRef.current) return
                setFailed(false)
                fieldRef.current.setImage(img, firstImageRef.current ? 'assemble' : transition)
                firstImageRef.current = false
            })
            .catch(() =>
            {
                if (cancelled) return
                if (onLoadErrorRef.current) onLoadErrorRef.current()
                else setFailed(true)
            })

        return () => { cancelled = true }
    }, [src, transition])

    // 3) Si cambia la dificultad cambia la densidad de partículas
    useEffect(() =>
    {
        fieldRef.current?.setDensity(particles)
    }, [particles])

    // 4) Cada fallo trae un missKey nuevo: la bandera tiembla (0 = aún no hay fallos)
    useEffect(() =>
    {
        if (missKey) fieldRef.current?.tremble()
    }, [missKey])

    /** Convierte la posición del ratón (pantalla) a coordenadas dentro del canvas */
    const handlePointerMove = (e: PointerEvent<HTMLCanvasElement>) =>
    {
        const rect = e.currentTarget.getBoundingClientRect()
        fieldRef.current?.setPointer(e.clientX - rect.left, e.clientY - rect.top)
    }

    return (
        <div className="flag" ref={wrapRef}>
            <canvas
                ref={canvasRef}
                className="flag__canvas"
                role="img"
                aria-label={label}
                hidden={failed}
                onPointerMove={handlePointerMove}
                onPointerLeave={() => fieldRef.current?.clearPointer()}
            />
            {failed && <img className="flag__fallback" src={src} alt={label} />}
        </div>
    )
}

export default Flag;
