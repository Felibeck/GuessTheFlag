/**
 * Mosaico de partículas que dibuja una bandera en un <canvas>.
 * Cada celda de la rejilla es una partícula con un muelle hacia su posición;
 * el cursor las repele, y al cambiar de bandera estallan y se recomponen.
 *
 * Es TypeScript puro (no React). El componente <Flag> crea una instancia y le
 * va pasando órdenes: resize(), setImage(), tremble(), setPointer()...
 *
 * Cómo funciona, en cuatro pasos:
 *  1. resize(): divide el canvas en una rejilla de celdas. Cada celda es una
 *     partícula y su centro es su "casa" (hx, hy).
 *  2. sample(): dibuja la bandera en un canvas diminuto de cols x rows píxeles.
 *     Así cada píxel de ese canvas es exactamente el color de una partícula.
 *  3. step(): física de cada fotograma. Cada partícula tiene un muelle que la
 *     atrae a su casa (SPRING), rozamiento (DAMPING) y, si el cursor está
 *     cerca, una fuerza que la empuja (REPEL_*).
 *  4. draw(): pinta un cuadradito por partícula visible.
 *
 * Para no gastar batería, la animación se para sola cuando todas las
 * partículas están quietas, y se vuelve a lanzar con kick() cuando pasa algo.
 */

/**
 * Cómo entra una bandera nueva:
 * - 'assemble': las partículas vuelan desde posiciones aleatorias (primera bandera)
 * - 'soft' / 'strong': explosión suave o fuerte desde el centro y cambio de color en vuelo
 * - 'none': cambio instantáneo, sin animación
 */
export type Transition = 'assemble' | 'soft' | 'strong' | 'none'

/** Proporción de la caja donde se dibuja la bandera (ancho / alto) */
const ASPECT = 3 / 2
/** Partículas aproximadas de una bandera en los modos fácil y medio */
export const DEFAULT_PARTICLES = 5200
/** Fuerza del muelle que devuelve cada partícula a su casa (más alto = más rápido) */
const SPRING = 0.055
/** Velocidad que se conserva en cada fotograma (más bajo = frena antes) */
const DAMPING = 0.84
/** Radio en píxeles alrededor del cursor en el que las partículas se apartan */
const REPEL_RADIUS = 80
/** Intensidad del empujón del cursor */
const REPEL_FORCE = 5.5
/** Duración de un fotograma a 60 fps: sirve para que la física vaya igual en pantallas de 120 Hz */
const FRAME_MS = 1000 / 60

export class ParticleField {
    private ctx: CanvasRenderingContext2D
    /** Densidad de píxeles de la pantalla (2 en pantallas retina) */
    private dpr = 1
    /** Tamaño del canvas en píxeles CSS */
    private width = 0
    private height = 0
    /** Rejilla de partículas */
    private cols = 0
    private rows = 0
    /** Lado de cada cuadradito dibujado */
    private size = 0
    /** Número total de partículas (cols * rows) */
    private n = 0
    private targetParticles = DEFAULT_PARTICLES

    // Datos de las partículas. En vez de un array de objetos se usan arrays
    // tipados (uno por propiedad): la partícula i es x[i], y[i], vx[i]...
    // Es mucho más rápido para miles de partículas a 60 fps.
    /** Posición actual */
    private x = new Float32Array(0)
    private y = new Float32Array(0)
    /** Velocidad */
    private vx = new Float32Array(0)
    private vy = new Float32Array(0)
    /** Casa: el punto de la rejilla al que vuelve cada partícula */
    private hx = new Float32Array(0)
    private hy = new Float32Array(0)
    /** Color empaquetado en un número: 0xRRGGBB */
    private color = new Uint32Array(0)
    /** 1 si la partícula se dibuja (0 en zonas transparentes, p. ej. banderas no rectangulares) */
    private visible = new Uint8Array(0)
    /** Color y visibilidad de la bandera siguiente, aplicados a mitad de la explosión */
    private nextColor = new Uint32Array(0)
    private nextVisible = new Uint8Array(0)
    /** Momento (ms) en que cada partícula cambia al color nuevo; 0 = nada pendiente */
    private swapAt = new Float64Array(0)
    private pendingSwaps = 0

    /** Posición del cursor dentro del canvas y si está encima */
    private pointerX = 0
    private pointerY = 0
    private pointerActive = false
    /** id del requestAnimationFrame en curso; 0 = animación parada */
    private raf = 0
    /** Instante del último fotograma, para saber cuánto tiempo ha pasado */
    private lastTime = 0
    /** Última bandera recibida (imagen ya cargada) */
    private image: HTMLImageElement | null = null
    /** Animación que toca cuando haya canvas listo (si la imagen llegó antes que el tamaño) */
    private pendingTransition: Transition | null = null
    /** Caché de textos de color: evita crear un string "rgb(...)" por partícula y fotograma */
    private styles = new Map<number, string>()

    /** Avisa con el color medio de la bandera, como "r g b" (lo usa la luz de fondo) */
    onColor?: (rgb: string) => void
    /** Avisa si no se pueden leer los píxeles de la imagen (CORS) */
    onError?: () => void

    private canvas: HTMLCanvasElement
    private reducedMotion: boolean

    constructor(canvas: HTMLCanvasElement, reducedMotion: boolean)
    {
        this.canvas = canvas
        this.reducedMotion = reducedMotion
        this.ctx = canvas.getContext('2d')!
    }

    /**
     * Prepara (o rehace) la rejilla para un ancho dado. Se llama la primera vez
     * que el canvas tiene tamaño y cada vez que cambia. Crea los arrays de
     * partículas desde cero, así que se pierde cualquier animación en curso.
     */
    resize(cssWidth: number)
    {
        const width = Math.round(cssWidth)
        if (width === this.width || width <= 0) return

        this.width = width
        this.height = Math.round(width / ASPECT)
        // El canvas tiene más píxeles reales que píxeles CSS en pantallas retina;
        // se limita a 2 para no gastar memoria de más
        this.dpr = Math.min(window.devicePixelRatio || 1, 2)
        this.canvas.width = this.width * this.dpr
        this.canvas.height = this.height * this.dpr

        // Lado de cada celda: área total / nº de partículas deseado, al menos 3 px.
        // Menos partículas objetivo = celdas más grandes = bandera más pixelada.
        const cell = Math.max(3, Math.sqrt((this.width * this.height) / this.targetParticles))
        this.cols = Math.floor(this.width / cell)
        this.rows = Math.floor(this.height / cell)
        // El cuadradito es algo menor que la celda: así queda una rendija entre ellos
        this.size = Math.max(1.5, cell - Math.max(1, cell * 0.08))
        this.n = this.cols * this.rows

        // Márgenes para centrar la rejilla en el canvas (sobra algo si no encaja exacto)
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

        // Las partículas se numeran fila a fila: la de (col, row) es la nº row*cols + col.
        // Empiezan ya en su casa, es decir, con la bandera montada.
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

    /**
     * Recibe una bandera (imagen ya cargada) y la muestra con la animación pedida.
     * Si el canvas aún no tiene tamaño (n = 0), se guarda y resize() la aplicará después.
     */
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

    /** El cursor está en (x, y) dentro del canvas: las partículas cercanas se apartarán */
    setPointer(x: number, y: number)
    {
        if (this.reducedMotion) return
        this.pointerX = x
        this.pointerY = y
        this.pointerActive = true
        this.kick()
    }

    /** El cursor salió del canvas */
    clearPointer()
    {
        this.pointerActive = false
        this.kick()
    }

    /** Para la animación. Hay que llamarlo al quitar el componente */
    destroy()
    {
        cancelAnimationFrame(this.raf)
        this.raf = 0
        this.image = null
    }

    /**
     * Pone en marcha la bandera actual: lee sus colores y los anima según la transición.
     *  - sin animación (o movimiento reducido): todo directo a su sitio.
     *  - 'assemble': los colores ya son los nuevos y las partículas parten de sitios
     *    aleatorios; el muelle las lleva a casa.
     *  - 'soft'/'strong': los colores NUEVOS se guardan en nextColor y cada partícula
     *    los adopta en su momento (swapAt) mientras sale disparada del centro.
     */
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

        // Explosión desde el centro; el color cambia en pleno vuelo, en forma de onda:
        // las partículas más lejanas del centro cambian de color un poco más tarde
        const strong = transition === 'strong'
        const cx = this.width / 2
        const cy = this.height / 2
        const maxDist = Math.hypot(cx, cy)
        const now = performance.now()

        this.nextColor.set(sample.colors)
        this.nextVisible.set(sample.visible)
        this.pendingSwaps = this.n

        for (let i = 0; i < this.n; i++) {
            // Dirección desde el centro hacia la partícula (vector unitario dx/dist, dy/dist)
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

    /**
     * Convierte la imagen en una lista de colores, uno por partícula.
     * Truco: se dibuja la imagen en un canvas invisible de cols x rows píxeles,
     * de modo que cada píxel de ese canvas corresponde exactamente a una partícula.
     * Devuelve también el color medio de toda la bandera.
     */
    private sample(image: HTMLImageElement)
    {
        const off = document.createElement('canvas')
        off.width = this.cols
        off.height = this.rows
        const ctx = off.getContext('2d', { willReadFrequently: true })!

        // La imagen se escala para caber entera (sin deformarla) y se centra
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
            // data va de 4 en 4: R, G, B, A. Si el píxel es casi transparente no hay partícula
            if (data[o + 3] < 128) continue
            // Se empaquetan los tres canales en un solo número: 0xRRGGBB
            colors[i] = (data[o] << 16) | (data[o + 1] << 8) | data[o + 2]
            visible[i] = 1
            r += data[o]; g += data[o + 1]; b += data[o + 2]; count++
        }

        const average = count
            ? `${Math.round(r / count)} ${Math.round(g / count)} ${Math.round(b / count)}`
            : '233 211 123'

        return { colors, visible, average }
    }

    /** Arranca la animación si estaba parada. Si ya corre, no hace nada */
    private kick()
    {
        if (this.raf || this.n === 0) return
        this.lastTime = performance.now()
        this.raf = requestAnimationFrame(this.tick)
    }

    /**
     * Un fotograma: avanza la física, dibuja, y pide el siguiente solo si aún hay
     * movimiento (o colores pendientes de cambiar). Si todo está quieto, se para.
     * En pantallas lentas hace hasta 3 pasos de física para compensar el retraso.
     */
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

    /** Un paso de física para todas las partículas. Devuelve cuánto movimiento queda */
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

            // 1) Muelle: cuanto más lejos de casa, más fuerte tira hacia ella
            let ax = (this.hx[i] - this.x[i]) * SPRING
            let ay = (this.hy[i] - this.y[i]) * SPRING

            // 2) Cursor: si está cerca, empuja en dirección contraria; más fuerte cuanto más cerca
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

            // 3) La aceleración cambia la velocidad (con rozamiento) y la velocidad la posición
            this.vx[i] = (this.vx[i] + ax) * DAMPING
            this.vy[i] = (this.vy[i] + ay) * DAMPING
            this.x[i] += this.vx[i]
            this.y[i] += this.vy[i]
            motion += Math.abs(this.vx[i]) + Math.abs(this.vy[i])
        }

        return motion
    }

    /** Pinta todas las partículas visibles como cuadraditos de su color */
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

    /** Convierte 0xRRGGBB en "rgb(r g b)" para el canvas, guardándolo en caché */
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
