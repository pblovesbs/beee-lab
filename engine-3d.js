// =====================================================================
// GLOBAL STATE
// =====================================================================
let scene, camera, renderer, controls;
let currentMachineKey = null, currentMachine = null;
let simulationSpeed = 2.0;
let currentMomentum = 0.0;
let isPowered = true;
let targetExplode = 0, curExplode = 0;
let currentChapterIndex = 0;
let legendOpen = false, machineMenuOpen = false;
let showCircuits = false;
let wireFlowTime = 0;
let flowWires = [];
let terminalGlows = [];
let interactables = [];
let sceneLabels = [];
let focusModeActive = false;
let camTweenActive = false, transitionActive = false;
let focusedMesh = null, focusedMeshName = null;
let targetCamPos = new THREE.Vector3();
let targetCamLook = new THREE.Vector3();
let isAutoScroll = false;
let panelCollapsed = false;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredObject = null;

// =====================================================================
// PANEL TOGGLE
// =====================================================================
function togglePanel() {
  panelCollapsed = !panelCollapsed;
  document.body.classList.toggle('panel-collapsed', panelCollapsed);
  setTimeout(() => {
    if (currentMachine) {
      targetCamLook.set(showCircuits ? -2 : 4, showCircuits ? 0 : -2, showCircuits ? -2 : 6);
      targetCamPos.set(showCircuits ? -2 : 18, showCircuits ? 18 : 6, showCircuits ? 38 : 26);
      transitionActive = true;
    }
  }, 300);
}

// =====================================================================
// PROCEDURAL TEXTURES
// =====================================================================
function mkLaminationTex() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const x = c.getContext('2d'); x.fillStyle = '#2c2c2c'; x.fillRect(0, 0, 512, 512);
  x.fillStyle = '#111'; for (let i = 0; i < 512; i += 4) x.fillRect(0, i, 512, 2);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 5); return t;
}
function mkPCBTex() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const x = c.getContext('2d'); x.fillStyle = '#001a00'; x.fillRect(0, 0, 256, 256);
  x.strokeStyle = 'rgba(0,200,0,0.2)'; x.lineWidth = 2;
  for (let i = 0; i < 256; i += 16) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.stroke(); }
  for (let i = 0; i < 256; i += 16) { x.beginPath(); x.moveTo(0, i); x.lineTo(256, i); x.stroke(); }
  return new THREE.CanvasTexture(c);
}
function mkEncoderTex() {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const x = c.getContext('2d'); x.fillStyle = 'rgba(255,255,255,.05)'; x.fillRect(0, 0, 512, 512);
  x.translate(256, 256); x.fillStyle = '#000';
  for (let i = 0; i < 128; i++) { x.rotate((Math.PI * 2) / 128); x.fillRect(190, -1, 66, 2); }
  return new THREE.CanvasTexture(c);
}
function mkConduitTex() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const x = c.getContext('2d'); x.fillStyle = '#111'; x.fillRect(0, 0, 64, 64);
  x.fillStyle = '#050505'; x.fillRect(0, 0, 32, 64);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(25, 1); return t;
}
function mkFlowTex() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 32;
  const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, 128, 32);

  // create a glowing directional dash
  const grad = x.createLinearGradient(0, 0, 128, 0);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.5, 'rgba(56,189,248,0.5)');
  grad.addColorStop(0.9, 'rgba(255,255,255,1)');
  grad.addColorStop(1.0, 'rgba(0,0,0,0)');

  x.fillStyle = grad;
  x.fillRect(0, 4, 128, 24);

  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(4, 1);
  return t;
}
const flowTex = mkFlowTex();

// =====================================================================
// MATERIALS
// =====================================================================
const mats = {
  copper: new THREE.MeshStandardMaterial({ color: 0xe06c3a, metalness: 0.9, roughness: 0.25 }),
  copperCoil: new THREE.MeshStandardMaterial({ color: 0xcc5522, metalness: 0.6, roughness: 0.6 }),
  steel: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.95, roughness: 0.2 }),
  lamination: new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.8, map: mkLaminationTex() }),
  iron: new THREE.MeshStandardMaterial({ color: 0x2a2e38, metalness: 0.7, roughness: 0.6 }),
  aluminum: new THREE.MeshStandardMaterial({ color: 0xd8e0ec, metalness: 0.6, roughness: 0.35 }),
  casing: new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.4, roughness: 0.7 }),
  mica: new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.1, roughness: 0.9 }),
  carbon: new THREE.MeshStandardMaterial({ color: 0x0a0a0a, metalness: 0.3, roughness: 0.9 }),
  magnetN: new THREE.MeshStandardMaterial({ color: 0xff2222, metalness: 0.3, roughness: 0.4, emissive: 0x440000 }),
  magnetS: new THREE.MeshStandardMaterial({ color: 0x2244ff, metalness: 0.3, roughness: 0.4, emissive: 0x000033 }),
  plastic: new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.2, roughness: 0.6 }),
  pcbBoard: new THREE.MeshStandardMaterial({ color: 0x002b00, metalness: 0.3, roughness: 0.8, map: mkPCBTex() }),
  icChip: new THREE.MeshStandardMaterial({ color: 0x050505, metalness: 0.5, roughness: 0.5 }),
  wireRed: new THREE.MeshStandardMaterial({ color: 0xff3333, roughness: 0.5, metalness: 0.1 }),
  wireBlack: new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5, metalness: 0.1 }),
  wireBlue: new THREE.MeshStandardMaterial({ color: 0x3366ff, roughness: 0.5, metalness: 0.1 }),
  wireYellow: new THREE.MeshStandardMaterial({ color: 0xffcc00, roughness: 0.5, metalness: 0.1 }),
  wireGreen: new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.5, metalness: 0.1 }),
  encoder: new THREE.MeshBasicMaterial({ map: mkEncoderTex(), transparent: true, side: THREE.DoubleSide })
};

// =====================================================================
// HTML LABEL SYSTEM
// =====================================================================
function createLabel(mesh, text, yOffset = 0) {
  const el = document.createElement('div');
  el.className = 'scene-label hidden';
  el.innerText = text;
  document.getElementById('labels-container').appendChild(el);
  sceneLabels.push({ mesh, el, yOffset, name: text.split('\n')[0] });
}
function clearLabels() {
  document.getElementById('labels-container').innerHTML = '';
  sceneLabels = [];
}

// =====================================================================
// BASE MESH CREATOR
// =====================================================================
function mkMesh(geom, mat, name, category = 'machine') {
  const m = mat.clone();
  const mesh = new THREE.Mesh(geom, m);
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.userData = { name, category, originalEmissive: m.emissive ? m.emissive.getHex() : 0, originalMat: mat };
  interactables.push(mesh);
  return mesh;
}

function mkShaft(radius, length, mat, name, category = 'machine') {
  const g = new THREE.Group();
  g.userData = { name, category };
  const cyl = mkMesh(new THREE.CylinderGeometry(radius, radius, length, 24), mat, name, category);
  g.add(cyl);
  const spiralMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
  const markGeom = new THREE.CylinderGeometry(radius * 0.85, radius * 0.85, 0.02, 16, 1, false, Math.PI / 6, Math.PI / 1.5);
  for (let end of [1, -1]) {
    const mark = new THREE.Mesh(markGeom, spiralMat);
    mark.position.y = (length / 2 + 0.01) * end;
    g.add(mark);
    const mark2 = mark.clone();
    mark2.rotation.y = Math.PI;
    g.add(mark2);
  }
  return g;
}

function mkEndShield(outerR, holeR, depth, mat, name) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerR, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, holeR, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: depth, curveSegments: 32, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.15, bevelSegments: 2 });
  geo.translate(0, 0, -depth / 2);
  return mkMesh(geo, mat, name);
}

// =====================================================================
// TERMINALS
// =====================================================================
function mkTerminalBox(pos, label, numPoles = 3, isPanel = false) {
  const g = new THREE.Group();
  g.position.copy(pos);
  g.userData = { name: label, category: isPanel ? 'circuit' : 'machine' };
  interactables.push(g);

  const baseM = mats.casing.clone(); baseM.color.setHex(0x151b26);
  const blockW = 1.0, blockH = Math.max(numPoles * 0.45 + 0.2, 1.2), blockD = 1.2;
  const base = new THREE.Mesh(new THREE.BoxGeometry(blockW, blockH, blockD), baseM);
  base.castShadow = true; g.add(base);

  for (let i = 0; i < numPoles; i++) {
    const yOff = (i - (numPoles - 1) / 2) * 0.45;
    const plate = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.35, 0.9), mats.copper.clone());
    plate.position.set(0, yOff, 0.15); g.add(plate);
    const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.15, 16), mats.steel.clone());
    screw.rotation.x = Math.PI / 2;
    const xOff = isPanel ? 0.3 : -0.3; screw.position.set(xOff, yOff, 0.6); g.add(screw);
    const lugMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
    const crimp = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.3, 12), lugMat);
    crimp.rotation.z = Math.PI / 2; const crimpXOff = isPanel ? 0.5 : -0.5; crimp.position.set(crimpXOff, yOff, 0.5); g.add(crimp);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0x0ea5e9, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), glowMat);
    glow.position.set(xOff, yOff, 0.6);
    glow.userData = { isTerminalGlow: true, phaseOffset: i * 0.6 };
    g.add(glow); terminalGlows.push(glow);
    const anchor = new THREE.Object3D();
    anchor.position.set(crimpXOff + (isPanel ? 0.1 : -0.1), yOff, 0.5);
    anchor.name = `pole_${i}`; g.add(anchor);
  }
  createLabel(base, label, blockH / 2 + 0.3);
  return g;
}

// =====================================================================
// PANEL & CIRCUIT BUILDERS
// =====================================================================
function addCircuitPanel(group) {
  const panel = mkMesh(new THREE.BoxGeometry(26, 16, 0.2), mats.iron.clone(), "Control Panel Backplate", 'circuit');
  panel.material.color.setHex(0x1e293b); panel.position.set(-1, 0, -1.5); group.add(panel);
  const ductMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.9, flatShading: true });
  [[24, 0.8, 0.8, -1, 6, -1.0], [24, 0.8, 0.8, -1, -1.5, -1.0], [24, 0.8, 0.8, -1, -6, -1.0]].forEach(([w, h, d, x, y, z]) => {
    const d2 = mkMesh(new THREE.BoxGeometry(w, h, d), ductMat, "Wire Duct", 'circuit'); d2.position.set(x, y, z); group.add(d2);
  });
}

function mkCircBox(name, w, h, d, mat, pos) {
  const m = mat.clone(); m.roughness = 0.8;
  const box = mkMesh(new THREE.BoxGeometry(w, h, d), m, name, 'circuit');
  if (pos) box.position.set(pos.x, pos.y, pos.z);
  const rail = mkMesh(new THREE.BoxGeometry(w + 0.4, 0.4, 0.1), mats.steel, "DIN Rail", 'circuit');
  rail.position.set(0, 0, -d / 2 - 0.05); box.add(rail);
  createLabel(box, name, h / 2 + 0.3);
  return box;
}

function mkWire(points, mat, name, flowDir = 1, radius = 0.06) {
  if (flowDir === true) flowDir = 1;
  if (flowDir === false) flowDir = 0;

  let curve;
  if (points.length === 3) curve = new THREE.QuadraticBezierCurve3(points[0], points[1], points[2]);
  else if (points.length === 4) curve = new THREE.CubicBezierCurve3(points[0], points[1], points[2], points[3]);
  else curve = new THREE.CatmullRomCurve3(points);
  const geom = new THREE.TubeGeometry(curve, 48, radius, 8, false);
  const wire = mkMesh(geom, mat, name, 'circuit');
  if (flowDir !== 0) {
    const fm = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.0, blending: THREE.AdditiveBlending, map: flowTex.clone(), depthWrite: false });
    fm.userData.flowSpeed = flowDir;
    const fg = new THREE.TubeGeometry(curve, 48, radius * 1.8, 8, false);
    const fmesh = new THREE.Mesh(fg, fm);
    fmesh.userData.flowMat = fm; wire.add(fmesh); flowWires.push(fmesh);
  }
  return wire;
}

// =====================================================================
// HARNESS BUILDERS
// =====================================================================
// Shared helper to retrieve robust world routing points between fixed panel and machine
function getHarnessPoints() {
  return {
    pExit: new THREE.Vector3(-10, -4, -8),
    mEntry: new THREE.Vector3(-8, -7, 6)
  };
}

function mkIndustrialHarness(panelExit, motorEntry, connections) {
  const g = new THREE.Group();
  const sag = -12;
  // Conduit routes entirely underground between panel and machine
  const midX = (panelExit.x + motorEntry.x) / 2;
  const midZ = (panelExit.z + motorEntry.z) / 2;
  const curve = new THREE.CatmullRomCurve3([
    panelExit,
    new THREE.Vector3(panelExit.x, sag, panelExit.z),
    new THREE.Vector3(midX, sag, midZ),
    new THREE.Vector3(motorEntry.x, sag, motorEntry.z),
    motorEntry
  ]);
  const conduitMat = new THREE.MeshStandardMaterial({ color: 0x111, roughness: 0.9, map: mkConduitTex() });
  const conduit = mkMesh(new THREE.TubeGeometry(curve, 64, 0.5, 16, false), conduitMat, "Flexible Conduit", "connection");
  g.add(conduit);

  connections.forEach((c) => {
    const entryPt = panelExit.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.5, 0.2, (Math.random() - 0.5) * 0.5));
    const exitPt = motorEntry.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.5, 0.2, (Math.random() - 0.5) * 0.5));

    // Panel drop wire — from panel terminal down to conduit entry
    const pC1 = c.startPos.clone().add(new THREE.Vector3(0, -2, 0));
    const pC2 = entryPt.clone().add(new THREE.Vector3(0, 2, 0));
    g.add(mkWire([c.startPos, pC1, pC2, entryPt], c.mat, c.name, c.flowDir || 1, 0.07));

    // Machine climb wire — route OUTSIDE the motor body
    // Push the approach point radially outward from machine center (0,0,0)
    // to a clearance radius guaranteed outside the largest motor (radius ~6)
    const clearR = 12;
    const ex = c.endPos.x, ey = c.endPos.y;
    const radDist = Math.sqrt(ex * ex + ey * ey) || 1;
    const pushX = (ex / radDist) * clearR;
    const pushY = (ey / radDist) * clearR;
    
    // Route: exitPt → underground → rise on outside of machine → approach terminal → terminal
    const underground = new THREE.Vector3(exitPt.x, sag, exitPt.z);
    const riseBase = new THREE.Vector3(pushX, sag, c.endPos.z);
    const riseTop = new THREE.Vector3(pushX, pushY, c.endPos.z);

    g.add(mkWire([exitPt, underground, riseBase, riseTop, c.endPos], c.mat, c.name, c.flowDir || 1, 0.07));
  });
  return g;
}

function buildHarness_DC(isGenerator) {
  const { pExit, mEntry } = getHarnessPoints();
  const panel = currentMachine.circuitGroup, mach = currentMachine.group;
  if (isGenerator) {
    return mkIndustrialHarness(pExit, mEntry, [
      { startPos: panel.userData.terminals.fieldOut.getObjectByName('pole_0').getWorldPosition(new THREE.Vector3()), endPos: mach.userData.terminals.field.getObjectByName('pole_0').getWorldPosition(new THREE.Vector3()), mat: mats.wireYellow, name: "Field Excitation +", flowDir: -1 },
      { startPos: panel.userData.terminals.fieldOut.getObjectByName('pole_1').getWorldPosition(new THREE.Vector3()), endPos: mach.userData.terminals.field.getObjectByName('pole_1').getWorldPosition(new THREE.Vector3()), mat: mats.wireBlack, name: "Field Excitation -", flowDir: -1 },
      { startPos: panel.userData.terminals.genIn.getObjectByName('pole_0').getWorldPosition(new THREE.Vector3()), endPos: mach.userData.terminals.output.getObjectByName('pole_0').getWorldPosition(new THREE.Vector3()), mat: mats.wireRed, name: "DC Output A+", flowDir: -1 },
      { startPos: panel.userData.terminals.genIn.getObjectByName('pole_1').getWorldPosition(new THREE.Vector3()), endPos: mach.userData.terminals.output.getObjectByName('pole_1').getWorldPosition(new THREE.Vector3()), mat: mats.wireBlack, name: "DC Output A-", flowDir: -1 }
    ]);
  } else {
    return mkIndustrialHarness(pExit, mEntry, [
      { startPos: panel.userData.terminals.output.getObjectByName('pole_0').getWorldPosition(new THREE.Vector3()), endPos: mach.userData.terminals.input.getObjectByName('pole_0').getWorldPosition(new THREE.Vector3()), mat: mats.wireRed, name: "Armature Supply +", flowDir: 1 },
      { startPos: panel.userData.terminals.output.getObjectByName('pole_1').getWorldPosition(new THREE.Vector3()), endPos: mach.userData.terminals.input.getObjectByName('pole_1').getWorldPosition(new THREE.Vector3()), mat: mats.wireBlack, name: "Armature Supply -", flowDir: 1 },
      { startPos: panel.userData.terminals.output.getObjectByName('pole_2').getWorldPosition(new THREE.Vector3()), endPos: mach.userData.terminals.input.getObjectByName('pole_2').getWorldPosition(new THREE.Vector3()), mat: mats.wireYellow, name: "Field Winding +", flowDir: 1 },
      { startPos: panel.userData.terminals.output.getObjectByName('pole_3').getWorldPosition(new THREE.Vector3()), endPos: mach.userData.terminals.input.getObjectByName('pole_3').getWorldPosition(new THREE.Vector3()), mat: mats.wireBlack, name: "Field Winding -", flowDir: 1 }
    ]);
  }
}

function buildHarness_Transformer() {
  const g = new THREE.Group();
  const panel = currentMachine.circuitGroup, mach = currentMachine.group;
  const pExitPri = new THREE.Vector3(-10, -4, -10);
  const mEntryPri = new THREE.Vector3(-4, -7, 10);
  g.add(mkIndustrialHarness(pExitPri, mEntryPri, [
    { startPos: panel.userData.terminals.primary.getObjectByName('pole_0').getWorldPosition(new THREE.Vector3()), endPos: mach.userData.terminals.primary.getObjectByName('pole_0').getWorldPosition(new THREE.Vector3()), mat: mats.wireRed, name: "Primary HV Line", flowDir: 1 },
    { startPos: panel.userData.terminals.primary.getObjectByName('pole_1').getWorldPosition(new THREE.Vector3()), endPos: mach.userData.terminals.primary.getObjectByName('pole_1').getWorldPosition(new THREE.Vector3()), mat: mats.wireBlack, name: "Primary HV Neutral", flowDir: 1 }
  ]));
  const mEntrySec = new THREE.Vector3(4, -7, 10);
  const pExitSec = new THREE.Vector3(-6, -4, -10);
  g.add(mkIndustrialHarness(pExitSec, mEntrySec, [
    { startPos: panel.userData.terminals.secondary.getObjectByName('pole_0').getWorldPosition(new THREE.Vector3()), endPos: mach.userData.terminals.secondary.getObjectByName('pole_0').getWorldPosition(new THREE.Vector3()), mat: mats.wireBlue, name: "Secondary LV Line", flowDir: -1 },
    { startPos: panel.userData.terminals.secondary.getObjectByName('pole_1').getWorldPosition(new THREE.Vector3()), endPos: mach.userData.terminals.secondary.getObjectByName('pole_1').getWorldPosition(new THREE.Vector3()), mat: mats.wireBlack, name: "Secondary LV Neutral", flowDir: -1 }
  ]));
  return g;
}

function buildHarness_3Phase() {
  const { pExit, mEntry } = getHarnessPoints();
  const panel = currentMachine.circuitGroup, mach = currentMachine.group;
  return mkIndustrialHarness(pExit, mEntry, [
    { startPos: panel.userData.terminals.output.getObjectByName('pole_0').getWorldPosition(new THREE.Vector3()), endPos: mach.userData.terminals.input.getObjectByName('pole_0').getWorldPosition(new THREE.Vector3()), mat: mats.wireRed, name: "Phase L1", flowDir: 1 },
    { startPos: panel.userData.terminals.output.getObjectByName('pole_1').getWorldPosition(new THREE.Vector3()), endPos: mach.userData.terminals.input.getObjectByName('pole_1').getWorldPosition(new THREE.Vector3()), mat: mats.wireYellow, name: "Phase L2", flowDir: 1 },
    { startPos: panel.userData.terminals.output.getObjectByName('pole_2').getWorldPosition(new THREE.Vector3()), endPos: mach.userData.terminals.input.getObjectByName('pole_2').getWorldPosition(new THREE.Vector3()), mat: mats.wireBlue, name: "Phase L3", flowDir: 1 }
  ]);
}

function buildHarness_PMSM() {
  const { pExit, mEntry } = getHarnessPoints();
  const panel = currentMachine.circuitGroup, mach = currentMachine.group;
  return mkIndustrialHarness(pExit, mEntry, [
    { startPos: panel.userData.terminals.output.getObjectByName('pole_0').getWorldPosition(new THREE.Vector3()), endPos: mach.userData.terminals.input.getObjectByName('pole_0').getWorldPosition(new THREE.Vector3()), mat: mats.wireRed, name: "Phase U", flowDir: 1 },
    { startPos: panel.userData.terminals.output.getObjectByName('pole_1').getWorldPosition(new THREE.Vector3()), endPos: mach.userData.terminals.input.getObjectByName('pole_1').getWorldPosition(new THREE.Vector3()), mat: mats.wireYellow, name: "Phase V", flowDir: 1 },
    { startPos: panel.userData.terminals.output.getObjectByName('pole_2').getWorldPosition(new THREE.Vector3()), endPos: mach.userData.terminals.input.getObjectByName('pole_2').getWorldPosition(new THREE.Vector3()), mat: mats.wireBlue, name: "Phase W", flowDir: 1 },
    { startPos: panel.userData.terminals.output.getObjectByName('pole_3').getWorldPosition(new THREE.Vector3()), endPos: mach.userData.terminals.input.getObjectByName('pole_3').getWorldPosition(new THREE.Vector3()), mat: mats.wireGreen, name: "Resolver Feedback", flowDir: -1 }
  ]);
}

function buildHarness_BLDC() {
  const { pExit } = getHarnessPoints();
  const mEntry = new THREE.Vector3(-5, -7, 8.0);
  const panel = currentMachine.circuitGroup, mach = currentMachine.group;
  return mkIndustrialHarness(pExit, mEntry, [
    { startPos: panel.userData.terminals.output.getObjectByName('pole_0').getWorldPosition(new THREE.Vector3()), endPos: mach.userData.terminals.input.getObjectByName('pole_0').getWorldPosition(new THREE.Vector3()), mat: mats.wireRed, name: "Phase A", flowDir: 1 },
    { startPos: panel.userData.terminals.output.getObjectByName('pole_1').getWorldPosition(new THREE.Vector3()), endPos: mach.userData.terminals.input.getObjectByName('pole_1').getWorldPosition(new THREE.Vector3()), mat: mats.wireYellow, name: "Phase B", flowDir: 1 },
    { startPos: panel.userData.terminals.output.getObjectByName('pole_2').getWorldPosition(new THREE.Vector3()), endPos: mach.userData.terminals.input.getObjectByName('pole_2').getWorldPosition(new THREE.Vector3()), mat: mats.wireBlue, name: "Phase C", flowDir: 1 },
    { startPos: panel.userData.terminals.output.getObjectByName('pole_3').getWorldPosition(new THREE.Vector3()), endPos: mach.userData.terminals.input.getObjectByName('pole_3').getWorldPosition(new THREE.Vector3()), mat: mats.wireGreen, name: "Hall Sensor Array", flowDir: -1 }
  ]);
}

function buildHarness_Stepper() {
  const { pExit } = getHarnessPoints();
  const mEntry = new THREE.Vector3(-7, -7, 6);
  const panel = currentMachine.circuitGroup, mach = currentMachine.group;
  const pt = panel.userData.terminals.output, mt = mach.userData.terminals.input;
  const connections = [];
  if (pt.getObjectByName('pole_3')) {
    connections.push(
      { startPos: pt.getObjectByName('pole_0').getWorldPosition(new THREE.Vector3()), endPos: mt.getObjectByName('pole_0').getWorldPosition(new THREE.Vector3()), mat: mats.wireRed, name: "Coil A+", flowDir: 1 },
      { startPos: pt.getObjectByName('pole_1').getWorldPosition(new THREE.Vector3()), endPos: mt.getObjectByName('pole_1').getWorldPosition(new THREE.Vector3()), mat: mats.wireYellow, name: "Coil A-", flowDir: 1 },
      { startPos: pt.getObjectByName('pole_2').getWorldPosition(new THREE.Vector3()), endPos: mt.getObjectByName('pole_2').getWorldPosition(new THREE.Vector3()), mat: mats.wireBlue, name: "Coil B+", flowDir: 1 },
      { startPos: pt.getObjectByName('pole_3').getWorldPosition(new THREE.Vector3()), endPos: mt.getObjectByName('pole_3').getWorldPosition(new THREE.Vector3()), mat: mats.wireBlack, name: "Coil B-", flowDir: 1 }
    );
  } else {
    connections.push(
      { startPos: pt.getObjectByName('pole_0').getWorldPosition(new THREE.Vector3()), endPos: mt.getObjectByName('pole_0').getWorldPosition(new THREE.Vector3()), mat: mats.wireRed, name: "Phase 1", flowDir: 1 },
      { startPos: pt.getObjectByName('pole_1').getWorldPosition(new THREE.Vector3()), endPos: mt.getObjectByName('pole_1').getWorldPosition(new THREE.Vector3()), mat: mats.wireYellow, name: "Phase 2", flowDir: 1 },
      { startPos: pt.getObjectByName('pole_2').getWorldPosition(new THREE.Vector3()), endPos: mt.getObjectByName('pole_2').getWorldPosition(new THREE.Vector3()), mat: mats.wireBlue, name: "Phase 3", flowDir: 1 }
    );
  }
  return mkIndustrialHarness(pExit, mEntry, connections);
}

function buildHarness_Servo() {
  const { pExit } = getHarnessPoints();
  const servoEntry = new THREE.Vector3(-4, -7, 6);
  const panel = currentMachine.circuitGroup, mach = currentMachine.group;
  return mkIndustrialHarness(pExit, servoEntry, [
    { startPos: panel.userData.terminals.output.getObjectByName('pole_0').getWorldPosition(new THREE.Vector3()), endPos: mach.userData.terminals.input.getObjectByName('pole_0').getWorldPosition(new THREE.Vector3()), mat: mats.wireRed, name: "Motor Power +", flowDir: 1 },
    { startPos: panel.userData.terminals.output.getObjectByName('pole_1').getWorldPosition(new THREE.Vector3()), endPos: mach.userData.terminals.input.getObjectByName('pole_1').getWorldPosition(new THREE.Vector3()), mat: mats.wireBlack, name: "Motor Power -", flowDir: 1 },
    { startPos: panel.userData.terminals.output.getObjectByName('pole_2').getWorldPosition(new THREE.Vector3()), endPos: mach.userData.terminals.input.getObjectByName('pole_2').getWorldPosition(new THREE.Vector3()), mat: mats.wireGreen, name: "Encoder Comm", flowDir: -1 }
  ]);
}

// =====================================================================
// MACHINE BUILDERS
// =====================================================================
function buildDCGenerator() {
  const root = new THREE.Group(), stator = new THREE.Group(), rotor = new THREE.Group(), brushes = new THREE.Group(), primeMover = new THREE.Group(), casing = new THREE.Group();
  const yokeShape = new THREE.Shape();
  yokeShape.absarc(0, 0, 5.8, 0, Math.PI * 2, false);
  const yokeHole = new THREE.Path();
  yokeHole.absarc(0, 0, 4.8, 0, Math.PI * 2, true);
  yokeShape.holes.push(yokeHole);
  const yokeGeo = new THREE.ExtrudeGeometry(yokeShape, { depth: 10, curveSegments: 32, bevelEnabled: false });
  yokeGeo.translate(0, 0, -5);
  const yoke = mkMesh(yokeGeo, mats.casing, "Stator Frame/Yoke"); casing.add(yoke);
  const epFront = mkEndShield(5.8, 0.7, 0.4, mats.casing, "Front End Plate"); epFront.position.z = 5; casing.add(epFront);
  const epRear = mkEndShield(5.8, 0.7, 0.4, mats.casing, "Rear End Plate"); epRear.position.z = -5; casing.add(epRear);
  for (let i = 0; i < 2; i++) {
    const a = i * Math.PI + Math.PI / 2;
    const pole = mkMesh(new THREE.BoxGeometry(2.5, 2.0, 9), mats.lamination, "Field Pole Core");
    pole.position.set(Math.cos(a) * 3.8, Math.sin(a) * 3.8, 0); pole.rotation.z = a + Math.PI / 2; stator.add(pole);
    const shoeShape = new THREE.Shape();
    const sStart = a - Math.PI / 2 - 1.2;
    const sEnd = a - Math.PI / 2 + 1.2;
    shoeShape.absarc(0, 0, 3.2, sStart, sEnd, false);
    shoeShape.absarc(0, 0, 2.8, sEnd, sStart, true);
    const shoeGeo = new THREE.ExtrudeGeometry(shoeShape, { depth: 9.0, curveSegments: 8, bevelEnabled: false });
    shoeGeo.translate(0, 0, -4.5);
    const shoe = mkMesh(shoeGeo, mats.lamination, "Pole Shoe"); stator.add(shoe);
    const winding = mkMesh(new THREE.BoxGeometry(4.5, 1.8, 8.8), mats.copperCoil, "Field Winding (Excitation)");
    winding.position.copy(pole.position); winding.rotation.copy(pole.rotation); stator.add(winding);
  }
  const ftbox = mkTerminalBox(new THREE.Vector3(-6.1, 3.5, 0), "Field Excitation Terminal", 2, false); stator.add(ftbox);
  const otbox = mkTerminalBox(new THREE.Vector3(-6.1, -3.5, 0), "DC Output Terminal", 2, false); stator.add(otbox);
  const shaft = mkShaft(0.55, 22, mats.steel, "Armature Shaft");
  shaft.rotation.x = Math.PI / 2; rotor.add(shaft);
  const armShape = new THREE.Shape();
  const rOut = 2.7, rIn = 1.9, numSlots = 18, slotW = 0.08;
  for (let i = 0; i < numSlots; i++) {
    const a1 = i * Math.PI * 2 / numSlots - slotW;
    const a2 = i * Math.PI * 2 / numSlots + slotW;
    if (i === 0) armShape.moveTo(Math.cos(a2) * rOut, Math.sin(a2) * rOut);
    
    const a1_next = (i + 1) * Math.PI * 2 / numSlots - slotW;
    armShape.absarc(0, 0, rOut, a2, a1_next, false);
    armShape.lineTo(Math.cos(a1_next) * rIn, Math.sin(a1_next) * rIn);
    
    const a2_next = (i + 1) * Math.PI * 2 / numSlots + slotW;
    armShape.absarc(0, 0, rIn, a1_next, a2_next, false);
    armShape.lineTo(Math.cos(a2_next) * rOut, Math.sin(a2_next) * rOut);
  }
  const armCoreGeo = new THREE.ExtrudeGeometry(armShape, { depth: 8.5, curveSegments: 8, bevelEnabled: false });
  armCoreGeo.translate(0, 0, -4.25);
  const armCore = mkMesh(armCoreGeo, mats.lamination, "Armature Body");
  rotor.add(armCore);
  
  for (let i = 0; i < numSlots; i++) {
    const aWind = i * Math.PI * 2 / numSlots;
    const wind = mkMesh(new THREE.BoxGeometry(0.35, 0.6, 8.7), mats.copperCoil, "Armature Winding Coil");
    wind.position.set(Math.cos(aWind) * 2.2, Math.sin(aWind) * 2.2, 0); wind.rotation.z = aWind + Math.PI / 2; rotor.add(wind);
  }
  const commGrp = new THREE.Group();
  for (let i = 0; i < 18; i++) {
    const seg = mkMesh(new THREE.CylinderGeometry(1.5, 1.5, 3.2, 18, 1, false, (i * Math.PI * 2 / 18) + 0.02, (Math.PI * 2 / 18) - 0.05), mats.copper, "Commutator Segment");
    commGrp.add(seg);
    const mic = mkMesh(new THREE.CylinderGeometry(1.48, 1.48, 3.2, 18, 1, false, i * Math.PI * 2 / 18, Math.PI * 2 / 18), mats.mica, "Mica Insulator");
    commGrp.add(mic);
  }
  commGrp.rotation.x = Math.PI / 2; commGrp.position.z = 5.8; rotor.add(commGrp);
  for (let i = 0; i < 2; i++) {
    const a = i * Math.PI + Math.PI / 2;
    const b = mkMesh(new THREE.BoxGeometry(0.8, 1.6, 1.8), mats.carbon, "Carbon Brush");
    b.position.set(Math.cos(a) * 2, Math.sin(a) * 2, 5.8); b.lookAt(0, 0, 5.8); brushes.add(b);
  }
  const bHolder = mkMesh(new THREE.TorusGeometry(2.1, 0.15, 8, 18), mats.steel, "Brush Holder Ring");
  bHolder.position.z = 5.8; brushes.add(bHolder);
  const pmShaft = mkShaft(0.55, 6, mats.steel, "Drive Shaft");
  pmShaft.rotation.x = Math.PI / 2; pmShaft.position.z = 14; primeMover.add(pmShaft);
  const coupling = mkMesh(new THREE.CylinderGeometry(0.9, 0.9, 1.2, 16), mats.aluminum, "Shaft Coupling");
  coupling.rotation.x = Math.PI / 2; coupling.position.z = 11; primeMover.add(coupling);
  const pmCase = mkMesh(new THREE.CylinderGeometry(3, 3.5, 4.5, 16), mats.iron, "Prime Mover (Turbine)");
  pmCase.rotation.x = Math.PI / 2; pmCase.position.z = 16; primeMover.add(pmCase);
  for (let i = 0; i < 6; i++) {
    const blade = mkMesh(new THREE.BoxGeometry(0.4, 2.8, 1.0), mats.aluminum, "Turbine Blade");
    blade.position.set(Math.cos(i * Math.PI / 3) * 1.8, Math.sin(i * Math.PI / 3) * 1.8, 16); blade.rotation.z = i * Math.PI / 3; primeMover.add(blade);
  }
  root.add(stator); root.add(rotor); root.add(brushes); root.add(primeMover); root.add(casing);
  root.userData.terminals = { field: ftbox, output: otbox };
  return {
    group: root,
    update: (dt, sp) => { rotor.rotation.z -= sp * 0.045; for (let i = 1; i < primeMover.children.length; i++) if (primeMover.children[i].userData.name === "Turbine Blade") primeMover.children[i].rotation.z += sp * 0.045; },
    explode: (f) => { 
      casing.position.z = f * -14; 
      yoke.material.opacity = 1 - f * 0.6; yoke.material.transparent = true; 
      stator.position.z = 0; 
      rotor.position.z = f * 10; 
      commGrp.position.z = 5.8 + f * 4; 
      brushes.position.z = f * 18; 
      primeMover.position.z = f * 22; 
    }
  };
}

function buildDCMotor() {
  const root = new THREE.Group(), stator = new THREE.Group(), rotor = new THREE.Group(), brushes = new THREE.Group(), loadSide = new THREE.Group(), casing = new THREE.Group();
  const yokeShape = new THREE.Shape();
  yokeShape.absarc(0, 0, 5.0, 0, Math.PI * 2, false);
  const yokeHole = new THREE.Path();
  yokeHole.absarc(0, 0, 4.6, 0, Math.PI * 2, true);
  yokeShape.holes.push(yokeHole);
  const yokeGeo = new THREE.ExtrudeGeometry(yokeShape, { depth: 9.5, curveSegments: 32, bevelEnabled: false });
  yokeGeo.translate(0, 0, -4.75);
  const yoke = mkMesh(yokeGeo, mats.casing, "Stator Yoke"); casing.add(yoke);
  const epFront = mkEndShield(5.0, 0.7, 0.5, mats.casing, "Front End Shield"); epFront.position.z = 4.75; casing.add(epFront);
  const epRear = mkEndShield(5.0, 0.7, 0.5, mats.casing, "Rear End Shield"); epRear.position.z = -4.75; casing.add(epRear);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    const pole = mkMesh(new THREE.BoxGeometry(2.4, 1.8, 8), mats.lamination, "Field Pole Core"); 
    pole.position.set(Math.cos(a) * 3.7, Math.sin(a) * 3.7, 0); pole.rotation.z = a + Math.PI / 2; stator.add(pole);
    const shoeShape = new THREE.Shape();
    const sStart = a - Math.PI / 2 - 0.38;
    const sEnd = a - Math.PI / 2 + 0.38;
    shoeShape.absarc(0, 0, 3.1, sStart, sEnd, false);
    shoeShape.absarc(0, 0, 2.8, sEnd, sStart, true);
    const shoeGeo = new THREE.ExtrudeGeometry(shoeShape, { depth: 8.0, curveSegments: 8, bevelEnabled: false });
    shoeGeo.translate(0, 0, -4.0);
    const shoe = mkMesh(shoeGeo, mats.lamination, "Pole Shoe"); stator.add(shoe);
    const winding = mkMesh(new THREE.BoxGeometry(2.8, 1.6, 7.8), mats.copperCoil, "Field Winding"); 
    winding.position.copy(pole.position); winding.rotation.copy(pole.rotation); stator.add(winding);
  }
  const itbox = mkTerminalBox(new THREE.Vector3(-5.2, 3.2, 0), "Motor Terminal", 4, false); stator.add(itbox);
  const shaft = mkShaft(0.5, 20, mats.steel, "Shaft (Output)"); shaft.rotation.x = Math.PI / 2; rotor.add(shaft);
  const armCore = mkMesh(new THREE.CylinderGeometry(1.5, 1.5, 8, 32), mats.lamination, "Armature Core Base"); armCore.rotation.x = Math.PI / 2; rotor.add(armCore);
  for (let i = 0; i < 16; i++) {
    const aTooth = i * Math.PI * 2 / 16;
    const tooth = mkMesh(new THREE.BoxGeometry(0.38, 2.0, 8), mats.lamination, "Armature Tooth"); 
    tooth.position.set(Math.cos(aTooth) * 2.0, Math.sin(aTooth) * 2.0, 0); tooth.rotation.z = aTooth + Math.PI / 2; rotor.add(tooth);
    
    const aWind = (i + 0.5) * Math.PI * 2 / 16;
    const wind = mkMesh(new THREE.BoxGeometry(0.4, 1.8, 8.2), mats.copperCoil, "Armature Winding"); 
    wind.position.set(Math.cos(aWind) * 2.0, Math.sin(aWind) * 2.0, 0); wind.rotation.z = aWind + Math.PI / 2; rotor.add(wind);
  }
  const commGrp = new THREE.Group();
  for (let i = 0; i < 16; i++) {
    const seg = mkMesh(new THREE.CylinderGeometry(1.45, 1.45, 3, 16, 1, false, (i * Math.PI * 2 / 16) + 0.02, (Math.PI * 2 / 16) - 0.04), mats.copper, "Commutator Segment"); commGrp.add(seg);
    const mic = mkMesh(new THREE.CylinderGeometry(1.42, 1.42, 3, 16, 1, false, i * Math.PI * 2 / 16, Math.PI * 2 / 16), mats.mica, "Mica Insulation"); commGrp.add(mic);
  }
  commGrp.rotation.x = Math.PI / 2; commGrp.position.z = 5.2; rotor.add(commGrp);
  for (let i = 0; i < 2; i++) { 
    const a = i * Math.PI + Math.PI / 2;
    const b = mkMesh(new THREE.BoxGeometry(0.75, 1.5, 1.6), mats.carbon, "Carbon Brush"); 
    b.position.set(Math.cos(a) * 1.85, Math.sin(a) * 1.85, 5.2); b.lookAt(0, 0, 5.2); brushes.add(b); 
  }
  const pulley = mkMesh(new THREE.CylinderGeometry(1.8, 1.8, 1.0, 20), mats.iron, "Output Pulley"); pulley.rotation.x = Math.PI / 2; pulley.position.z = -7; loadSide.add(pulley);
  const pulleyMark = mkMesh(new THREE.BoxGeometry(0.4, 1.02, 0.4), mats.aluminum, "Rotation Mark"); pulleyMark.position.set(1.7, 0, 0); pulley.add(pulleyMark);
  root.add(stator); root.add(rotor); root.add(brushes); root.add(loadSide); root.add(casing);
  root.userData.terminals = { input: itbox };
  return {
    group: root,
    update: (dt, sp) => { rotor.rotation.z -= sp * 0.05; pulley.rotation.y -= sp * 0.05; },
    explode: (f) => { 
      casing.position.z = f * -14; 
      yoke.material.opacity = 1 - f * 0.6; yoke.material.transparent = true; 
      stator.position.z = 0; 
      rotor.position.z = f * 10; 
      commGrp.position.z = 5.2 + f * 4; 
      brushes.position.z = f * 18; 
      loadSide.position.z = f * -22; 
    }
  };
}

function buildTransformer() {
  const root = new THREE.Group(), core = new THREE.Group(), coils = new THREE.Group();
  const w = 11, h = 10, d = 4, leg = 2;
  const leftLeg = mkMesh(new THREE.BoxGeometry(leg, h, d), mats.lamination, "Laminated Core Leg"); leftLeg.position.x = -w / 2 + leg / 2; core.add(leftLeg);
  const rightLeg = mkMesh(new THREE.BoxGeometry(leg, h, d), mats.lamination, "Laminated Core Leg"); rightLeg.position.x = w / 2 - leg / 2; core.add(rightLeg);
  const centerLeg = mkMesh(new THREE.BoxGeometry(leg * 1.5, h, d), mats.lamination, "Laminated Core Centre"); core.add(centerLeg);
  const topYoke = mkMesh(new THREE.BoxGeometry(w, leg, d), mats.lamination, "Top Yoke"); topYoke.position.y = h / 2 - leg / 2; core.add(topYoke);
  const botYoke = mkMesh(new THREE.BoxGeometry(w, leg, d), mats.lamination, "Bottom Yoke"); botYoke.position.y = -h / 2 + leg / 2; core.add(botYoke);
  const bobbin = mkMesh(new THREE.BoxGeometry(leg * 1.6, h - leg * 2 - 0.2, d + 0.3), mats.plastic, "Insulating Bobbin"); coils.add(bobbin);
  const hvMat = mats.copperCoil.clone(); const lvMat = mats.copperCoil.clone(); lvMat.color.setHex(0xd46820);
  const lv = mkMesh(new THREE.BoxGeometry(leg * 2.3, h - leg * 2.5, d + 1.1), lvMat, "Secondary Winding (LV)"); coils.add(lv);
  const hv = mkMesh(new THREE.BoxGeometry(leg * 3.2, h - leg * 3.1, d + 2.2), hvMat, "Primary Winding (HV)"); coils.add(hv);
  const priTerm = mkTerminalBox(new THREE.Vector3(-6.1, -2, 0), "Primary Terminal", 2, false); priTerm.rotation.y = -Math.PI/2; core.add(priTerm);
  const secTerm = mkTerminalBox(new THREE.Vector3(6.1, -2, 0), "Secondary Terminal", 2, false); secTerm.rotation.y = Math.PI/2; core.add(secTerm);
  root.add(core); root.add(coils);
  root.userData.terminals = { primary: priTerm, secondary: secTerm };
  let t = 0;
  return {
    group: root,
    update: (dt, sp) => { t += dt * sp * 4; hvMat.emissive.setHex(0x552200).multiplyScalar((Math.sin(t) + 1) / 2); lvMat.emissive.setHex(0x005522).multiplyScalar((Math.sin(t + 1.5) + 1) / 2); },
    explode: (f) => { topYoke.position.y = (h / 2 - leg / 2) + f * 6; botYoke.position.y = (-h / 2 + leg / 2) - f * 6; coils.position.z = f * 8; }
  };
}

function buildInductionMotor() {
  const root = new THREE.Group(), stator = new THREE.Group(), rotor = new THREE.Group(), casing = new THREE.Group();
  const frameShape = new THREE.Shape();
  frameShape.absarc(0, 0, 5.4, 0, Math.PI * 2, false);
  const frameHole = new THREE.Path();
  frameHole.absarc(0, 0, 4.8, 0, Math.PI * 2, true);
  frameShape.holes.push(frameHole);
  const frameGeo = new THREE.ExtrudeGeometry(frameShape, { depth: 12, curveSegments: 32, bevelEnabled: false });
  frameGeo.translate(0, 0, -6);
  const frame = mkMesh(frameGeo, mats.casing, "Cast Iron Frame"); casing.add(frame);
  for (let i = 0; i < 40; i++) { const fin = mkMesh(new THREE.BoxGeometry(0.18, 1.6, 11), mats.casing, "Cooling Fin"); fin.position.set(Math.cos(i * Math.PI / 20) * 5.2, Math.sin(i * Math.PI / 20) * 5.2, 0); fin.rotation.z = i * Math.PI / 20; casing.add(fin); }
  const tbox = mkTerminalBox(new THREE.Vector3(0, 5.5, -3.5), "3-Phase Terminal Box", 3, false); tbox.rotation.x = -Math.PI / 2; casing.add(tbox);
  const coverShape = new THREE.Shape();
  coverShape.absarc(0, 0, 5.4, 0, Math.PI * 2, false);
  const coverHole = new THREE.Path();
  coverHole.absarc(0, 0, 0.7, 0, Math.PI * 2, true);
  coverShape.holes.push(coverHole);
  const coverGeo = new THREE.ExtrudeGeometry(coverShape, { depth: 0.4, curveSegments: 32, bevelEnabled: true, bevelThickness: 0.3, bevelSize: 0.3, bevelSegments: 3 });
  coverGeo.translate(0, 0, -0.2);
  const fCover = mkMesh(coverGeo, mats.casing, "Front Bell Cover"); fCover.position.z = 6.0; casing.add(fCover);
  const rCover = mkMesh(coverGeo, mats.casing, "Rear Bell Cover"); rCover.position.z = -6.0; casing.add(rCover);
  const sShape = new THREE.Shape();
  const sRout = 4.8, sRin = 3.1, deepR = 4.1, numS = 24, sW = 0.06;
  for (let i = 0; i < numS; i++) {
    const a1 = i * Math.PI * 2 / numS - sW;
    const a2 = i * Math.PI * 2 / numS + sW;
    if (i === 0) sShape.moveTo(Math.cos(a2) * sRin, Math.sin(a2) * sRin);
    const a1_next = (i + 1) * Math.PI * 2 / numS - sW;
    sShape.absarc(0, 0, sRin, a2, a1_next, false);
    sShape.lineTo(Math.cos(a1_next) * deepR, Math.sin(a1_next) * deepR);
    const a2_next = (i + 1) * Math.PI * 2 / numS + sW;
    sShape.absarc(0, 0, deepR, a1_next, a2_next, false);
    sShape.lineTo(Math.cos(a2_next) * sRin, Math.sin(a2_next) * sRin);
  }
  const sCoreGeo = new THREE.ExtrudeGeometry(sShape, { depth: 10, curveSegments: 8, bevelEnabled: false });
  sCoreGeo.translate(0, 0, -5);
  const sCore = mkMesh(sCoreGeo, mats.lamination, "Stator Core"); stator.add(sCore);
  
  const cMats = [mats.copperCoil.clone(), mats.copperCoil.clone(), mats.copperCoil.clone()];
  cMats[0].color.setHex(0xff4444); cMats[1].color.setHex(0x44ff44); cMats[2].color.setHex(0x4444ff);
  
  // Create solid linear windings in the slots
  for (let i = 0; i < numS; i++) {
    const phaseIndex = Math.floor(i / 2) % 3;
    const a = i * Math.PI * 2 / numS;
    const slotWind = mkMesh(new THREE.BoxGeometry(0.8, 0.4, 10.4), cMats[phaseIndex], `Phase Winding Line`);
    slotWind.position.set(Math.cos(a) * 3.6, Math.sin(a) * 3.6, 0); slotWind.rotation.z = a + Math.PI / 2; stator.add(slotWind);
  }
  
  // Create end turns
  for (let p = 0; p < 3; p++) for (let i = 0; i < 4; i++) {
    const w = mkMesh(new THREE.TorusGeometry(3.6, 0.4, 8, 16, Math.PI / 3), cMats[p], `Phase End Turn`);
    w.position.z = 5.2; w.rotation.z = (i * Math.PI / 2) + (p * Math.PI / 6); stator.add(w);
    const wb = w.clone(); wb.position.z = -5.2; wb.rotation.x = Math.PI; wb.rotation.z = (i * Math.PI / 2) + (p * Math.PI / 6); stator.add(wb);
  }
  const rShape = new THREE.Shape();
  const rOut = 3.0, rIn = 2.6, numBars = 26, barW = 0.08;
  for (let i = 0; i < numBars; i++) {
    const a1 = i * Math.PI * 2 / numBars - barW;
    const a2 = i * Math.PI * 2 / numBars + barW;
    if (i === 0) rShape.moveTo(Math.cos(a2) * rOut, Math.sin(a2) * rOut);
    const a1_next = (i + 1) * Math.PI * 2 / numBars - barW;
    rShape.absarc(0, 0, rOut, a2, a1_next, false);
    rShape.lineTo(Math.cos(a1_next) * rIn, Math.sin(a1_next) * rIn);
    const a2_next = (i + 1) * Math.PI * 2 / numBars + barW;
    rShape.absarc(0, 0, rIn, a1_next, a2_next, false);
    rShape.lineTo(Math.cos(a2_next) * rOut, Math.sin(a2_next) * rOut);
  }
  const rCoreGeo = new THREE.ExtrudeGeometry(rShape, { depth: 9.8, curveSegments: 8, bevelEnabled: false });
  rCoreGeo.translate(0, 0, -4.9);
  const rCore = mkMesh(rCoreGeo, mats.lamination, "Rotor Core"); rotor.add(rCore);
  
  const bars = new THREE.Group();
  for (let i = 0; i < numBars; i++) { 
    const bar = mkMesh(new THREE.BoxGeometry(0.4, 0.45, 10.2), mats.aluminum, "Aluminium Rotor Bar"); 
    const a = i * Math.PI * 2 / numBars;
    bar.position.set(Math.cos(a) * 2.8, Math.sin(a) * 2.8, 0); bar.rotation.z = a + Math.PI / 2; bars.add(bar); 
  }
  const ring1 = mkMesh(new THREE.TorusGeometry(2.8, 0.26, 12, 32), mats.aluminum, "Short-Circuit Ring"); ring1.position.z = 5.1; bars.add(ring1);
  const ring2 = mkMesh(new THREE.TorusGeometry(2.8, 0.26, 12, 32), mats.aluminum, "Short-Circuit Ring"); ring2.position.z = -5.1; bars.add(ring2); rotor.add(bars);
  const shaft = mkShaft(0.6, 22, mats.steel, "Shaft"); shaft.rotation.x = Math.PI / 2; rotor.add(shaft);
  root.add(stator); root.add(rotor); root.add(casing);
  root.userData.terminals = { input: tbox };
  let t = 0;
  return {
    group: root,
    update: (dt, sp) => { rotor.rotation.z -= sp * 0.05; t += dt * sp * 2; cMats.forEach((m, i) => m.emissive.setHex(0x221111).multiplyScalar((Math.sin(t + i * 2.09) + 1) / 2)); },
    explode: (f) => { 
      casing.position.z = f * -12; 
      fCover.position.z = 6.0 + f * 24;
      rCover.position.z = -6.0 - f * 4;
      frame.material.opacity = 1 - f * 0.65; frame.material.transparent = true; 
      rotor.position.z = f * 8; 
      bars.position.z = f * 2; 
    }
  };
}

function buildPMSM() {
  const root = new THREE.Group(), stator = new THREE.Group(), rotor = new THREE.Group();
  const sFrame = mkMesh(new THREE.CylinderGeometry(5.2, 5.0, 8.5, 32, 1, true), mats.casing, "Stator Housing"); 
  sFrame.rotation.x = Math.PI / 2; sFrame.material.side = THREE.DoubleSide; stator.add(sFrame);
  const sYoke = mkMesh(new THREE.CylinderGeometry(4.9, 4.2, 8.0, 32, 1, true), mats.lamination, "Stator Yoke"); 
  sYoke.rotation.x = Math.PI / 2; sYoke.material.side = THREE.DoubleSide; stator.add(sYoke);
  const fBell = mkEndShield(5.2, 0.7, 0.4, mats.casing, "Front Bearing Shield"); fBell.position.z = 4.3; stator.add(fBell);
  const rBell = mkEndShield(5.2, 0.7, 0.4, mats.casing, "Rear Bearing Shield"); rBell.position.z = -4.3; stator.add(rBell);
  const cMats = [mats.copperCoil.clone(), mats.copperCoil.clone(), mats.copperCoil.clone()];
  cMats[0].color.setHex(0xff4444); cMats[1].color.setHex(0x44ff44); cMats[2].color.setHex(0x4488ff);
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI * 2 / 12;
    const tooth = mkMesh(new THREE.BoxGeometry(0.8, 1.2, 8.0), mats.lamination, "Stator Tooth"); 
    tooth.position.set(Math.cos(a) * 3.6, Math.sin(a) * 3.6, 0); tooth.rotation.z = a + Math.PI / 2; stator.add(tooth);
    const shoe = mkMesh(new THREE.CylinderGeometry(3.05, 3.05, 8.0, 12, 1, false, a - 0.15, 0.3), mats.lamination, "Pole Shoe"); 
    shoe.rotation.x = Math.PI / 2; stator.add(shoe);
    const coil = mkMesh(new THREE.BoxGeometry(1.6, 1.1, 8.2), cMats[i % 3], "Phase Coil"); 
    coil.position.copy(tooth.position); coil.rotation.copy(tooth.rotation); stator.add(coil);
  }
  const resHousing = mkMesh(new THREE.CylinderGeometry(1.8, 1.8, 1.2, 32), mats.plastic, "Resolver Housing"); 
  resHousing.rotation.x = Math.PI / 2; resHousing.position.z = -5.0; stator.add(resHousing);
  const resolver = mkMesh(new THREE.CylinderGeometry(1.4, 1.4, 1.0, 24), mats.encoder, "Resolver Rotor"); 
  resolver.rotation.x = Math.PI / 2; resolver.position.z = -5.0; rotor.add(resolver);
  const rCore = mkMesh(new THREE.CylinderGeometry(2.9, 2.9, 7.8, 32), mats.iron, "Rotor Core (V-IPM)"); 
  rCore.rotation.x = Math.PI / 2; rotor.add(rCore);
  for (let p = 0; p < 4; p++) {
    const poleA = p * Math.PI / 2;
    for (let j of [-1, 1]) {
      const magA = poleA + j * 0.35;
      const m = mkMesh(new THREE.BoxGeometry(0.4, 2.3, 7.8), p % 2 === 0 ? mats.magnetN : mats.magnetS, `V-IPM Magnet (${p % 2 === 0 ? 'N' : 'S'})`); 
      m.position.set(Math.cos(magA) * 2.15, Math.sin(magA) * 2.15, 0); 
      m.rotation.z = magA + Math.PI / 2 - j * 0.55; 
      rotor.add(m);
    }
  }
  const shaft = mkShaft(0.6, 22, mats.steel, "Shaft"); 
  shaft.rotation.x = Math.PI / 2; rotor.add(shaft);
  const tbox = mkTerminalBox(new THREE.Vector3(-5.4, 0, -2), "Phase Terminal", 4, false); stator.add(tbox);
  root.add(stator); root.add(rotor);
  root.userData.terminals = { input: tbox };
  let t = 0;
  return {
    group: root,
    update: (dt, sp) => { 
      rotor.rotation.z -= sp * 0.05; t += dt * sp * 2; 
      cMats.forEach((m, i) => m.emissive.setHex(0x221111).multiplyScalar((Math.sin(t + i * 2.09) + 1) / 2)); 
    },
    explode: (f) => { 
      stator.position.z = 0; 
      sFrame.position.z = f * -12;
      sFrame.material.opacity = 1 - f * 0.6; sFrame.material.transparent = true; 
      fBell.position.z = 4.3 + f * 16; 
      rBell.position.z = -4.3 - f * 12; 
      resHousing.position.z = -5.0 - f * 16;
      rotor.position.z = f * 8; 
      resolver.position.z = -5.0 - f * 8; 
    }
  };
}

function buildBLDC() {
  const root = new THREE.Group(), stator = new THREE.Group(), rotor = new THREE.Group();
  const sFrame = mkMesh(new THREE.CylinderGeometry(4.7, 4.5, 6.5, 32, 1, true), mats.casing, "Stator Housing"); 
  sFrame.rotation.x = Math.PI / 2; sFrame.material.side = THREE.DoubleSide; stator.add(sFrame);
  const sCoreRing = mkMesh(new THREE.CylinderGeometry(4.4, 3.9, 6.3, 32, 1, true), mats.lamination, "Stator Yoke");
  sCoreRing.rotation.x = Math.PI / 2; sCoreRing.material.side = THREE.DoubleSide; stator.add(sCoreRing);
  const fBell = mkEndShield(4.7, 0.5, 0.4, mats.casing, "Front End Shield"); fBell.position.z = 3.35; stator.add(fBell);
  const rBell = mkEndShield(4.7, 0.5, 0.4, mats.casing, "Rear End Shield"); rBell.position.z = -3.35; stator.add(rBell);
  const sMats = [mats.copperCoil.clone(), mats.copperCoil.clone(), mats.copperCoil.clone()];
  sMats[0].color.setHex(0xff5533); sMats[1].color.setHex(0x55ff33); sMats[2].color.setHex(0x3355ff);
  for (let i = 0; i < 9; i++) {
    const a = i * Math.PI * 2 / 9;
    const tooth = mkMesh(new THREE.BoxGeometry(0.7, 1.5, 6.3), mats.lamination, "Stator Tooth"); 
    tooth.position.set(Math.cos(a) * 3.15, Math.sin(a) * 3.15, 0); tooth.rotation.z = a + Math.PI / 2; stator.add(tooth);
    const shoe = mkMesh(new THREE.CylinderGeometry(2.45, 2.45, 6.3, 16, 1, false, a - 0.18, 0.36), mats.lamination, "Pole Shoe"); 
    shoe.rotation.x = Math.PI / 2; stator.add(shoe);
    const coil = mkMesh(new THREE.BoxGeometry(1.3, 1.3, 6.5), sMats[i % 3], "Phase Coil"); 
    coil.position.copy(tooth.position); coil.rotation.copy(tooth.rotation); stator.add(coil);
  }
  const pcb = mkMesh(new THREE.TorusGeometry(3.6, 0.6, 4, 32), mats.pcbBoard, "Hall Sensor PCB"); 
  pcb.scale.z = 0.15; pcb.position.z = 3.6; stator.add(pcb);
  for (let i = 0; i < 3; i++) { 
    const hall = mkMesh(new THREE.BoxGeometry(0.35, 0.35, 0.35), mats.icChip, "Hall Sensor"); 
    hall.position.set(Math.cos(i * Math.PI * 2 / 3) * 2.5, Math.sin(i * Math.PI * 2 / 3) * 2.5, 3.65); stator.add(hall); 
  }
  const tbox = mkTerminalBox(new THREE.Vector3(-4.9, 0, -1), "Phases + Hall", 4, false); stator.add(tbox);
  const rCore = mkMesh(new THREE.CylinderGeometry(2.15, 2.15, 6.4, 32), mats.iron, "Rotor Hub"); 
  rCore.rotation.x = Math.PI / 2; rotor.add(rCore);
  for (let i = 0; i < 8; i++) { 
    const a = i * Math.PI / 4; 
    const mag = mkMesh(new THREE.CylinderGeometry(2.35, 2.35, 6.2, 16, 1, false, a - 0.3, 0.6), i % 2 === 0 ? mats.magnetN : mats.magnetS, `Surface Magnet (${i % 2 === 0 ? 'N' : 'S'})`); 
    mag.rotation.x = Math.PI / 2; rotor.add(mag); 
  }
  const shaft = mkShaft(0.5, 14, mats.steel, "Shaft"); 
  shaft.rotation.x = Math.PI / 2; rotor.add(shaft);
  root.add(stator); root.add(rotor);
  root.userData.terminals = { input: tbox };
  let t = 0;
  return {
    group: root,
    update: (dt, sp) => { rotor.rotation.z -= sp * 0.055; t += dt * sp * 3.5; const ph = Math.floor(t) % 3; sMats.forEach((m, i) => m.emissive.setHex(i === ph ? 0xff5500 : 0)); },
    explode: (f) => { 
      stator.position.z = 0; 
      sFrame.position.z = f * -10;
      sFrame.material.opacity = 1 - f * 0.7; sFrame.material.transparent = true; 
      fBell.position.z = 3.35 + f * 14; 
      rBell.position.z = -3.35 - f * 10;
      rotor.position.z = f * 8; 
      pcb.position.z = 3.6 + f * 12; 
    }
  };
}

function buildHybridStepper() {
  const root = new THREE.Group(), stator = new THREE.Group(), rotor = new THREE.Group();
  const sFrame = mkMesh(new THREE.CylinderGeometry(4.7, 4.5, 4.2, 32, 1, true), mats.casing, "Stator Housing"); 
  sFrame.rotation.x = Math.PI / 2; sFrame.material.side = THREE.DoubleSide; stator.add(sFrame);
  const sYoke = mkMesh(new THREE.CylinderGeometry(4.4, 3.8, 4.2, 32, 1, true), mats.lamination, "Stator Yoke"); 
  sYoke.rotation.x = Math.PI / 2; sYoke.material.side = THREE.DoubleSide; stator.add(sYoke);
  
  const fBell = mkEndShield(4.7, 0.5, 0.4, mats.casing, "Front Bearing Shield"); fBell.position.z = 2.2; stator.add(fBell);
  const rBell = mkEndShield(4.7, 0.5, 0.4, mats.casing, "Rear Bearing Shield"); rBell.position.z = -2.2; stator.add(rBell);

  const cMats = [mats.copperCoil.clone(), mats.copperCoil.clone()];
  cMats[0].color.setHex(0xff4422); cMats[1].color.setHex(0x2244ff);
  
  // 8 Salient Poles with exact 5-tooth faces
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    const pole = mkMesh(new THREE.BoxGeometry(0.8, 1.0, 4.2), mats.lamination, "Salient Pole Core"); 
    pole.position.set(Math.cos(a) * 3.25, Math.sin(a) * 3.25, 0); pole.rotation.z = a + Math.PI / 2; stator.add(pole);
    const shoe = mkMesh(new THREE.CylinderGeometry(2.75, 2.75, 4.2, 16, 1, false, a - 0.16, 0.32), mats.lamination, "Pole Shoe Arch"); 
    shoe.rotation.x = Math.PI / 2; stator.add(shoe);
    
    // Procedural Stator Micro-teeth
    for (let t = -2; t <= 2; t++) {
      const toothA = a + t * (Math.PI * 2 / 50);
      const st = mkMesh(new THREE.BoxGeometry(0.15, 0.08, 4.2), mats.lamination, "Stator Micro-Tooth");
      st.position.set(Math.cos(toothA) * 2.7, Math.sin(toothA) * 2.7, 0); st.rotation.z = toothA; stator.add(st);
    }
    
    const coil = mkMesh(new THREE.BoxGeometry(1.5, 1.3, 4.0), cMats[i % 2], "Phase Coil"); 
    coil.position.copy(pole.position); coil.rotation.copy(pole.rotation); stator.add(coil);
  }

  // 50-Tooth Hybrid Rotor Caps (N and S)
  const axMag = mkMesh(new THREE.CylinderGeometry(1.4, 1.4, 1.3, 32), mats.magnetN, "Axial Permanent Magnet"); 
  axMag.rotation.x = Math.PI / 2; rotor.add(axMag);
  
  const capN = new THREE.Group(); capN.position.z = 1.35; rotor.add(capN);
  const coreN = mkMesh(new THREE.CylinderGeometry(2.55, 2.55, 1.4, 32), mats.iron, "Rotor Cap (N)"); 
  coreN.rotation.x = Math.PI / 2; capN.add(coreN);
  const capS = new THREE.Group(); capS.position.z = -1.35; capS.rotation.z = Math.PI / 50; rotor.add(capS); // Exactly 1/2 pitch offset!
  const coreS = mkMesh(new THREE.CylinderGeometry(2.55, 2.55, 1.4, 32), mats.iron, "Rotor Cap (S)"); 
  coreS.rotation.x = Math.PI / 2; capS.add(coreS);

  // Procedural Rotor Micro-teeth
  for (let i = 0; i < 50; i++) {
    const a = i * Math.PI * 2 / 50;
    const toothN = mkMesh(new THREE.BoxGeometry(0.15, 0.08, 1.4), mats.iron, "North Micro-Tooth");
    toothN.position.set(Math.cos(a) * 2.6, Math.sin(a) * 2.6, 0); toothN.rotation.z = a; capN.add(toothN);
    const toothS = mkMesh(new THREE.BoxGeometry(0.15, 0.08, 1.4), mats.iron, "South Micro-Tooth");
    toothS.position.set(Math.cos(a) * 2.6, Math.sin(a) * 2.6, 0); toothS.rotation.z = a; capS.add(toothS);
  }

  const shaft = mkShaft(0.42, 12, mats.steel, "Shaft"); 
  shaft.rotation.x = Math.PI / 2; rotor.add(shaft);
  const tbox = mkTerminalBox(new THREE.Vector3(-4.9, 0, 0), "Coil Terminals", 4, false); stator.add(tbox);
  
  root.add(stator); root.add(rotor);
  root.userData.terminals = { input: tbox };
  let st = 0, si = 0;
  return {
    group: root,
    update: (dt, sp) => { 
      if (!sp) return; st += dt * sp * 3; 
      if (st > 0.3) { 
        st = 0; si++; rotor.rotation.z -= (1.8 * Math.PI / 180); 
        cMats[0].emissive.setHex(si % 4 < 2 ? 0x993300 : 0); 
        cMats[1].emissive.setHex((si + 1) % 4 < 2 ? 0x002299 : 0); 
      } 
    },
    explode: (f) => { 
      stator.position.z = 0; 
      sFrame.position.z = f * -8; sFrame.material.opacity = 1 - f * 0.7; sFrame.material.transparent = true; 
      fBell.position.z = 2.2 + f * 12; 
      rBell.position.z = -2.2 - f * 8;
      rotor.position.z = f * 8; 
      capN.position.z = 1.35 + f * 4; 
      capS.position.z = -1.35 - f * 4; 
    }
  };
}

function buildVRStepper() {
  const root = new THREE.Group(), stator = new THREE.Group(), rotor = new THREE.Group();
  
  const sFrame = mkMesh(new THREE.CylinderGeometry(4.7, 4.5, 4.2, 32, 1, true), mats.casing, "Stator Housing"); 
  sFrame.rotation.x = Math.PI / 2; sFrame.material.side = THREE.DoubleSide; stator.add(sFrame);
  const sYoke = mkMesh(new THREE.CylinderGeometry(4.4, 3.8, 4.0, 32, 1, true), mats.lamination, "Stator Yoke"); 
  sYoke.rotation.x = Math.PI / 2; sYoke.material.side = THREE.DoubleSide; stator.add(sYoke);

  const fBell = mkEndShield(4.7, 0.5, 0.4, mats.casing, "Front Bearing Shield"); fBell.position.z = 2.1; stator.add(fBell);
  const rBell = mkEndShield(4.7, 0.5, 0.4, mats.casing, "Rear Bearing Shield"); rBell.position.z = -2.1; stator.add(rBell);

  const cMats = [mats.copperCoil.clone(), mats.copperCoil.clone(), mats.copperCoil.clone()];
  cMats[0].color.setHex(0xff4422); cMats[1].color.setHex(0x44ff22); cMats[2].color.setHex(0x2244ff);
  
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    const pole = mkMesh(new THREE.BoxGeometry(1.2, 1.2, 4.0), mats.lamination, "Salient Stator Pole"); 
    pole.position.set(Math.cos(a) * 3.2, Math.sin(a) * 3.2, 0); pole.rotation.z = a + Math.PI / 2; stator.add(pole);
    
    // Creates the curved face piece binding to the pole end
    const shoeShape = new THREE.Shape();
    const sStart = a - Math.PI / 2 - 0.25;
    const sEnd = a - Math.PI / 2 + 0.25;
    shoeShape.absarc(0, 0, 2.6, sStart, sEnd, false);
    shoeShape.absarc(0, 0, 2.5, sEnd, sStart, true);
    const shoeGeo = new THREE.ExtrudeGeometry(shoeShape, { depth: 4.0, curveSegments: 8, bevelEnabled: false });
    shoeGeo.translate(0, 0, -2.0);
    const shoe = mkMesh(shoeGeo, mats.lamination, "Pole Shoe"); 
    stator.add(shoe);
    
    const coil = mkMesh(new THREE.BoxGeometry(1.6, 1.4, 3.8), cMats[i % 3], "Phase Coil"); 
    coil.position.copy(pole.position); coil.rotation.copy(pole.rotation); stator.add(coil);
  }

  const rCore = mkMesh(new THREE.CylinderGeometry(1.5, 1.5, 4.0, 32), mats.iron, "Soft Iron Rotor Core"); 
  rCore.rotation.x = Math.PI / 2; rotor.add(rCore);
  
  for (let i = 0; i < 4; i++) { 
    const a = i * Math.PI / 2; 
    const tooth = mkMesh(new THREE.BoxGeometry(1.2, 0.8, 4.0), mats.iron, "Solid Rotor Tooth"); 
    tooth.position.set(Math.cos(a) * 1.9, Math.sin(a) * 1.9, 0); 
    tooth.rotation.z = a + Math.PI / 2; 
    rotor.add(tooth); 
    
    // Face the tooth exactly parallel to stator shoe
    const faceShape = new THREE.Shape();
    const fStart = a - Math.PI / 2 - 0.24;
    const fEnd = a - Math.PI / 2 + 0.24;
    faceShape.absarc(0, 0, 2.38, fStart, fEnd, false);
    faceShape.absarc(0, 0, 2.3, fEnd, fStart, true);
    const faceGeo = new THREE.ExtrudeGeometry(faceShape, { depth: 4.0, curveSegments: 8, bevelEnabled: false });
    faceGeo.translate(0, 0, -2.0);
    const face = mkMesh(faceGeo, mats.iron, "Rotor Shoe Face"); 
    rotor.add(face);
  }

  const shaft = mkShaft(0.42, 10, mats.steel, "Shaft"); shaft.rotation.x = Math.PI / 2; rotor.add(shaft);
  const tbox = mkTerminalBox(new THREE.Vector3(-4.9, 0, 0), "Phase Terminals", 3, false); stator.add(tbox);
  
  root.add(stator); root.add(rotor);
  root.userData.terminals = { input: tbox };
  let st = 0, si = 0;

  return {
    group: root,
    update: (dt, sp) => { 
      if (!sp) return; st += dt * sp * 3; 
      if (st > 0.3) { 
        st = 0; si++; rotor.rotation.z -= (30 * Math.PI / 180); 
        cMats.forEach((m, i) => m.emissive.setHex(i === si % 3 ? 0xcc5500 : 0)); 
      } 
    },
    explode: (f) => { 
      stator.position.z = 0; 
      sFrame.position.z = f * -8; sFrame.material.opacity = 1 - f * 0.7; sFrame.material.transparent = true; 
      fBell.position.z = 2.1 + f * 12; 
      rBell.position.z = -2.1 - f * 8;
      rotor.position.z = f * 8; 
    }
  };
}

function buildPMStepper() {
  const root = new THREE.Group(), stator = new THREE.Group(), rotor = new THREE.Group();
  
  const sYoke = mkMesh(new THREE.CylinderGeometry(4.6, 4.6, 4.0, 32, 1, true), mats.lamination, "Stator Yoke"); 
  sYoke.rotation.x = Math.PI / 2; sYoke.material.side = THREE.DoubleSide; stator.add(sYoke);

  const fBell = mkEndShield(4.6, 0.6, 0.4, mats.casing, "Front Bearing Shield"); fBell.position.z = 2.1; stator.add(fBell);
  const rBell = mkEndShield(4.6, 0.6, 0.4, mats.casing, "Rear Bearing Shield"); rBell.position.z = -2.1; stator.add(rBell);

  const cMats = [mats.copperCoil.clone(), mats.copperCoil.clone()];
  cMats[0].color.setHex(0xff4422); cMats[1].color.setHex(0x2244ff);
  
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    const pole = mkMesh(new THREE.BoxGeometry(1.6, 1.4, 4.0), mats.lamination, "Salient Stator Pole"); 
    pole.position.set(Math.cos(a) * 3.4, Math.sin(a) * 3.4, 0); 
    pole.rotation.z = a + Math.PI / 2; stator.add(pole);
    
    const shoeShape = new THREE.Shape();
    const sStart = a - Math.PI / 2 - 0.35;
    const sEnd = a - Math.PI / 2 + 0.35;
    shoeShape.absarc(0, 0, 2.75, sStart, sEnd, false);
    shoeShape.absarc(0, 0, 2.66, sEnd, sStart, true);
    const shoeGeo = new THREE.ExtrudeGeometry(shoeShape, { depth: 4.0, curveSegments: 8, bevelEnabled: false });
    shoeGeo.translate(0, 0, -2.0);
    const shoe = mkMesh(shoeGeo, mats.lamination, "Pole Shoe"); 
    stator.add(shoe);
    
    const coil = mkMesh(new THREE.BoxGeometry(2.0, 1.3, 3.8), cMats[i % 2], `Phase Coil ${i % 2 === 0 ? "A" : "B"}`); 
    coil.position.copy(pole.position); coil.rotation.copy(pole.rotation); stator.add(coil);
  }

  const numRotorPoles = 6;
  for(let i=0; i < numRotorPoles; i++) {
     const a = i * Math.PI * 2 / numRotorPoles;
     const shape = new THREE.Shape();
     const startA = a - Math.PI / 2 - 0.45;
     const endA = a - Math.PI / 2 + 0.45;
     shape.absarc(0, 0, 2.65, startA, endA, false);
     shape.absarc(0, 0, 0.5, endA, startA, true);
     const geo = new THREE.ExtrudeGeometry(shape, { depth: 3.8, curveSegments: 8, bevelEnabled: false });
     geo.translate(0, 0, -1.9);
     const mag = mkMesh(geo, i % 2 === 0 ? mats.magnetN : mats.magnetS, `Permanent Magnet (${i % 2 === 0 ? 'N' : 'S'})`);
     rotor.add(mag);
  }

  const shaft = mkShaft(0.5, 12, mats.steel, "Shaft"); shaft.rotation.x = Math.PI / 2; rotor.add(shaft);
  const tbox = mkTerminalBox(new THREE.Vector3(-4.9, 0, 0), "Phase Terminals A/B", 4, false); stator.add(tbox);
  
  root.add(stator); root.add(rotor);
  root.userData.terminals = { input: tbox };
  let st = 0, si = 0;

  return {
    group: root,
    update: (dt, sp) => { 
      if (!sp) return; st += dt * sp * 3; 
      if (st > 0.45) { 
        st = 0; si++; 
        rotor.rotation.z -= (30 * Math.PI / 180); 
        cMats[0].emissive.setHex(si % 4 < 2 ? 0x993300 : 0); 
        cMats[1].emissive.setHex((si + 1) % 4 < 2 ? 0x002299 : 0); 
      } 
    },
    explode: (f) => { 
      stator.position.z = 0; 
      sYoke.material.opacity = 1 - f * 0.7; sYoke.material.transparent = true; 
      fBell.position.z = 2.1 + f * 12; 
      rBell.position.z = -2.1 - f * 8;
      rotor.position.z = f * 8; 
    }
  };
}

function buildServo() {
  const root = new THREE.Group(), motorGrp = new THREE.Group(), gearGrp = new THREE.Group(), encGrp = new THREE.Group();
  
  const mCase = mkMesh(new THREE.CylinderGeometry(2.1, 2.1, 5.5, 32), mats.casing, "Motor Housing"); mCase.rotation.x = Math.PI / 2; motorGrp.add(mCase);
  const mShaft = mkShaft(0.3, 7.5, mats.steel, "Motor Shaft"); mShaft.rotation.x = Math.PI / 2; motorGrp.add(mShaft);
  
  const gBox = mkMesh(new THREE.BoxGeometry(5.2, 4.8, 1.8), mats.aluminum, "Gearbox Housing"); gBox.position.set(0.4, 1.0, -3.6); gearGrp.add(gBox);

  const pinion = mkMesh(new THREE.CylinderGeometry(0.4, 0.4, 0.35, 12), mats.copper, "Motor Pinion (G1)"); 
  pinion.rotation.x = Math.PI / 2; pinion.position.set(0, 0, -3.1); motorGrp.add(pinion);

  const g2Grp = new THREE.Group(); g2Grp.position.set(1.6, 0, 0); gearGrp.add(g2Grp);
  const g2Large = mkMesh(new THREE.CylinderGeometry(1.2, 1.2, 0.35, 24), mats.iron, "Compound Gear 1 (Large)"); 
  g2Large.rotation.x = Math.PI / 2; g2Large.position.set(0, 0, -3.1); g2Grp.add(g2Large);
  const g2Small = mkMesh(new THREE.CylinderGeometry(0.4, 0.4, 0.35, 12), mats.copper, "Compound Gear 1 (Small)"); 
  g2Small.rotation.x = Math.PI / 2; g2Small.position.set(0, 0, -3.5); g2Grp.add(g2Small);

  const g3Grp = new THREE.Group(); g3Grp.position.set(1.6, 1.6, 0); gearGrp.add(g3Grp);
  const g3Large = mkMesh(new THREE.CylinderGeometry(1.2, 1.2, 0.35, 24), mats.iron, "Compound Gear 2 (Large)"); 
  g3Large.rotation.x = Math.PI / 2; g3Large.position.set(0, 0, -3.5); g3Grp.add(g3Large);
  const g3Small = mkMesh(new THREE.CylinderGeometry(0.4, 0.4, 0.35, 12), mats.copper, "Compound Gear 2 (Small)"); 
  g3Small.rotation.x = Math.PI / 2; g3Small.position.set(0, 0, -3.9); g3Grp.add(g3Small);

  const g4Grp = new THREE.Group(); g4Grp.position.set(-0.4, 1.6, 0); gearGrp.add(g4Grp);
  const outGear = mkMesh(new THREE.CylinderGeometry(1.6, 1.6, 0.35, 32), mats.iron, "Output Gear (G4)"); 
  outGear.rotation.x = Math.PI / 2; outGear.position.set(0, 0, -3.9); g4Grp.add(outGear);
  const spline = mkShaft(0.42, 2.2, mats.carbon, "Spline Shaft"); 
  spline.rotation.x = Math.PI / 2; spline.position.set(0, 0, -5.0); g4Grp.add(spline);

  const encCover = mkMesh(new THREE.CylinderGeometry(2.1, 2.1, 1.6, 32), mats.plastic, "Encoder Cover"); encCover.rotation.x = Math.PI / 2; encCover.position.z = 3.5; encGrp.add(encCover);
  const disc = mkMesh(new THREE.CylinderGeometry(1.6, 1.6, 0.06, 32), mats.encoder, "Encoder Disc"); disc.rotation.x = Math.PI / 2; disc.position.z = 3.0; encGrp.add(disc);
  const optSens = mkMesh(new THREE.BoxGeometry(0.85, 0.85, 0.45), mats.carbon, "Optical Sensor"); optSens.position.set(0, 1.3, 3.0); encGrp.add(optSens);
  const tbox = mkTerminalBox(new THREE.Vector3(-2.3, 2, 0), "Power + PWM", 3, false); motorGrp.add(tbox);
  
  root.add(motorGrp); root.add(gearGrp); root.add(encGrp);
  root.userData.terminals = { input: tbox };
  
  let angle = 0, dir = 1;
  return {
    group: root,
    update: (dt, sp) => { 
      if (!sp) return; 
      angle += sp * 0.025 * dir; 
      if (angle > Math.PI / 2 || angle < -Math.PI / 2) dir *= -1; 
      g4Grp.rotation.z = angle; 
      g3Grp.rotation.z = -angle * 4; 
      g2Grp.rotation.z = angle * 12; 
      pinion.rotation.y = -angle * 36; 
      mShaft.rotation.y = -angle * 36; 
      disc.rotation.y = -angle * 36; 
    },
    explode: (f) => { 
      motorGrp.position.z = f * 4; 
      encGrp.position.z = f * 8; 
      encCover.material.transparent = true; 
      encCover.material.opacity = 1 - f * 0.8; 
      
      gBox.position.y = 1.0 + f * 10; 
      gBox.position.z = -3.6;
      gBox.material.transparent = true; 
      gBox.material.opacity = 1 - f * 0.8; 
      
      g4Grp.position.z = f * -9;
      g3Grp.position.z = f * -6;
      g2Grp.position.z = f * -3;
    }
  };
}

// =====================================================================
// CIRCUIT BUILDERS (INTERNAL WIRING)
// =====================================================================
function buildDCGeneratorCircuit() {
  const g = new THREE.Group(); addCircuitPanel(g);
  g.add(mkCircBox("Separate Excitation\nDC Supply", 3, 2.5, 2, mats.casing, { x: -7, y: 2.5, z: 0 }));
  g.add(mkCircBox("Field Rheostat", 2, 1.8, 1.5, mats.plastic, { x: -1.5, y: 2.5, z: 0 }));
  g.add(mkCircBox("AVR (Regulator)", 2.5, 2, 1.5, mats.pcbBoard, { x: 3.5, y: 2.5, z: 0 }));
  const ft = mkTerminalBox(new THREE.Vector3(8, 2.5, 0), "Excitation Output", 2, true); g.add(ft);
  const ot = mkTerminalBox(new THREE.Vector3(8, -2.5, 0), "Gen Output Input", 2, true); g.add(ot);
  g.userData.terminals = { fieldOut: ft, genIn: ot };
  g.add(mkCircBox("Circuit Breaker", 2, 2, 1.5, mats.pcbBoard, { x: 3, y: -2.5, z: 0 }));
  g.add(mkCircBox("DC Load / Bus", 3, 2.5, 2, mats.casing, { x: -3.5, y: -2.5, z: 0 }));
  g.add(mkWire([new THREE.Vector3(-5.5, 2.8, 0), new THREE.Vector3(-2.5, 2.8, 0)], mats.wireRed, "Excitation DC+", 1));
  g.add(mkWire([new THREE.Vector3(-5.5, 2.2, 0), new THREE.Vector3(-2.5, 2.2, 0)], mats.wireBlack, "Excitation DC−", 1));
  g.add(mkWire([new THREE.Vector3(-0.5, 2.5, 0), new THREE.Vector3(2.25, 2.5, 0)], mats.wireYellow, "Regulated Current", 1));
  const ftA1 = ft.getObjectByName('pole_0').getWorldPosition(new THREE.Vector3()), ftA2 = ft.getObjectByName('pole_1').getWorldPosition(new THREE.Vector3());
  g.add(mkWire([new THREE.Vector3(4.75, 2.7, 0), new THREE.Vector3(6, ftA1.y, 0), ftA1], mats.wireRed, "To Field Terminal +", 1));
  g.add(mkWire([new THREE.Vector3(4.75, 2.3, 0), new THREE.Vector3(6, ftA2.y, 0), ftA2], mats.wireBlack, "To Field Terminal -", 1));
  const otA1 = ot.getObjectByName('pole_0').getWorldPosition(new THREE.Vector3());
  g.add(mkWire([otA1, new THREE.Vector3(6, otA1.y, 0), new THREE.Vector3(4, -2.5, 0)], mats.wireRed, "Output Transfer", 1));
  g.add(mkWire([new THREE.Vector3(2, -2.5, 0), new THREE.Vector3(-2, -2.5, 0)], mats.wireRed, "Breaker to Bus", 1));
  return g;
}

function buildDCMotorCircuit() {
  const g = new THREE.Group(); addCircuitPanel(g);
  g.add(mkCircBox("DC Power Supply", 3, 2.5, 2, mats.casing, { x: -7, y: 0, z: 0 }));
  g.add(mkCircBox("3-Point Starter", 2.5, 2, 1.5, mats.pcbBoard, { x: -2, y: 0, z: 0 }));
  g.add(mkCircBox("Field Rheostat", 2, 1.5, 1.5, mats.plastic, { x: 2.5, y: 3.5, z: 0 }));
  g.add(mkCircBox("PWM Controller", 2.5, 2, 1.5, mats.pcbBoard, { x: 2.5, y: 0, z: 0 }));
  const pt = mkTerminalBox(new THREE.Vector3(8, 0, 0), "Motor Supply Terminal", 4, true); g.add(pt);
  g.userData.terminals = { output: pt };
  g.add(mkWire([new THREE.Vector3(-5.5, 0.4, 0), new THREE.Vector3(-3.25, 0.4, 0)], mats.wireRed, "DC+ Supply", 1));
  g.add(mkWire([new THREE.Vector3(-5.5, -0.4, 0), new THREE.Vector3(-3.25, -0.4, 0)], mats.wireBlack, "DC− Return", 1));
  g.add(mkWire([new THREE.Vector3(-0.75, 0, 0), new THREE.Vector3(1.25, 0, 0)], mats.wireRed, "Starter Output", 1));
  g.add(mkWire([new THREE.Vector3(-0.75, 0.5, 0), new THREE.Vector3(1.5, 3.5, 0)], mats.wireYellow, "Field Branch", 1));
  const p0 = pt.getObjectByName('pole_0').getWorldPosition(new THREE.Vector3()), p3 = pt.getObjectByName('pole_3').getWorldPosition(new THREE.Vector3());
  g.add(mkWire([new THREE.Vector3(3.5, 3.5, 0), new THREE.Vector3(6, p0.y, 0), p0], mats.wireYellow, "Field Return", 1));
  g.add(mkWire([new THREE.Vector3(3.75, 0, 0), new THREE.Vector3(6, p3.y, 0), p3], mats.wireRed, "PWM Output", 1));
  return g;
}

function buildTransformerCircuit() {
  const g = new THREE.Group(); addCircuitPanel(g);
  g.add(mkCircBox("AC Utility Grid", 3, 2.5, 2, mats.casing, { x: -7, y: 2.5, z: 0 }));
  g.add(mkCircBox("HV Breaker", 2, 2, 1.5, mats.pcbBoard, { x: -2.5, y: 2.5, z: 0 }));
  const priTerm = mkTerminalBox(new THREE.Vector3(2, 2.5, 0), "Primary Term", 2, true); g.add(priTerm);
  const secTerm = mkTerminalBox(new THREE.Vector3(2, -2.5, 0), "Secondary Term", 2, true); g.add(secTerm);
  g.userData.terminals = { primary: priTerm, secondary: secTerm };
  g.add(mkCircBox("OLTC Tap", 2.2, 1.8, 1.5, mats.pcbBoard, { x: 6.5, y: -2.5, z: 0 }));
  g.add(mkCircBox("AC Load", 3, 2.5, 2, mats.casing, { x: 11, y: -2.5, z: 0 }));
  g.add(mkWire([new THREE.Vector3(-5.5, 2.9, 0), new THREE.Vector3(-3.5, 2.9, 0)], mats.wireRed, "L (Line)", 1));
  g.add(mkWire([new THREE.Vector3(-5.5, 2.1, 0), new THREE.Vector3(-3.5, 2.1, 0)], mats.wireBlack, "N (Neutral)", 1));
  const p0 = priTerm.getObjectByName('pole_0').getWorldPosition(new THREE.Vector3());
  g.add(mkWire([new THREE.Vector3(-1.5, 2.5, 0), new THREE.Vector3(0.5, p0.y, 0), p0], mats.wireRed, "Protected HV Line", 1));
  const s0 = secTerm.getObjectByName('pole_0').getWorldPosition(new THREE.Vector3());
  g.add(mkWire([s0, new THREE.Vector3(3.5, s0.y, 0), new THREE.Vector3(5.4, -2.5, 0)], mats.wireBlue, "Secondary Out", 1));
  g.add(mkWire([new THREE.Vector3(7.6, -2.5, 0), new THREE.Vector3(9.5, -2.5, 0)], mats.wireBlue, "Tapped LV", 1));
  return g;
}

function buildInductionCircuit() {
  const g = new THREE.Group(); addCircuitPanel(g);
  g.add(mkCircBox("3-Phase Supply", 3.2, 3, 2, mats.casing, { x: -7, y: 0, z: 0 }));
  g.add(mkCircBox("Main Contactor", 2.2, 2, 1.5, mats.pcbBoard, { x: -1.5, y: 0, z: 0 }));
  g.add(mkCircBox("Star-Delta Starter", 3, 3, 2, mats.pcbBoard, { x: 3.5, y: 0, z: 0 }));
  const tb = mkTerminalBox(new THREE.Vector3(9, 0, 0), "Motor Terminal Block", 3, true); g.add(tb);
  g.userData.terminals = { output: tb };
  ['Red', 'Yellow', 'Blue'].forEach((col, i) => {
    const m = [mats.wireRed, mats.wireYellow, mats.wireBlue][i];
    g.add(mkWire([new THREE.Vector3(-5.4, 1 - i, 0), new THREE.Vector3(-2.6, 1 - i, 0)], m, `L${i + 1} Supply`, 1));
    g.add(mkWire([new THREE.Vector3(-0.4, 1 - i, 0), new THREE.Vector3(2.0, 1 - i, 0)], m, `L${i + 1} Switched`, 1));
    const p = tb.getObjectByName('pole_' + i).getWorldPosition(new THREE.Vector3());
    g.add(mkWire([new THREE.Vector3(5.0, 1 - i, 0), new THREE.Vector3(7, p.y, 0), p], m, `L${i + 1} to Motor`, 1));
  });
  return g;
}

function buildPMSMCircuit() {
  const g = new THREE.Group(); addCircuitPanel(g);
  g.add(mkCircBox("DC Link Capacitor", 2.5, 2, 1.5, mats.casing, { x: -7, y: 0, z: 0 }));
  g.add(mkCircBox("3-Phase Inverter", 3.5, 3, 2, mats.pcbBoard, { x: -1.5, y: 0, z: 0 }));
  g.add(mkCircBox("FOC Controller", 3, 2.5, 2, mats.icChip, { x: -1.5, y: 4.5, z: 0 }));
  const pt = mkTerminalBox(new THREE.Vector3(6, 0, 0), "Phase Out", 4, true); g.add(pt);
  g.userData.terminals = { output: pt };
  g.add(mkWire([new THREE.Vector3(-5.75, 0.4, 0), new THREE.Vector3(-3.25, 0.4, 0)], mats.wireRed, "DC Bus +", 1));
  g.add(mkWire([new THREE.Vector3(-5.75, -0.4, 0), new THREE.Vector3(-3.25, -0.4, 0)], mats.wireBlack, "DC Bus −", 1));
  g.add(mkWire([new THREE.Vector3(-1.5, 3.25, 0), new THREE.Vector3(-1.5, 1.5, 0)], mats.wireYellow, "PWM Gate Signals", 1));
  for (let i = 0; i < 3; i++) { const p = pt.getObjectByName('pole_' + i).getWorldPosition(new THREE.Vector3()); const ma = [mats.wireRed, mats.wireYellow, mats.wireBlue]; g.add(mkWire([new THREE.Vector3(0.25, 0.5 - i * 0.5, 0), new THREE.Vector3(4, p.y, 0), p], ma[i], "Phase", 1)); }
  const p3 = pt.getObjectByName('pole_3').getWorldPosition(new THREE.Vector3());
  g.add(mkWire([p3, new THREE.Vector3(4, p3.y, 0), new THREE.Vector3(0, 4.5, 0)], mats.wireGreen, "Resolver Loop", -1));
  return g;
}

function buildBLDCCircuit() {
  const g = new THREE.Group(); addCircuitPanel(g);
  g.add(mkCircBox("Battery Pack", 3, 2.5, 2, mats.casing, { x: -7, y: 0, z: 0 }));
  g.add(mkCircBox("BMS Board", 2.2, 1.8, 1.5, mats.pcbBoard, { x: -2.5, y: 0, z: 0 }));
  g.add(mkCircBox("ESC Unit", 4, 3, 2, mats.pcbBoard, { x: 3, y: 0, z: 0 }));
  const pt = mkTerminalBox(new THREE.Vector3(9, 0, 0), "Output Terminal", 4, true); g.add(pt);
  g.userData.terminals = { output: pt };
  g.add(mkWire([new THREE.Vector3(-5.5, 0.4, 0), new THREE.Vector3(-3.6, 0.4, 0)], mats.wireRed, "Battery V+", 1));
  g.add(mkWire([new THREE.Vector3(-5.5, -0.4, 0), new THREE.Vector3(-3.6, -0.4, 0)], mats.wireBlack, "Battery GND", 1));
  g.add(mkWire([new THREE.Vector3(-1.4, 0.4, 0), new THREE.Vector3(1, 0.4, 0)], mats.wireRed, "Protected V+", 1));
  g.add(mkWire([new THREE.Vector3(-1.4, -0.4, 0), new THREE.Vector3(1, -0.4, 0)], mats.wireBlack, "Protected GND", 1));
  for (let i = 0; i < 3; i++) { const p = pt.getObjectByName('pole_' + i).getWorldPosition(new THREE.Vector3()); const ma = [mats.wireRed, mats.wireYellow, mats.wireBlue]; g.add(mkWire([new THREE.Vector3(5, 0.4 - i * 0.4, 0), new THREE.Vector3(7, p.y, 0), p], ma[i], "Phase", 1)); }
  return g;
}

function buildHybridStepperCircuit() {
  const g = new THREE.Group(); addCircuitPanel(g);
  g.add(mkCircBox("DC Power Supply", 3, 2.5, 2, mats.casing, { x: -7, y: 0, z: 0 }));
  g.add(mkCircBox("Microcontroller", 3, 2.5, 2, mats.pcbBoard, { x: -1.5, y: 3.5, z: 0 }));
  g.add(mkCircBox("Microstepping Driver", 3, 2.5, 2, mats.icChip, { x: -1.5, y: 0, z: 0 }));
  g.add(mkCircBox("Current Chopper", 2.5, 2, 1.5, mats.pcbBoard, { x: 3.5, y: 0, z: 0 }));
  const pt = mkTerminalBox(new THREE.Vector3(8, 0, 0), "Coil Output", 4, true); g.add(pt);
  g.userData.terminals = { output: pt };
  g.add(mkWire([new THREE.Vector3(-5.5, 0.4, 0), new THREE.Vector3(-3, 0.4, 0)], mats.wireRed, "V_MOT +", 1));
  g.add(mkWire([new THREE.Vector3(-5.5, -0.4, 0), new THREE.Vector3(-3, -0.4, 0)], mats.wireBlack, "V_MOT GND", 1));
  g.add(mkWire([new THREE.Vector3(-1.5, 2.25, 0), new THREE.Vector3(-1.5, 1.25, 0)], mats.wireYellow, "STEP signal", 1));
  g.add(mkWire([new THREE.Vector3(0, 0.3, 0), new THREE.Vector3(2.25, 0.3, 0)], mats.wireRed, "Coil A+", 1));
  g.add(mkWire([new THREE.Vector3(0, -0.3, 0), new THREE.Vector3(2.25, -0.3, 0)], mats.wireBlue, "Coil A−", 1));
  for (let i = 0; i < 4; i++) { const p = pt.getObjectByName('pole_' + i).getWorldPosition(new THREE.Vector3()); const ma = [mats.wireRed, mats.wireBlue, mats.wireYellow, mats.wireBlack]; g.add(mkWire([new THREE.Vector3(4.75, 0.4 - i * 0.25, 0), new THREE.Vector3(6, p.y, 0), p], ma[i], "Coil Wire", 1)); }
  return g;
}

function buildVRStepperCircuit() {
  const g = new THREE.Group(); addCircuitPanel(g);
  g.add(mkCircBox("DC Power Supply", 3, 2.5, 2, mats.casing, { x: -7, y: 0, z: 0 }));
  g.add(mkCircBox("Pulse Indexer", 3, 2.5, 2, mats.pcbBoard, { x: -1.5, y: 3.5, z: 0 }));
  g.add(mkCircBox("Unipolar Driver", 3, 2.5, 2, mats.icChip, { x: -1.5, y: 0, z: 0 }));
  g.add(mkCircBox("Flyback Diodes", 2, 1.8, 1.2, mats.pcbBoard, { x: 3.5, y: -2.5, z: 0 }));
  const pt = mkTerminalBox(new THREE.Vector3(8, 0, 0), "Phases Out", 3, true); g.add(pt);
  g.userData.terminals = { output: pt };
  g.add(mkWire([new THREE.Vector3(-5.5, 0.4, 0), new THREE.Vector3(-3, 0.4, 0)], mats.wireRed, "V_CC", 1));
  g.add(mkWire([new THREE.Vector3(-5.5, -0.4, 0), new THREE.Vector3(-3, -0.4, 0)], mats.wireBlack, "GND", 1));
  g.add(mkWire([new THREE.Vector3(-1.5, 2.25, 0), new THREE.Vector3(-1.5, 1.25, 0)], mats.wireYellow, "Step Pulse", 1));
  for (let i = 0; i < 3; i++) { const p = pt.getObjectByName('pole_' + i).getWorldPosition(new THREE.Vector3()); const ma = [mats.wireRed, mats.wireYellow, mats.wireBlue]; g.add(mkWire([new THREE.Vector3(0, 0.6 - i * 0.6, 0), new THREE.Vector3(6, p.y, 0), p], ma[i], "Phase", 1)); }
  return g;
}

function buildPMStepperCircuit() {
  const g = new THREE.Group(); addCircuitPanel(g);
  g.add(mkCircBox("DC Power Supply", 3, 2.5, 2, mats.casing, { x: -7, y: 0, z: 0 }));
  g.add(mkCircBox("Indexer (MCU)", 3, 2.5, 2, mats.pcbBoard, { x: -1.5, y: 3.5, z: 0 }));
  g.add(mkCircBox("Bipolar H-Bridge", 3.5, 3, 2, mats.pcbBoard, { x: -1.5, y: 0, z: 0 }));
  g.add(mkCircBox("Current Limiter", 2.5, 2, 1.5, mats.icChip, { x: 3.5, y: 0, z: 0 }));
  const pt = mkTerminalBox(new THREE.Vector3(8, 0, 0), "Coil Terminals", 4, true); g.add(pt);
  g.userData.terminals = { output: pt };
  g.add(mkWire([new THREE.Vector3(-5.5, 0.4, 0), new THREE.Vector3(-3.25, 0.4, 0)], mats.wireRed, "V_MOT +", 1));
  g.add(mkWire([new THREE.Vector3(-5.5, -0.4, 0), new THREE.Vector3(-3.25, -0.4, 0)], mats.wireBlack, "V_MOT −", 1));
  g.add(mkWire([new THREE.Vector3(-1.5, 2.25, 0), new THREE.Vector3(-1.5, 1.5, 0)], mats.wireYellow, "STEP Logic", 1));
  g.add(mkWire([new THREE.Vector3(0.25, 0.35, 0), new THREE.Vector3(2.25, 0.35, 0)], mats.wireRed, "Bipolar Out A+", 1));
  g.add(mkWire([new THREE.Vector3(0.25, -0.35, 0), new THREE.Vector3(2.25, -0.35, 0)], mats.wireBlue, "Bipolar Out A−", 1));
  for (let i = 0; i < 4; i++) { const p = pt.getObjectByName('pole_' + i).getWorldPosition(new THREE.Vector3()); const ma = [mats.wireRed, mats.wireBlue, mats.wireYellow, mats.wireBlack]; g.add(mkWire([new THREE.Vector3(4.75, 0.4 - i * 0.25, 0), new THREE.Vector3(6, p.y, 0), p], ma[i], "Coil Wire", 1)); }
  return g;
}

function buildServoCircuit() {
  const g = new THREE.Group(); addCircuitPanel(g);
  g.add(mkCircBox("DC Power Supply", 3, 2.5, 2, mats.casing, { x: -7, y: 0, z: 0 }));
  g.add(mkCircBox("PWM Signal Generator", 2.5, 1.8, 1.5, mats.plastic, { x: -7, y: 4, z: 0 }));
  g.add(mkCircBox("PID Controller", 3.5, 3, 2, mats.pcbBoard, { x: -1.5, y: 0, z: 0 }));
  g.add(mkCircBox("Servo Amplifier", 3.5, 2.5, 2, mats.icChip, { x: 3.5, y: 0, z: 0 }));
  const pt = mkTerminalBox(new THREE.Vector3(8, 0, 0), "Motor & Encoder", 3, true); g.add(pt);
  g.userData.terminals = { output: pt };
  g.add(mkWire([new THREE.Vector3(-5.5, 0, 0), new THREE.Vector3(-3.25, 0, 0)], mats.wireRed, "Supply Power", 1));
  g.add(mkWire([new THREE.Vector3(-5.75, 4, 0), new THREE.Vector3(-2, 4, 0), new THREE.Vector3(-2, 1.5, 0)], mats.wireYellow, "Target PWM", 1));
  g.add(mkWire([new THREE.Vector3(0.25, 0, 0), new THREE.Vector3(1.75, 0, 0)], mats.wireRed, "Correction Signal", 1));
  const p0 = pt.getObjectByName('pole_0').getWorldPosition(new THREE.Vector3());
  const p1 = pt.getObjectByName('pole_1').getWorldPosition(new THREE.Vector3());
  const p2 = pt.getObjectByName('pole_2').getWorldPosition(new THREE.Vector3());
  g.add(mkWire([new THREE.Vector3(5.25, 0.4, 0), new THREE.Vector3(6.5, p0.y, 0), p0], mats.wireRed, "Drive Power", 1));
  g.add(mkWire([new THREE.Vector3(5.25, -0.4, 0), new THREE.Vector3(6.5, p1.y, 0), p1], mats.wireBlack, "Drive Return", 1));
  g.add(mkWire([new THREE.Vector3(5.25, 1.2, 0), new THREE.Vector3(6.5, p2.y, 0), p2], mats.wireGreen, "Encoder Bus", -1));
  return g;
}