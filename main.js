noise.seed(Math.random())

const PERIOD = 60
const NUM_PHASES = 6

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
    test: true,
    x: 0,
    y: 0,
    zoom: 0,
    rotation: 0,
    keystoneX: 0,
    keystoneY: 0,
    distance: 0,
    offsetY: 0
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
  }
  update(t) {
    this.turtles.forEach(turtle => {
      if (turtle.counter <= 0) {
        const adjacent = cellGraph[turtle.index]
        let nextIndex = adjacent[turtle.dir] || adjacent.X
        if (turtle.dir === "X" || !nextIndex || Math.random() < turtle.twistiness) {
          const a = Object.entries(adjacent).filter(([dir, i]) => i !== turtle.prevIndex)
          const [dir, i] = a[ilerp(0, a.length - 1, Math.random())]
          turtle.dir = dir
          nextIndex = i
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
      } else {
        turtle.counter--
      }
    })
  }
}
class Pattern {
  constructor(linearFlower, pointLight, ambientLight) {
    this.linearFlower = linearFlower
    this.pointLight = pointLight
    this.ambientLight = ambientLight
    this.canvas = document.createElement("canvas")
    this.canvas.width = 1024
    this.canvas.height = 1024

    this.canvas2 = this.canvas.cloneNode()
    this.canvas3 = this.canvas.cloneNode()

    this.graph = new CellGraph(linearFlower.mrows, linearFlower.mcols, 32)
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
    const ctx = canvas.getContext('2d')
    this.fill("black", canvas)
    ctx.save()
    switch (phase) {
      case 0:
        // shadows
        this.drawFaces(canvas, (index, row, col, x, y) => {
          ctx.fillStyle = "white"
          if (index === 0 || cellRing.includes(index)) {
            ctx.fillStyle = "#CCF"
          }
          if (index === 16 || cellFlower.includes(index)) {
            ctx.fillStyle = "#FCC"
          }
          return 1
        })
        break
      case 1:
        // rectangle waves
        this.drawFaces(canvas, (index, row, col, x, y) => {
          if (cellBack.includes(index)) {
            const rgb = [-1, 0, 1].map(dt => 255 * exp(1 - Math.abs(noise.simplex3(1 * x, 1 * y, t / 3 + dt / 20)), 3))
            ctx.fillStyle = `rgb(${rgb.join(",")})`
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
            const k = i / (cellRing.length - 1) + t * lerp(0.1, 0.5, I)
            const a = exp(0.5 + 0.5 * Math.cos(2 * Math.PI * k), 3)
            ctx.fillStyle = `rgb(${255*a},${240*a**2},${240*a**2})`
            return 1
          }
        })
        break
      case 3:
        // wireframe waves
        ctx.globalCompositeOperation = "lighter"
        this.drawFaces(canvas, (index, row, col, x, y) => {
          const a = noise.simplex3(2 * x, 2 * y, t / 5)
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
        break
      case 5:
        this.graph.update(t)
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
    const phase = Math.floor(t / PERIOD) % NUM_PHASES
    const k = t % PERIOD
    const fadeIn = Math.min(1, k * fadeSpeed)
    const fadeOut = Math.max(0, 1 - k * fadeSpeed)

    if (phase === 0) {
      this.setPointLightIntensity(exp(fadeIn, -3))
    } else if (phase === 1) {
      this.setPointLightIntensity(exp(fadeOut, -3))
    } else {
      this.setPointLightIntensity(0)
    }

    // this.drawPhase(t, 0, this.canvas)
    // this.setPointLightIntensity(1)
    // return

    // this.drawPhase(t, 4, this.canvas)
    // this.setPointLightIntensity(0)
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
  }
  drawTest() {
    this.fill("white", this.canvas)
    this.setPointLightIntensity(1)
  }
}

const linearFlower = new LinearFlower()

const pointLight = new THREE.PointLight();
const ambientLight = new THREE.AmbientLight()

const pattern = new Pattern(linearFlower, pointLight, ambientLight)

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

function render() {
  const time = performance.now() / 1000 + PERIOD * (((parameters.phase % NUM_PHASES) + NUM_PHASES) % NUM_PHASES)

  let t = time / 2
  const R = 4 * noise.simplex2(t / 3, 0)
  let u = t + noise.simplex2(0, t / 6)
  // const R = lerp(1, 4, unit(-1, 1, Math.cos(t / 3.7)))
  const z = 1
  pointLight.position.set(
    R * Math.cos(u),
    R * Math.sin(u),
    z
  )

  if (parameters.test) {
    pattern.drawTest()
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
