import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { DEFAULT_PARTICLES, ParticleField, type Transition } from './particleField'
import './Flag.css'

interface FlagProps {
    src: string
    /** Cómo entra una bandera nueva: 'strong' al acertar, 'soft' en la portada */
    transition?: Exclude<Transition, 'assemble' | 'none'>
    /** Cambia su valor para que la bandera tiemble (respuesta incorrecta) */
    missKey?: number
    /** Recibe el color medio de la bandera como "r g b" */
    onColor?: (rgb: string) => void
    /** La imagen no existe o no carga: el padre puede cambiar de bandera */
    onLoadError?: () => void
    label?: string
    /** Cuántas partículas forman la bandera: menos = más pixelada */
    particles?: number
}

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
    const fieldRef = useRef<ParticleField | null>(null)
    const firstImageRef = useRef(true)
    const onColorRef = useRef(onColor)
    const onLoadErrorRef = useRef(onLoadError)
    const [failed, setFailed] = useState(false)

    useEffect(() =>
    {
        onColorRef.current = onColor
        onLoadErrorRef.current = onLoadError
    })

    useEffect(() =>
    {
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const field = new ParticleField(canvasRef.current!, reduced)
        field.onColor = rgb => onColorRef.current?.(rgb)
        field.onError = () => setFailed(true)
        fieldRef.current = field

        const observer = new ResizeObserver(([entry]) => field.resize(entry.contentRect.width))
        observer.observe(wrapRef.current!)

        return () =>
        {
            observer.disconnect()
            field.destroy()
            fieldRef.current = null
        }
    }, [])

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

    useEffect(() =>
    {
        fieldRef.current?.setDensity(particles)
    }, [particles])

    useEffect(() =>
    {
        if (missKey) fieldRef.current?.tremble()
    }, [missKey])

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
