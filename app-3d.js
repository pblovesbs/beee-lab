// =====================================================================
// MACHINE DATA REGISTRY
// =====================================================================
const machineData = {
  dc_generator: { name:'DC Generator', builder:buildDCGenerator, circuitBuilder:buildDCGeneratorCircuit, harnessBuilder:()=>buildHarness_DC(true),
    chapters:[
      {title:"DC Generator",explode:0.0,io:{input:"Rotational Torque + DC Excitation",output:"Direct Current (DC)"},desc:"Energy conversion: Mechanical → Electrical. Driven by a prime mover (turbine/engine). Field excitation creates the stationary magnetic flux."},
      {title:"Stator & Field Poles",explode:0.3,highlight:"Field Winding (Excitation)",desc:"Separately-excited field windings create a stationary magnetic flux. A Field Rheostat + AVR (Automatic Voltage Regulator) controls excitation current and output voltage."},
      {title:"Armature & Commutator",explode:0.6,highlight:"Armature Winding",desc:"The rotating armature cuts through stationary flux lines, inducing AC internally. The mechanical commutator rectifies this AC to DC at the brushes."},
      {title:"Prime Mover",explode:0.8,highlight:"Drive Shaft",desc:"The prime mover (diesel, steam turbine, hydro) provides input torque. Output DC voltage depends on flux, armature speed and number of conductors."},
      {title:"Full Circuit View",explode:1.0,desc:"Excitation supply → Field Rheostat → AVR → Field Winding. Armature → Commutator → Brushes → Circuit Breaker → DC Bus/Load."}
    ]
  },
  dc_motor: { name:'DC Motor', builder:buildDCMotor, circuitBuilder:buildDCMotorCircuit, harnessBuilder:()=>buildHarness_DC(false),
    chapters:[
      {title:"DC Motor",explode:0.0,io:{input:"DC Voltage",output:"Rotational Torque"},desc:"Energy conversion: Electrical → Mechanical via Lorentz Force on armature conductors. Widely used in variable-speed drives, traction, and robotics."},
      {title:"Stator Field",explode:0.3,highlight:"Field Pole Core",desc:"Field poles (or permanent magnets) create the stationary magnetic field. In shunt/series motors, field current controls the magnetic flux, affecting speed and torque."},
      {title:"Armature & Commutation",explode:0.6,highlight:"Carbon Brush",desc:"DC enters the armature via brushes on the commutator. The commutator ensures current always flows in the right direction for continuous rotation."},
      {title:"Starting & Control",explode:0.8,highlight:"Motor Terminal",desc:"At startup, back-EMF = 0 so a 3-point starter inserts series resistance to limit inrush current. PWM controller adjusts speed by varying armature voltage."},
      {title:"Full Circuit View",explode:1.0,desc:"DC Supply → 3-Point Starter → Field Rheostat → PWM Speed Controller → Protective Relay → Armature & Field Windings."}
    ]
  },
  transformer: { name:'Single-Phase Transformer', builder:buildTransformer, circuitBuilder:buildTransformerCircuit, harnessBuilder:buildHarness_Transformer,
    chapters:[
      {title:"Single-Phase Transformer",explode:0.0,io:{input:"AC at Primary (HV)",output:"AC at Secondary (LV)"},desc:"Static device — NO moving parts. Works ONLY on AC. DC causes core saturation. Used everywhere for voltage step-up/step-down."},
      {title:"Laminated Core",explode:0.4,highlight:"Laminated Core Centre",desc:"E-I or shell-form laminated silicon steel core. Laminations interrupt eddy currents. Closed magnetic circuit ensures nearly all primary flux links to secondary (k ≈ 0.99)."},
      {title:"Windings & Isolation",explode:0.7,highlight:"Primary Winding (HV)",desc:"Primary (HV) and Secondary (LV) are electrically isolated but magnetically coupled via mutual flux. Turns ratio N1:N2 determines voltage ratio. V2/V1 = N2/N1."},
      {title:"Insulation System",explode:0.9,highlight:"Insulating Bobbin",desc:"The insulating bobbin provides galvanic isolation — essential for safety. HV and LV windings are physically separated within the same core window."},
      {title:"Full Circuit View",explode:1.0,desc:"HV Fuse → Primary → (Core mutual flux) → Secondary → OLTC Tap Changer → LV MCB → Load."}
    ]
  },
  induction: { name:'3-Phase Induction Motor', builder:buildInductionMotor, circuitBuilder:buildInductionCircuit, harnessBuilder:buildHarness_3Phase,
    chapters:[
      {title:"3-Phase Induction Motor",explode:0.0,io:{input:"3-Phase AC",output:"Rotational Speed"},desc:"No electrical connection to rotor — current is induced electromagnetically. Most common industrial motor. Rugged, low-maintenance, self-starting."},
      {title:"Stator & Frame",explode:0.3,highlight:"Cast Iron Frame",desc:"Robust cast iron frame with cooling fins. Stator carries 3-phase winding sets displaced 120° spatially, creating a Rotating Magnetic Field (RMF) at supply frequency."},
      {title:"3-Phase Windings",explode:0.5,highlight:"Phase U Winding",desc:"Three winding sets spaced 120° apart create a Rotating Magnetic Field (RMF) at synchronous speed = 120f/p. This RMF sweeps past the rotor at slip frequency."},
      {title:"Squirrel Cage Rotor",explode:0.8,highlight:"Aluminium Rotor Bar",desc:"Cast aluminium bars short-circuited by end rings. The RMF induces current in bars. Bar current + RMF produces torque by Lenz's Law. Rotor runs just below synchronous speed."},
      {title:"Full Circuit View",explode:1.0,desc:"3-Phase Supply → Contactor → Star-Delta Starter (reduces starting current) → Thermal Overload Relay → Motor Terminal Box."}
    ]
  },
  pmsm: { name:'PM Synchronous Motor', builder:buildPMSM, circuitBuilder:buildPMSMCircuit, harnessBuilder:buildHarness_PMSM,
    chapters:[
      {title:"PMSM",explode:0.0,io:{input:"Modulated 3-Phase AC (Inverter)",output:"High-precision synchronous rotation"},desc:"High-efficiency motor used in EVs, CNC, robotics. Requires sinusoidal drive and position feedback for Field Oriented Control."},
      {title:"Distributed Stator",explode:0.4,highlight:"Stator Core",desc:"Distributed stator windings produce a near-perfect sinusoidal rotating field. The PMSM requires sinusoidal drive unlike the trapezoidal BLDC."},
      {title:"IPM Rotor",explode:0.7,highlight:"Interior Magnet (N)",desc:"Interior Permanent Magnets (IPM) buried in the iron rotor add Reluctance Torque on top of magnet torque, boosting efficiency at partial load."},
      {title:"FOC Controller",explode:1.0,highlight:"Resolver Sensor",desc:"DC link → 3-Phase Inverter → Motor. Position encoder feeds back to DSP running Field Oriented Control (FOC) for precise torque and speed."}
    ]
  },
  bldc: { name:'BLDC Motor', builder:buildBLDC, circuitBuilder:buildBLDCCircuit, harnessBuilder:buildHarness_BLDC,
    chapters:[
      {title:"BLDC Motor",explode:0.0,io:{input:"DC Power (switched by ESC)",output:"High-speed rotation"},desc:"Brushless: electronic commutation via ESC + Hall sensors replaces mechanical brushes. Used in drones, EVs, computer cooling fans."},
      {title:"Stator Coils",explode:0.4,highlight:"Phase Coil",desc:"9-tooth stator with concentrated coils. ESC switches phases in a trapezoidal (6-step) sequence. The active coil creates a magnetic pull that rotor magnets chase."},
      {title:"Surface Magnets",explode:0.7,highlight:"Surface Magnet (N)",desc:"Surface-mounted NdFeB magnets on the rotor. High remanence provides strong torque. SPM configuration gives lower inductance for high-speed operation."},
      {title:"Hall Sensors",explode:1.0,highlight:"Hall Sensor",desc:"3 Hall Effect Sensors detect rotor magnet position every 60° electrical. ESC uses Hall readings to fire the correct phase pair in sequence."}
    ]
  },
  stepper_hybrid: { name:'Hybrid Stepper', builder:buildHybridStepper, circuitBuilder:buildHybridStepperCircuit, harnessBuilder:buildHarness_Stepper,
    chapters:[
      {title:"Hybrid Stepper",explode:0.0,io:{input:"Pulsed DC sequences",output:"Precise angular steps"},desc:"Combines permanent magnet + variable reluctance teeth for fine resolution. Standard motor for CNC/3D printers. 1.8°/step standard."},
      {title:"Stator Poles",explode:0.4,highlight:"Salient Pole",desc:"8 wound poles ending in fine teeth. When energised, the pole tip becomes an electromagnet. Flux concentrates into the tooth gap, pulling rotor teeth into alignment."},
      {title:"Rotor Assembly",explode:0.7,highlight:"Axial Magnet",desc:"An axial permanent magnet between two iron rotor caps with offset teeth. The magnet makes one cap N, the other S — halving effective step angle."},
      {title:"Microstepping",explode:1.0,highlight:"Rotor Cap (N)",desc:"DC Supply → Microstepping Driver (DRV8825) → Bipolar H-Bridge. Varying current proportionally achieves micro-steps for smooth motion."}
    ]
  },
  stepper_vr: { name:'VR Stepper', builder:buildVRStepper, circuitBuilder:buildVRStepperCircuit, harnessBuilder:buildHarness_Stepper,
    chapters:[
      {title:"VR Stepper",explode:0.0,io:{input:"Discrete DC Pulses",output:"Precise angular displacement"},desc:"Soft iron rotor — NO permanent magnets — means zero detent torque. Simple construction, 30° step angle typical. Oldest type of stepper."},
      {title:"Salient Stator",explode:0.4,highlight:"Salient Stator Pole",desc:"6 wound stator poles (3 phases). When a phase is energised, the nearest rotor tooth is pulled into alignment via minimum magnetic reluctance path."},
      {title:"Soft Iron Rotor",explode:0.8,highlight:"Soft Iron Rotor",desc:"Multi-toothed soft iron rotor with no permanent magnets. No holding torque when de-energised — rotor freewheels."},
      {title:"Full Circuit",explode:1.0,desc:"DC PSU → Arduino Indexer → ULN2003 Unipolar Driver → Flyback Diodes → Phase Coils."}
    ]
  },
  stepper_pm: { name:'PM Stepper', builder:buildPMStepper, circuitBuilder:buildPMStepperCircuit, harnessBuilder:buildHarness_Stepper,
    chapters:[
      {title:"PM Stepper",explode:0.0,io:{input:"Pulsed DC",output:"Incremental rotation + Detent Torque"},desc:"Rotor holds position unpowered due to permanent magnets (detent torque). Simple, low-cost. 7.5° step angle typical for direct drive."},
      {title:"Stator Poles",explode:0.4,highlight:"Phase Coil",desc:"8 wound poles (2 phases). Current polarity determines N/S on each pole. Push-pull action drives the PM rotor to specific positions."},
      {title:"PM Rotor",explode:0.7,highlight:"PM Rotor",desc:"Cylindrical permanent magnet with radially magnetised teeth alternating N-S. Teeth reduce step angle. Detent torque holds position when unpowered."},
      {title:"H-Bridge Drive",explode:1.0,desc:"Bipolar H-Bridge Driver reverses current direction in each coil to push-pull the PM rotor through its step sequence."}
    ]
  },
  servo: { name:'Servo Motor System', builder:buildServo, circuitBuilder:buildServoCircuit, harnessBuilder:buildHarness_Servo,
    chapters:[
      {title:"Servo Motor System",explode:0.0,io:{input:"Power + PWM Signal",output:"Precise shaft position"},desc:"A complete closed-loop positioning system. Not just a motor — includes gearbox, encoder, and PID controller for accurate angular positioning."},
      {title:"Drive Motor",explode:0.3,highlight:"Motor Housing",desc:"High-speed core motor provides raw mechanical power at thousands of RPM. Small diameter for fast response and compact packaging."},
      {title:"Reduction Gearbox",explode:0.6,highlight:"Output Gear",desc:"Multi-stage gearbox reduces motor speed by 50:1–200:1, multiplying torque proportionally. Plastic or metal gears depending on torque class."},
      {title:"Closed-Loop Feedback",explode:1.0,highlight:"Encoder Disc",desc:"Optical encoder reads actual shaft angle. PID Controller computes error = target – actual, then drives servo amplifier to apply correcting current."}
    ]
  }
};

// =====================================================================
// THREE.JS ENGINE
// =====================================================================
function init() {
  const container = document.getElementById('canvas-container');
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x020611, 0.011);

  scene.add(new THREE.AmbientLight(0xffffff, 0.45));
  const key = new THREE.DirectionalLight(0xffffff, 2.0); key.position.set(12,22,16); key.castShadow = true; scene.add(key);
  const fill = new THREE.DirectionalLight(0x88bbff, 0.9); fill.position.set(-18,2,-12); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffddaa, 1.1); rim.position.set(2,12,-22); scene.add(rim);
  const ground = new THREE.DirectionalLight(0x334455, 0.5); ground.position.set(0,-10,0); scene.add(ground);

  // Subtle floor
  const grid = new THREE.GridHelper(100, 70, 0x0f2040, 0x070f1e);
  grid.position.y = -9; scene.add(grid);

  camera = new THREE.PerspectiveCamera(42, container.clientWidth/container.clientHeight, 0.1, 200);
  camera.position.set(16, 10, 22);

  renderer = new THREE.WebGLRenderer({antialias:true, alpha:true});
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.05;
  controls.maxDistance = 70; controls.minDistance = 3;
  controls.enablePan = true; controls.target.set(2,0,0);

  controls.addEventListener('start', ()=>{ if(camTweenActive) camTweenActive=false; if(transitionActive) transitionActive=false; });

  window.addEventListener('resize', onResize);
  renderer.domElement.addEventListener('mousemove', onMouseMove);
  renderer.domElement.addEventListener('dblclick', onCanvasDblClick);

  document.getElementById('speed-slider').addEventListener('input', e=>{
    simulationSpeed = parseFloat(e.target.value);
    document.getElementById('speed-val').innerText = simulationSpeed.toFixed(1)+'×';
    document.getElementById('speed-status').innerText = `Speed: ${simulationSpeed.toFixed(1)}×`;
  });

  document.getElementById('story-container').addEventListener('scroll', handleScroll);

  document.addEventListener('click', e=>{
    if(!e.target.closest('#legend-btn')&&!e.target.closest('#legend-dropdown')) { if(legendOpen) toggleLegend(false); }
    if(!e.target.closest('#machine-btn')&&!e.target.closest('#machine-dropdown')) { if(machineMenuOpen) toggleMachineMenu(false); }
  });

  buildMachineDropdown();
  loadMachine('dc_motor');
  animate();
}

// =====================================================================
// ANIMATE LOOP
// =====================================================================
function animate() {
  requestAnimationFrame(animate);
  const dt = 0.016;
  curExplode += (targetExplode - curExplode) * 0.06;

  // Update explode bar
  document.getElementById('explode-fill').style.height = (curExplode*100)+'%';

  const targetSpeed = isPowered ? simulationSpeed : 0;
  currentMomentum += (targetSpeed - currentMomentum) * 0.03;

  if(currentMachine) {
    currentMachine.update(dt, currentMomentum);
    currentMachine.explode(curExplode);
  }

  if(isPowered) wireFlowTime += dt * simulationSpeed * 4;

  flowWires.forEach(fw=>{
    if(fw.userData.flowMat){
      const tgt = isPowered ? 0.8 : 0;
      fw.userData.flowMat.opacity += (tgt - fw.userData.flowMat.opacity)*0.1;
      if (isPowered) {
         // Animating flow texture translation
         fw.userData.flowMat.map.offset.x -= dt * simulationSpeed * 1.5 * fw.userData.flowMat.userData.flowSpeed;
      }
    }
  });

  terminalGlows.forEach(glow=>{
    const phase = glow.userData.phaseOffset||0;
    const tgt = isPowered ? Math.max(0,(Math.sin(wireFlowTime*3+phase)+1)*0.45) : 0;
    glow.material.opacity += (tgt - glow.material.opacity)*0.1;
  });

  // Update scene labels
  sceneLabels.forEach(l=>{
    let visible=true; let p=l.mesh;
    while(p){if(!p.visible){visible=false;break;} p=p.parent;}
    if(!visible){l.el.classList.add('hidden');return;}
    const pos=new THREE.Vector3(); l.mesh.getWorldPosition(pos); pos.y+=l.yOffset;
    const dist=camera.position.distanceTo(pos);
    pos.project(camera);
    if(pos.z>1||dist>50){l.el.classList.add('hidden');return;}
    l.el.classList.remove('hidden');
    const x=(pos.x*0.5+0.5)*window.innerWidth;
    const y=(pos.y*-0.5+0.5)*window.innerHeight;
    l.el.style.transform=`translate(-50%,-50%) translate(${x}px,${y}px)`;
    l.el.style.opacity=Math.max(0.1,1-(dist/45));
    if(focusedMeshName===l.name) l.el.classList.add('focus-label-active');
    else l.el.classList.remove('focus-label-active');
  });

  // Camera tweening
  if(camTweenActive && focusedMesh){
    focusedMesh.getWorldPosition(targetCamLook);
    if(focusedMesh.geometry && focusedMesh.geometry.boundingSphere){
      let r=focusedMesh.geometry.boundingSphere.radius*(focusedMesh.scale.x||1);
      r=Math.max(3.5,Math.min(r,18));
      const dir=targetCamLook.clone().normalize();
      if(dir.length()<0.1) dir.set(0,0,1);
      const offset=dir.multiplyScalar(r*2.5).add(new THREE.Vector3(0,r*0.8,0));
      targetCamPos.copy(targetCamLook).add(offset);
    } else {
      targetCamPos.copy(targetCamLook).add(new THREE.Vector3(0,2,8));
    }
    controls.target.lerp(targetCamLook,0.08);
    camera.position.lerp(targetCamPos,0.06);
  } else if(transitionActive){
    controls.target.lerp(targetCamLook,0.06);
    camera.position.lerp(targetCamPos,0.04);
    if(camera.position.distanceTo(targetCamPos)<0.5) transitionActive=false;
  } else if(!focusModeActive&&!transitionActive){
    const neutralTarget = showCircuits ? new THREE.Vector3(-2,0,-2) : new THREE.Vector3(4,-2,6);
    controls.target.lerp(neutralTarget,0.015);
  }

  controls.update();
  renderer.render(scene, camera);
}

// =====================================================================
// LOAD MACHINE
// =====================================================================
function loadMachine(key) {
  if(currentMachine){
    scene.remove(currentMachine.group);
    if(currentMachine.circuitGroup) scene.remove(currentMachine.circuitGroup);
    if(currentMachine.harnessGroup) scene.remove(currentMachine.harnessGroup);
    interactables=[]; flowWires=[]; terminalGlows=[];
    clearLabels(); clearFocusMode(true); targetExplode=0; curExplode=0;
  }
  currentMachineKey = key;
  const data = machineData[key];
  document.getElementById('current-machine-label').innerText = data.name;

  // Update active state in dropdown
  document.querySelectorAll('.machine-item').forEach(el=>el.classList.toggle('active', el.dataset.key===key));

  currentMachine = data.builder();
  currentMachine.circuitGroup = data.circuitBuilder();

  // Position components fixed in world space far apart to avoid explode overlap
  currentMachine.group.position.set(4, -2, 6);
  currentMachine.group.updateMatrixWorld(true);

  currentMachine.circuitGroup.position.set(-14, 2, -10);
  currentMachine.circuitGroup.updateMatrixWorld(true);

  // Then construct harness
  currentMachine.harnessGroup = data.harnessBuilder();

  currentMachine.circuitGroup.visible = showCircuits;
  currentMachine.harnessGroup.visible = showCircuits;

  scene.add(currentMachine.group);
  scene.add(currentMachine.circuitGroup);
  scene.add(currentMachine.harnessGroup);

  buildStory(data.chapters);
  populateLegend();
  clearFocusMode(true);
  targetExplode=0;

  const sc = document.getElementById('story-container');
  sc.scrollTo({top:0,behavior:'smooth'});

  // Update status
  document.getElementById('machine-status').innerText = `${data.name} · ${isPowered?'Running':'Stopped'}`;
}

// =====================================================================
// UI CONTROLS
// =====================================================================
function togglePower() {
  isPowered = !isPowered;
  const btn = document.getElementById('power-btn');
  btn.className = isPowered ? 'on' : 'off';
  document.getElementById('power-label').innerText = isPowered ? 'POWER ON' : 'POWER OFF';
  const data = machineData[currentMachineKey];
  document.getElementById('machine-status').innerText = `${data.name} · ${isPowered?'Running':'Stopped'}`;
}

function toggleCircuits() {
  showCircuits = !showCircuits;
  const btn = document.getElementById('circuit-btn');
  const txt = document.getElementById('circuit-btn-text');
  clearFocusMode(false);
  if(showCircuits){
    btn.classList.add('active'); txt.innerText='Hide Circuits';
    if(currentMachine){
      if(currentMachine.circuitGroup) currentMachine.circuitGroup.visible=true;
      if(currentMachine.harnessGroup) currentMachine.harnessGroup.visible=true;
    }
    targetCamLook.set(-2, 0, -2);
    targetCamPos.set(-2, 18, 38);
    transitionActive=true;
  } else {
    btn.classList.remove('active'); txt.innerText='View Circuits';
    if(currentMachine){
      if(currentMachine.circuitGroup) currentMachine.circuitGroup.visible=false;
      if(currentMachine.harnessGroup) currentMachine.harnessGroup.visible=false;
    }
    targetCamLook.set(4, -2, 6);
    targetCamPos.set(18, 6, 26);
    transitionActive=true;
  }
  populateLegend();
}

function changeChapter(delta) {
  const sc = document.getElementById('story-container');
  const chapters = sc.querySelectorAll('.chapter');
  if(!chapters.length) return;
  currentChapterIndex = Math.max(0, Math.min(currentChapterIndex+delta, chapters.length-1));
  isAutoScroll = true;
  chapters[currentChapterIndex].scrollIntoView({behavior:'smooth', block:'start'});
  setTimeout(()=>{
    chapters.forEach(c=>c.classList.remove('active'));
    chapters[currentChapterIndex].classList.add('active');
    targetExplode = parseFloat(chapters[currentChapterIndex].dataset.explode);
    const hn = chapters[currentChapterIndex].dataset.highlight;
    if(hn&&hn!==focusedMeshName){ focusedMeshName=hn; applySpotlight(hn,true); }
    else if(!hn){ focusedMeshName=null; removeSpotlight(); }
    updateStageCounter();
    isAutoScroll = false;
  }, 600);
}

// =====================================================================
// STORY
// =====================================================================
function buildStory(chapters) {
  currentChapterIndex = 0;
  const c = document.getElementById('story-container'); c.innerHTML='';
  document.getElementById('stage-total').innerText = chapters.length;
  document.getElementById('stage-current').innerText = '1';

  chapters.forEach((ch, i)=>{
    const div = document.createElement('div');
    div.className = 'chapter' + (i===0?' active':'');
    div.dataset.explode = ch.explode;
    div.dataset.highlight = ch.highlight||'';

    const ioBadges = ch.io ? `
      <div class="io-badges">
        <span class="io-badge input">⚡ IN: ${ch.io.input}</span>
        <span class="io-badge output">⚙ OUT: ${ch.io.output}</span>
      </div>` : '';

    const hint = i===0 ? `<div class="scroll-hint"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3"/></svg> Use arrows or scroll to explore</div>` : '';

    div.innerHTML = `
      <div class="chapter-card">
        <div class="chapter-stage">Stage 0${i+1}</div>
        <div class="chapter-title">${ch.title}</div>
        <div class="chapter-desc">${ch.desc}</div>
        ${ioBadges}
        ${hint}
      </div>`;
    c.appendChild(div);
  });
}

function updateStageCounter() {
  const sc = document.getElementById('story-container');
  const total = sc.querySelectorAll('.chapter').length;
  document.getElementById('stage-current').innerText = currentChapterIndex+1;
  document.getElementById('stage-total').innerText = total;
}

function handleScroll() {
  if(isAutoScroll||focusModeActive) return;
  const c = document.getElementById('story-container');
  const chapters = c.querySelectorAll('.chapter');
  const top = c.scrollTop;
  let cIdx = 0, minD = Infinity;
  chapters.forEach((ch,i)=>{
    const d = Math.abs(ch.offsetTop - top);
    if(d<minD){minD=d;cIdx=i;}
    ch.classList.remove('active');
  });
  if(chapters[cIdx]){
    chapters[cIdx].classList.add('active');
    currentChapterIndex = cIdx;
    targetExplode = parseFloat(chapters[cIdx].dataset.explode);
    const hn = chapters[cIdx].dataset.highlight;
    if(hn&&hn!==focusedMeshName){focusedMeshName=hn;applySpotlight(hn,true);}
    else if(!hn){focusedMeshName=null;removeSpotlight();}
    updateStageCounter();
  }
}

// =====================================================================
// LEGEND
// =====================================================================
function populateLegend() {
  const list = document.getElementById('component-list'); list.innerHTML='';
  const seen=new Set(), machineParts=[], circuitParts=[], connParts=[];
  interactables.forEach(m=>{
    const cat=m.userData.category, name=m.userData.name;
    if(seen.has(name)||!name) return; seen.add(name);
    if(cat==='machine') machineParts.push(m);
    else if(cat==='circuit'&&showCircuits) circuitParts.push(m);
    else if(cat==='connection'&&showCircuits) connParts.push(m);
  });

  const addSection=(parts,label,cls)=>{
    if(!parts.length) return;
    const h=document.createElement('div'); h.className='legend-section-label'; h.innerText=label; list.appendChild(h);
    parts.sort((a,b)=>a.userData.name.localeCompare(b.userData.name)).forEach(m=>{
      const div=document.createElement('div'); div.className=`legend-item ${cls}`; div.innerText=m.userData.name; div.dataset.name=m.userData.name;
      div.addEventListener('dblclick',()=>triggerFocus(m.userData.name));
      div.addEventListener('mouseenter',()=>{if(!focusModeActive) applySpotlight(m.userData.name,false);});
      div.addEventListener('mouseleave',()=>{if(!focusModeActive){removeSpotlight(); if(focusedMeshName) applySpotlight(focusedMeshName,true);}});
      list.appendChild(div);
    });
  };
  addSection(machineParts,'Machine Parts','');
  addSection(circuitParts,'Circuit Components','circuit');
  addSection(connParts,'Harness / Connections','conn');
}

// =====================================================================
// FOCUS MODE
// =====================================================================
function triggerFocus(name) {
  toggleLegend(false);
  focusModeActive=true; focusedMeshName=name;
  const mesh=interactables.find(m=>m.userData.name===name);
  if(!mesh) return;

  if(mesh.userData.category==='machine'){
    const chapters=machineData[currentMachineKey].chapters;
    let bestIdx=chapters.length-1;
    chapters.forEach((ch,i)=>{if(ch.highlight===name) bestIdx=i;});
    const sc=document.getElementById('story-container');
    const chs=sc.querySelectorAll('.chapter');
    if(chs[bestIdx]){
      currentChapterIndex=bestIdx;
      isAutoScroll=true;
      chs[bestIdx].scrollIntoView({behavior:'smooth',block:'start'});
      setTimeout(()=>isAutoScroll=false,900);
      chs.forEach(c=>c.classList.remove('active'));
      chs[bestIdx].classList.add('active');
      targetExplode=parseFloat(chs[bestIdx].dataset.explode);
      updateStageCounter();
    }
  } else { targetExplode=1.0; }

  applySpotlight(name,false);
  focusedMesh=mesh; camTweenActive=true; transitionActive=false;
  document.getElementById('focus-name').innerText=name;
  document.getElementById('focus-banner').classList.add('visible');
}

function clearFocusMode(resetCamera=false) {
  focusModeActive=false; camTweenActive=false; focusedMesh=null; focusedMeshName=null;
  document.getElementById('focus-banner').classList.remove('visible');
  removeSpotlight(); handleScroll();
  if(resetCamera){
    targetCamLook.set(showCircuits ? -2 : 4, showCircuits ? 0 : -2, showCircuits ? -2 : 6);
    targetCamPos.set(showCircuits ? -2 : 18, showCircuits ? 18 : 6, showCircuits ? 38 : 26);
    transitionActive=true;
  }
}

function applySpotlight(name,soft) {
  interactables.forEach(m=>{
    if(m.userData.name===name){
      if(m.material&&m.material.emissive!==undefined){m.material.emissive.setHex(0x0ea5e9);m.material.transparent=false;m.material.opacity=1;}
    } else {
      if(m.material){m.material.transparent=true;m.material.opacity=soft?0.35:0.05; if(m.material.emissive!==undefined)m.material.emissive.setHex(0);}
    }
  });
  document.querySelectorAll('.legend-item').forEach(el=>el.classList.toggle('active',el.dataset.name===name));
}

function removeSpotlight() {
  interactables.forEach(m=>{
    if(m.material){
      if(m.material.emissive!==undefined) m.material.emissive.setHex(m.userData.originalEmissive||0);
      m.material.transparent=m.userData.originalMat?.transparent||false;
      m.material.opacity=m.userData.originalMat?.opacity||1;
    }
  });
  document.querySelectorAll('.legend-item').forEach(el=>el.classList.remove('active'));
}

// =====================================================================
// MOUSE EVENTS
// =====================================================================
function onMouseMove(e) {
  mouse.x=(e.clientX/window.innerWidth)*2-1;
  mouse.y=-(e.clientY/window.innerHeight)*2+1;
  const visible=interactables.filter(m=>{let p=m;while(p){if(!p.visible)return false;p=p.parent;}return true;});
  raycaster.setFromCamera(mouse,camera);
  const hits=raycaster.intersectObjects(visible,false);
  const tt=document.getElementById('tooltip');
  if(hits.length>0){
    const obj=hits[0].object;
    if(hoveredObject!==obj){hoveredObject=obj;if(!focusModeActive)applySpotlight(obj.userData.name,false);}
    tt.style.opacity='1'; tt.style.left=e.clientX+'px'; tt.style.top=e.clientY+'px';
    tt.innerText=obj.userData.name; document.body.style.cursor='pointer';
  } else {
    if(hoveredObject){hoveredObject=null;if(!focusModeActive){removeSpotlight();if(focusedMeshName)applySpotlight(focusedMeshName,true);}}
    tt.style.opacity='0'; document.body.style.cursor='default';
  }
}

function onCanvasDblClick(e) {
  mouse.x=(e.clientX/window.innerWidth)*2-1;
  mouse.y=-(e.clientY/window.innerHeight)*2+1;
  const visible=interactables.filter(m=>{let p=m;while(p){if(!p.visible)return false;p=p.parent;}return true;});
  raycaster.setFromCamera(mouse,camera);
  const hits=raycaster.intersectObjects(visible,false);
  if(hits.length>0) triggerFocus(hits[0].object.userData.name);
}

function onResize() {
  camera.aspect=window.innerWidth/window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth,window.innerHeight);
}

// =====================================================================
// DROPDOWN CONTROLS
// =====================================================================
function toggleLegend(force) {
  legendOpen = force!==undefined ? force : !legendOpen;
  document.getElementById('legend-dropdown').classList.toggle('hidden',!legendOpen);
  document.getElementById('legend-btn').classList.toggle('active',legendOpen);
}

function toggleMachineMenu(force) {
  machineMenuOpen = force!==undefined ? force : !machineMenuOpen;
  document.getElementById('machine-dropdown').classList.toggle('hidden',!machineMenuOpen);
  document.getElementById('machine-btn').classList.toggle('open',machineMenuOpen);
}

function buildMachineDropdown() {
  const list = document.getElementById('machine-list');
  const groups = {
    'DC Machines': ['dc_generator','dc_motor'],
    'AC Machines': ['transformer','induction','pmsm','bldc'],
    'Stepper Motors': ['stepper_hybrid','stepper_vr','stepper_pm'],
    'Servo Systems': ['servo']
  };
  for(const [grp,keys] of Object.entries(groups)){
    const gh=document.createElement('div'); gh.className='machine-group-label'; gh.innerText=grp; list.appendChild(gh);
    keys.forEach(k=>{
      const btn=document.createElement('button');
      btn.className='machine-item'; btn.innerText=machineData[k].name; btn.dataset.key=k;
      btn.onclick=()=>{loadMachine(k);toggleMachineMenu(false);};
      list.appendChild(btn);
    });
  }
}

window.onload = init;