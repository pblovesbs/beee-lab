// ═══════════════════════════════════════════════════════
// GLOBAL STATE & DATA STRUCTURES
// ═══════════════════════════════════════════════════════

let currentDevice = null;
let animFrame = null;
let simTime = 0;
let ctx = null;
let canvas = null;

// Default Configurations (Used for Reset)
const DEFAULT_STATE = {
  dcg: { rpm: 1500, if: 2.0, rl: 20 }, 
  dcm: { v: 230, load: 10 },
  tf:  { v1: 230, freq: 50, n1: 10, n2: 5 },
  im:  { freq: 50, load: 15 },
  pmsm:{ delta: 0 }, 
  bldc:{ pwm: 50 },
  st:  { rate: 10 }, 
  sv:  { sp: 90, dist: 0 }
};

// Dynamic States for all devices (Target values from UI)
let targetState = JSON.parse(JSON.stringify(DEFAULT_STATE));

// Continuous Real-Time State (Fluidly smoothed for rendering)
const state = {
  dcg: { rpm: 0, if: 0, rl: 20, type: 0, ia: 0, vout: 0, fluxDistort: 0 },
  dcm: { v: 0, load: 0, type: 0, speed: 0, eb: 0, ia: 0, rotAngle: 0 },
  tf:  { v1: 0, freq: 50, n1: 10, n2: 5, type: 1, heat: 0 }, 
  im:  { freq: 50, load: 0, slip: 0, rmfAng: 0, rotAng: 0 },
  pmsm:{ delta: 0, rmfAng: 0, rotAng: 0, stutter: 0 },
  bldc:{ pwm: 0, mode: 0, rotAng: 0, manualCoil: -1 }, 
  st:  { rate: 10, type: 0, mode: 0, angle: 0, exactPos: 0 }, 
  sv:  { sp: 90, dist: 0, pos: 0, vel: 0, hist: [] }
};

// ═══════════════════════════════════════════════════════
// DATABASE: Configurations, Layouts, and Deep Theory
// ═══════════════════════════════════════════════════════
const DEVICES = {
  dcg: {
    title: 'DC Generator', icon: '🔋', desc: 'Mechanical → Electrical Energy Conversion',
    params: [
      { id: 'rpm', name: 'Prime Mover Speed (ω)', min: 0, max: 3000, step: 10, unit: ' RPM', tip: 'Mechanical Input: Adjusts the rotational torque. Directly proportional to generated EMF.' },
      { id: 'if', name: 'Field Current (If)', min: 0.1, max: 5.0, step: 0.1, unit: ' A', tip: 'Electrical Input: DC excitation to field windings. Visually increases magnetic flux density.' },
      { id: 'rl', name: 'Load Resistance (Rl)', min: 5, max: 100, step: 1, unit: ' Ω', tip: '"Aha!" Feature: Decreasing resistance draws massive Armature Current (Ia). Watch the magnetic flux lines severely distort!' }
    ],
    toggles: [ { id: 'type', options: ['Lap Winding', 'Wave Winding'], tip:'Lap (A=P) for High Current. Wave (A=2) for High Voltage. Alters the EMF Equation.' } ],
    theory: `
      <h3>DC Generator: Construction & Working</h3>
      <p><strong>Core Concept:</strong> Converts mechanical energy into electrical energy using Faraday's Law of electromagnetic induction, with a commutator to make the alternating induced EMF unidirectional.</p>
      <p><strong>Visual Animation:</strong> Observe the cross-section of the yoke, field poles, and rotating armature. Hover over the parts to see their functions. Critically, watch the split-ring commutator spinning against the stationary carbon brushes, rectifying the internal AC sine wave into pulsating DC on the output graph.</p>
      
      <h3>Fundamental Equations</h3>
      <div class="eq-box">E<sub>g</sub> = (P × Φ × N × Z) / (60 × A)</div>
      <ul>
        <li><strong>E<sub>g</sub></strong> = Generated EMF, <strong>P</strong> = Poles, <strong>Φ</strong> = Flux per pole, <strong>N</strong> = RPM</li>
        <li><strong>Z</strong> = Conductors, <strong>A</strong> = Parallel paths (Lap: A=P, Wave: A=2)</li>
      </ul>
      <p><strong>Terminal Voltage:</strong> <span class="highlight">V = E<sub>g</sub> - I<sub>a</sub>R<sub>a</sub></span> (Internal voltage drop heavily reduces output under load).</p>
    `
  },
  dcm: {
    title: 'DC Motor', icon: '⚙️', desc: 'Electrical → Mechanical Energy Conversion',
    params: [
      { id: 'v', name: 'Applied Voltage (V)', min: 0, max: 400, step: 1, unit: ' V', tip: 'Electrical Input: Constant DC voltage powering the armature conductors. Increases speed.' },
      { id: 'load', name: 'Mechanical Torque', min: 0, max: 50, step: 0.5, unit: ' N·m', tip: '"Aha!" Feature: Increase the load! The rotor will visibly slow, Back-EMF (Eb) drops, and Armature Current (Ia) turns bright red as it draws heavy power.' }
    ],
    toggles: [ { id: 'type', options: ['Lap Wound', 'Wave Wound'], tip:'Winding affects Back-EMF constant and parallel current paths.' } ],
    theory: `
      <h3>DC Motor: Layout & Conversion</h3>
      <p><strong>Core Concept:</strong> Current-carrying conductors in a magnetic field experience a Lorentz force, converting electrical energy to mechanical energy.</p>
      <p><strong>Visual Animation:</strong> Similar physical setup to the generator. Observe electron flow (current) entering the brushes, flowing through the armature coils, and experiencing a physical "push" represented by dynamic green force vectors on the conductors. The conductors smoothly turn red when drawing high current under load.</p>
      
      <h3>Fundamental Equations</h3>
      <p>When the armature rotates, it cuts flux and generates an opposing voltage called Back EMF (E<sub>b</sub>).</p>
      <div class="eq-box">V = E<sub>b</sub> + I<sub>a</sub>R<sub>a</sub></div>
      <p>The torque produced is directly proportional to Flux and Armature Current:</p>
      <div class="eq-box">Torque (T) = 0.159 × Φ × Z × I<sub>a</sub> × (P / A)</div>
      <ul>
        <li>If load increases, Speed (N) drops → E<sub>b</sub> drops → I<sub>a</sub> heavily increases → Torque increases to match the load.</li>
      </ul>
    `
  },
  tf: {
    title: 'Single-Phase Transformer', icon: '⚡', desc: 'Static Electromagnetic Voltage Conversion',
    params: [
      { id: 'v1', name: 'Primary Voltage (Vin)', min: 0, max: 440, step: 1, unit: ' V', tip: 'Input AC Voltage driving the magnetizing current.' },
      { id: 'freq', name: 'AC Frequency (f)', min: 10, max: 100, step: 1, unit: ' Hz', tip: 'Rate of flux alternation. Visually speeds up the pulsing magnetic flux loop.' },
      { id: 'n1', name: 'Primary Turns (N1)', min: 5, max: 20, step: 1, unit: '', tip: 'Dynamically draws the exact number of coils. Changes transformation ratio.' },
      { id: 'n2', name: 'Secondary Turns (N2)', min: 5, max: 20, step: 1, unit: '', tip: 'Controls Step-up/Step-down ratio mathematically and visually.' }
    ],
    toggles: [ { id: 'type', options: ['Laminated Core', 'Solid Core'], tip:'"Aha!" Feature: Solid core allows massive swirling Eddy Currents (red rings) causing severe heat loss.' } ],
    theory: `
      <h3>Single-Phase Transformer</h3>
      <p><strong>Core Concept:</strong> A static device transferring energy between magnetically coupled circuits via time-varying magnetic flux.</p>
      <p><strong>Visual Animation:</strong> Observe the iron core with exact Primary (N1) and Secondary (N2) windings drawn. The alternating magnetic flux pulses in a loop around the core. Notice the live stacked sine waves showing Phase and Amplitude relationships cleanly.</p>
      
      <h3>Equivalent Circuit & Equations</h3>
      <div class="eq-box">E = 4.44 × f × N × Φ<sub>max</sub></div>
      <ul>
        <li><strong>E</strong> = RMS Induced Voltage</li>
        <li><strong>f</strong> = Frequency, <strong>N</strong> = Number of turns, <strong>Φ<sub>max</sub></strong> = Peak core flux</li>
      </ul>
      <p><strong>Transformation Ratio (K):</strong> K = N<sub>2</sub> / N<sub>1</sub> = V<sub>2</sub> / V<sub>1</sub> = I<sub>1</sub> / I<sub>2</sub></p>
      <p><strong>Core Type:</strong> A Solid Core allows massive internal Eddy Currents (swirling red visuals), causing immense heat loss. Laminated cores block these large current loops, keeping efficiency high.</p>
    `
  },
  im: {
    title: '3-Phase Induction Motor', icon: '🌀', desc: 'Rotating Magnetic Field & Slip',
    params: [
      { id: 'freq', name: 'Supply Freq (f)', min: 10, max: 60, step: 1, unit: ' Hz', tip: 'Controls the Synchronous Speed of the Rotating Magnetic Field (RMF) sweeping cone.' },
      { id: 'load', name: 'Mechanical Load', min: 0, max: 50, step: 0.5, unit: ' N·m', tip: '"Aha!" Feature: Watch the yellow cage bar! As load increases, the RMF vector visibly laps the rotor faster (Slip increases).' }
    ],
    theory: `
      <h3>Three-Phase Induction Motor</h3>
      <p><strong>Core Concept:</strong> A three-phase stator produces a Rotating Magnetic Field (RMF) that induces current in a squirrel cage rotor, dragging it along.</p>
      <p><strong>Visual Animation:</strong> A circular stator with 3 color-coded phase windings. A large sweeping cone vector represents the RMF. The bright yellow bar on the rotor acts as a "Slip Visualizer" showing the rotor constantly falling behind the RMF dynamically.</p>
      
      <h3>Slip & Synchronous Speed</h3>
      <div class="eq-box">N<sub>s</sub> = (120 × f) / P</div>
      <p>The rotor can never reach N<sub>s</sub> (if it did, relative motion = 0, induced EMF = 0, Torque = 0).</p>
      <div class="eq-box">Slip (s) = (N<sub>s</sub> - N<sub>r</sub>) / N<sub>s</sub></div>
      
      <h3>Torque Equation</h3>
      <div class="eq-box">T = (k × s × E<sub>2</sub><sup>2</sup> × R<sub>2</sub>) / (R<sub>2</sub><sup>2</sup> + (sX<sub>2</sub>)<sup>2</sup>)</div>
      <p>The dynamic Torque-Slip graph plots this equation in real-time as a moving dot tracks the motor's operating point fluidly.</p>
    `
  },
  pmsm: {
    title: 'PMSM Motor', icon: '🧲', desc: 'Permanent Magnet Synchronous',
    params: [
      { id: 'delta', name: 'Load Angle (δ)', min: 0, max: 120, step: 1, unit: '°', tip: '"Aha!" Feature: Simulates mechanical stress. Watch the magnetic rubber band stretch smoothly. If pushed past 90°, synchronism is violently lost!' }
    ],
    theory: `
      <h3>Permanent Magnet Synchronous Machine (PMSM)</h3>
      <p><strong>Core Concept:</strong> A synchronous machine where the rotor is made of permanent magnets that lock perfectly into step with the stator's RMF.</p>
      <p><strong>Visual Animation:</strong> The rotor features fixed N/S permanent magnets facing the airgap. A visual "magnetic rubber band" connects the Stator RMF to the Rotor's North pole, visualizing the load angle smoothly.</p>
      
      <h3>Load Angle (δ) & Synchronism</h3>
      <p>As mechanical load increases, the rotor falls behind the RMF by a distinct angle δ, but continues spinning at exactly Synchronous Speed.</p>
      <div class="eq-box">Power (P) = (3 × V × E / X<sub>s</sub>) × sin(δ)</div>
      <p>If the Load Angle exceeds 90°, the rubber band snaps. Maximum power is exceeded, and the rotor violently stutters, completely losing synchronism (Stalling).</p>
    `
  },
  bldc: {
    title: 'BLDC Motor', icon: '🤖', desc: 'Brushless DC & Commutation',
    params: [
      { id: 'pwm', name: 'PWM Duty Cycle (Speed)', min: 10, max: 100, step: 1, unit: '%', tip: 'Controls how fast the Electronic Speed Controller (ESC) fires pulses fluidly.' }
    ],
    toggles: [ { id: 'mode', options: ['Auto (Sensors)', 'Manual (Click Coils)'], tip:'"Aha!" Feature: In Manual mode, click the 6 stator coils in a circle to manually drag the magnet around!' } ],
    theory: `
      <h3>Brushless DC Motor (BLDC)</h3>
      <p><strong>Core Concept:</strong> An "inside-out" DC motor using an electronic solid-state inverter and rotor position sensors instead of mechanical brushes.</p>
      <p><strong>Visual Animation:</strong> Permanent magnet rotor inside a stator. The Electronic Speed Controller (ESC inverter block) takes DC supply and fires gate pulses to the stator. Observe the 3-phase trapezoidal Back-EMF and square-wave current pulses on the graph.</p>
      
      <h3>Electronic Commutation</h3>
      <p>In Auto Mode, Hall-Effect sensors perfectly time the 120° commutation, ensuring only 2 phases are active at any time to maximize torque.</p>
      <p>In <strong>Manual Commutation Mode</strong>, you take the place of the ESC. You must click the 6 stator coils in the exact sequence to pull the magnet around, gamifying the concept of electronic commutation!</p>
    `
  },
  st: {
    title: 'Stepper Motor', icon: '🪜', desc: 'Discrete Reluctance Steps',
    params: [
      { id: 'rate', name: 'Pulse Rate (Speed)', min: 1, max: 20, step: 1, unit: ' Hz', tip: 'Frequency of input pulses. Watch the Logic Timing Diagram track smoothly with rotation.' }
    ],
    toggles: [
      { id: 'type', options: ['Var. Reluctance (VR)', 'PM Hybrid'], tip:'VR uses a soft iron toothed rotor. PM uses a magnetized rotor with detent torque.' }
    ],
    theory: `
      <h3>Stepper Motor Types</h3>
      <p><strong>Core Concept:</strong> A pulse-driven motor that changes angular position in distinct discrete "steps".</p>
      <p><strong>Visual Animation:</strong> "Aha!" Magnetic Reluctance Visualizer. Watch the invisible magnetic flux lines act like elastic bands, pulling the nearest misaligned rotor tooth into perfect alignment.</p>
      
      <h4>Variable Reluctance (VR) vs PM</h4>
      <p><strong>VR:</strong> Uses a non-magnetic soft iron multi-tooth rotor that strictly seeks the path of minimum magnetic reluctance.</p>
      <p><strong>PM/Hybrid:</strong> Rotor is magnetized. Possesses "Detent Torque" to hold position, providing finer step angles.</p>
      
      <h3>Step Angle & Logic</h3>
      <div class="eq-box">Step Angle = 360° / (Stator Phases × Rotor Teeth)</div>
      <p>Observe the Logic Timing Diagram mapping the High/Low square waves for Phase A, B, and C as the controller fires them sequentially.</p>
    `
  },
  sv: {
    title: 'Servo Motor', icon: '🎯', desc: 'Closed-Loop PID Control',
    params: [
      { id: 'sp', name: 'Target Angle (Setpoint)', min: 0, max: 360, step: 1, unit: '°', tip: 'Command the desired position. Watch the Error shrink to zero fluidly on the Block Diagram.' },
      { id: 'dist', name: 'Disturbance Force', min: -50, max: 50, step: 1, unit: '%', tip: 'Push the servo arm mechanically. The PID loop will visually fight back to hold position!' }
    ],
    theory: `
      <h3>Servo Motor Systems</h3>
      <p><strong>Core Concept:</strong> A closed-loop servomechanism using position feedback to control exact angular position dynamically.</p>
      <p><strong>Visual Animation:</strong> An electric motor connected to a reduction gearbox, driving a horn. Critically, observe the Control Block Diagram overlay and watch the logic update live with high precision.</p>
      
      <h3>Closed-Loop Control</h3>
      <p>Unlike open-loop steppers, servos use a sensor to perfectly correct errors dynamically.</p>
      <div class="eq-box">Error (e) = Setpoint (Target) - Actual Position</div>
      <p>"Aha!" Feature: Watch the math happen live. When you move the Target slider, the Error flashes large, the Error Amplifier drives the motor, and as the gear turns the Position Sensor, the Error dynamically ticks down to exactly 0, bringing the Step Response graph to rest.</p>
    `
  }
};

// ═══════════════════════════════════════════════════════
// NAVIGATION, UI UPDATES & REFRESH
// ═══════════════════════════════════════════════════════
function navTo(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(screenId + '-screen').classList.add('active');
  
  if (screenId === 'home') {
    cancelAnimationFrame(animFrame);
    currentDevice = null;
    buildGrid();
  }
}

function buildGrid() {
  const container = document.getElementById('grid-container');
  container.innerHTML = '';
  Object.keys(DEVICES).forEach(key => {
    const d = DEVICES[key];
    container.innerHTML += `
      <div class="device-card" onclick="loadDevice('${key}')">
        <div class="dc-title"><span style="font-size:2.2rem">${d.icon}</span> ${d.title}</div>
        <div class="dc-desc">${d.desc}</div>
      </div>
    `;
  });
}

function loadDevice(key) {
  currentDevice = key;
  const d = DEVICES[key];
  document.getElementById('dev-title').textContent = d.icon + ' ' + d.title;
  document.getElementById('theory-content').innerHTML = d.theory;
  
  buildControlsUI(key, d);
  
  navTo('device');
  
  // Set up responsive canvas
  canvas = document.getElementById('simCanvas');
  ctx = canvas.getContext('2d');
  
  // Initialize/Reset local render states smoothly
  if(key === 'st') { state.st.angle = 0; state.st.exactPos = 0; }
  if(key === 'sv') { state.sv.hist = []; state.sv.pos = targetState.sv.sp; } // Start at target
  
  simTime = 0;
  cancelAnimationFrame(animFrame);
  renderLoop();
}

function buildControlsUI(key, d) {
  const ctrlContainer = document.getElementById('controls-container');
  let html = '';
  
  if (d.toggles) {
    d.toggles.forEach(t => {
      html += `
        <div class="param-group">
          <div class="param-header">
            <span class="param-name">Configuration <span class="info-icon" data-tip="${t.tip}">i</span></span>
          </div>
          <div class="toggle-group">
            <button class="btn-toggle active" id="btn-tg-${t.id}-0" onclick="setToggle('${t.id}', 0)">${t.options[0]}</button>
            <button class="btn-toggle" id="btn-tg-${t.id}-1" onclick="setToggle('${t.id}', 1)">${t.options[1]}</button>
          </div>
        </div>
      `;
    });
  }
  
  d.params.forEach(p => {
    html += `
      <div class="param-group">
        <div class="param-header">
          <span class="param-name">${p.name} <span class="info-icon" data-tip="${p.tip}">i</span></span>
          <span class="param-val" id="val-${p.id}">${targetState[key][p.id]}${p.unit}</span>
        </div>
        <input type="range" id="sl-${p.id}" min="${p.min}" max="${p.max}" step="${p.step}" value="${targetState[key][p.id]}" 
               oninput="updateParam('${p.id}', this.value, '${p.unit}')">
      </div>
    `;
  });
  ctrlContainer.innerHTML = html;
  
  // Update slider backgrounds immediately
  d.params.forEach(p => {
    const el = document.getElementById(`sl-${p.id}`);
    const pct = ((el.value - el.min) / (el.max - el.min)) * 100;
    el.style.setProperty('--pct', pct + '%');
  });
}

function resetCurrentDevice() {
  if (!currentDevice) return;
  // Deep copy default state to target
  targetState[currentDevice] = JSON.parse(JSON.stringify(DEFAULT_STATE[currentDevice]));
  // Rebuild UI controls to reflect defaults
  buildControlsUI(currentDevice, DEVICES[currentDevice]);
  // Reset specific histories
  if(currentDevice === 'sv') { state.sv.hist = []; state.sv.vel = 0; }
}

function updateParam(id, val, unit) {
  targetState[currentDevice][id] = parseFloat(val);
  document.getElementById(`val-${id}`).textContent = val + unit;
  const el = document.getElementById(`sl-${id}`);
  const pct = ((val - el.min) / (el.max - el.min)) * 100;
  el.style.setProperty('--pct', pct + '%');
}

function setToggle(id, val) {
  state[currentDevice][id] = val; // Toggles update immediate render state
  const b0 = document.getElementById(`btn-tg-${id}-0`);
  const b1 = document.getElementById(`btn-tg-${id}-1`);
  if(b0 && b1) {
    b0.classList.toggle('active', val===0);
    b1.classList.toggle('active', val===1);
  }
}

function toggleTheory(show) {
  const t = document.getElementById('theory-overlay');
  if(show) t.classList.add('open');
  else t.classList.remove('open');
}

// ═══════════════════════════════════════════════════════
// DETAILED HIT DETECTION & INTELLIGENT HOVER LABELS
// ═══════════════════════════════════════════════════════
const tooltip = document.getElementById('canvas-tooltip');

document.getElementById('simCanvas')?.addEventListener('mousemove', (e) => {
  if(!currentDevice || !canvas) return;
  
  // offsetX/offsetY provides coordinates perfectly matching CSS bounds (0 to w)
  const x = e.offsetX; 
  const y = e.offsetY;
  const w = canvas.clientWidth; 
  const h = canvas.clientHeight;
  const cx = w * 0.35; 
  const cy = h / 2;
  const dist = Math.hypot(x - cx, y - cy);
  const angRad = Math.atan2(y - cy, x - cx);
  let angDeg = angRad * 180 / Math.PI; if(angDeg < 0) angDeg += 360;
  const graphX = w * 0.65;
  
  let tip = '';

  // Extremely Detailed Device Specific Hitboxes
  if (currentDevice === 'dcg' || currentDevice === 'dcm') {
    if (x > graphX) {
        tip = currentDevice === 'dcg' 
            ? "<strong>Pulsating DC Output Graph</strong><br>Rectified via Commutator. Notice the absence of negative cycles."
            : "<strong>Motor Energy Balance</strong><br>Applied Voltage must balance the internal Back-EMF and Resistance drop dynamically.";
    }
    else if (dist < 40) {
        tip = "<strong>Split-Ring Commutator & Shaft</strong><br>Mechanical rectifier. Reverses current flow in the armature dynamically as it spins.";
    }
    else if (x >= cx-55 && x <= cx-35 && y >= cy-20 && y <= cy+20) {
        tip = "<strong>Negative Carbon Brush</strong><br>Stationary sliding contact extracting/supplying current to the rotating commutator.";
    }
    else if (x >= cx+35 && x <= cx+55 && y >= cy-20 && y <= cy+20) {
        tip = "<strong>Positive Carbon Brush</strong><br>Stationary sliding contact connected to the external circuit.";
    }
    else if (dist >= 40 && dist < 95) {
        tip = "<strong>Armature Core & Conductors</strong><br>Carries current and cuts magnetic flux. Outer conductors dynamically react to the magnetic field.";
    }
    else if (dist >= 100 && dist < 140) {
        if ((angDeg > 315 || angDeg <= 45) || (angDeg > 135 && angDeg <= 225)) {
            tip = "<strong>Stator Field Poles</strong><br>Electromagnets generating the main stationary magnetic field (Φ). Intensity scales with Field Current.";
        } else {
            tip = "<strong>Stator Yoke</strong><br>Provides mechanical protection and a low reluctance path for the magnetic flux to complete its circuit.";
        }
    }
    else if (dist >= 95 && dist < 100) {
        tip = "<strong>Air Gap</strong><br>The crucial clearance between Rotor and Stator where electromagnetic energy conversion occurs.";
    }
  }
  else if (currentDevice === 'tf') {
    if (x > graphX) {
        tip = "<strong>Live Waveforms</strong><br>Notice Secondary V2 is perfectly 180° out of phase relative to Primary V1 due to Lenz's Law.";
    }
    else if (x >= cx-160 && x <= cx-60 && y >= cy-110 && y <= cy+110) {
        tip = "<strong>Primary Winding (N1)</strong><br>Takes input AC, creating an alternating, pulsing magnetic flux inside the core.";
    }
    else if (x >= cx+60 && x <= cx+160 && y >= cy-110 && y <= cy+110) {
        tip = "<strong>Secondary Winding (N2)</strong><br>Faraday's Law of Mutual Induction induces voltage across these turns.";
    }
    else if (x >= cx-140 && x <= cx+140 && y >= cy-120 && y <= cy+120) {
        if (x > cx-80 && x < cx+80 && y > cy-60 && y < cy+60) { 
            tip = "<strong>Core Window</strong><br>Empty space allowing windings to wrap around the central limbs.";
        } else {
            tip = state.tf.type === 0 
                ? "<strong>Laminated Iron Core</strong><br>Provides low reluctance path for flux. Laminations completely block macroscopic Eddy Currents."
                : "<strong>Solid Iron Core</strong><br>Warning: Massive Eddy Current loops causing severe thermal heat loss (Red Swirls)!";
        }
    }
  }
  else if (currentDevice === 'im') {
    if (x > graphX) {
        tip = "<strong>Torque-Slip Characteristic</strong><br>As mechanical load forces slip to increase, induced torque increases fluidly to match the load demand.";
    }
    else if (dist < 20) {
        tip = "<strong>Rotor Shaft</strong><br>Delivers mechanical torque to the physical load.";
    }
    else if (dist >= 20 && dist < 80) {
        tip = "<strong>Rotor Iron Core</strong><br>Laminated iron providing a low reluctance path to guide the Rotating Magnetic Field.";
    }
    else if (dist >= 80 && dist < 100) {
        tip = "<strong>Squirrel Cage Bars</strong><br>Short-circuited conductive bars carrying heavy induced rotor currents.";
    }
    else if (dist >= 100 && dist < 110) {
        tip = "<strong>Air Gap</strong><br>The sweeping cone visualizes the Rotating Magnetic Field (RMF) crossing the gap.";
    }
    else if (dist >= 110 && dist < 140) {
        tip = "<strong>Stator & 3-Phase Windings</strong><br>Coils physically displaced by 120°, fed by 3-phase AC to generate the continuous RMF.";
    }
  }
  else if (currentDevice === 'pmsm') {
    if (x > graphX) {
        tip = "<strong>Power vs Load Angle Curve</strong><br>Power peaks at 90°. If pushed past, the magnetic lock shatters, causing a full stall.";
    }
    else if (dist < 45) {
        tip = "<strong>Rotor Core</strong><br>Solid iron cylinder supporting the surface-mounted permanent magnets.";
    }
    else if (dist >= 45 && dist < 90) {
        tip = "<strong>Permanent Magnet Poles</strong><br>High-strength Neodymium magnets locking perfectly in sync with the stator's sweeping field.";
    }
    else if (dist >= 90 && dist < 105) {
        tip = "<strong>Air Gap (Load Angle δ)</strong><br>The dashed line visualizes the magnetic 'rubber band' stretching under mechanical load stress.";
    }
    else if (dist >= 105 && dist < 140) {
        tip = "<strong>Stator Windings</strong><br>Driven by a Sinusoidal Inverter using precise Field Oriented Control (FOC).";
    }
  }
  else if (currentDevice === 'bldc') {
    if (x > graphX) {
        tip = "<strong>Trapezoidal Control Waveforms</strong><br>Flat-top Back-EMF combined with precisely timed square current pulses provides constant, ripple-free torque.";
    }
    else if (x >= cx-190 && x <= cx-60 && y >= cy+130 && y <= cy+210) {
        tip = "<strong>Electronic Speed Controller (ESC)</strong><br>Brain of the BLDC. Uses solid-state switches (MOSFETs) controlled via high-frequency PWM duty cycles.";
    }
    else if (dist < 45) {
        tip = "<strong>Rotor Core</strong><br>Supports the surface-mounted permanent magnets.";
    }
    else if (dist >= 45 && dist < 90) {
        tip = "<strong>Permanent Magnet Rotor</strong><br>Follows the discrete electronic switching of the stator coils precisely without mechanical brushes.";
    }
    else if (dist >= 90 && dist < 140) {
        tip = "<strong>Electronic Commutator Stator</strong><br>In standard 120° conduction, only 2 phases are active at any one time to maximize torque efficiency.";
    }
  }
  else if (currentDevice === 'st') {
    if (x > graphX) {
        tip = "<strong>Logic Timing Diagram</strong><br>High/Low square waves generated by the stepper driver trigger the corresponding phase coils sequentially.";
    }
    else if (dist < 80) {
        tip = state.st.type === 0 
            ? "<strong>Soft Iron Rotor (VR)</strong><br>Not magnetized. Strictly seeks the path of minimum magnetic reluctance to align with active stator poles."
            : "<strong>Hybrid/PM Rotor</strong><br>Magnetized teeth provide strong holding detent torque even when unpowered.";
    }
    else if (dist >= 80 && dist < 140) {
        tip = "<strong>Multi-Pole Stator</strong><br>Coils are rapidly pulsed in sequence. Notice how they pull the rotor teeth into alignment via magnetic flux.";
    }
  }
  else if (currentDevice === 'sv') {
    if (x > graphX) {
        tip = "<strong>Step Response Graph</strong><br>Maps the dynamic performance of the closed-loop system over time. Watch the Error converge as the actual position hunts the target.";
    }
    else if (x >= 20 && x <= 320 && y >= 20 && y <= 210) {
        tip = "<strong>PID Controller & Comparator</strong><br>The math engine. Constantly calculates Error = Setpoint - Actual, and applies Proportional (Kp) gain to correct deviations.";
    }
    else if (dist < 50) {
        tip = "<strong>DC/AC Motor Core</strong><br>Provides the raw physical actuation to drive the load, governed dynamically by the Error Amplifier.";
    }
    else {
        const hAng = state.sv.pos * Math.PI/180;
        const hx = cx + 140*Math.cos(hAng);
        const hy = cy + 140*Math.sin(hAng);
        if (Math.hypot(x - hx, y - hy) < 30 || (dist >= 50 && dist < 160 && Math.abs(angDeg - (state.sv.pos % 360 + 360)%360) < 10)) {
            tip = "<strong>Position Sensor & Output Horn</strong><br>Potentiometer or Encoder reads the exact mechanical angle constantly and feeds it back to the Comparator.";
        } else if (dist >= 140 && dist <= 160) {
            tip = "<strong>Angle Scale</strong><br>Visual reference for absolute angular position (0-360°).";
        }
    }
  }

  // Handle BLDC manual coil click cursor swap
  if (currentDevice === 'bldc' && state.bldc.mode === 1) {
    const coil = Math.round(angDeg / 60) % 6;
    if (dist > 90 && dist < 130) {
      canvas.style.cursor = 'pointer';
      tip = `<strong>Click to energize Coil ${coil+1}</strong><br>Pull the magnet manually to step it around!`;
    } else canvas.style.cursor = 'crosshair';
  } else {
    canvas.style.cursor = tip ? 'help' : 'crosshair';
  }

  // Smart Intelligent Tooltip Placement (Prevents overlapping)
  if (tip) {
    if (tooltip.innerHTML !== tip) tooltip.innerHTML = tip; // Avoid unnecessary layout recalculations
    tooltip.style.opacity = 1;
    
    const tw = tooltip.offsetWidth;
    const th = tooltip.offsetHeight;
    let tX = x;
    let tY = y;
    
    // Determine positioning dynamically based on region
    if (x > graphX || (currentDevice === 'sv' && x < 320 && y < 210)) {
        // Linear corner push for graphs and UI boxes
        tX = x < graphX + (w - graphX)/2 ? x + 20 : x - tw - 20;
        tY = y < h/2 ? y + 20 : y - th - 20;
    } else {
        // Radial push (repel from the center of the motor so we don't cover it)
        const dxCenter = x - cx;
        const dyCenter = y - cy;
        const lenCenter = Math.hypot(dxCenter, dyCenter) || 1;
        const nx = dxCenter / lenCenter;
        const ny = dyCenter / lenCenter;
        
        tX = x + nx * 40; 
        tY = y + ny * 40;
        
        // Flip quadrant origin to prevent cursor overlap
        if (nx < 0) tX -= tw;
        if (ny < 0) tY -= th;
    }
    
    // Strict Canvas Bounds Clamping
    tX = Math.max(10, Math.min(tX, w - tw - 10));
    tY = Math.max(10, Math.min(tY, h - th - 10));
    
    tooltip.style.transform = `translate(${tX}px, ${tY}px)`;
  } else {
    tooltip.style.opacity = 0;
  }
});

document.getElementById('simCanvas')?.addEventListener('mouseleave', () => { tooltip.style.opacity = 0; });

document.getElementById('simCanvas')?.addEventListener('mousedown', (e) => {
  if (currentDevice !== 'bldc' || state.bldc.mode !== 1) return;
  const x = e.offsetX; const y = e.offsetY;
  const w = canvas.clientWidth; const h = canvas.clientHeight;
  const cx = w * 0.35; const cy = h / 2;
  const dist = Math.hypot(x - cx, y - cy);
  if (dist > 90 && dist < 130) {
    let ang = Math.atan2(y - cy, x - cx) * 180 / Math.PI; if (ang < 0) ang += 360;
    state.bldc.manualCoil = Math.round(ang / 60) % 6;
  }
});
document.getElementById('simCanvas')?.addEventListener('mouseup', () => {
  if (currentDevice === 'bldc') state.bldc.manualCoil = -1;
});

// ═══════════════════════════════════════════════════════
// INTRICATE 2D RENDER ENGINE (FLUID DYNAMIC PHYSICS)
// ═══════════════════════════════════════════════════════

function drawLine(x1, y1, x2, y2, color, w=2) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
}
function drawBezier(x1, y1, cx1, cy1, cx2, cy2, x2, y2, color, w=2) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.bezierCurveTo(cx1, cy1, cx2, cy2, x2, y2);
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.stroke();
}
function drawGlowCircle(x, y, r, color, blur) {
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI*2);
  ctx.shadowBlur = blur; ctx.shadowColor = color; ctx.fillStyle = color; ctx.fill(); ctx.restore();
}
function updateStatusBar(html) {
  const el = document.getElementById('status-container');
  if(el.innerHTML !== html) el.innerHTML = html;
}
function statBox(lbl, val, warn=false) {
  const col = warn ? 'var(--red)' : 'var(--green)';
  const glow = warn ? '0 0 10px rgba(255,51,85,0.6)' : '0 0 8px rgba(0,255,136,0.4)';
  return `<div class="stat-box"><div class="stat-lbl">${lbl}</div><div class="stat-val" style="color:${col}; text-shadow:${glow}">${val}</div></div>`;
}

// Fluid Interpolation logic
function lerp(start, end, factor) { return start + (end - start) * factor; }

// Color Interpolator for Heat/Current (Green -> Orange -> Red)
function getColorForHeat(ratio) {
  const h = (1 - Math.min(1, Math.max(0, ratio))) * 120; // 120=Green, 0=Red
  return `hsl(${h}, 100%, 50%)`;
}

function renderLoop() {
  if (!currentDevice || !canvas) return;
  simTime += 0.016; 
  
  // Dynamic Canvas Coordinate Syncing (Fixes scaling hitboxes if CSS resizes)
  const currentW = canvas.clientWidth; 
  const currentH = canvas.clientHeight;
  if (canvas.width !== currentW * 2 || canvas.height !== currentH * 2) {
      canvas.width = currentW * 2;
      canvas.height = currentH * 2;
      ctx.scale(2, 2);
  }
  const w = currentW;
  const h = currentH;
  
  ctx.clearRect(0, 0, w, h);

  const cx = w * 0.35; 
  const cy = h / 2;
  const graphX = w * 0.65;
  const graphW = w * 0.35;

  // Background grid drawn direct to canvas
  ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 1;
  for(let i=0; i<w; i+=40) drawLine(i,0,i,h, ctx.strokeStyle);
  for(let i=0; i<h; i+=40) drawLine(0,i,w,i, ctx.strokeStyle);

  // Graph Panel Background
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(graphX, 0, graphW, h);
  drawLine(graphX, 0, graphX, h, 'var(--glass-border)', 1);

  // ─────────────────────────────────────────────────────────
  // 1. DC GENERATOR (dcg)
  // ─────────────────────────────────────────────────────────
  if (currentDevice === 'dcg') {
    const s = state.dcg; const ts = targetState.dcg;
    s.rpm = lerp(s.rpm, ts.rpm, 0.08); 
    s.if = lerp(s.if, ts.if, 0.15); 
    s.rl = lerp(s.rl, ts.rl, 0.15);
    
    const A = s.type === 0 ? 4 : 2; const K = (4 * 1000) / (60 * A); 
    const eg = K * (s.if * 0.05) * s.rpm; 
    s.ia = eg / (s.rl + 0.5);
    s.vout = eg - s.ia * 0.5;
    const rotSpeed = (s.rpm / 1500) * 0.1;
    const rotAng = simTime * rotSpeed * 30;

    s.fluxDistort = lerp(s.fluxDistort, s.ia * 0.8, 0.1); 

    // Stator
    ctx.strokeStyle = '#283548'; ctx.lineWidth = 15; ctx.beginPath(); ctx.arc(cx, cy, 140, 0, Math.PI*2); ctx.stroke();
    const poles = [{a:0, t:'N', c:'#ff3355'}, {a:Math.PI, t:'S', c:'#3b82f6'}];
    poles.forEach(p => {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(p.a);
      ctx.fillStyle = p.c; ctx.fillRect(100, -35, 30, 70); 
      ctx.fillStyle = '#fff'; ctx.font = 'bold 20px Arial'; ctx.fillText(p.t, 110, 7);
      ctx.strokeStyle = `rgba(255,187,0, ${s.if/5})`; ctx.lineWidth = 4; ctx.shadowBlur = s.if*6; ctx.shadowColor = '#ffbb00';
      for(let i=0;i<5;i++) { ctx.beginPath(); ctx.moveTo(115, -25+i*12); ctx.lineTo(125, -25+i*12); ctx.stroke(); }
      ctx.restore();
    });

    // Flux Lines
    ctx.lineWidth = 2;
    for(let y = -60; y <= 60; y+=15) {
      const alpha = 0.2 + (s.if/5)*0.7;
      const distortion = (y / 60) * s.fluxDistort; 
      drawBezier(cx+100, cy+y, cx+50, cy+y + distortion, cx-50, cy+y - distortion, cx-100, cy+y, `rgba(0,229,255,${alpha})`);
    }

    // Armature
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rotAng); 
    ctx.beginPath(); ctx.arc(0, 0, 95, 0, Math.PI*2); ctx.fillStyle = '#1e293b'; ctx.fill();
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 2;
    
    // Dynamic Conductor Coloring based on current
    const condColor = getColorForHeat(s.ia / 40); 
    for(let i=0; i<16; i++) {
      ctx.save(); ctx.rotate(i * Math.PI/8);
      ctx.fillStyle = '#0f172a'; ctx.fillRect(85, -6, 10, 12); 
      ctx.fillStyle = condColor; ctx.beginPath(); ctx.arc(90, 0, 4, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }
    // Commutator
    ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI*2); ctx.fillStyle = '#b45309'; ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 4;
    for(let i=0; i<16; i++) {
      ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(40*Math.cos(i*Math.PI/8), 40*Math.sin(i*Math.PI/8)); ctx.stroke();
    }
    ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(0,0, 20, 0, Math.PI*2); ctx.fill(); // shaft
    ctx.restore();
    
    // Brushes & Sparks
    ctx.fillStyle = '#222'; ctx.fillRect(cx-50, cy-12, 12, 24); ctx.fillRect(cx+38, cy-12, 12, 24);
    if(s.ia > 5 && s.rpm > 0) {
       drawGlowCircle(cx-38, cy + (Math.random()*10-5), 4, '#fff', 10);
       drawGlowCircle(cx+38, cy + (Math.random()*10-5), 4, '#fff', 10);
    }

    // Graph
    ctx.fillStyle = '#fff'; ctx.font = '14px Orbitron'; ctx.fillText('OUTPUT VOLTAGE (Rectified DC)', graphX+20, 40);
    drawLine(graphX+20, cy, w-20, cy, '#555', 1);
    ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 3; ctx.beginPath();
    for(let i=0; i<graphW-40; i++) {
      const t = simTime*20 + i*0.05;
      const rawSine = Math.sin(t);
      const val = Math.abs(rawSine) * (s.vout / 400); 
      const py = cy - val * 200;
      if(i===0) ctx.moveTo(graphX+20+i, py); else ctx.lineTo(graphX+20+i, py);
    } ctx.stroke();

    updateStatusBar(
      statBox('Gen EMF (Eg)', eg.toFixed(1) + ' V') +
      statBox('Term Voltage', Math.max(0, s.vout).toFixed(1) + ' V') +
      statBox('Arm Current', s.ia.toFixed(1) + ' A', s.ia > 30)
    );
  }

  // ─────────────────────────────────────────────────────────
  // 2. DC MOTOR (dcm)
  // ─────────────────────────────────────────────────────────
  else if (currentDevice === 'dcm') {
    const s = state.dcm; const ts = targetState.dcm;
    s.v = lerp(s.v, ts.v, 0.15); 
    s.load = lerp(s.load, ts.load, 0.1);

    const A = s.type === 0 ? 4 : 2; 
    const fluxWb = 0.05; 
    const K = (4 * 1000) / (60 * A);
    s.ia = lerp(s.ia, s.load / (K * fluxWb * 0.159) || 0, 0.1);
    s.eb = Math.max(0, s.v - s.ia * 0.8);
    s.speed = lerp(s.speed, Math.max(0, s.eb / (K * fluxWb)), 0.05);

    const rotSpeed = (s.speed / 1500) * 0.1;
    s.rotAngle += rotSpeed;

    ctx.strokeStyle = '#283548'; ctx.lineWidth = 15; ctx.beginPath(); ctx.arc(cx, cy, 140, 0, Math.PI*2); ctx.stroke();
    const poles = [{a:0, t:'N', c:'#ff3355'}, {a:Math.PI, t:'S', c:'#3b82f6'}];
    poles.forEach(p => {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(p.a);
      ctx.fillStyle = p.c; ctx.fillRect(100, -35, 30, 70); 
      ctx.fillStyle = '#fff'; ctx.font = 'bold 20px Arial'; ctx.fillText(p.t, 110, 7);
      ctx.restore();
    });

    ctx.save(); ctx.translate(cx, cy); ctx.rotate(s.rotAngle); 
    ctx.beginPath(); ctx.arc(0, 0, 95, 0, Math.PI*2); ctx.fillStyle = '#1e293b'; ctx.fill();
    
    const condColor = getColorForHeat(s.ia / 40);
    const cGlow = s.ia > 30 ? 12 : 5;

    for(let i=0; i<16; i++) {
      ctx.save(); ctx.rotate(i * Math.PI/8);
      ctx.fillStyle = '#0f172a'; ctx.fillRect(85, -6, 10, 12); 
      drawGlowCircle(90, 0, 4, condColor, cGlow);
      
      const ang = i * Math.PI/8 + s.rotAngle;
      const inField = Math.abs(Math.cos(ang)) > 0.6; // near poles
      if(inField && s.v > 0) {
        ctx.fillStyle = condColor;
        const fl = Math.min(25, s.ia*0.6); // force vector length
        ctx.beginPath(); ctx.moveTo(105, -2); ctx.lineTo(105+fl, -2); ctx.lineTo(105+fl, -6); ctx.lineTo(115+fl, 0); ctx.lineTo(105+fl, 6); ctx.lineTo(105+fl, 2); ctx.lineTo(105, 2); ctx.fill();
      }
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(0, 0, 40, 0, Math.PI*2); ctx.fillStyle = '#b45309'; ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#222'; ctx.fillRect(cx-50, cy-12, 12, 24); ctx.fillRect(cx+38, cy-12, 12, 24);
    
    // Graph
    ctx.fillStyle = '#fff'; ctx.font = '14px Orbitron'; ctx.fillText('VOLTAGE EQUATION (V = Eb + IaRa)', graphX+20, 40);
    const bY = h - 60; const bH = h - 140;
    drawLine(graphX+20, bY, w-20, bY, '#fff', 2);
    
    const vH = (s.v / 400) * bH; const ebH = (s.eb / 400) * bH; const iaH = ((s.ia * 0.8) / 400) * bH;

    ctx.fillStyle = '#00e5ff'; ctx.fillRect(graphX+50, bY - vH, 50, vH);
    ctx.fillText('V', graphX+70, bY + 25); ctx.fillText(s.v.toFixed(0), graphX+60, bY - vH - 10);
    
    ctx.fillStyle = '#ffbb00'; ctx.fillRect(graphX+150, bY - ebH, 50, ebH);
    ctx.fillText('Eb', graphX+165, bY + 25); ctx.fillText(s.eb.toFixed(0), graphX+160, bY - ebH - 10);
    
    ctx.fillStyle = condColor; ctx.fillRect(graphX+250, bY - iaH, 50, iaH);
    ctx.fillText('IaRa', graphX+260, bY + 25); ctx.fillText((s.ia*0.8).toFixed(1), graphX+260, bY - iaH - 10);

    if(s.load > 30) {
      ctx.fillStyle = '#ff3355'; ctx.font = 'bold 12px Inter';
      ctx.fillText('HEAVY LOAD DETECTED: Eb drops, Current spikes!', graphX+20, 70);
    }

    updateStatusBar(
      statBox('Motor Speed', s.speed.toFixed(0) + ' RPM') +
      statBox('Back EMF (Eb)', s.eb.toFixed(1) + ' V') +
      statBox('Arm Current (Ia)', s.ia.toFixed(1) + ' A', s.ia > 30)
    );
  }

  // ─────────────────────────────────────────────────────────
  // 3. TRANSFORMER (tf)
  // ─────────────────────────────────────────────────────────
  else if (currentDevice === 'tf') {
    const s = state.tf; const ts = targetState.tf;
    s.v1 = lerp(s.v1, ts.v1, 0.15); s.freq = lerp(s.freq, ts.freq, 0.1);
    // Integer snaps for coils
    s.n1 = Math.round(lerp(s.n1, ts.n1, 0.2)); 
    s.n2 = Math.round(lerp(s.n2, ts.n2, 0.2));
    const v2 = s.v1 * (s.n2 / s.n1);

    ctx.fillStyle = '#1e293b'; ctx.strokeStyle = '#475569'; ctx.lineWidth = 2;
    ctx.fillRect(cx-140, cy-120, 280, 240); ctx.clearRect(cx-80, cy-60, 160, 120);
    ctx.strokeRect(cx-140, cy-120, 280, 240); ctx.strokeRect(cx-80, cy-60, 160, 120);
    
    if (s.type === 0) { // Laminated
      for(let i=-135; i<140; i+=6) drawLine(cx+i, cy-120, cx+i, cy-60, 'rgba(255,255,255,0.06)', 1);
      s.heat = Math.max(0, s.heat - 1);
    } else { // Solid
      s.heat = Math.min(100, s.heat + 2);
      ctx.strokeStyle = `rgba(255,51,85,${s.heat/100})`; ctx.lineWidth = 1.5;
      for(let i=0; i<8; i++) {
        const r = (simTime*20 + i*10) % 40;
        ctx.beginPath(); ctx.arc(cx, cy-90, r, 0, Math.PI*2); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy+90, r, 0, Math.PI*2); ctx.stroke();
      }
    }

    ctx.strokeStyle = '#ff6e00'; ctx.lineWidth = 7;
    // Exactly distribute N coils within 200px limb height
    let pSpace = 200 / s.n1;
    for(let i=0; i<s.n1; i++) {
      ctx.beginPath(); ctx.ellipse(cx-110, cy-100 + i*pSpace + pSpace/2, 45, 14, 0, 0, Math.PI*2); ctx.stroke();
    }
    
    ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 7;
    let sSpace = 200 / s.n2;
    for(let i=0; i<s.n2; i++) {
      ctx.beginPath(); ctx.ellipse(cx+110, cy-100 + i*sSpace + sSpace/2, 45, 14, 0, 0, Math.PI*2); ctx.stroke();
    }

    ctx.save();
    ctx.beginPath(); ctx.rect(cx-110, cy-90, 220, 180);
    ctx.strokeStyle = `rgba(0, 255, 136, ${Math.abs(Math.sin(simTime*s.freq*0.1))})`; 
    ctx.lineWidth = 5; ctx.setLineDash([15, 15]); ctx.lineDashOffset = -simTime * s.freq * 1.5;
    ctx.shadowBlur = 15; ctx.shadowColor = '#00ff88'; ctx.stroke();
    ctx.restore();

    // Graph
    ctx.fillStyle = '#fff'; ctx.font = '14px Orbitron'; ctx.fillText('WAVEFORMS (Vin vs Vout)', graphX+20, 40);
    drawLine(graphX+20, cy-80, w-20, cy-80, '#555', 1);
    drawLine(graphX+20, cy+80, w-20, cy+80, '#555', 1);

    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ff6e00'; ctx.beginPath();
    for(let i=0; i<graphW-40; i++) {
      const py = (cy-80) - Math.sin(simTime*s.freq*0.1 + i*0.05) * (s.v1/400)*70;
      if(i===0) ctx.moveTo(graphX+20+i, py); else ctx.lineTo(graphX+20+i, py);
    } ctx.stroke();

    ctx.strokeStyle = '#00e5ff'; ctx.beginPath();
    for(let i=0; i<graphW-40; i++) {
      const py = (cy+80) - Math.sin(simTime*s.freq*0.1 + Math.PI + i*0.05) * (v2/400)*70;
      if(i===0) ctx.moveTo(graphX+20+i, py); else ctx.lineTo(graphX+20+i, py);
    } ctx.stroke();
    
    ctx.fillStyle='#ff6e00'; ctx.fillText('Primary (V1)', graphX+20, cy-10);
    ctx.fillStyle='#00e5ff'; ctx.fillText('Secondary (V2) - Out of Phase', graphX+20, cy+150);

    updateStatusBar(
      statBox('Sec. Voltage (V2)', v2.toFixed(1) + ' V') +
      statBox('Turns Ratio (K)', (s.n2/s.n1).toFixed(2)) +
      statBox('Core Heat Loss', s.heat.toFixed(0) + '%', s.heat > 50)
    );
  }

  // ─────────────────────────────────────────────────────────
  // 4. INDUCTION MOTOR (im)
  // ─────────────────────────────────────────────────────────
  else if (currentDevice === 'im') {
    const s = state.im; const ts = targetState.im;
    s.freq = lerp(s.freq, ts.freq, 0.15); s.load = lerp(s.load, ts.load, 0.15);

    const ns = 120 * s.freq / 4; 
    s.slip = lerp(s.slip, Math.min(0.99, Math.max(0.001, (s.load * 0.15) / 100)), 0.1); 
    const nr = ns * (1 - s.slip);

    s.rmfAng += (ns / 1500) * 0.1;
    s.rotAng += (nr / 1500) * 0.1;

    ctx.strokeStyle = '#283548'; ctx.lineWidth = 20; ctx.beginPath(); ctx.arc(cx, cy, 130, 0, Math.PI*2); ctx.stroke();
    for(let i=0; i<24; i++) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(i*Math.PI/12);
      ctx.fillStyle = (i%3===0)?'#ff3355':(i%3===1)?'#ffbb00':'#3b82f6';
      ctx.beginPath(); ctx.arc(125, 0, 6, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }

    // Sweeping RMF Cone
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(s.rmfAng);
    ctx.fillStyle = 'rgba(0, 229, 255, 0.15)'; 
    ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0,0,110, -Math.PI/6, Math.PI/6); ctx.lineTo(0,0); ctx.fill();
    ctx.shadowBlur = 15; ctx.shadowColor = '#00e5ff';
    drawLine(0, 0, 110, 0, '#00e5ff', 5); 
    ctx.restore();

    ctx.save(); ctx.translate(cx, cy); ctx.rotate(s.rotAng);
    ctx.beginPath(); ctx.arc(0, 0, 100, 0, Math.PI*2); ctx.fillStyle = '#1e293b'; ctx.fill();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0,0,85,0,Math.PI*2); ctx.stroke(); 
    for(let i=0; i<16; i++) {
      ctx.fillStyle = i === 0 ? '#ffbb00' : '#cbd5e1';
      ctx.shadowBlur = i === 0 ? 15 : 0; ctx.shadowColor = '#ffbb00';
      ctx.beginPath(); ctx.arc(85*Math.cos(i*Math.PI/8), 85*Math.sin(i*Math.PI/8), 7, 0, Math.PI*2); ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.fillStyle = '#0f172a'; ctx.beginPath(); ctx.arc(0,0, 15, 0, Math.PI*2); ctx.fill(); 
    ctx.restore();

    // Graph
    ctx.fillStyle = '#fff'; ctx.font = '14px Orbitron'; ctx.fillText('TORQUE-SLIP CURVE', graphX+20, 40);
    const gY = h - 60; const gW = graphW - 40; const gH = h - 120;
    drawLine(graphX+20, gY, graphX+20+gW, gY, '#fff', 1); 
    ctx.fillText('s=1 (Start)', graphX+20, gY+25); ctx.fillText('s=0 (Sync)', graphX+gW-70, gY+25);
    
    ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 3; ctx.beginPath();
    for(let i=0; i<gW; i++) {
      const slp = 1 - (i/gW); 
      const trq = (slp * 0.1) / (0.1*0.1 + slp*slp); 
      const py = gY - (trq * 200);
      if(i===0) ctx.moveTo(graphX+20+i, py); else ctx.lineTo(graphX+20+i, py);
    } ctx.stroke();

    const opX = graphX+20 + (1-s.slip)*gW;
    const opY = gY - ((s.slip * 0.1) / (0.1*0.1 + s.slip*s.slip) * 200);
    drawGlowCircle(opX, opY, 7, '#ffbb00', 12);

    updateStatusBar(
      statBox('Sync Speed (Ns)', ns.toFixed(0) + ' RPM') +
      statBox('Rotor Speed (Nr)', nr.toFixed(0) + ' RPM') +
      statBox('Slip (s)', (s.slip*100).toFixed(1) + '%', s.slip > 0.1)
    );
  }

  // ─────────────────────────────────────────────────────────
  // 5. PMSM (pmsm)
  // ─────────────────────────────────────────────────────────
  else if (currentDevice === 'pmsm') {
    const s = state.pmsm; const ts = targetState.pmsm;
    s.delta = lerp(s.delta, ts.delta, 0.1);
    
    const speed = 1500; 
    s.rmfAng += (speed / 1500) * 0.05;
    if (s.delta > 90) s.stutter = Math.random() * 0.3 - 0.15; else s.stutter = 0;
    s.rotAng = s.rmfAng - (s.delta * Math.PI/180) + s.stutter;

    ctx.strokeStyle = '#283548'; ctx.lineWidth = 15; ctx.beginPath(); ctx.arc(cx, cy, 130, 0, Math.PI*2); ctx.stroke();
    for(let i=0; i<24; i++) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(i*Math.PI/12);
      ctx.fillStyle = (i%3===0)?'#ff3355':(i%3===1)?'#ffbb00':'#3b82f6';
      ctx.beginPath(); ctx.arc(125, 0, 6, 0, Math.PI*2); ctx.fill();
      ctx.restore();
    }

    ctx.save(); ctx.translate(cx, cy); ctx.rotate(s.rotAng);
    ctx.beginPath(); ctx.arc(0, 0, 90, 0, Math.PI*2); ctx.fillStyle = '#1e293b'; ctx.fill();
    ctx.fillStyle = '#ff3355'; ctx.fillRect(-30, -90, 60, 45); ctx.fillStyle='#fff'; ctx.font='bold 22px Arial'; ctx.fillText('N', -8, -60);
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(-30, 45, 60, 45); ctx.fillStyle='#fff'; ctx.fillText('S', -8, 75);
    const rotorNx = 0; const rotorNy = -90;
    ctx.restore();

    ctx.save(); ctx.translate(cx, cy); ctx.rotate(s.rmfAng);
    drawLine(0, 0, 0, -110, '#00e5ff', 4); 
    const rmfX = 0; const rmfY = -110;
    ctx.restore();

    if (s.delta <= 90) {
      const rx = cx + rotorNx*Math.cos(s.rotAng) - rotorNy*Math.sin(s.rotAng);
      const ry = cy + rotorNx*Math.sin(s.rotAng) + rotorNy*Math.cos(s.rotAng);
      const mx = cx + rmfX*Math.cos(s.rmfAng) - rmfY*Math.sin(s.rmfAng);
      const my = cy + rmfX*Math.sin(s.rmfAng) + rmfY*Math.cos(s.rmfAng);
      
      ctx.strokeStyle = `rgba(0, 255, 136, ${1 - s.delta/100})`; ctx.lineWidth = 3 + (s.delta/25);
      ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(rx, ry); ctx.stroke(); ctx.setLineDash([]);
    } else {
      ctx.fillStyle = '#ff3355'; ctx.font = 'bold 22px Orbitron'; ctx.shadowBlur=10; ctx.shadowColor='#ff3355';
      ctx.fillText('SYNCHRONISM LOST!', cx-120, cy+150); ctx.shadowBlur=0;
    }

    ctx.fillStyle = '#fff'; ctx.font = '14px Orbitron'; ctx.fillText('POWER vs LOAD ANGLE (δ)', graphX+20, 40);
    const gY = h/2; const gW = graphW - 40;
    drawLine(graphX+20, gY, graphX+20+gW, gY, '#fff', 1); 
    ctx.fillText('90°', graphX+20 + gW*(90/180), gY+25);
    
    ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 3; ctx.beginPath();
    for(let i=0; i<gW; i++) {
      const deg = (i/gW) * 180;
      const py = gY - Math.sin(deg * Math.PI/180) * 150;
      if(i===0) ctx.moveTo(graphX+20+i, py); else ctx.lineTo(graphX+20+i, py);
    } ctx.stroke();

    const opX = graphX+20 + (Math.min(s.delta, 180)/180)*gW;
    const opY = gY - Math.sin(s.delta * Math.PI/180) * 150;
    drawGlowCircle(opX, opY, 7, s.delta>90?'#ff3355':'#00ff88', 15);

    updateStatusBar(
      statBox('Sync Speed', '1500 RPM') +
      statBox('Load Angle', s.delta.toFixed(0) + '°', s.delta > 90) +
      statBox('Status', s.delta <= 90 ? 'Locked' : 'STALLED', s.delta > 90)
    );
  }

  // ─────────────────────────────────────────────────────────
  // 6. BLDC (bldc)
  // ─────────────────────────────────────────────────────────
  else if (currentDevice === 'bldc') {
    const s = state.bldc; const ts = targetState.bldc;
    s.pwm = lerp(s.pwm, ts.pwm, 0.1);
    
    ctx.strokeStyle = '#283548'; ctx.lineWidth = 15; ctx.beginPath(); ctx.arc(cx, cy, 130, 0, Math.PI*2); ctx.stroke();
    
    let activePhase = -1;
    if (s.mode === 0) {
      const speed = (s.pwm / 100) * 12;
      s.rotAng += speed * 0.016;
      activePhase = Math.floor(((s.rotAng * 180/Math.PI) % 360) / 60) % 6;
    } else {
      activePhase = s.manualCoil;
      if(activePhase !== -1) {
        const targetAng = (activePhase * 60 + 90) * Math.PI/180; 
        let diff = targetAng - s.rotAng;
        while(diff < -Math.PI) diff += Math.PI*2;
        while(diff > Math.PI) diff -= Math.PI*2;
        s.rotAng += diff * 0.2;
      }
    }

    for(let i=0; i<6; i++) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(i*Math.PI/3 - Math.PI/2);
      const isActive = (i === activePhase || (i+3)%6 === activePhase);
      ctx.fillStyle = isActive ? '#00e5ff' : '#475569';
      if(isActive) { ctx.shadowBlur = 20; ctx.shadowColor = '#00e5ff'; }
      ctx.fillRect(100, -20, 25, 40);
      ctx.restore();
    }

    ctx.save(); ctx.translate(cx, cy); ctx.rotate(s.rotAng);
    ctx.beginPath(); ctx.arc(0, 0, 90, 0, Math.PI*2); ctx.fillStyle = '#1e293b'; ctx.fill();
    ctx.fillStyle = '#ff3355'; ctx.fillRect(-30, -90, 60, 45); ctx.fillStyle='#fff'; ctx.font='bold 22px Arial'; ctx.fillText('N', -8, -60);
    ctx.fillStyle = '#3b82f6'; ctx.fillRect(-30, 45, 60, 45); ctx.fillStyle='#fff'; ctx.fillText('S', -8, 75);
    ctx.restore();

    if(s.mode === 1) {
      ctx.fillStyle = '#ffbb00'; ctx.font = 'bold 16px Inter'; ctx.textAlign='center';
      ctx.fillText('MANUAL MODE: Click the 6 stator coils to pull the rotor!', cx, cy+180);
      ctx.textAlign='left';
    } else {
      ctx.fillStyle = 'rgba(255, 110, 0, 0.2)'; ctx.fillRect(cx-180, cy+140, 110, 60);
      ctx.strokeStyle = '#ff6e00'; ctx.lineWidth=2; ctx.strokeRect(cx-180, cy+140, 110, 60);
      ctx.fillStyle = '#fff'; ctx.font = '14px Orbitron'; ctx.fillText('ESC INVERTER', cx-170, cy+160);
      ctx.fillStyle = '#00e5ff'; ctx.fillText(`PWM: ${s.pwm.toFixed(0)}%`, cx-170, cy+185);
      drawLine(cx-70, cy+170, cx-20, cy+100, '#ff6e00', 3); // line to motor
    }

    ctx.fillStyle = '#fff'; ctx.font = '14px Orbitron'; ctx.fillText('PHASE A: BACK-EMF & CURRENT', graphX+20, 40);
    const gY = h/2; const gW = graphW - 40;
    drawLine(graphX+20, gY, graphX+20+gW, gY, '#555', 1); 

    ctx.strokeStyle = '#ffbb00'; ctx.lineWidth = 2; ctx.beginPath();
    for(let i=0; i<gW; i++) {
      const a = ((simTime*3 + i*0.01) % (Math.PI*2)) / (Math.PI*2);
      let val = 0;
      if(a<1/6) val=a*6; else if(a<3/6) val=1; else if(a<4/6) val=1-(a-0.5)*6; else if(a<5/6) val=-1; else val=-1+(a-5/6)*6;
      const py = gY - val*120;
      if(i===0) ctx.moveTo(graphX+20+i, py); else ctx.lineTo(graphX+20+i, py);
    } ctx.stroke();

    ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 3; ctx.beginPath();
    for(let i=0; i<gW; i++) {
      const a = ((simTime*3 + i*0.01) % (Math.PI*2)) / (Math.PI*2);
      let val = 0;
      if(a>1/6 && a<3/6) val=0.8; else if(a>4/6 && a<6/6) val=-0.8; 
      const py = gY - val*90;
      if(i===0) ctx.moveTo(graphX+20+i, py); else ctx.lineTo(graphX+20+i, py);
    } ctx.stroke();
    
    ctx.fillStyle='#ffbb00'; ctx.fillText('Trapezoidal Back-EMF', graphX+20, h-60);
    ctx.fillStyle='#00e5ff'; ctx.fillText('Square Current Pulse', graphX+20, h-40);

    updateStatusBar(
      statBox('Commutation', s.mode===0?'Auto (Sensors)':'Manual') +
      statBox('PWM Duty', s.pwm.toFixed(0) + '%')
    );
  }

  // ─────────────────────────────────────────────────────────
  // 7. STEPPER (st)
  // ─────────────────────────────────────────────────────────
  else if (currentDevice === 'st') {
    const s = state.st; const ts = targetState.st;
    s.rate = ts.rate;

    const sTeeth = 6; 
    const rTeeth = s.type === 0 ? 4 : 20; 
    const stepDeg = s.type === 0 ? (360/(sTeeth*rTeeth)) : 1.8;

    if (simTime % (1/s.rate) < 0.016) { s.angle += stepDeg; }
    s.exactPos = lerp(s.exactPos, s.angle, 0.35); 

    const activePhase = Math.floor(s.angle / stepDeg) % 3;

    ctx.strokeStyle = '#283548'; ctx.lineWidth = 15; ctx.beginPath(); ctx.arc(cx, cy, 130, 0, Math.PI*2); ctx.stroke();
    for(let i=0; i<6; i++) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(i*Math.PI/3);
      const isActive = (i%3 === activePhase);
      ctx.fillStyle = isActive ? '#ff6e00' : '#475569';
      if(isActive) { ctx.shadowBlur = 15; ctx.shadowColor = '#ff6e00'; }
      ctx.fillRect(100, -15, 30, 30);
      ctx.restore();
    }

    if (s.type === 0) { 
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.6)'; ctx.lineWidth = 2;
      for(let i=0; i<6; i++) {
        if(i%3 === activePhase) {
          const pAng = i*Math.PI/3;
          const px = cx + 100*Math.cos(pAng); const py = cy + 100*Math.sin(pAng);
          let minD = 999; let rx, ry;
          for(let j=0; j<rTeeth; j++) {
            const rAng = (s.exactPos * Math.PI/180) + j*Math.PI*2/rTeeth;
            const tx = cx + 80*Math.cos(rAng); const ty = cy + 80*Math.sin(rAng);
            const d = Math.hypot(tx-px, ty-py);
            if(d < minD) { minD = d; rx=tx; ry=ty; }
          }
          drawLine(px, py, rx, ry, 'rgba(0,255,136,0.9)', 4);
        }
      }
    }

    ctx.save(); ctx.translate(cx, cy); ctx.rotate(s.exactPos * Math.PI/180);
    ctx.beginPath(); ctx.arc(0, 0, 80, 0, Math.PI*2); ctx.fillStyle = '#1e293b'; ctx.fill();
    ctx.fillStyle = s.type === 0 ? '#64748b' : '#3b82f6';
    for(let i=0; i<rTeeth; i++) {
      ctx.save(); ctx.rotate(i*Math.PI*2/rTeeth);
      if(s.type === 1) ctx.fillStyle = (i%2===0)?'#ff3355':'#3b82f6'; 
      ctx.beginPath(); ctx.moveTo(70, -10); ctx.lineTo(90, 0); ctx.lineTo(70, 10); ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    ctx.fillStyle = '#fff'; ctx.font = '14px Orbitron'; ctx.fillText('LOGIC TIMING (Phases A, B, C)', graphX+20, 40);
    const gW = graphW - 40;
    
    for(let p=0; p<3; p++) {
      const pY = 120 + p*120;
      ctx.fillStyle = '#94a3b8'; ctx.fillText(`Phase ${['A','B','C'][p]}`, graphX+20, pY - 15);
      drawLine(graphX+20, pY, graphX+20+gW, pY, '#555', 1);
      
      ctx.strokeStyle = p===0?'#ff3355':p===1?'#ffbb00':'#3b82f6'; ctx.lineWidth = 3; ctx.beginPath();
      for(let i=0; i<gW; i++) {
        const t = simTime - (gW - i)*0.01;
        const ang = Math.floor(t * s.rate * stepDeg);
        const isActive = (Math.floor(ang / stepDeg) % 3) === p;
        const val = isActive ? 1 : 0;
        const py = pY - val*60;
        if(i===0) ctx.moveTo(graphX+20+i, py); else ctx.lineTo(graphX+20+i, py);
      } ctx.stroke();
    }

    updateStatusBar(
      statBox('Step Angle', stepDeg.toFixed(1) + '°') +
      statBox('Pulse Rate', s.rate + ' Hz') +
      statBox('Angle', s.angle.toFixed(1) + '°')
    );
  }

  // ─────────────────────────────────────────────────────────
  // 8. SERVO (sv)
  // ─────────────────────────────────────────────────────────
  else if (currentDevice === 'sv') {
    const s = state.sv; const ts = targetState.sv;
    s.dist = lerp(s.dist, ts.dist, 0.1); 

    const err = ts.sp - s.pos;
    const kp = 0.5; 
    const controlOutput = kp * err;
    s.vel += (controlOutput - s.dist - s.vel * 0.8) * 0.05; 
    s.pos += s.vel;

    s.hist.push({ sp: ts.sp, pv: s.pos });
    if(s.hist.length > 200) s.hist.shift();

    ctx.strokeStyle = '#283548'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, cy, 150, 0, Math.PI*2); ctx.stroke();
    for(let i=0; i<36; i++) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(i*10*Math.PI/180);
      drawLine(140, 0, 150, 0, (i%9===0)?'#fff':'#444', (i%9===0)?3:1);
      if(i%9===0) { ctx.fillStyle='#fff'; ctx.font='14px Arial'; ctx.fillText(i*10+'°', 165, 5); }
      ctx.restore();
    }

    ctx.save(); ctx.translate(cx, cy); ctx.rotate((ts.sp) * Math.PI/180);
    drawLine(110, 0, 160, 0, 'rgba(0,255,136,0.6)', 5);
    ctx.restore();

    ctx.beginPath(); ctx.arc(cx, cy, 50, 0, Math.PI*2); ctx.fillStyle = '#1e293b'; ctx.fill();
    ctx.save(); ctx.translate(cx, cy); ctx.rotate((s.pos) * Math.PI/180);
    ctx.shadowBlur = 10; ctx.shadowColor = '#00e5ff';
    drawLine(0, 0, 140, 0, '#00e5ff', 8); 
    ctx.beginPath(); ctx.arc(140, 0, 8, 0, Math.PI*2); ctx.fillStyle = '#ffbb00'; ctx.fill(); 
    ctx.restore();

    if (Math.abs(s.dist) > 0) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate((s.pos) * Math.PI/180);
      const distLen = s.dist * 2.5;
      drawLine(140, 0, 140, -distLen, '#ff3355', 5);
      ctx.beginPath(); ctx.moveTo(140, -distLen); ctx.lineTo(132, -distLen + Math.sign(s.dist)*12); ctx.lineTo(148, -distLen + Math.sign(s.dist)*12); ctx.fillStyle='#ff3355'; ctx.fill();
      ctx.fillStyle='#ff3355'; ctx.font='bold 16px Arial'; ctx.fillText('Force!', 155, -distLen/2);
      ctx.restore();
    }

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)'; ctx.fillRect(20, 20, 280, 180);
    ctx.strokeStyle = '#475569'; ctx.strokeRect(20, 20, 280, 180);
    
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px Orbitron'; ctx.fillText(`SP: ${ts.sp}°`, 30, 60);
    ctx.fillStyle = '#c084fc'; ctx.fillRect(90, 45, 55, 35); ctx.fillStyle='#fff'; ctx.fillText('Kp', 105, 68);
    ctx.fillStyle = '#ff6e00'; ctx.fillRect(180, 45, 65, 35); ctx.fillStyle='#fff'; ctx.fillText('MOTOR', 185, 68);
    
    drawLine(30, 80, 90, 80, '#fff'); // SP -> Kp
    drawLine(145, 62, 180, 62, '#fff'); // Kp -> Motor
    drawLine(245, 62, 280, 62, '#fff'); // Motor -> Out
    
    drawLine(260, 62, 260, 130, '#fff'); // Feedback down
    drawLine(260, 130, 60, 130, '#fff'); // Feedback left
    drawLine(60, 130, 60, 80, '#fff'); // Feedback up to diff
    
    ctx.fillStyle = Math.abs(err) > 5 ? '#ff3355' : '#00ff88';
    ctx.font = 'bold 16px Orbitron'; ctx.fillText(`Err = ${err.toFixed(1)}°`, 90, 120);

    ctx.fillStyle = '#fff'; ctx.font = '14px Orbitron'; ctx.fillText('STEP RESPONSE (Target vs Actual)', graphX+20, 40);
    const gY = h - 60; const gH = h - 120; const gW = graphW - 40;
    drawLine(graphX+20, gY, graphX+20+gW, gY, '#fff', 1);
    
    ctx.strokeStyle = 'rgba(0,255,136,0.5)'; ctx.lineWidth = 2; ctx.beginPath(); 
    s.hist.forEach((pt, i) => {
      const x = graphX+20 + (i/200)*gW; const y = gY - (pt.sp/360)*gH;
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }); ctx.stroke();

    ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 3; ctx.beginPath(); 
    s.hist.forEach((pt, i) => {
      const x = graphX+20 + (i/200)*gW; const y = gY - (pt.pv/360)*gH;
      if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
    }); ctx.stroke();

    updateStatusBar(
      statBox('Target', ts.sp + '°') +
      statBox('Actual', s.pos.toFixed(1) + '°') +
      statBox('Error', err.toFixed(1) + '°', Math.abs(err) > 2)
    );
  }

  animFrame = requestAnimationFrame(renderLoop);
}

// ═══════════════════════════════════════════════════════
// BOOT
// ═══════════════════════════════════════════════════════
navTo('login');