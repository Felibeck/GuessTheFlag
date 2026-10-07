/**
 * Mosaico de partículas que dibuja una bandera en un <canvas>.
 * Cada celda de la rejilla es una partícula con un muelle hacia su posición;
 * el cursor las repele, y al cambiar de bandera estallan y se recomponen.
 */

export type Transition = 'assemble' | 'soft' | 'strong' | 'none'

const ASPECT = 3 / 2
export const DEFAULT_PARTICLES = 5200
const SPRING = 0.055
const DAMPING = 0.84
const REPEL_RADIUS = 80
const REPEL_FORCE = 5.5
const FRAME_MS = 1000 / 60

export class ParticleField {
    private ctx: CanvasRenderingContext2D
    private dpr = 1
    private width = 0
    private height = 0
    private cols = 0
    private rows = 0
    private size = 0
    private n = 0
    private targetParticles = DEFAULT_PARTICLES

    private x = new Float32Array(0)
    private y = new Float32Array(0)
    private vx = new Float32Array(0)
    private vy = new Float32Array(0)
    private hx = new Float32Array(0)
    private hy = new Float32Array(0)
    private color = new Uint32Array(0)
    private visible = new Uint8Array(0)
    private nextColor = new Uint32Array(0)
    private nextVisible = new Uint8Array(0)
    private swapAt = new Float64Array(0)
    private pendingSwaps = 0

    private pointerX = 0
    private pointerY = 0
    private pointerActive = false
    private raf = 0
    private lastTime = 0
    private image: HTMLImageElement | null = null
    private pendingTransition: Transition | null = null
    private styles = new Map<number, string>()

    onColor?: (rgb: string) => void
    onError?: () => void

    private canvas: HTMLCanvasElement
    private reducedMotion: boolean

    constructor(canvas: HTMLCanvasElement, reducedMotion: boolean)
    {
        this.canvas = canvas
        this.reducedMotion = reducedMotion
        this.ctx = canvas.getContext('2d')!
    }

    resize(cssWidth: number)
    {
        const width = Math.round(cssWidth)
        if (width === this.width || width <= 0) return

        this.width = width
        this.height = Math.round(width / ASPECT)
        this.dpr = Math.min(window.devicePixelRatio || 1, 2)
        this.canvas.width = this.width * this.dpr
        this.canvas.height = this.height * this.dpr

        const cell = Math.max(3, Math.sqrt((this.width * this.height) / this.targetParticles))
        this.cols = Math.floor(this.width / cell)
        this.rows = Math.floor(this.height / cell)
        this.size = Math.max(1.5, cell - Math.max(1, cell * 0.08))
        this.n = this.cols * this.rows

        const offsetX = (this.width - this.cols * cell) / 2 + cell / 2
        const offsetY = (this.height - this.rows * cell) / 2 + cell / 2

        this.x = new Float32Array(this.n)
        this.y = new Float32Array(this.n)
        this.vx = new Float32Array(this.n)
        this.vy = new Float32Array(this.n)
        this.hx = new Float32Array(this.n)
        this.hy = new Float32Array(this.n)
        this.color = new Uint32Array(this.n)
        this.visible = new Uint8Array(this.n)
        this.nextColor = new Uint32Array(this.n)
        this.nextVisible = new Uint8Array(this.n)
        this.swapAt = new Float64Array(this.n)
        this.pendingSwaps = 0

        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < this.cols; col++) {
                const i = row * this.cols + col
                this.hx[i] = this.x[i] = offsetX + col * cell
                this.hy[i] = this.y[i] = offsetY + row * cell
            }
        }

        if (this.image) this.apply(this.pendingTransition ?? 'none')
    }

    /** Cambia cuántas partículas forman la bandera; se recompone con animación */
    setDensity(particles: number)
    {
        if (particles === this.targetParticles) return

        this.targetParticles = particles
        const width = this.width
        if (width <= 0) return

        this.width = 0
        if (this.image) this.pendingTransition = 'assemble'
        this.resize(width)
    }

    setImage(image: HTMLImageElement, transition: Transition)
    {
        this.image = image
        this.pendingTransition = transition
        if (this.n > 0) this.apply(transition)
    }

    /** Temblor breve: respuesta incorrecta */
    tremble()
    {
        if (this.reducedMotion || this.n === 0) return

        for (let i = 0; i < this.n; i++) {
            this.vx[i] += (Math.random() - 0.5) * 9
            this.vy[i] += (Math.random() - 0.5) * 4
        }
        this.kick()
    }

    setPointer(x: number, y: number)
    {
        if (this.reducedMotion) return
        this.pointerX = x
        this.pointerY = y
        this.pointerActive = true
        this.kick()
    }

    clearPointer()
    {
        this.pointerActive = false
        this.kick()
    }

    destroy()
    {
        cancelAnimationFrame(this.raf)
        this.raf = 0
        this.image = null
    }

    private apply(transition: Transition)
    {
        if (!this.image) return
        this.pendingTransition = null

        let sample: { colors: Uint32Array; visible: Uint8Array; average: string }
        try {
            sample = this.sample(this.image)
        } catch {
            this.onError?.()
            return
        }

        this.onColor?.(sample.average)

        if (this.reducedMotion || transition === 'none') {
            this.color.set(sample.colors)
            this.visible.set(sample.visible)
            this.swapAt.fill(0)
            this.pendingSwaps = 0
            this.x.set(this.hx)
            this.y.set(this.hy)
            this.vx.fill(0)
            this.vy.fill(0)
            this.draw()
            return
        }

        if (transition === 'assemble') {
            this.color.set(sample.colors)
            this.visible.set(sample.visible)
            for (let i = 0; i < this.n; i++) {
                const angle = Math.random() * Math.PI * 2
                const radius = (0.35 + Math.random() * 0.65) * this.width * 0.6
                this.x[i] = this.width / 2 + Math.cos(angle) * radius
                this.y[i] = this.height / 2 + Math.sin(angle) * radius * 0.7
                this.vx[i] = 0
                this.vy[i] = 0
            }
            this.kick()
            return
        }

        // Explosión desde el centro; el color cambia en pleno vuelo, en forma de onda
        const strong = transition === 'strong'
        const cx = this.width / 2
        const cy = this.height / 2
        const maxDist = Math.hypot(cx, cy)
        const now = performance.now()

        this.nextColor.set(sample.colors)
        this.nextVisible.set(sample.visible)
        this.pendingSwaps = this.n

        for (let i = 0; i < this.n; i++) {
            const dx = this.x[i] - cx
            const dy = this.y[i] - cy
            const dist = Math.hypot(dx, dy) || 1
            const speed = strong ? 10 + Math.random() * 18 : 3 + Math.random() * 7
            const jitter = (Math.random() - 0.5) * 0.9

            this.vx[i] += (dx / dist + jitter) * speed
            this.vy[i] += (dy / dist - jitter) * speed
            this.swapAt[i] = now + (strong ? 120 : 60) + (dist / maxDist) * (strong ? 260 : 180) + Math.random() * 90
        }
        this.kick()
    }

    private sample(image: HTMLImageElement)
    {
        const off = document.createElement('canvas')
        off.width = this.cols
        off.height = this.rows
        const ctx = off.getContext('2d', { willReadFrequently: true })!

        const iw = image.naturalWidth || 3
        const ih = image.naturalHeight || 2
        const scale = Math.min(this.cols / iw, this.rows / ih)
        const dw = iw * scale
        const dh = ih * scale
        ctx.drawImage(image, (this.cols - dw) / 2, (this.rows - dh) / 2, dw, dh)

        // getImageData lanza SecurityError si la imagen no permite CORS
        const data = ctx.getImageData(0, 0, this.cols, this.rows).data
        const colors = new Uint32Array(this.n)
        const visible = new Uint8Array(this.n)
        let r = 0, g = 0, b = 0, count = 0

        for (let i = 0; i < this.n; i++) {
            const o = i * 4
            if (data[o + 3] < 128) continue
            colors[i] = (data[o] << 16) | (data[o + 1] << 8) | data[o + 2]
            visible[i] = 1
            r += data[o]; g += data[o + 1]; b += data[o + 2]; count++
        }

        const average = count
            ? `${Math.round(r / count)} ${Math.round(g / count)} ${Math.round(b / count)}`
            : '233 211 123'

        return { colors, visible, average }
    }

    private kick()
    {
        if (this.raf || this.n === 0) return
        this.lastTime = performance.now()
        this.raf = requestAnimationFrame(this.tick)
    }

    private tick = (time: number) =>
    {
        const steps = Math.min(3, Math.max(1, Math.round((time - this.lastTime) / FRAME_MS)))
        this.lastTime = time

        let motion = 0
        for (let s = 0; s < steps; s++) motion = this.step(time)
        this.draw()

        if (motion > this.n * 0.015 || this.pendingSwaps > 0) {
            this.raf = requestAnimationFrame(this.tick)
        } else {
            this.raf = 0
        }
    }

    private step(time: number)
    {
        const r2 = REPEL_RADIUS * REPEL_RADIUS
        let motion = 0

        for (let i = 0; i < this.n; i++) {
            if (this.swapAt[i] && time >= this.swapAt[i]) {
                this.color[i] = this.nextColor[i]
                this.visible[i] = this.nextVisible[i]
                this.swapAt[i] = 0
                this.pendingSwaps--
            }

            let ax = (this.hx[i] - this.x[i]) * SPRING
            let ay = (this.hy[i] - this.y[i]) * SPRING

            if (this.pointerActive) {
                const dx = this.x[i] - this.pointerX
                const dy = this.y[i] - this.pointerY
                const d2 = dx * dx + dy * dy
                if (d2 < r2 && d2 > 0.01) {
                    const d = Math.sqrt(d2)
                    const f = (1 - d / REPEL_RADIUS) * REPEL_FORCE
                    ax += (dx / d) * f
                    ay += (dy / d) * f
                }
            }

            this.vx[i] = (this.vx[i] + ax) * DAMPING
            this.vy[i] = (this.vy[i] + ay) * DAMPING
            this.x[i] += this.vx[i]
            this.y[i] += this.vy[i]
            motion += Math.abs(this.vx[i]) + Math.abs(this.vy[i])
        }

        return motion
    }

    private draw()
    {
        const { ctx, size } = this
        const half = size / 2

        ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
        ctx.clearRect(0, 0, this.width, this.height)

        for (let i = 0; i < this.n; i++) {
            if (!this.visible[i]) continue
            ctx.fillStyle = this.style(this.color[i])
            ctx.fillRect(this.x[i] - half, this.y[i] - half, size, size)
        }
    }

    private style(rgb: number)
    {
        let style = this.styles.get(rgb)
        if (!style) {
            if (this.styles.size > 4096) this.styles.clear()
            style = `rgb(${rgb >> 16} ${(rgb >> 8) & 255} ${rgb & 255})`
            this.styles.set(rgb, style)
        }
        return style
    }
}
