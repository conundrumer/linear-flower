/* sound test */

const audioContext = new AudioContext()
// if (audioContext.state !== 'running') {
//   window.addEventListener('click', () => {
//     audioContext.resume().then(() => {
//       console.log(audioContext.state)
//     })
//   }, { once: true })
// }
const audioPrompt = document.getElementById("audio-prompt")
const audioOn = document.getElementById("audio-on")
const audioOff = document.getElementById("audio-off")
const audioHide = document.getElementById("audio-hide")
audioOn.onclick = () => {
  audioContext.resume()
  window.removeEventListener('click', audioOn.onclick)
}
document.body.addEventListener('click', audioOn.onclick, { once: true })
audioOff.onclick = () => {
  audioContext.suspend()
  window.removeEventListener('click', audioOn.onclick)
}
audioHide.onclick = () => audioPrompt.remove()
document.addEventListener('keydown', e => e.key == "Escape" && audioPrompt.remove())
/* rest */

noise.seed(Math.random())

const PERIOD = 60
const getPeriod = () => Math.max(1/6, parameters.period) * 60
const NUM_PHASES = 6
const NUM_TURTLES = 32

const forRange = (n, cb) => {
  for (let i = 0; i < n; i++) {
    cb(i)
  }
}
const array = (n, cb) => Array(n).fill().map((_, i) => cb(i))
const lerp = (a,b,k) => a + k * (b - a)
const ilerp = (a,b,k) => lerp(a, b + 1, k) | 0
const unit = (a,b,x) => (x - a) / (b - a)
const inv = (f, y) => (x, k) => (
  !k ? x : (
    y = f(k>0 ? x : 1-x, Math.abs(k)),
    k>0 ? y : 1-y
  )
)
const exp = inv((x, k) => x * Math.exp((x - 1) * k))
const log = inv((x, k) => Math.log(lerp(Math.exp(-k), 1, x)) / k + 1)
const logCompress = inv((x, k) => Math.log(1 + Math.abs(k) * x) / Math.abs(k))
const smoothMin = (x, y, k) => -Math.log(Math.exp(-k*x)+Math.exp(-k*y))/k

const softEnds = (x, x0) => {
  if (x0 === 0) return x
  const a = 2 / (2 - x0)
  const b = a * a / 4 / (a - 1)
  const x1 = 1 - M.abs(2 * x - 1)
  let y
  if (x1 < x0) {
    y = b * x1 * x1
  } else {
    y = a * (x1 - 1) + 1
  }
  y /= 2
  const out = x < 0.5 ? y : 1-y
  return out
}

if (!localStorage.parameters) {
  localStorage.parameters = JSON.stringify({
    phase: 0,
    test: false,
    x: 0,
    y: 0,
    zoom: -0.5,
    rotation: 0,
    keystoneX: 0,
    keystoneY: 0,
    distance: 0,
    offsetY: 0,
    flipSound: false,
    period: 2,
  })
}
let parameters = JSON.parse(localStorage.parameters)
window.onstorage = () => {
  parameters = JSON.parse(localStorage.parameters)
  updateParams()
};

class LinearFlower {
  static faces = [
    [[0,0],[0,1],[1,1],[1,0]],
    [[1,0],[1,1],[2,1],[2,0]],
    [[2,0],[2,1],[4,1],[4,0]],
    [[4,0],[4,1],[5,1],[5,0]],
    [[0,1],[0,2],[1,2],[1,1]],
    [[1,1],[1,2],[2,2]],
    [[1,1],[2,2],[2,1]],
    [[2,1],[2,2],[3,2]],
    [[2,1],[3,2],[4,1]],
    [[4,1],[3,2],[4,2]],
    [[4,1],[4,2],[5,1]],
    [[5,1],[4,2],[5,2]],
    [[0,2],[0,4],[1,4],[1,2]],
    [[1,2],[1,4],[2,3]],
    [[1,2],[2,3],[2,2]],
    [[2,2],[2,3],[3,2]],
    [[3,2],[2,3],[3,4],[4,3]],
    [[3,2],[4,3],[4,2]],
    [[4,2],[4,3],[5,2]],
    [[5,2],[4,3],[5,4]],
    [[2,3],[1,4],[2,4]],
    [[2,3],[2,4],[3,4]],
    [[4,3],[3,4],[4,4]],
    [[4,3],[4,4],[5,4]],
    [[0,4],[0,5],[1,5],[1,4]],
    [[1,4],[1,5],[2,4]],
    [[2,4],[1,5],[2,5]],
    [[2,4],[2,5],[3,4]],
    [[3,4],[2,5],[4,5]],
    [[3,4],[4,5],[4,4]],
    [[4,4],[4,5],[5,5]],
    [[4,4],[5,5],[5,4]],
  ]

  constructor(mrows = 6, mcols = 6) {
    this.mrows = mrows
    this.mcols = mcols
    this.rows = mrows * 5 + 2
    this.cols = mcols * 5 + 2

    this.flatShape = this.genShape(1)

    this.faces = []
    this.indices = []
    this.indicesWithShadow = []

    for (let mi = 0; mi <= mrows; mi++) {
      for (let mj = 0; mj <= mcols; mj++) {
        const j0 = mj * 5
        const i0 = mi * 5

        LinearFlower.faces.forEach((face, index) => {
          let is = []
          let vs = []
          for (let v of face) {
            const j = v[0] + j0
            const i = v[1] + i0
            if (i >= this.rows || j >= this.cols) return

            const index = i * this.rows + j
            is.push(index)
            vs.push(this.flatShape.vs[index])
          }

          vs.index = index
          vs.row = mi
          vs.col = mj
          vs.x = vs.reduce((a, [x, y]) => a + x, 0) / vs.length / this.flatShape.w
          vs.y = vs.reduce((a, [x, y]) => a + y, 0) / vs.length / this.flatShape.h
          const hasShadow = index !== 0 && index !== 16
          this.faces.push(vs)
          if (is.length === 3) {
            this.indicesWithShadow.push(hasShadow, hasShadow, hasShadow)
            this.indices.push(...is)
          } else {
            const [a, b, c, d] = is
            this.indices.push(a, b, c)
            this.indices.push(a, c, d)
            this.indicesWithShadow.push(hasShadow, hasShadow, hasShadow, hasShadow, hasShadow, hasShadow)
          }
        })
      }
    }

    this.indexToFace = {}
    for (let face of this.faces) {
      const {index, row, col} = face
      this.indexToFace[`${index}-${row}-${col}`] = face
    }
  }
  genShape(m = 1 - (8 + 3 * Math.SQRT2) / 8.5 * (8.5 - 7.75) / 4) {
    const mrows = this.mrows
    const mcols = this.mcols
    const rows = this.rows
    const cols = this.cols
    const a = 1
    const b = Math.SQRT2
    const c = 2

    const mr = b + c + 2 * m
    const w = mcols * mr + b
    const h = mrows * mr + b

    const z1 = Math.sqrt(1 - m * m)
    const d = Math.SQRT2 * m + b/2
    const heronArea = (a, b, c) => Math.sqrt(
      (a + (b + c)) *
      (c - (a - b)) *
      (c + (a - b)) *
      (a + (b - c))
    ) / 4
    const z2 = heronArea(d, b, b/2) * 2 / d
    const dxy = Math.sqrt(2 - z2 * z2) / Math.SQRT2 - m

    const offsets = [
      0,
      b,
      b + m,
      b + m + 1,
      b + m + 2
    ]
    const getOffset = i => offsets[i]

    const vs = []

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const mj = j % 5
        const mi = i % 5
        let x = Math.floor(j / 5) * mr + getOffset(mj)
        let y = Math.floor(i / 5) * mr + getOffset(mi)

        let z = 0
        if (m < 1) {
          const mk = mj + mi * 6
          switch (mk) {
            case 0:
            case 1:
            case 6:
            case 7:
            case 15:
            case 20:
            case 22:
            case 27:
              z = z1
              break
            case 14:
            case 16:
            case 26:
            case 28:
              z = z1 - z2
          }
          if (mk === 14) {
            x += dxy
            y += dxy
          }
          if (mk === 16) {
            x -= dxy
            y += dxy
          }
          if (mk === 26) {
            x += dxy
            y -= dxy
          }
          if (mk === 28) {
            x -= dxy
            y -= dxy
          }
        }

        const vert = [x, y, z]
        vs.push(vert)
      }
    }

    return {vs, w, h}
  }

  getCoords(index, row, col) {
    return this.indexToFace[`${index}-${row}-${col}`]
  }
}

const cellBack = [2, 12]
const cellFront = [0, 16]
const cellRows = [0, 1, 2, 3]
const cellCols = [0, 4, 12, 24]
const cellFlower = [7,8,9,17,18,19,23,22,29,28,27,21,20,13,14,15]
const cellRing = [1,6,5,4,11,10,3,30,31,24,25,26]
const cellRingDeltas = [
  [0,0],
  [0,0],
  [0,0],
  [0,0],
  [1,0],
  [1,0],
  [1,0],
  [1,1],
  [1,1],
  [0,1],
  [0,1],
  [0,1],
]
const cellGraph = {
  1: { D: 6, U: 26 },
  3: { D: 10, U: 30 },
  4: { R: 5, L: 11 },
  5: { X: 6, D: 14, L: 4 },
  6: { X: 5, R: 7, U: 1 },
  7: { X: 8, D: 15, L: 6 },
  8: { R: 9, L: 7 },
  9: { X: 8, R: 10, D: 17 },
  10: { X: 11, L: 9, U: 3 },
  11: { X: 10, R: 4, D: 18 },
  13: { D: 20, U: 14 },
  14: { D: 13, R: 15, U: 5 },
  15: { L: 14, U: 7 },
  17: { R: 18, U: 9 },
  18: { D: 19, L: 17, U: 11 },
  19: { D: 23, U: 18 },
  20: { R: 21, D: 25, U: 13 },
  21: { D: 27, L: 20 },
  22: { R: 23, D: 29 },
  23: { D: 31, L: 22, U: 19 },
  24: { R: 25, L: 31 },
  25: { X: 26, L: 24, U: 20 },
  26: { X: 25, R: 27, D: 1 },
  27: { R: 28, L: 26, U: 21 },
  28: { R: 29, L: 27 },
  29: { R: 30, L: 28, U: 22 },
  30: { X: 31, D: 3, L: 29 },
  31: { X: 30, R: 24, U: 23 }
}
function getCellGraphCrossing(a, b) {
  if ((a === 1 && b === 26) || (a === 3 && b === 30)) return [0, -1]
  if ((a === 26 && b === 1) || (a === 30 && b === 3)) return [0, 1]
  if ((a === 4 && b === 11) || (a === 24 && b === 31)) return [-1, 0]
  if ((a === 11 && b === 4) || (a === 31 && b === 24)) return [1, 0]
  return [0, 0]
}
class CellGraph {
  constructor(rows, cols, numTurtles) {
    this.rows = rows
    this.cols = cols
    this.modules = array(rows, () => array(cols, () => array(LinearFlower.faces.length, () => 0)))
    this.modules.forEach(row => row.push(row[0]))
    this.modules.push(this.modules[0])
    this.turtles = array(numTurtles, i => ({
      module: [0, 0],
      index: 1,
      prevIndex: 26,
      dir: "D",
      counter: 0,
      period: lerp(1.5, 3, Math.random()),
      twistiness: lerp(0, 0.8, Math.random())
    }))
    this.numTurtles = numTurtles
  }
  update(t, onStep) {
    forRange(this.numTurtles, j => {
      const turtle = this.turtles[j]
      if (turtle.counter <= 0) {
        const adjacent = cellGraph[turtle.index]
        let nextIndex = adjacent[turtle.dir] || adjacent.X
        if (turtle.dir === "X" || !nextIndex || Math.random() < turtle.twistiness) {
          const a = Object.entries(adjacent).filter(([dir, i]) => i !== turtle.prevIndex)
          const [dir, i] = a[ilerp(0, a.length - 1, Math.random())]
          turtle.dir = dir
          nextIndex = i

          if (onStep) {
            onStep(j, turtle.index, turtle.module[0], turtle.module[1], true)
          }
        }
        const [dx, dy] = getCellGraphCrossing(turtle.index, nextIndex)
        const [row, col] = turtle.module
        const nextRow = (row + dy + this.rows) % this.rows
        const nextCol = (col + dx + this.cols) % this.cols
        this.modules[nextRow][nextCol][nextIndex] = t
        turtle.prevIndex = turtle.index
        turtle.index = nextIndex
        turtle.module = [nextRow, nextCol]
        turtle.counter = (turtle.period | 0) + (Math.random() < (turtle.period % 1) ? 1 : 0)

        if (onStep) {
          onStep(j, nextIndex, nextRow, nextCol, false)
        }
      } else {
        turtle.counter--
      }
    })
  }
}
class Pattern {
  constructor(linearFlower, pointLight, ambientLight, synth) {
    this.linearFlower = linearFlower
    this.pointLight = pointLight
    this.ambientLight = ambientLight
    this.synth = synth
    this.canvas = document.createElement("canvas")
    this.canvas.width = 1024
    this.canvas.height = 1024

    this.canvas2 = this.canvas.cloneNode()
    this.canvas3 = this.canvas.cloneNode()

    this.graph = new CellGraph(linearFlower.mrows, linearFlower.mcols, NUM_TURTLES)
  }
  drawFaces(canvas, cb) {
    const ctx = canvas.getContext('2d')
    for (let face of this.linearFlower.faces) {
      const draw = cb(face.index, face.row, face.col, face.x, face.y)
      if (draw) {
        const [first, ...rest] = face
        ctx.beginPath()
        ctx.moveTo(
          first[0] / this.linearFlower.flatShape.w * canvas.width,
          first[1] / this.linearFlower.flatShape.h * canvas.height
        )
        for (let [x, y] of rest) {
          ctx.lineTo(
            x / this.linearFlower.flatShape.w * canvas.width,
            y / this.linearFlower.flatShape.h * canvas.height
          )
        }
        if (draw & 1) {
          ctx.fill()
        }
        if (draw & 2) {
          ctx.closePath()
          ctx.stroke()
        }
      }
    }
  }
  setPointLightIntensity(k) {
    this.pointLight.intensity = k
    this.ambientLight.intensity = 1 - k
  }
  fill(color = "white", canvas) {
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = color
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }
  drawPhase(t, phase, canvas) {
    const deltaT = this.prevT ? Math.max(1/60, Math.min(5/60, Math.abs(t - this.prevT))) : 0

    const ctx = canvas.getContext('2d')
    this.fill("black", canvas)
    ctx.save()
    switch (phase) {
      case 0:
        this.fill("white", canvas)

        // shadows
        // this.drawFaces(canvas, (index, row, col, x, y) => {
        //   ctx.fillStyle = "white"
        //   if (index === 0 || cellRing.includes(index)) {
        //     ctx.fillStyle = "#CCF"
        //   }
        //   if (index === 16 || cellFlower.includes(index)) {
        //     ctx.fillStyle = "#FCC"
        //   }
        //   return 1
        // })
        break
      case 1:
        // rectangle waves
        this.drawFaces(canvas, (index, row, col, x, y) => {
          // 2: h, 12: v
          if (cellBack.includes(index)) {
            const rgb = [-1, 0, 1].map(dt => 255 * exp(1 - Math.abs(noise.simplex3(1 * x, 1 * y, t / 3 + dt / 20)), 3))
            ctx.fillStyle = `rgb(${rgb.join(",")})`

            const delta = Math.abs((rgb[0] - rgb[2]) / 255)
            const a = rgb[1] / 255 * delta
            if (this.synth && this.synth.updateWave) {
              this.synth.updateWave(index, row, col, a)
            }
            // console.log(row, col, index)
            return 1
          }
        })
        break
      case 2:
        // ring phasing
        this.drawFaces(canvas, (index, row, col, x, y) => {
          if (cellFlower.includes(index)) {
            const I = (6 * col + row) / 35
            const i = cellFlower.indexOf(index)
            const k = i / (cellFlower.length - 1) + t * lerp(0.2, 0.7, I)
            const a = exp(0.5 + 0.5 * Math.cos(2 * Math.PI * k), 3)
            ctx.fillStyle = `rgb(${240*a**2},${240*a**2},${255*a})`
            return 1
          }
          if (cellRing.includes(index)) {
            const i = cellRing.indexOf(index)
            const [dx, dy] = cellRingDeltas[i]
            const I = (6 * (row + dy) + (col + dx)) / 35
            const k = i / (cellRing.length - 1) + t * lerp(0.1, 0.5, I) + 1/4
            const a = exp(0.5 + 0.5 * Math.cos(2 * Math.PI * k), 3)
            ctx.fillStyle = `rgb(${255*a},${240*a**2},${240*a**2})`
            return 1
          }
        })
        if (this.synth && this.synth.updateRotors) {
          this.synth.updateRotors(t)
        }
        break
      case 3:
        // wireframe waves
        ctx.globalCompositeOperation = "lighter"
        // if (this.synth.cancelWire && deltaT > 0) {
        //   this.synth.cancelWire()
        // }
        this.drawFaces(canvas, (index, row, col, x, y) => {
          // if (!(row == 0 && col == 0)) return
          const a = noise.simplex3(2 * x, 2 * y, t / 5)
          const prevA = noise.simplex3(2 * x, 2 * y, (t - deltaT) / 5)
          const b = Math.abs(a)
          const c = 255 * log(1 - b, -8)
          const kr = exp(1 - (a < 0 ? -a : 0), 0)
          const kb = exp(1 - (a > 0 ? a : 0), 0)
          const rgb = [
            c * kb,
            c * kb * kr,
            c * kr
          ]
          ctx.strokeStyle = `rgb(${rgb.join(",")})`
          ctx.lineWidth = 4


          if (this.synth && this.synth.triggerWire) {
            if (Math.sign(a) != Math.sign(prevA)) {
              const k = a / (a - prevA) * 1/60 / deltaT
              this.synth.triggerWire(deltaT * k, Math.abs(a - prevA), row, col)
            }
          }

          return 2
        })
        break
      case 4:
        // rows/cols phasing
        this.drawFaces(canvas, (index, row, col, x, y) => {
          const isRow = cellRows.includes(index)
          const isCol = cellCols.includes(index)
          let rgb = [0,0,0]
          if (isRow) {
            const f = t => exp(0.5 + 0.5 * Math.cos(lerp(1,2,y) * 2 * Math.PI * (x - (row % 2 ? 1 : -1) * t/3)), 10)
            rgb = [-1, 0, 1].map(dt => 255 * f(t + dt / 15))
          }
          if (isCol) {
            const f = t => exp(0.5 + 0.5 * Math.cos(lerp(1,2,x) * 2 * Math.PI * (y - (col % 2 ? 1 : -1) * t/4)), 10)
            rgb = [-1, 0, 1].map((dt, i) => Math.max(rgb[i], 255 * f(t + dt / 15)))
          }
          if (isRow || isCol) {
            ctx.fillStyle = `rgb(${rgb.join(",")})`
            return 1
          }
        })
        if (this.synth && this.synth.updateLines) {
          this.synth.updateLines(t)
        }
        break
      case 5:
        let onStep
        if (this.synth && this.synth.triggerTurtle) {
          onStep = (i, index, row, col, turn) => {
            const {x, y} = this.linearFlower.getCoords(index, row, col)
            this.synth.triggerTurtle(turn, x, y, i, deltaT * Math.random())
          }
        }
        const k = (t / getPeriod()) % 1
        this.graph.numTurtles = lerp(1, NUM_TURTLES, 1 - lerp(-1, 1, k) ** 2) | 0
        console.log(this.graph.numTurtles)
        this.graph.update(t, onStep)
        ctx.globalCompositeOperation = "lighter"
        this.drawFaces(canvas, (index, row, col, x, y) => {
          const dt = t - this.graph.modules[row][col][index]
          const T = 1
          if (dt < T) {
            const a = Math.max(0, T - dt * 4) / T
            const b = (T - dt) / T
            const p = 2.5
            ctx.fillStyle = `rgb(${255*a**p},${255*a**p},${255*a})`
            ctx.strokeStyle = `rgb(${255*b},${255*b**2.2},${255*b**p})`
            return 3
          }
        })
        break
    }
    ctx.restore()
  }
  draw(t) {
    const fadeSpeed = 1/5
    let phase = Math.floor(t / getPeriod()) % NUM_PHASES
    const k = t % getPeriod()
    const fadeIn = Math.min(1, k * fadeSpeed)
    const fadeOut = Math.max(0, 1 - k * fadeSpeed)

    if (phase === 0) {
      this.setPointLightIntensity(exp(fadeIn, -3))
    } else if (phase === 1) {
      this.setPointLightIntensity(exp(fadeOut, -3))
    } else {
      this.setPointLightIntensity(0)
    }

    // phase = 5
    // if (this.synth) {
    //   this.synth.setMix(t, phase, 0)
    // }

    // this.drawPhase(t,phase, this.canvas)
    // this.setPointLightIntensity(0)

    // this.prevT = t

    // return

    this.drawPhase(t, phase, this.canvas)
    if (fadeOut > 0) {
      this.drawPhase(t, (NUM_PHASES + phase - 1) % NUM_PHASES, this.canvas2)
      const ctx = this.canvas.getContext('2d')
      ctx.save()
      ctx.globalAlpha = fadeOut
      ctx.drawImage(this.canvas2, 0, 0)
      ctx.restore()
    }

    if (this.synth) {
      this.synth.setMix(t, phase, fadeOut)
    }

    this.prevT = t
  }
  drawTest(t) {
    this.fill("white", this.canvas)
    this.setPointLightIntensity(1)

    if (this.synth) {
      this.synth.setMix(t, 0)
    }
  }
}

class Synth {
  /**
   * @param {AudioContext} ctx
   */
  constructor(ctx) {
    this.ctx = ctx

    this.limiter = this.ctx.createDynamicsCompressor()
    this.limiter.connect(this.ctx.destination)

    // setTimeout(() => {
    //   this.limiter.disconnect()
    //   setTimeout(() => {
    //     this.limiter.connect(this.ctx.destination)
    //   }, 2000)
    // }, 2000)

    /* noise source */
    {
      this.noises = array(6, () => {
        var bufferSize = 2 * audioContext.sampleRate,
        noiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate),
        output = noiseBuffer.getChannelData(0);
        for (var i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        var whiteNoise = audioContext.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;
        whiteNoise.start(0);

        return whiteNoise
      })
    }

    this.mixes = [
      this.initShadow(),
      this.initWaves(),
      this.initRotors(),
      this.initWires(),
      this.initLines(),
      this.initTurtles()
    ]
    for (let mix of this.mixes) {
      mix.gain.setValueAtTime(0, 0)
    }
    this.currentPhase = -1
    this.prevPhase = -1
  }
  setMix(t, phase, fadeOut) {
    if (fadeOut === 0 && this.currentPhase !== -1) {
      this.mixes[this.currentPhase].gain.setTargetAtTime(1, 0, 1/60)
    }
    if (fadeOut === 0 && this.prevPhase !== -1 && this.currentPhase !== this.prevPhase) {
      // this.mixes[this.prevPhase].gain.setValueAtTime(0, 0)
      this.mixes[this.prevPhase].disconnect()
      // console.log('disconnecting prev', this.prevPhase)
      this.prevPhase = -1
    }
    if (phase !== this.currentPhase) {
      if (this.currentPhase !== -1) {
        // this.mixes[this.currentPhase].gain.setValueAtTime(0, 0)
        this.mixes[this.currentPhase].disconnect()
        // console.log('disconnecting current', this.currentPhase)
      }
      this.mixes[phase].connect(this.limiter)
      // console.log('connecting current', phase)
      // this.mixes[phase].gain.setValueAtTime(0, 0)
      this.currentPhase = phase
    }
    if (fadeOut > 0 && this.prevPhase === -1) {
      this.prevPhase = (NUM_PHASES + phase - 1) % NUM_PHASES
      this.mixes[this.prevPhase].connect(this.limiter)
      // console.log('connecting prev', this.prevPhase)

      // this.mixes[this.prevPhase].gain.setValueAtTime(0, 0)
    }
    if (fadeOut > 0) {
      this.mixes[this.currentPhase].gain.setTargetAtTime(1 - fadeOut, 0, 1/60)
      this.mixes[this.prevPhase].gain.setTargetAtTime(fadeOut, 0, 1/60)
    }
  }
  initShadow() {
    function makeDistortionCurve(amount) {
      const k = typeof amount === 'number' ? amount : 50,
        n_samples = 44100,
        curve = new Float32Array(n_samples),
        deg = Math.PI / 180;

      let x;
      for (let i = 0 ; i < n_samples; ++i ) {
        x = i * 2 / n_samples - 1;
        curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
      }
      return curve;
    };

    const oscHi = this.ctx.createOscillator()
    const oscHiV = this.ctx.createOscillator()
    const oscLo = this.ctx.createOscillator()
    const oscLoV = this.ctx.createOscillator()
    const gHi = this.ctx.createGain()
    const gHiV = this.ctx.createGain()
    const gLo = this.ctx.createGain()
    const gLoV = this.ctx.createGain()
    const g3 = this.ctx.createGain()
    const distortion = this.ctx.createWaveShaper()
    const filterPre = this.ctx.createBiquadFilter()
    const filterPost = this.ctx.createBiquadFilter()
    distortion.curve = makeDistortionCurve(400);
    // distortion.oversample = '2x';
    filterPre.type = "lowpass"
    filterPre.Q.setValueAtTime(1, 0)
    filterPre.frequency.setValueAtTime(800, 0)
    filterPost.type = "lowpass"
    filterPost.Q.setValueAtTime(0, 0)
    filterPost.frequency.setValueAtTime(600, 0)


    // const gn = this.ctx.createGain()
    // gn.gain.setValueAtTime(0.1, 0)
    // this.noise.connect(gn)

    // const fn = this.ctx.createBiquadFilter()
    // fn.type = "highpass"
    // fn.Q.setValueAtTime(0.3, 0)
    // fn.frequency.setValueAtTime(2000, 0)
    // gn.connect(fn)

    const pan = this.ctx.createStereoPanner()
    oscHi.connect(gHi)
    oscLo.connect(gLo)
    oscHiV.connect(gHiV)
    gHiV.connect(gHi)
    oscLoV.connect(gLoV)
    gLoV.connect(gLo)
    // fn.connect(filterPre)
    gHi.connect(filterPre)
    gLo.connect(filterPre)
    filterPre.connect(distortion)
    distortion.connect(filterPost)
    filterPost.connect(pan)
    pan.connect(g3)

    oscHi.start()
    oscLo.start()
    oscHiV.start()
    oscLoV.start()
    gHi.gain.setValueAtTime(0, 0)
    gLo.gain.setValueAtTime(0, 0)
    gHiV.gain.setValueAtTime(0.15, 0)
    gLoV.gain.setValueAtTime(0.15, 0)

    // g2.gain.setValueAtTime(0, 0)
    oscHi.frequency.setValueAtTime(55 * 5/4 * 3, 0)
    oscHiV.frequency.setValueAtTime(55 * 5/4 * 3, 0)
    oscLo.frequency.setValueAtTime(55 * 5/4 * 2, 0)
    oscLoV.frequency.setValueAtTime(55 * 5/4 * 2, 0)
    oscHiV.detune.setValueAtTime(7, 0)
    oscLoV.detune.setValueAtTime(13, 0)

    const shadowGain1 = gHi.gain
    const shadowGain2 = gLo.gain
    const shadowPan = pan.pan

    this.updateShadow = (x, y, delta) => {
      x *= 0.25
      y = unit(-5, 5, y)
      if (parameters.flipSound) {
        y = 1 - y
      }
      const g = lerp(0.003, 1, (delta * 5) ** 3)
      const p = x * (parameters.flipSound ? -1 : 1)
      shadowGain1.setTargetAtTime(g * y, 0, 1/60)
      shadowGain2.setTargetAtTime(g * (1 - y), 0, 1/60)
      shadowPan.setTargetAtTime(p, 0, 1/60)
    }

    return g3
  }
  initWaves() {
    const freqs = [
      31,
      29,
      27,
      24,
      22,
      19,
      17,
      15,
      12,
      10,
      7,
      3,
      0,
    ].map(n => 2 ** (n / 12) * 110 * 5/4)

    const mix = this.ctx.createGain()

    /** @type {AudioParam[][]} */
    const waveNodes = array(13, i => {
      const odd = i & 1
      const maxJ = odd ? 7 : 6
      return array(maxJ, j => {
        const osc = this.ctx.createOscillator()
        // osc.type = "triangle"
        osc.frequency.setValueAtTime(freqs[i], 0)
        osc.detune.setValueAtTime(lerp(-15, 15, unit(0, maxJ - 1, j)), 0)
        osc.start()

        const g = this.ctx.createGain()
        g.gain.setValueAtTime(0, 0)

        const p = this.ctx.createStereoPanner()

        p.pan.setValueAtTime(lerp(-1, 1, (odd ? j : (j + 0.5)) / 6), 0)

        osc.connect(g)
        g.connect(p)
        p.connect(mix)

        return g.gain
      })
    })

    this.updateWave = (index, row, col, a) => {
      a *= 0.2

      let i = 2 * row + (index == 12 ? 1 : 0)
      let j = col
      if (parameters.flipSound) {
        i = 12 - i
        j = ((i % 2 == 0) ? 5 : 6) - j
      }
      const pitchHeight =  unit(0, 12, i)
      waveNodes[i][j].setTargetAtTime(a * lerp(0.4, 1, pitchHeight), 0, 1/60)
    }

    return mix
  }
  initWires() {
    const mix = this.ctx.createGain()
    let cabinet

    {
      const ks = [
      {b: [0.998427797774257, -1.996855595548515, 0.998427797774258],
      a: [1.000000000000000, -1.996729031901556, 0.996982159195472]},

      {b: [1.71381752013609, -3.59123502602204, 1.89042101128582],
      a: [1.000000000000000, -1.946518614625237, 0.959522120025104]},

      // {b: [2.44712046192491, -5.07920063666641, 2.71162250478877],
      // a: [1.000000000000000, -1.847874331025749, 0.92741666107301]},

      // {b: [0.0744394809810769, 0.1488789619621539, 0.0744394809810770],
      // a: [1.000000000000000, -1.433046457023383, 0.730804380947690]},
      ]
      const filters = array(ks.length, i => this.ctx.createIIRFilter(ks[i].b, ks[i].a))
      for (let i = 0; i < ks.length-1; i++) {
        filters[i].connect(filters[i+1])
      }
      filters[ks.length-1].connect(mix)
      cabinet = filters[0]
    }

    const mainFilter = this.ctx.createBiquadFilter()
    mainFilter.type = "lowpass"
    mainFilter.frequency.setValueAtTime(10000, 0)
    mainFilter.Q.setValueAtTime(0.1, 0)

    const f2 = this.ctx.createBiquadFilter()
    f2.type = "peaking"
    f2.frequency.setValueAtTime(5000, 0)
    f2.gain.setValueAtTime(-18, 0)

    // mainFilter.connect(cabinet)
    // cabinet.connect(mix)
    // cabinet.connect(f2)
    mainFilter.connect(f2)
    f2.connect(mix)
    // mainFilter.connect(mix)

    const pans = array(6, i => {
      const pan = this.ctx.createStereoPanner()
      pan.pan.setValueAtTime(lerp(-1, 1, i/5), 0)

      this.noises[i].connect(pan)

      return pan
    })
    const filters = array(6, i => {
      const freq = lerp(16000, 8000, exp(i/5, -0.5))
      console.log(freq)

      const filter = this.ctx.createBiquadFilter()
      filter.type = "bandpass"
      filter.frequency.setValueAtTime(freq, 0)
      filter.Q.setValueAtTime(0.6, 0)
      filter.connect(mainFilter)

      return filter
    })
    const gains = array(6, i => {
      return array(6, j => {
        const g = this.ctx.createGain()
        g.gain.setValueAtTime(0, 0)

        pans[j].connect(g)
        g.connect(filters[i])

        return g
      })
    })
    this.triggerWire = (t, a, row, col) => {
      // if (!this.cancelWire && this.ctx.state == "running") {
      //   this.cancelWire = () => {
      //     for (let row of gains) {
      //       for (let g of row) {
      //         g.gain.cancelScheduledValues(0)
      //       }
      //     }
      //   }
      // }
      row = Math.min(5, row)
      col = Math.min(5, col)
      if (a < 1e-3) return

      if (parameters.flipSound) {
        row = 5 - row
        col = 5 - col
      }
      // a *= lerp(0.3, 1, unit(0, 5, row))
      a = Math.min(1, 60 * a)

      const time = this.ctx.currentTime + t
      const g = gains[row][col]
      const attack = 2e-3
      const decay = 1e-2
      g.gain.setTargetAtTime(a, time, attack)
      g.gain.setTargetAtTime(0, time + attack, decay)
    }


    // this.noise.connect(g)

    // const osc = this.ctx.createOscillator()
    // osc.start()
    // osc.connect(g)

    return mix
  }
  initTurtles() {
    const mix = this.ctx.createGain()

    const mainFilter = this.ctx.createBiquadFilter()
    mainFilter.type = "lowpass"
    mainFilter.frequency.setValueAtTime(10000, 0)
    mainFilter.Q.setValueAtTime(0.1, 0)

    const f2 = this.ctx.createBiquadFilter()
    f2.type = "peaking"
    f2.frequency.setValueAtTime(5000, 0)
    f2.gain.setValueAtTime(-18, 0)

    mainFilter.connect(f2)
    f2.connect(mix)

    const turtles = array(NUM_TURTLES, i => {
      return array(1, j => {
        const noise = this.noises[i % this.noises.length]

        const g = this.ctx.createGain()
        g.gain.setValueAtTime(0, 0)

        const p = this.ctx.createStereoPanner()

        const filter = this.ctx.createBiquadFilter()
        filter.type = "bandpass"
        filter.Q.setValueAtTime(j == 0 ? 3 : 20, 0)

        noise.connect(g)
        g.connect(p)
        p.connect(filter)
        filter.connect(mainFilter)

        return {
          gain: g.gain,
          freq: filter.frequency,
          pan: p.pan
        }
      })
    })
    this.triggerTurtle = (isTurn, x, y, i, t) => {
      if (isTurn) return
      if (parameters.flipSound) {
        x = 1-x
        y = 1-y
      }
      const time = this.ctx.currentTime + t

      const turtle = turtles[i][isTurn ? 1 : 0]
      if (!turtle) debugger

      const a = 20 / NUM_TURTLES
      const f = lerp(8000, 1000, exp(y + Math.random() * 1e-2, -1))
      const p = lerp(-1, 1, x)

      const attack = 1e-3
      const decay = isTurn ? 0.05 : 1.3e-2
      turtle.gain.setTargetAtTime(a, time, attack)
      turtle.gain.setTargetAtTime(0, time + attack, decay)
      turtle.freq.setValueAtTime(f, 0)
      turtle.pan.setValueAtTime(p, 0)
    }

    return mix
  }
  initRotors() {
    const mix = this.ctx.createGain()
    const volume = this.ctx.createGain()
    volume.gain.setValueAtTime(1/36 * 2.5, 0)

    const mainFilter = this.ctx.createBiquadFilter()
    mainFilter.type = "lowpass"
    mainFilter.frequency.setValueAtTime(2000, 0)
    mainFilter.Q.setValueAtTime(0.5, 0)

    mainFilter.connect(volume)
    volume.connect(mix)

    const filters = array(6, i => {
      const freq = lerp(1000, 110 * 3/2, exp(i/5, -0.5))
      console.log(freq)

      const filter = this.ctx.createBiquadFilter()
      filter.type = "bandpass"
      filter.frequency.setValueAtTime(freq, 0)
      filter.Q.setValueAtTime(1.5, 0)
      filter.connect(mainFilter)

      return filter
    })
    const detunes = array(6, i => {
      return array(6, j => {
        const osc1 = this.ctx.createOscillator()
        const osc2 = this.ctx.createOscillator()
        osc1.type = "square"
        osc2.type = "square"
        osc1.frequency.setValueAtTime(110 * 3/2 * 3/2, 0)
        osc2.frequency.setValueAtTime(110 * 3/2, 0)
        osc1.start()
        osc2.start()

        const pan = this.ctx.createStereoPanner()
        pan.pan.setValueAtTime(lerp(-1, 1, i/5), 0)

        osc1.connect(pan)
        osc2.connect(pan)
        pan.connect(filters[j])

        return [osc1.detune, osc2.detune]
      })
    })
    this.updateRotors = t => {
      forRange(6, i => {
        forRange(6, j => {
          if (parameters.flipSound) {
            i = 5 - i
            j - 5 - j
          }
          const I = (6 * j + i) / 35
          let p1 = Math.cos(2 * Math.PI * t * lerp(0.2, 0.7, I))
          let p2 = Math.cos(2 * Math.PI * (t * lerp(0.1, 0.5, I)))
          const k = -0.7
          p1 = Math.sign(p1) * exp(Math.abs(p1), k)
          p2 = Math.sign(p2) * exp(Math.abs(p2), k)

          detunes[i][j][0].setTargetAtTime(p1 * 100 + 100, 0, 1/60)
          detunes[i][j][1].setTargetAtTime(p2 * 100 + 100, 0, 1/60)
        })
      })
    }

    return mix
  }
  initLines() {
    const F = 55 * 4/5
    const mix = this.ctx.createGain()
    const volume = this.ctx.createGain()
    volume.gain.setValueAtTime(1/28 * 3, 0)
    volume.connect(mix)

    const mainOsc = this.ctx.createOscillator()
    mainOsc.type = "sawtooth"
    mainOsc.frequency.setValueAtTime(F, 0)
    mainOsc.start()

    const N = 7
    const rows = array(N, i => {

      return array(2, j => {
        const osc = this.ctx.createOscillator()
        osc.type = j == 0 ? "sawtooth" : "triangle"
        const freq = (9 - i) * F
        osc.frequency.setValueAtTime(freq, 0)
        osc.start()

        const pan = this.ctx.createStereoPanner()
        const gain = this.ctx.createGain()
        gain.gain.setValueAtTime(0, 0)

        osc.connect(pan)
        pan.connect(gain)

        if (j == 0) {
          const filter = this.ctx.createBiquadFilter()
          filter.frequency.setValueAtTime(freq * 2, 0)
          gain.connect(filter)
          filter.connect(volume)
        } else {
          gain.connect(volume)
        }

        return {pan: pan.pan, gain: gain.gain}
      })
    })
    const cols = array(N, i => {
      const pan = this.ctx.createStereoPanner()
      pan.pan.setValueAtTime(lerp(-1, 1, i / (N - 1)), 0)

      pan.connect(volume)
      return array(2, j => {

        const gain = this.ctx.createGain()
        gain.gain.setValueAtTime(0, 0)

        const filter = this.ctx.createBiquadFilter()
        filter.type = "bandpass"
        filter.Q.setValueAtTime(20, 0)
        // filter.frequency.setValueAtTime(1000, 0)

        mainOsc.connect(gain)
        gain.connect(filter)
        filter.connect(pan)

        return {gain: gain.gain, freq: filter.frequency}
      })
    })
    const positions = [
      0.020858917883843395,
      0.1805726119225623,
      0.3402863059612812,
      0.5,
      0.659713694038719,
      0.8194273880774379,
      0.9791410821161567,
    ]
    this.updateLines = t => {
      forRange(N, i => {
        if (parameters.flipSound) {
          i = 6 - i
        }
        const y = positions[i]
        // const y = positions[6 - i]

        const w1 = lerp(1,2,y)
        // let px1 = (lerp(1,2,y) * (0 + t/3)) % 1

        forRange(2, j => {
          let x = lerp(-1, 1, Math.min(1, Math.max(0, ((j + (w1 * t/3)) % 2) / w1)))
          let y = Math.min(1, Math.max(0, ((j + (w1 * t/4)) % 2) / w1))

          if ((i % 2 == 0) != parameters.flipSound) {
            x *= -1
            y = 1 - y
          }
          rows[i][j].pan.setTargetAtTime(Math.sign(x) * exp(Math.abs(x), -0.7), 0, 1/60)
          rows[i][j].gain.setTargetAtTime((1 - x ** 2) ** 3, 0, 1/60)

          cols[i][j].freq.setTargetAtTime(lerp(2, 12, y) * F, 0, 1/60)
          cols[i][j].gain.setTargetAtTime((1 - lerp(-1, 1, y) ** 2) * 8, 0, 1/60)
        })
      })
      // const py = Math.cos(lerp(1,2,x) * 2 * Math.PI * (0 - (i % 2 ? 1 : -1) * t/4))


    }

    return mix
  }
}

const linearFlower = new LinearFlower()

const pointLight = new THREE.PointLight();
const ambientLight = new THREE.AmbientLight()

const synth = new Synth(audioContext)

const pattern = new Pattern(linearFlower, pointLight, ambientLight, synth)

let camera, scene, renderer;
let mesh, material;

init();
animate();

function drawMain(t) {
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = "#FFFFFF"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
}
function drawWhite() {
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = "#FFFFFF"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
}

function init() {
  //

  camera = new THREE.PerspectiveCamera(
    2 * Math.atan2(3,1)/Math.PI*180,
    window.innerWidth / window.innerHeight
  );

  scene = new THREE.Scene();
  // scene.background = new THREE.Color(0x050505);

  //

  pointLight.castShadow = true
  pointLight.shadow.bias = -2e-4;
  pointLight.shadow.camera.far = 100
  pointLight.shadow.mapSize.width *= 4;
  pointLight.shadow.mapSize.height *= 4;
  ambientLight.intensity = 0
  scene.add(pointLight);
  scene.add(ambientLight)
  // scene.add(new THREE.HemisphereLight(0xffffff,0x000000,0.3));
  // scene.add(new THREE.AmbientLight())

  //

  const geometry = new THREE.BufferGeometry();

  const shape = linearFlower.genShape();
  const r = shape.h
  const R = 55 / 12
  const r2 = linearFlower.flatShape.h

  const vertices = new THREE.Float32BufferAttribute(shape.vs.flatMap(([x, y, z]) => [(x / r - 0.5) * R, (y / r - 0.5) * R, z / r * R]), 3)
  const uvs = new THREE.Float32BufferAttribute(linearFlower.flatShape.vs.flatMap(([x, y]) => [x / r2, y / r2]), 2)

  // for (let face of linearFlower.faces) {
  //   if (
  //     //   case 0:
  //     //   case 16:)
  //   face.index
  // }
  geometry.setIndex(linearFlower.indices);
  // geometry.setIndex(linearFlower.indices.filter((_, i) => linearFlower.indicesWithShadow[i]));
  geometry.setAttribute( "position", vertices );
  geometry.setAttribute( "uv", uvs );

  const geometryNoShadow = geometry.clone()
  geometryNoShadow.setIndex(linearFlower.indices.filter((_, i) => !linearFlower.indicesWithShadow[i]))

  geometry.computeVertexNormals()
  geometryNoShadow.computeVertexNormals()

  // geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  // geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

  // const material = new THREE.MeshBasicMaterial({
  material = new THREE.MeshPhongMaterial({
    flatShading: true,
    side: THREE.DoubleSide,
    specular: 0,
    map: new THREE.Texture(pattern.canvas)
    // vertexColors: true,
  });

  // material.wireframe = true;

  mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true
  mesh.receiveShadow = true
  scene.add(mesh);

  // no shadow
  const mesh2 = new THREE.Mesh(geometryNoShadow, material);
  mesh.castShadow = true
  scene.add(mesh2);

  //

  renderer = new THREE.WebGLRenderer({ antialias: true });
  // renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true
  // renderer.shadowMap.type = THREE.PCFSoftShadowMap
  document.body.appendChild(renderer.domElement);

  //

  window.addEventListener("resize", updateParams);

  updateParams()
}

function updateParams() {
  let {
    test,
    x,
    y,
    zoom,
    rotation,
    keystoneX,
    keystoneY,
    distance,
    offsetY,
  } = parameters
  x /= 4
  y /= 4
  zoom = 2 ** zoom
  distance = 2 ** distance
  rotation *= Math.PI / 8
  keystoneX *= Math.PI / 8
  keystoneY *= Math.PI / 8

  let z = 0.1433 / distance / zoom

  let w = window.innerWidth
  let h = window.innerHeight
  camera.setViewOffset(
    3 * w,
    3 * h,
    (1.5 - z * (x + 0.5)) * w,
    (1.5 - z * (y + 0.5 + offsetY * zoom)) * h,
    z * w,
    z * h
  )
  camera.position.z = 16 * distance
  camera.position.y = -offsetY * 55 / 12

  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  renderer.setSize(w, h);

  scene.rotation.x = keystoneY
  scene.rotation.y = keystoneX
  scene.rotation.z = rotation

  // light.visible = !test
  // ambientLight.visible = test
}

//
function animate() {
  requestAnimationFrame( animate );
  // mesh.rotation.x = Math.PI + 0.1
  // mesh.rotation.x = -Math.PI /2 + 0.5

  render();
}

function getLightPos (t) {
  const R = 4 * noise.simplex2(t / 3, 0)
  let u = t + noise.simplex2(0, t / 6)
  // const R = lerp(1, 4, unit(-1, 1, Math.cos(t / 3.7)))
  return [
    R * Math.cos(u),
    R * Math.sin(u)
  ]
}
function render() {
  const time = performance.now() / 1000 + getPeriod() * (((parameters.phase % NUM_PHASES) + NUM_PHASES) % NUM_PHASES)

  let t = time / 2
  const [x1, y1] = getLightPos(t)
  const z = 1
  pointLight.position.set( x1, y1, z )

  const [x0, y0] = getLightPos(t - 1/60)
  if (synth && synth.updateShadow) {
    synth.updateShadow(x1, y1, Math.hypot(x1 - x0, y1 - y0))
  }

  if (parameters.test) {
    pattern.drawTest(time)
    pointLight.castShadow = false
  } else {
    pointLight.castShadow = true
    pattern.draw(time)
  }
  material.map.needsUpdate = true

  pointLight.visible = pointLight.intensity > 0
  ambientLight.visible = ambientLight.intensity > 0

  renderer.render(scene, camera);


  // mesh.rotation.x = time * 0.25;
  // mesh.rotation.y = time * 0.5;

}
