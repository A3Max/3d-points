import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

console.log('Three.js loaded:', THREE);

let scene, camera, renderer, particles, geometry, controls;
let audioContext, analyser, dataArray, source, audioBuffer;
let isPlaying = false;
let gridGroup;

const GRID_SIZE = 100;
const PARTICLE_COUNT = GRID_SIZE * GRID_SIZE;
const SPACING = 0.5;

let baseAmplitude = 1.6;
let audioAmplitude = 2;
let particleSize = 0.25;
let waveCount = 6;
let waveDensity = 0.06;
let waveSpeed = 1.6;
let maxHeightBound = 50;
let currentColorProfile = 0;
let gridRepetitions = 1;
let gridOffsetX = 15;
let gridOffsetZ = 0;
let trueOffsetX = 0;
let trueOffsetZ = 0;
let particleSystems = [];
let lastGridRepetitions = 1;

let videoElement, videoCanvas, videoCtx;
let videoFrameData;
let videoSampleWidth = 100;
let videoSampleHeight = 100;
let videoImpact = 0;
let videoEnabled = false;
let invertVideo = false;
let videoSmoothing = 0.15;
let lastVideoSampleTime = 0;
const VIDEO_SAMPLE_INTERVAL = 33;

let autoRotateX = false;
let autoRotateY = false;
const autoRotateSpeed = 0.005;
let gridRotationX = 0;
let gridRotationY = 0;
let fov = 75;
let camRoll = 0;
let camShake = 0;
let camDolly = 0;

let timeline = {
  fps: 30,
  durationSeconds: 10,
  loop: false,
  keyframes: []
};
let timelineState = {
  currentFrame: 0,
  isPlaying: false,
  lastFrameTime: 0,
  frameAccumulator: 0,
  selectedKeyframeId: null,
  lockControlsDuringPlayback: true
};

let customGradient = {
  stops: [
    { position: 0, color: new THREE.Color(0x00ff88) },
    { position: 100, color: new THREE.Color(0x0088ff) }
  ],
  selectedStopIndex: 0
};

const defaultColorProfiles = [
  {
    name: 'Ocean',
    colors: [
      { position: 0, color: new THREE.Color(0x001133) },
      { position: 0.3, color: new THREE.Color(0x0066aa) },
      { position: 0.6, color: new THREE.Color(0x00aaff) },
      { position: 1, color: new THREE.Color(0x88ddff) }
    ]
  },
  {
    name: 'Sunset',
    colors: [
      { position: 0, color: new THREE.Color(0x220033) },
      { position: 0.3, color: new THREE.Color(0xff4400) },
      { position: 0.6, color: new THREE.Color(0xffaa00) },
      { position: 1, color: new THREE.Color(0xffff44) }
    ]
  },
  {
    name: 'Forest',
    colors: [
      { position: 0, color: new THREE.Color(0x001100) },
      { position: 0.3, color: new THREE.Color(0x006600) },
      { position: 0.6, color: new THREE.Color(0x00cc00) },
      { position: 1, color: new THREE.Color(0x88ff88) }
    ]
  },
  {
    name: 'Neon',
    colors: [
      { position: 0, color: new THREE.Color(0xff00ff) },
      { position: 0.25, color: new THREE.Color(0x00ffff) },
      { position: 0.5, color: new THREE.Color(0x00ff00) },
      { position: 0.75, color: new THREE.Color(0xffff00) },
      { position: 1, color: new THREE.Color(0xff00ff) }
    ]
  },
  {
    name: 'Fire',
    colors: [
      { position: 0, color: new THREE.Color(0x330000) },
      { position: 0.3, color: new THREE.Color(0xff0000) },
      { position: 0.6, color: new THREE.Color(0xff6600) },
      { position: 1, color: new THREE.Color(0xffff00) }
    ]
  }
];

let colorProfiles = [...defaultColorProfiles];
let savedPresets = [];

const waveParams = {
  waves: [
    { frequency: 0.02, amplitude: 1, speed: 1, phase: 0 },
    { frequency: 0.03, amplitude: 0.7, speed: 1.5, phase: 1 },
    { frequency: 0.05, amplitude: 0.5, speed: 2, phase: 2 },
    { frequency: 0.01, amplitude: 1.2, speed: 0.8, phase: 3 },
    { frequency: 0.04, amplitude: 0.6, speed: 1.2, phase: 4 },
    { frequency: 0.025, amplitude: 0.8, speed: 1.8, phase: 5 },
    { frequency: 0.035, amplitude: 0.4, speed: 2.2, phase: 6 },
    { frequency: 0.015, amplitude: 0.9, speed: 0.9, phase: 7 }
  ]
};

function init() {
  try {
    console.log('Initializing scene...');
    const container = document.getElementById('canvas-container');
    console.log('Canvas container found:', container);
    console.log('Container styles:', window.getComputedStyle(container));
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    console.log('Scene created');

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(15, 20, 40);
    camera.lookAt(gridOffsetX + trueOffsetX, 0, gridOffsetZ + trueOffsetZ);
    console.log('Camera created');

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 1);
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.zIndex = '1';
    renderer.domElement.style.background = '#000000';
    container.appendChild(renderer.domElement);
    
    container.style.background = '#000000';
    container.style.width = '100vw';
    container.style.height = '100vh';
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.zIndex = '1';
    console.log('Renderer created and appended');
    console.log('Renderer canvas element:', renderer.domElement);
    console.log('Renderer canvas width:', renderer.domElement.width);
    console.log('Renderer canvas height:', renderer.domElement.height);
    console.log('Renderer canvas styles:', window.getComputedStyle(renderer.domElement));

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 5;
    controls.maxDistance = 200;
    controls.target.set(gridOffsetX + trueOffsetX, 0, gridOffsetZ + trueOffsetZ);
    console.log('Controls created');

    gridGroup = new THREE.Group();
    gridGroup.position.set(gridOffsetX + trueOffsetX, 0, gridOffsetZ + trueOffsetZ);
    scene.add(gridGroup);
    console.log('Grid group created and added to scene');

    setupVideo();
    createParticles();
    setupControls();
    setupAudio();
    setupTimeline();
    updateColorProfileDropdown();
    currentColorProfile = 0;
    document.getElementById('colorProfile').value = 0;
    
    console.log('Scene children count:', scene.children.length);
    console.log('Grid group children count:', gridGroup.children.length);
    
    console.log('DOM elements:');
    console.log('Body children:', document.body.children.length);
    Array.from(document.body.children).forEach((child, i) => {
      const styles = window.getComputedStyle(child);
      console.log(`  ${i}: ${child.tagName} - z-index: ${styles.zIndex}, display: ${styles.display}, position: ${styles.position}, visibility: ${styles.visibility}`);
    });
    
    console.log('Canvas container computed styles:', window.getComputedStyle(container));
    console.log('Canvas computed styles:', window.getComputedStyle(renderer.domElement));
    
    setTimeout(() => {
      console.log('After 1 second - Canvas rect:', renderer.domElement.getBoundingClientRect());
      console.log('After 1 second - Container rect:', container.getBoundingClientRect());
    }, 1000);
    
    renderer.render(scene, camera);
    console.log('Initial render complete');
    
    console.log('Starting animation loop');
    animate();

    window.addEventListener('resize', onWindowResize);
    console.log('Initialization complete');
  } catch (error) {
    console.error('Error during initialization:', error);
    console.error('Error stack:', error.stack);
  }
}

function createParticles() {
  if (gridGroup) {
    scene.remove(gridGroup);
  }
  
  gridGroup = new THREE.Group();
  scene.add(gridGroup);
  particleSystems = [];
  
  createPlaneParticles();
}

function createPlaneParticles() {
  const gridWidth = (GRID_SIZE - 1) * SPACING;
  const centerOffset = (gridRepetitions - 1) / 2;
  
  for (let gx = 0; gx < gridRepetitions; gx++) {
    for (let gz = 0; gz < gridRepetitions; gz++) {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(PARTICLE_COUNT * 3);
      const colors = new Float32Array(PARTICLE_COUNT * 3);
      
      const offsetX = (gx - centerOffset) * gridWidth * 1.01;
      const offsetZ = (gz - centerOffset) * gridWidth * 1.01;
      
      for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
          const index = (i * GRID_SIZE + j) * 3;
          let x = (i - GRID_SIZE / 2) * SPACING;
          let z = (j - GRID_SIZE / 2) * SPACING;
          
          positions[index] = x + offsetX;
          positions[index + 1] = 0;
          positions[index + 2] = z + offsetZ;
          
          colors[index] = 1;
          colors[index + 1] = 1;
          colors[index + 2] = 1;
        }
      }
      
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      
      const material = new THREE.PointsMaterial({
        size: particleSize,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true
      });
      
      const ps = new THREE.Points(geometry, material);
      ps.userData = {};
      gridGroup.add(ps);
      particleSystems.push(ps);
    }
  }
}

function getWaveHeight(x, z, time, audioModulation) {
  let height = 0;
  
  for (let i = 0; i < waveCount; i++) {
    const wave = waveParams.waves[i];
    const freq = wave.frequency * (waveDensity / 0.02);
    const modulatedAmp = wave.amplitude * audioModulation;
    height += Math.sin(x * freq + time * wave.speed * waveSpeed + wave.phase) * 
              Math.cos(z * freq + time * wave.speed * waveSpeed * 0.8) * 
              modulatedAmp;
  }
  
  return height * baseAmplitude;
}

function updateParticles(time) {
  updateVideoFrame();
  
  if (isPlaying && analyser && dataArray) {
    analyser.getByteFrequencyData(dataArray);
  }
  
  particleSystems.forEach(ps => {
    const positions = ps.geometry.attributes.position.array;
    const colors = ps.geometry.attributes.color.array;
    
    let minHeight = Infinity;
    let maxHeight = -Infinity;
    const heights = [];
    
    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        const index = (i * GRID_SIZE + j) * 3;
        const x = positions[index];
        const z = positions[index + 2];
        
        let audioModulation = 1;
        if (isPlaying && dataArray) {
          const wavePhase = (x + z) * waveDensity + time * waveSpeed;
          const normalizedPhase = (Math.sin(wavePhase) + 1) / 2;
          const freqIndex = Math.floor(normalizedPhase * (dataArray.length / 4));
          const audioValue = dataArray[freqIndex] / 255;
          audioModulation = 1 + audioValue * audioAmplitude;
        }
        
        let height = getWaveHeight(x, z, time, audioModulation);
        
        const videoBrightness = getVideoBrightnessAt(i, j, false, false);
        height += videoImpact * videoBrightness;
        
        height = Math.max(-maxHeightBound, Math.min(maxHeightBound, height));
        
        positions[index + 1] = height;
        
        heights.push(height);
        
        if (height < minHeight) minHeight = height;
        if (height > maxHeight) maxHeight = height;
      }
    }
    
    const heightRange = maxHeight - minHeight || 1;
    
    for (let i = 0; i < heights.length; i++) {
      const index = i * 3;
      const normalizedHeight = (heights[i] - minHeight) / heightRange;
      const color = getGradientColor(normalizedHeight);
      
      colors[index] = color.r;
      colors[index + 1] = color.g;
      colors[index + 2] = color.b;
    }
    
    ps.geometry.attributes.position.needsUpdate = true;
    ps.geometry.attributes.color.needsUpdate = true;
  });
}

function getGradientColor(t) {
  const isCustom = currentColorProfile >= colorProfiles.length;
  
  if (isCustom) {
    const stops = customGradient.stops.sort((a, b) => a.position - b.position);
    
    if (stops.length === 0) return new THREE.Color(0xffffff);
    if (stops.length === 1) return stops[0].color.clone();
    
    const normalizedT = Math.max(0, Math.min(1, t));
    
    if (normalizedT <= stops[0].position / 100) return stops[0].color.clone();
    if (normalizedT >= stops[stops.length - 1].position / 100) return stops[stops.length - 1].color.clone();
    
    for (let i = 0; i < stops.length - 1; i++) {
      const stop1 = stops[i];
      const stop2 = stops[i + 1];
      const pos1 = stop1.position / 100;
      const pos2 = stop2.position / 100;
      
      if (normalizedT >= pos1 && normalizedT <= pos2) {
        const localT = (normalizedT - pos1) / (pos2 - pos1);
        return stop1.color.clone().lerp(stop2.color, localT);
      }
    }
    
    return stops[0].color.clone();
  } else {
    const profile = colorProfiles[currentColorProfile];
    const colors = profile.colors;
    
    if (colors.length === 0) return new THREE.Color(0xffffff);
    if (colors.length === 1) return colors[0].color.clone();
    
    const normalizedT = Math.max(0, Math.min(1, t));
    
    if (normalizedT <= colors[0].position) return colors[0].color.clone();
    if (normalizedT >= colors[colors.length - 1].position) return colors[colors.length - 1].color.clone();
    
    for (let i = 0; i < colors.length - 1; i++) {
      const color1 = colors[i];
      const color2 = colors[i + 1];
      const pos1 = color1.position;
      const pos2 = color2.position;
      
      if (normalizedT >= pos1 && normalizedT <= pos2) {
        const localT = (normalizedT - pos1) / (pos2 - pos1);
        return color1.color.clone().lerp(color2.color, localT);
      }
    }
    
    return colors[0].color.clone();
  }
}

function setupControls() {
  const baseAmpSlider = document.getElementById('baseAmplitude');
  const baseAmpValue = document.getElementById('baseAmplitudeValue');
  baseAmpSlider.addEventListener('input', (e) => {
    baseAmplitude = parseInt(e.target.value) / 10;
    baseAmpValue.value = e.target.value;
  });
  baseAmpValue.addEventListener('input', (e) => {
    let val = parseInt(e.target.value);
    val = Math.max(0, Math.min(20, val));
    baseAmplitude = val / 10;
    baseAmpSlider.value = val;
    baseAmpValue.value = val;
  });

  const audioAmpSlider = document.getElementById('audioAmplitude');
  const audioAmpValue = document.getElementById('audioAmplitudeValue');
  audioAmpSlider.addEventListener('input', (e) => {
    audioAmplitude = parseInt(e.target.value) / 10;
    audioAmpValue.value = e.target.value;
  });
  audioAmpValue.addEventListener('input', (e) => {
    let val = parseInt(e.target.value);
    val = Math.max(0, Math.min(50, val));
    audioAmplitude = val / 10;
    audioAmpSlider.value = val;
    audioAmpValue.value = val;
  });

  const particleSizeSlider = document.getElementById('particleSize');
  const particleSizeValue = document.getElementById('particleSizeValue');
  particleSizeSlider.addEventListener('input', (e) => {
    particleSize = parseInt(e.target.value) / 100;
    particleSizeValue.value = e.target.value;
    particleSystems.forEach(ps => {
      ps.material.size = particleSize;
    });
  });
  particleSizeValue.addEventListener('input', (e) => {
    let val = parseInt(e.target.value);
    val = Math.max(5, Math.min(100, val));
    particleSize = val / 100;
    particleSizeSlider.value = val;
    particleSizeValue.value = val;
    particleSystems.forEach(ps => {
      ps.material.size = particleSize;
    });
  });

  const waveCountSlider = document.getElementById('waveCount');
  const waveCountValue = document.getElementById('waveCountValue');
  waveCountSlider.addEventListener('input', (e) => {
    waveCount = parseInt(e.target.value);
    waveCountValue.value = waveCount;
  });
  waveCountValue.addEventListener('input', (e) => {
    let val = parseInt(e.target.value);
    val = Math.max(1, Math.min(8, val));
    waveCount = val;
    waveCountSlider.value = val;
    waveCountValue.value = val;
  });

  const waveDensitySlider = document.getElementById('waveDensity');
  const waveDensityValue = document.getElementById('waveDensityValue');
  waveDensitySlider.addEventListener('input', (e) => {
    waveDensity = parseInt(e.target.value) / 1000;
    waveDensityValue.value = e.target.value;
  });
  waveDensityValue.addEventListener('input', (e) => {
    let val = parseInt(e.target.value);
    val = Math.max(5, Math.min(100, val));
    waveDensity = val / 1000;
    waveDensitySlider.value = val;
    waveDensityValue.value = val;
  });

  const waveSpeedSlider = document.getElementById('waveSpeed');
  const waveSpeedValue = document.getElementById('waveSpeedValue');
  waveSpeedSlider.addEventListener('input', (e) => {
    waveSpeed = parseInt(e.target.value) / 10;
    waveSpeedValue.value = e.target.value;
  });
  waveSpeedValue.addEventListener('input', (e) => {
    let val = parseInt(e.target.value);
    val = Math.max(1, Math.min(50, val));
    waveSpeed = val / 10;
    waveSpeedSlider.value = val;
    waveSpeedValue.value = val;
  });

  const maxHeightBoundSlider = document.getElementById('maxHeightBound');
  const maxHeightBoundValue = document.getElementById('maxHeightBoundValue');
  maxHeightBoundSlider.addEventListener('input', (e) => {
    maxHeightBound = parseInt(e.target.value);
    maxHeightBoundValue.value = e.target.value;
  });
  maxHeightBoundValue.addEventListener('input', (e) => {
    let val = parseInt(e.target.value);
    val = Math.max(5, Math.min(200, val));
    maxHeightBound = val;
    maxHeightBoundSlider.value = val;
    maxHeightBoundValue.value = val;
  });

  const colorProfileSelect = document.getElementById('colorProfile');
  colorProfileSelect.addEventListener('change', (e) => {
    const value = e.target.value;
    if (value === 'custom') {
      currentColorProfile = colorProfiles.length;
    } else {
      currentColorProfile = parseInt(value);
    }
    const gradientEditor = document.querySelector('.gradient-editor');
    const isCustom = value === 'custom';
    const deleteBtn = document.getElementById('deletePresetBtn');
    
    if (isCustom) {
      gradientEditor.style.display = 'block';
      deleteBtn.style.display = 'none';
    } else {
      gradientEditor.style.display = 'none';
      const isSavedPreset = currentColorProfile >= defaultColorProfiles.length;
      deleteBtn.style.display = isSavedPreset ? 'inline-block' : 'none';
    }
  });



  const gridRepetitionsSlider = document.getElementById('gridRepetitions');
  const gridRepetitionsValue = document.getElementById('gridRepetitionsValue');
  gridRepetitionsSlider.addEventListener('input', (e) => {
    gridRepetitions = parseInt(e.target.value);
    gridRepetitionsValue.value = gridRepetitions;
    createParticles();
    lastGridRepetitions = gridRepetitions;
  });
  gridRepetitionsValue.addEventListener('input', (e) => {
    let val = parseInt(e.target.value);
    val = Math.max(1, Math.min(5, val));
    gridRepetitions = val;
    gridRepetitionsSlider.value = val;
    gridRepetitionsValue.value = val;
    createParticles();
    lastGridRepetitions = gridRepetitions;
  });

  const gridOffsetXSlider = document.getElementById('gridOffsetX');
  const gridOffsetXValue = document.getElementById('gridOffsetXValue');
  gridOffsetXSlider.addEventListener('input', (e) => {
    gridOffsetX = parseInt(e.target.value);
    gridOffsetXValue.value = gridOffsetX;
    updateGridPosition();
  });
  gridOffsetXValue.addEventListener('input', (e) => {
    let val = parseInt(e.target.value);
    val = Math.max(-50, Math.min(50, val));
    gridOffsetX = val;
    gridOffsetXSlider.value = val;
    gridOffsetXValue.value = val;
    updateGridPosition();
  });

  const gridOffsetZSlider = document.getElementById('gridOffsetZ');
  const gridOffsetZValue = document.getElementById('gridOffsetZValue');
  gridOffsetZSlider.addEventListener('input', (e) => {
    gridOffsetZ = parseInt(e.target.value);
    gridOffsetZValue.value = gridOffsetZ;
    updateGridPosition();
  });
  gridOffsetZValue.addEventListener('input', (e) => {
    let val = parseInt(e.target.value);
    val = Math.max(-50, Math.min(50, val));
    gridOffsetZ = val;
    gridOffsetZSlider.value = val;
    gridOffsetZValue.value = val;
    updateGridPosition();
  });

  const trueOffsetXSlider = document.getElementById('trueOffsetX');
  const trueOffsetXValue = document.getElementById('trueOffsetXValue');
  trueOffsetXSlider.addEventListener('input', (e) => {
    trueOffsetX = parseInt(e.target.value);
    trueOffsetXValue.value = trueOffsetX;
    updateGridPosition();
  });
  trueOffsetXValue.addEventListener('input', (e) => {
    let val = parseInt(e.target.value);
    val = Math.max(-50, Math.min(50, val));
    trueOffsetX = val;
    trueOffsetXSlider.value = val;
    trueOffsetXValue.value = val;
    updateGridPosition();
  });

  const trueOffsetZSlider = document.getElementById('trueOffsetZ');
  const trueOffsetZValue = document.getElementById('trueOffsetZValue');
  trueOffsetZSlider.addEventListener('input', (e) => {
    trueOffsetZ = parseInt(e.target.value);
    trueOffsetZValue.value = trueOffsetZ;
    updateGridPosition();
  });
  trueOffsetZValue.addEventListener('input', (e) => {
    let val = parseInt(e.target.value);
    val = Math.max(-50, Math.min(50, val));
    trueOffsetZ = val;
    trueOffsetZSlider.value = val;
    trueOffsetZValue.value = val;
    updateGridPosition();
  });

  const fovSlider = document.getElementById('fov');
  const fovValue = document.getElementById('fovValue');
  fovSlider.addEventListener('input', (e) => {
    fov = parseInt(e.target.value);
    fovValue.value = fov;
    camera.fov = fov;
    camera.updateProjectionMatrix();
  });
  fovValue.addEventListener('input', (e) => {
    let val = parseInt(e.target.value);
    val = Math.max(30, Math.min(120, val));
    fov = val;
    fovSlider.value = val;
    fovValue.value = val;
    camera.fov = fov;
    camera.updateProjectionMatrix();
  });

  const camRollSlider = document.getElementById('camRoll');
  const camRollValue = document.getElementById('camRollValue');
  camRollSlider.addEventListener('input', (e) => {
    camRoll = parseInt(e.target.value);
    camRollValue.value = camRoll;
  });
  camRollValue.addEventListener('input', (e) => {
    let val = parseInt(e.target.value);
    val = Math.max(-100, Math.min(100, val));
    camRoll = val;
    camRollSlider.value = val;
    camRollValue.value = val;
  });

  const camShakeSlider = document.getElementById('camShake');
  const camShakeValue = document.getElementById('camShakeValue');
  camShakeSlider.addEventListener('input', (e) => {
    camShake = parseInt(e.target.value);
    camShakeValue.value = camShake;
  });
  camShakeValue.addEventListener('input', (e) => {
    let val = parseInt(e.target.value);
    val = Math.max(0, Math.min(50, val));
    camShake = val;
    camShakeSlider.value = val;
    camShakeValue.value = val;
  });

  const camDollySlider = document.getElementById('camDolly');
  const camDollyValue = document.getElementById('camDollyValue');
  camDollySlider.addEventListener('input', (e) => {
    camDolly = parseInt(e.target.value);
    camDollyValue.value = camDolly;
  });
  camDollyValue.addEventListener('input', (e) => {
    let val = parseInt(e.target.value);
    val = Math.max(-50, Math.min(50, val));
    camDolly = val;
    camDollySlider.value = val;
    camDollyValue.value = val;
  });

  document.getElementById('playBtn').addEventListener('click', playAudio);
  document.getElementById('pauseBtn').addEventListener('click', pauseAudio);

  const uiToggleBtn = document.getElementById('ui-toggle-btn');
  let mouseTimeout;
  let isUIHidden = false;

  function showUIToggle() {
    uiToggleBtn.classList.add('visible');
    clearTimeout(mouseTimeout);
    mouseTimeout = setTimeout(() => {
      uiToggleBtn.classList.remove('visible');
    }, 2000);
  }

  document.addEventListener('mousemove', showUIToggle);
  uiToggleBtn.addEventListener('mouseenter', () => {
    clearTimeout(mouseTimeout);
  });
  uiToggleBtn.addEventListener('mouseleave', () => {
    mouseTimeout = setTimeout(() => {
      uiToggleBtn.classList.remove('visible');
    }, 2000);
  });

  uiToggleBtn.addEventListener('click', () => {
    isUIHidden = !isUIHidden;
    document.body.classList.toggle('ui-hidden', isUIHidden);
    uiToggleBtn.textContent = isUIHidden ? 'Show UI' : 'Hide UI';
    showUIToggle();
  });

  const videoImpactSlider = document.getElementById('videoImpact');
  const videoImpactValue = document.getElementById('videoImpactValue');
  videoImpactSlider.addEventListener('input', (e) => {
    videoImpact = parseInt(e.target.value) / 10;
    videoImpactValue.value = e.target.value;
  });
  videoImpactValue.addEventListener('input', (e) => {
    let val = parseInt(e.target.value);
    val = Math.max(0, Math.min(50, val));
    videoImpact = val / 10;
    videoImpactSlider.value = val;
    videoImpactValue.value = val;
  });

  document.getElementById('autoRotateXBtn').addEventListener('click', () => {
    autoRotateX = !autoRotateX;
    document.getElementById('autoRotateXBtn').classList.toggle('active', autoRotateX);
  });
  document.getElementById('autoRotateYBtn').addEventListener('click', () => {
    autoRotateY = !autoRotateY;
    document.getElementById('autoRotateYBtn').classList.toggle('active', autoRotateY);
  });
  document.getElementById('invertVideoBtn').addEventListener('click', () => {
    invertVideo = !invertVideo;
    document.getElementById('invertVideoBtn').classList.toggle('active', invertVideo);
  });
  document.getElementById('resetRotationBtn').addEventListener('click', () => {
    gridRotationX = 0;
    gridRotationY = 0;
    gridGroup.rotation.x = 0;
    gridGroup.rotation.y = 0;
  });

  setupGradientEditor();
}

function updateGridPosition() {
  const totalX = gridOffsetX + trueOffsetX;
  const totalZ = gridOffsetZ + trueOffsetZ;
  gridGroup.position.x = totalX;
  gridGroup.position.z = totalZ;
  controls.target.set(totalX, 0, totalZ);
}

function setupGradientEditor() {
  const preview = document.getElementById('gradientPreview');
  const stopsContainer = document.getElementById('gradientStops');
  const controlsContainer = document.getElementById('gradientStopControls');
  const colorPicker = document.getElementById('gradientStopColor');
  const positionSlider = document.getElementById('gradientStopPosition');
  const positionValue = document.getElementById('gradientStopPositionValue');
  const addStopBtn = document.getElementById('gradientAddStop');
  const deleteStopBtn = document.getElementById('gradientDeleteStop');

  let draggingStopIndex = null;

  function updateGradientPreview() {
    const sortedStops = [...customGradient.stops].sort((a, b) => a.position - b.position);
    const gradientCSS = sortedStops.map(stop =>
      `#${stop.color.getHexString()} ${stop.position}%`
    ).join(', ');
    preview.style.background = `linear-gradient(to right, ${gradientCSS})`;
  }

  function renderStops() {
    stopsContainer.innerHTML = '';
    customGradient.stops.forEach((stop, index) => {
      if (!stop || !stop.color) return;
      const stopEl = document.createElement('div');
      stopEl.className = 'gradient-stop';
      stopEl.style.left = `${stop.position}%`;
      stopEl.style.backgroundColor = `#${stop.color.getHexString()}`;
      if (index === customGradient.selectedStopIndex) {
        stopEl.classList.add('selected');
      }
      stopEl.addEventListener('click', (e) => {
        e.stopPropagation();
        selectStop(index);
      });
      stopEl.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
          draggingStopIndex = index;
          e.preventDefault();
        }
      });
      stopsContainer.appendChild(stopEl);
    });
  }

  function selectStop(index) {
    customGradient.selectedStopIndex = index;
    const stop = customGradient.stops[index];
    if (stop) {
      colorPicker.value = `#${stop.color.getHexString()}`;
      positionSlider.value = stop.position;
      positionValue.value = stop.position;
      controlsContainer.style.display = 'flex';
    } else {
      controlsContainer.style.display = 'none';
    }
    renderStops();
  }

  function addStop() {
    if (customGradient.stops.length >= 10) {
      alert('Maximum 10 color stops allowed');
      return;
    }
    const newStop = {
      position: 50,
      color: new THREE.Color(0xffffff)
    };
    customGradient.stops.push(newStop);
    selectStop(customGradient.stops.length - 1);
    updateGradientPreview();
  }

  function deleteStop() {
    if (customGradient.stops.length <= 2) {
      alert('Minimum 2 color stops required');
      return;
    }
    if (customGradient.selectedStopIndex !== null) {
      customGradient.stops.splice(customGradient.selectedStopIndex, 1);
      customGradient.selectedStopIndex = Math.min(customGradient.selectedStopIndex, customGradient.stops.length - 1);
      selectStop(customGradient.selectedStopIndex);
      updateGradientPreview();
    }
  }

  stopsContainer.addEventListener('mousemove', (e) => {
    if (draggingStopIndex !== null && customGradient.stops[draggingStopIndex]) {
      const rect = stopsContainer.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      customGradient.stops[draggingStopIndex].position = Math.round(percentage);
      selectStop(draggingStopIndex);
      updateGradientPreview();
    }
  });

  document.addEventListener('mouseup', () => {
    draggingStopIndex = null;
  });

  colorPicker.addEventListener('input', (e) => {
    if (customGradient.selectedStopIndex !== null && customGradient.stops[customGradient.selectedStopIndex]) {
      customGradient.stops[customGradient.selectedStopIndex].color = new THREE.Color(e.target.value);
      renderStops();
      updateGradientPreview();
    }
  });

  positionSlider.addEventListener('input', (e) => {
    if (customGradient.selectedStopIndex !== null && customGradient.stops[customGradient.selectedStopIndex]) {
      const val = parseInt(e.target.value);
      customGradient.stops[customGradient.selectedStopIndex].position = val;
      positionValue.value = val;
      renderStops();
      updateGradientPreview();
    }
  });

  positionValue.addEventListener('input', (e) => {
    if (customGradient.selectedStopIndex !== null && customGradient.stops[customGradient.selectedStopIndex]) {
      let val = parseInt(e.target.value);
      val = Math.max(0, Math.min(100, val));
      customGradient.stops[customGradient.selectedStopIndex].position = val;
      positionSlider.value = val;
      positionValue.value = val;
      renderStops();
      updateGradientPreview();
    }
  });

  addStopBtn.addEventListener('click', addStop);
  deleteStopBtn.addEventListener('click', deleteStop);

  document.getElementById('savePresetBtn').addEventListener('click', saveGradientPreset);
  document.getElementById('deletePresetBtn').addEventListener('click', deleteGradientPreset);

  updateGradientPreview();
  renderStops();
  if (customGradient.stops.length > 0) {
    selectStop(0);
  }

  const gradientEditor = document.querySelector('.gradient-editor');
  const isCustom = currentColorProfile >= colorProfiles.length;
  if (isCustom) {
    gradientEditor.style.display = 'block';
  } else {
    gradientEditor.style.display = 'none';
  }
}

function saveGradientPreset() {
  const name = prompt('Enter a name for this gradient preset:');
  if (!name || name.trim() === '') return;
  
  const sortedStops = [...customGradient.stops].sort((a, b) => a.position - b.position);
  const colors = sortedStops.map(stop => ({
    position: stop.position / 100,
    color: stop.color.clone()
  }));
  
  const preset = {
    name: name.trim(),
    colors: colors
  };
  
  colorProfiles.push(preset);
  savedPresets.push(preset);
  
  updateColorProfileDropdown();
  currentColorProfile = colorProfiles.length - 1;
  document.getElementById('colorProfile').value = currentColorProfile;
  
  const gradientEditor = document.querySelector('.gradient-editor');
  gradientEditor.style.display = 'none';
  
  const deleteBtn = document.getElementById('deletePresetBtn');
  deleteBtn.style.display = 'inline-block';
  
  console.log('Gradient preset saved:', name);
}

function deleteGradientPreset() {
  const isCustom = currentColorProfile === colorProfiles.length;
  const isSavedPreset = currentColorProfile >= defaultColorProfiles.length && !isCustom;

  if (!isSavedPreset) {
    alert('Can only delete saved custom presets');
    return;
  }

  const preset = colorProfiles[currentColorProfile];
  if (!confirm(`Delete preset "${preset.name}"?`)) return;

  colorProfiles.splice(currentColorProfile, 1);
  savedPresets = savedPresets.filter(p => p.name !== preset.name);

  currentColorProfile = 0;
  updateColorProfileDropdown();
  document.getElementById('colorProfile').value = currentColorProfile;

  const gradientEditor = document.querySelector('.gradient-editor');
  gradientEditor.style.display = 'none';

  console.log('Gradient preset deleted:', preset.name);
}

function updateColorProfileDropdown() {
  const select = document.getElementById('colorProfile');
  if (!select) return;

  select.innerHTML = '';

  colorProfiles.forEach((profile, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = profile.name;
    select.appendChild(option);
  });

  const customOption = document.createElement('option');
  customOption.value = 'custom';
  customOption.textContent = 'Custom Gradient';
  select.appendChild(customOption);
}

function setupVideo() {
  videoElement = document.createElement('video');
  videoElement.crossOrigin = 'anonymous';
  videoElement.loop = true;
  videoElement.muted = true;
  videoElement.playsInline = true;
  videoElement.style.display = 'none';
  videoElement.style.position = 'absolute';
  videoElement.style.zIndex = '-1';
  videoElement.style.visibility = 'hidden';
  document.body.appendChild(videoElement);

  videoCanvas = document.createElement('canvas');
  videoCanvas.width = videoSampleWidth;
  videoCanvas.height = videoSampleHeight;
  videoCanvas.style.display = 'none';
  videoCanvas.style.position = 'absolute';
  videoCanvas.style.zIndex = '-1';
  videoCanvas.style.visibility = 'hidden';
  videoCtx = videoCanvas.getContext('2d', { willReadFrequently: true });

  const videoFile = document.getElementById('videoFile');
  const videoFileButton = document.getElementById('videoFileButton');
  
  videoFileButton.addEventListener('click', () => {
    videoFile.click();
  });
  
  videoFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const buttonText = videoFileButton.querySelector('span');
      buttonText.textContent = file.name;
      videoFileButton.classList.add('has-file');
      
      const url = URL.createObjectURL(file);
      videoElement.src = url;
      videoElement.load();
      videoEnabled = true;
    }
  });

  document.getElementById('videoPlayBtn').addEventListener('click', () => {
    if (videoEnabled) {
      videoElement.play();
    }
  });

  document.getElementById('videoPauseBtn').addEventListener('click', () => {
    if (videoEnabled) {
      videoElement.pause();
    }
  });
}

function setupAudio() {
  const audioFile = document.getElementById('audioFile');
  const audioFileButton = document.getElementById('audioFileButton');
  
  audioFileButton.addEventListener('click', () => {
    audioFile.click();
  });
  
  audioFile.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const buttonText = audioFileButton.querySelector('span');
      buttonText.textContent = file.name;
      audioFileButton.classList.add('has-file');
      
      const reader = new FileReader();
      reader.onload = (event) => {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContext.decodeAudioData(event.target.result, (buffer) => {
          audioBuffer = buffer;
          console.log('Audio loaded successfully');
        });
      };
      reader.readAsArrayBuffer(file);
    }
  });
}

function playAudio() {
  if (audioBuffer && !isPlaying) {
    source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.loop = true;

    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    dataArray = new Uint8Array(analyser.frequencyBinCount);

    source.connect(analyser);
    analyser.connect(audioContext.destination);

    source.start(0);
    isPlaying = true;
    console.log('Audio playing');
  }
}

function pauseAudio() {
  if (source && isPlaying) {
    source.stop();
    isPlaying = false;
    console.log('Audio paused');
  }
}

function getVideoBrightnessAt(i, j, mirrorX, mirrorZ) {
  if (!videoEnabled || !videoElement || videoElement.paused || videoElement.ended) {
    return 0;
  }

  const x = mirrorX ? videoSampleWidth - 1 - i : i;
  const y = mirrorZ ? videoSampleHeight - 1 - j : j;

  if (videoFrameData && x >= 0 && x < videoSampleWidth && y >= 0 && y < videoSampleHeight) {
    const index = (y * videoSampleWidth + x) * 4;
    const r = videoFrameData[index];
    const g = videoFrameData[index + 1];
    const b = videoFrameData[index + 2];
    let brightness = (r + g + b) / 3 / 255;

    if (invertVideo) {
      brightness = 1 - brightness;
    }

    return brightness;
  }

  return 0;
}

function updateVideoFrame() {
  if (!videoEnabled || !videoElement || videoElement.paused || videoElement.ended) {
    return;
  }

  const now = performance.now();
  if (now - lastVideoSampleTime < VIDEO_SAMPLE_INTERVAL) {
    return;
  }
  lastVideoSampleTime = now;

  try {
    videoCtx.drawImage(videoElement, 0, 0, videoSampleWidth, videoSampleHeight);
    videoFrameData = videoCtx.getImageData(0, 0, videoSampleWidth, videoSampleHeight).data;
  } catch (e) {
    console.error('Error sampling video frame:', e);
  }
}

function setupTimeline() {
  document.getElementById('timelinePlayPause').addEventListener('click', () => {
    timelineState.isPlaying = !timelineState.isPlaying;
    const btn = document.getElementById('timelinePlayPause');
    btn.textContent = timelineState.isPlaying ? '⏸ Pause' : '▶ Play';
    btn.classList.toggle('active', timelineState.isPlaying);
  });

  document.getElementById('timelineStop').addEventListener('click', () => {
    timelineState.isPlaying = false;
    timelineState.currentFrame = 0;
    document.getElementById('timelinePlayPause').textContent = '▶ Play';
    document.getElementById('timelinePlayPause').classList.remove('active');
    updateTimelineDisplay();
  });

  document.getElementById('timelineJumpStart').addEventListener('click', () => {
    timelineState.currentFrame = 0;
    updateTimelineDisplay();
  });

  document.getElementById('timelineJumpEnd').addEventListener('click', () => {
    const totalFrames = Math.floor(timeline.durationSeconds * timeline.fps);
    timelineState.currentFrame = totalFrames - 1;
    updateTimelineDisplay();
  });

  document.getElementById('timelineAddKeyframe').addEventListener('click', () => {
    const time = timelineState.currentFrame / timeline.fps;
    const keyframe = {
      id: Date.now(),
      timeSeconds: time,
      easing: 'linear',
      camera: {
        position: { x: camera.position.x, y: camera.position.y, z: camera.position.z },
        target: { x: controls.target.x, y: controls.target.y, z: controls.target.z }
      },
      parameters: {
        baseAmplitude: baseAmplitude,
        audioAmplitude: audioAmplitude,
        particleSize: particleSize,
        waveCount: waveCount,
        waveDensity: waveDensity,
        waveSpeed: waveSpeed,
        maxHeightBound: maxHeightBound,
        colorProfile: currentColorProfile,
        gridRepetitions: gridRepetitions,
        gridOffsetX: gridOffsetX,
        gridOffsetZ: gridOffsetZ,
        trueOffsetX: trueOffsetX,
        trueOffsetZ: trueOffsetZ,
        fov: fov,
        videoImpact: videoImpact,
        invertVideo: invertVideo,
        autoRotateX: autoRotateX,
        autoRotateY: autoRotateY,
        camRoll: camRoll,
        camShake: camShake,
        camDolly: camDolly
      }
    };
    timeline.keyframes.push(keyframe);
    timeline.keyframes.sort((a, b) => a.timeSeconds - b.timeSeconds);
    selectKeyframe(keyframe.id);
    updateTimelineDisplay();
  });

  document.getElementById('timelineDeleteKeyframe').addEventListener('click', () => {
    if (timelineState.selectedKeyframeId !== null) {
      timeline.keyframes = timeline.keyframes.filter(kf => kf.id !== timelineState.selectedKeyframeId);
      timelineState.selectedKeyframeId = null;
      document.getElementById('keyframe-editor').classList.remove('visible');
      document.getElementById('timelineDeleteKeyframe').style.display = 'none';
      updateTimelineDisplay();
    }
  });

  document.getElementById('timelineSave').addEventListener('click', saveTimeline);
  document.getElementById('timelineLoad').addEventListener('click', () => {
    document.getElementById('timelineFileInput').click();
  });
  document.getElementById('timelineFileInput').addEventListener('change', loadTimeline);

  document.getElementById('timelineFps').addEventListener('change', (e) => {
    timeline.fps = parseInt(e.target.value);
    updateTimelineDisplay();
  });

  document.getElementById('timelineDuration').addEventListener('change', (e) => {
    timeline.durationSeconds = parseFloat(e.target.value);
    updateTimelineDisplay();
  });

  document.getElementById('timelineLoop').addEventListener('change', (e) => {
    timeline.loop = e.target.checked;
  });

  document.getElementById('timelineLockControls').addEventListener('change', (e) => {
    timelineState.lockControlsDuringPlayback = e.target.checked;
  });

  const ruler = document.getElementById('timeline-ruler');
  ruler.addEventListener('click', (e) => {
    if (e.target === ruler || e.target.id === 'timeline-ruler-track') {
      const rect = ruler.getBoundingClientRect();
      const percentage = (e.clientX - rect.left) / rect.width;
      const totalFrames = Math.floor(timeline.durationSeconds * timeline.fps);
      const targetFrame = Math.floor(percentage * totalFrames);
      scrubToFrame(targetFrame);
    }
  });

  const playhead = document.getElementById('timeline-playhead');
  let isDraggingPlayhead = false;

  playhead.addEventListener('mousedown', () => {
    isDraggingPlayhead = true;
  });

  document.addEventListener('mousemove', (e) => {
    if (isDraggingPlayhead) {
      const rect = ruler.getBoundingClientRect();
      const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const totalFrames = Math.floor(timeline.durationSeconds * timeline.fps);
      const targetFrame = Math.floor(percentage * totalFrames);
      scrubToFrame(targetFrame);
    }
  });

  document.addEventListener('mouseup', () => {
    isDraggingPlayhead = false;
  });

  document.getElementById('keyframe-editor-header').addEventListener('click', () => {
    document.getElementById('keyframe-editor').classList.toggle('collapsed');
  });

  document.getElementById('keyframeUpdate').addEventListener('click', updateKeyframe);
  document.getElementById('keyframeUpdateFromView').addEventListener('click', updateKeyframeFromView);
  document.getElementById('keyframeDelete').addEventListener('click', () => {
    document.getElementById('timelineDeleteKeyframe').click();
  });

  document.getElementById('keyframeInvertVideoBtn').addEventListener('click', () => {
    const btn = document.getElementById('keyframeInvertVideoBtn');
    btn.textContent = btn.textContent === 'Off' ? 'On' : 'Off';
  });

  updateTimelineDisplay();
}

function selectKeyframe(id) {
  timelineState.selectedKeyframeId = id;
  const keyframe = timeline.keyframes.find(kf => kf.id === id);

  if (keyframe) {
    document.getElementById('keyframe-editor').classList.remove('collapsed');
    document.getElementById('keyframe-editor').classList.add('visible');
    document.getElementById('timelineDeleteKeyframe').style.display = 'inline-block';

    document.getElementById('keyframeTime').value = keyframe.timeSeconds.toFixed(2);
    document.getElementById('keyframeEasing').value = keyframe.easing;

    document.getElementById('keyframePosX').value = keyframe.camera.position.x.toFixed(2);
    document.getElementById('keyframePosY').value = keyframe.camera.position.y.toFixed(2);
    document.getElementById('keyframePosZ').value = keyframe.camera.position.z.toFixed(2);
    document.getElementById('keyframeTargetX').value = keyframe.camera.target.x.toFixed(2);
    document.getElementById('keyframeTargetY').value = keyframe.camera.target.y.toFixed(2);
    document.getElementById('keyframeTargetZ').value = keyframe.camera.target.z.toFixed(2);

    document.getElementById('keyframeBaseAmp').value = keyframe.parameters.baseAmplitude.toFixed(2);
    document.getElementById('keyframeAudioAmp').value = keyframe.parameters.audioAmplitude.toFixed(2);
    document.getElementById('keyframeParticleSize').value = keyframe.parameters.particleSize.toFixed(2);
    document.getElementById('keyframeWaveCount').value = keyframe.parameters.waveCount;
    document.getElementById('keyframeWaveDensity').value = keyframe.parameters.waveDensity.toFixed(3);
    document.getElementById('keyframeWaveSpeed').value = keyframe.parameters.waveSpeed.toFixed(2);
    document.getElementById('keyframeMaxHeightBound').value = keyframe.parameters.maxHeightBound;
    document.getElementById('keyframeColorProfile').value = keyframe.parameters.colorProfile;
    document.getElementById('keyframeGridReps').value = keyframe.parameters.gridRepetitions;
    document.getElementById('keyframeGridOffX').value = keyframe.parameters.gridOffsetX;
    document.getElementById('keyframeGridOffZ').value = keyframe.parameters.gridOffsetZ;
    document.getElementById('keyframeTrueOffX').value = keyframe.parameters.trueOffsetX;
    document.getElementById('keyframeTrueOffZ').value = keyframe.parameters.trueOffsetZ;
    document.getElementById('keyframeFov').value = keyframe.parameters.fov;
    document.getElementById('keyframeVideoImpact').value = keyframe.parameters.videoImpact.toFixed(2);
    document.getElementById('keyframeInvertVideoBtn').textContent = keyframe.parameters.invertVideo ? 'On' : 'Off';
    document.getElementById('keyframeAutoRotateX').checked = keyframe.parameters.autoRotateX;
    document.getElementById('keyframeAutoRotateY').checked = keyframe.parameters.autoRotateY;
    document.getElementById('keyframeCamRoll').value = keyframe.parameters.camRoll.toFixed(2);
    document.getElementById('keyframeCamShake').value = keyframe.parameters.camShake.toFixed(2);
    document.getElementById('keyframeCamDolly').value = keyframe.parameters.camDolly.toFixed(2);
  }

  updateTimelineDisplay();
}

function updateKeyframe() {
  if (timelineState.selectedKeyframeId === null) return;

  const keyframe = timeline.keyframes.find(kf => kf.id === timelineState.selectedKeyframeId);
  if (!keyframe) return;

  keyframe.timeSeconds = parseFloat(document.getElementById('keyframeTime').value);
  keyframe.easing = document.getElementById('keyframeEasing').value;

  keyframe.camera.position.x = parseFloat(document.getElementById('keyframePosX').value);
  keyframe.camera.position.y = parseFloat(document.getElementById('keyframePosY').value);
  keyframe.camera.position.z = parseFloat(document.getElementById('keyframePosZ').value);
  keyframe.camera.target.x = parseFloat(document.getElementById('keyframeTargetX').value);
  keyframe.camera.target.y = parseFloat(document.getElementById('keyframeTargetY').value);
  keyframe.camera.target.z = parseFloat(document.getElementById('keyframeTargetZ').value);

  keyframe.parameters.baseAmplitude = parseFloat(document.getElementById('keyframeBaseAmp').value);
  keyframe.parameters.audioAmplitude = parseFloat(document.getElementById('keyframeAudioAmp').value);
  keyframe.parameters.particleSize = parseFloat(document.getElementById('keyframeParticleSize').value);
  keyframe.parameters.waveCount = parseInt(document.getElementById('keyframeWaveCount').value);
  keyframe.parameters.waveDensity = parseFloat(document.getElementById('keyframeWaveDensity').value);
  keyframe.parameters.waveSpeed = parseFloat(document.getElementById('keyframeWaveSpeed').value);
  keyframe.parameters.maxHeightBound = parseInt(document.getElementById('keyframeMaxHeightBound').value);
  keyframe.parameters.colorProfile = parseInt(document.getElementById('keyframeColorProfile').value);
  keyframe.parameters.gridRepetitions = parseInt(document.getElementById('keyframeGridReps').value);
  keyframe.parameters.gridOffsetX = parseInt(document.getElementById('keyframeGridOffX').value);
  keyframe.parameters.gridOffsetZ = parseInt(document.getElementById('keyframeGridOffZ').value);
  keyframe.parameters.trueOffsetX = parseInt(document.getElementById('keyframeTrueOffX').value);
  keyframe.parameters.trueOffsetZ = parseInt(document.getElementById('keyframeTrueOffZ').value);
  keyframe.parameters.fov = parseInt(document.getElementById('keyframeFov').value);
  keyframe.parameters.videoImpact = parseFloat(document.getElementById('keyframeVideoImpact').value);
  keyframe.parameters.invertVideo = document.getElementById('keyframeInvertVideoBtn').textContent === 'On';
  keyframe.parameters.autoRotateX = document.getElementById('keyframeAutoRotateX').checked;
  keyframe.parameters.autoRotateY = document.getElementById('keyframeAutoRotateY').checked;
  keyframe.parameters.camRoll = parseFloat(document.getElementById('keyframeCamRoll').value);
  keyframe.parameters.camShake = parseFloat(document.getElementById('keyframeCamShake').value);
  keyframe.parameters.camDolly = parseFloat(document.getElementById('keyframeCamDolly').value);

  timeline.keyframes.sort((a, b) => a.timeSeconds - b.timeSeconds);
  updateTimelineDisplay();
}

function updateKeyframeFromView() {
  if (timelineState.selectedKeyframeId === null) return;

  const keyframe = timeline.keyframes.find(kf => kf.id === timelineState.selectedKeyframeId);
  if (!keyframe) return;

  keyframe.camera.position.x = camera.position.x;
  keyframe.camera.position.y = camera.position.y;
  keyframe.camera.position.z = camera.position.z;
  keyframe.camera.target.x = controls.target.x;
  keyframe.camera.target.y = controls.target.y;
  keyframe.camera.target.z = controls.target.z;

  document.getElementById('keyframePosX').value = keyframe.camera.position.x.toFixed(2);
  document.getElementById('keyframePosY').value = keyframe.camera.position.y.toFixed(2);
  document.getElementById('keyframePosZ').value = keyframe.camera.position.z.toFixed(2);
  document.getElementById('keyframeTargetX').value = keyframe.camera.target.x.toFixed(2);
  document.getElementById('keyframeTargetY').value = keyframe.camera.target.y.toFixed(2);
  document.getElementById('keyframeTargetZ').value = keyframe.camera.target.z.toFixed(2);
}

function scrubToFrame(frame) {
  const totalFrames = Math.floor(timeline.durationSeconds * timeline.fps);
  timelineState.currentFrame = Math.max(0, Math.min(totalFrames - 1, frame));
  const time = timelineState.currentFrame / timeline.fps;
  evaluateTimeline(time);
  updateTimelineDisplay();
}

function evaluateTimeline(time) {
  if (timeline.keyframes.length === 0) return;

  const sortedKeyframes = [...timeline.keyframes].sort((a, b) => a.timeSeconds - b.timeSeconds);

  let prevKf = null;
  let nextKf = null;

  for (let i = 0; i < sortedKeyframes.length; i++) {
    if (sortedKeyframes[i].timeSeconds <= time) {
      prevKf = sortedKeyframes[i];
    }
    if (sortedKeyframes[i].timeSeconds >= time && !nextKf) {
      nextKf = sortedKeyframes[i];
    }
  }

  if (prevKf && nextKf && prevKf !== nextKf) {
    const t = (time - prevKf.timeSeconds) / (nextKf.timeSeconds - prevKf.timeSeconds);
    const easedT = prevKf.easing === 'easeInOut' ? t * t * (3 - 2 * t) : t;

    camera.position.x = lerp(prevKf.camera.position.x, nextKf.camera.position.x, easedT);
    camera.position.y = lerp(prevKf.camera.position.y, nextKf.camera.position.y, easedT);
    camera.position.z = lerp(prevKf.camera.position.z, nextKf.camera.position.z, easedT);
    controls.target.x = lerp(prevKf.camera.target.x, nextKf.camera.target.x, easedT);
    controls.target.y = lerp(prevKf.camera.target.y, nextKf.camera.target.y, easedT);
    controls.target.z = lerp(prevKf.camera.target.z, nextKf.camera.target.z, easedT);

    baseAmplitude = lerp(prevKf.parameters.baseAmplitude, nextKf.parameters.baseAmplitude, easedT);
    audioAmplitude = lerp(prevKf.parameters.audioAmplitude, nextKf.parameters.audioAmplitude, easedT);
    particleSize = lerp(prevKf.parameters.particleSize, nextKf.parameters.particleSize, easedT);
    waveCount = Math.round(lerp(prevKf.parameters.waveCount, nextKf.parameters.waveCount, easedT));
    waveDensity = lerp(prevKf.parameters.waveDensity, nextKf.parameters.waveDensity, easedT);
    waveSpeed = lerp(prevKf.parameters.waveSpeed, nextKf.parameters.waveSpeed, easedT);
    maxHeightBound = Math.round(lerp(prevKf.parameters.maxHeightBound, nextKf.parameters.maxHeightBound, easedT));
    currentColorProfile = Math.round(lerp(prevKf.parameters.colorProfile, nextKf.parameters.colorProfile, easedT));
    gridRepetitions = Math.round(lerp(prevKf.parameters.gridRepetitions, nextKf.parameters.gridRepetitions, easedT));
    gridOffsetX = Math.round(lerp(prevKf.parameters.gridOffsetX, nextKf.parameters.gridOffsetX, easedT));
    gridOffsetZ = Math.round(lerp(prevKf.parameters.gridOffsetZ, nextKf.parameters.gridOffsetZ, easedT));
    trueOffsetX = Math.round(lerp(prevKf.parameters.trueOffsetX, nextKf.parameters.trueOffsetX, easedT));
    trueOffsetZ = Math.round(lerp(prevKf.parameters.trueOffsetZ, nextKf.parameters.trueOffsetZ, easedT));
    fov = Math.round(lerp(prevKf.parameters.fov, nextKf.parameters.fov, easedT));
    videoImpact = lerp(prevKf.parameters.videoImpact, nextKf.parameters.videoImpact, easedT);
    invertVideo = easedT < 0.5 ? prevKf.parameters.invertVideo : nextKf.parameters.invertVideo;
    autoRotateX = easedT < 0.5 ? prevKf.parameters.autoRotateX : nextKf.parameters.autoRotateX;
    autoRotateY = easedT < 0.5 ? prevKf.parameters.autoRotateY : nextKf.parameters.autoRotateY;
    camRoll = lerp(prevKf.parameters.camRoll, nextKf.parameters.camRoll, easedT);
    camShake = lerp(prevKf.parameters.camShake, nextKf.parameters.camShake, easedT);
    camDolly = lerp(prevKf.parameters.camDolly, nextKf.parameters.camDolly, easedT);

    updateGridPosition();
    camera.fov = fov;
    camera.updateProjectionMatrix();
    applyMaterialChanges();
  } else if (prevKf) {
    camera.position.x = prevKf.camera.position.x;
    camera.position.y = prevKf.camera.position.y;
    camera.position.z = prevKf.camera.position.z;
    controls.target.x = prevKf.camera.target.x;
    controls.target.y = prevKf.camera.target.y;
    controls.target.z = prevKf.camera.target.z;

    baseAmplitude = prevKf.parameters.baseAmplitude;
    audioAmplitude = prevKf.parameters.audioAmplitude;
    particleSize = prevKf.parameters.particleSize;
    waveCount = prevKf.parameters.waveCount;
    waveDensity = prevKf.parameters.waveDensity;
    waveSpeed = prevKf.parameters.waveSpeed;
    maxHeightBound = prevKf.parameters.maxHeightBound;
    currentColorProfile = prevKf.parameters.colorProfile;
    gridRepetitions = prevKf.parameters.gridRepetitions;
    gridOffsetX = prevKf.parameters.gridOffsetX;
    gridOffsetZ = prevKf.parameters.gridOffsetZ;
    trueOffsetX = prevKf.parameters.trueOffsetX;
    trueOffsetZ = prevKf.parameters.trueOffsetZ;
    fov = prevKf.parameters.fov;
    videoImpact = prevKf.parameters.videoImpact;
    invertVideo = prevKf.parameters.invertVideo;
    autoRotateX = prevKf.parameters.autoRotateX;
    autoRotateY = prevKf.parameters.autoRotateY;

    updateGridPosition();
    camera.fov = fov;
    camera.updateProjectionMatrix();
    applyMaterialChanges();
  }
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function applyMaterialChanges() {
  particleSystems.forEach(ps => {
    ps.material.size = particleSize;
  });
}

function updateTimelineDisplay() {
  const totalFrames = Math.floor(timeline.durationSeconds * timeline.fps);
  const currentTime = timelineState.currentFrame / timeline.fps;
  
  document.getElementById('timeline-time-display').textContent = 
    `Frame: ${timelineState.currentFrame} / ${totalFrames} | Time: ${currentTime.toFixed(2)}s / ${timeline.durationSeconds.toFixed(2)}s`;
  
  const playhead = document.getElementById('timeline-playhead');
  const percentage = (timelineState.currentFrame / totalFrames) * 100;
  playhead.style.left = `${percentage}%`;
  
  const ruler = document.getElementById('timeline-ruler');
  ruler.querySelectorAll('.timeline-keyframe').forEach(el => el.remove());
  
  const frameLinesContainer = document.getElementById('timeline-frame-lines');
  frameLinesContainer.innerHTML = '';
  
  const frameStep = Math.max(1, Math.floor(totalFrames / 100));
  const majorFrameStep = Math.max(1, Math.floor(totalFrames / 20));
  
  for (let frame = 0; frame <= totalFrames; frame += frameStep) {
    const line = document.createElement('div');
    line.className = 'timeline-frame-line';
    if (frame % majorFrameStep === 0) {
      line.classList.add('major');
    }
    const linePercentage = (frame / totalFrames) * 100;
    line.style.left = `${linePercentage}%`;
    frameLinesContainer.appendChild(line);
  }
  
  timeline.keyframes.forEach(kf => {
    const kfPercentage = (kf.timeSeconds / timeline.durationSeconds) * 100;
    const marker = document.createElement('div');
    marker.className = 'timeline-keyframe';
    if (kf.id === timelineState.selectedKeyframeId) {
      marker.classList.add('selected');
    }
    marker.style.left = `${kfPercentage}%`;
    marker.addEventListener('click', (e) => {
      e.stopPropagation();
      selectKeyframe(kf.id);
      const targetFrame = Math.floor(kf.timeSeconds * timeline.fps);
      scrubToFrame(targetFrame);
    });
    ruler.appendChild(marker);
  });
}

function updateTimelinePlayback(deltaTime) {
  if (!timelineState.isPlaying) return;
  
  const frameDurationMs = 1000 / timeline.fps;
  timelineState.frameAccumulator += deltaTime;
  
  while (timelineState.frameAccumulator >= frameDurationMs) {
    timelineState.currentFrame++;
    timelineState.frameAccumulator -= frameDurationMs;
    
    const totalFrames = Math.floor(timeline.durationSeconds * timeline.fps);
    
    if (timelineState.currentFrame >= totalFrames) {
      if (timeline.loop) {
        timelineState.currentFrame = 0;
      } else {
        timelineState.currentFrame = totalFrames - 1;
        timelineState.isPlaying = false;
        document.getElementById('timelinePlayPause').textContent = '▶ Play';
        document.getElementById('timelinePlayPause').classList.remove('active');
      }
    }
  }
  
  const time = timelineState.currentFrame / timeline.fps;
  evaluateTimeline(time);
  updateTimelineDisplay();
}

function saveTimeline() {
  const data = {
    version: 1,
    timeline: {
      fps: timeline.fps,
      durationSeconds: timeline.durationSeconds,
      loop: timeline.loop,
      keyframes: timeline.keyframes
    }
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'timeline.json';
  a.click();
  URL.revokeObjectURL(url);
}

function loadTimeline(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.version === 1 && data.timeline) {
        timeline.fps = data.timeline.fps || 30;
        timeline.durationSeconds = data.timeline.durationSeconds || 10;
        timeline.loop = data.timeline.loop || false;
        timeline.keyframes = data.timeline.keyframes || [];
        
        document.getElementById('timelineFps').value = timeline.fps;
        document.getElementById('timelineDuration').value = timeline.durationSeconds;
        document.getElementById('timelineLoop').checked = timeline.loop;
        
        timelineState.selectedKeyframeId = null;
        document.getElementById('keyframe-editor').classList.remove('visible');
        
        updateTimelineDisplay();
        console.log('Timeline loaded successfully');
      }
    } catch (error) {
      console.error('Error loading timeline:', error);
      alert('Failed to load timeline file');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  
  const now = performance.now();
  const deltaTime = now - (timelineState.lastFrameTime || now);
  timelineState.lastFrameTime = now;
  
  const time = Date.now() * 0.001;
  updateParticles(time);
  
  if (timelineState.isPlaying) {
    updateTimelinePlayback(deltaTime);
    if (timelineState.lockControlsDuringPlayback) {
      controls.enabled = false;
    }
  } else {
    controls.enabled = true;
    
    if (autoRotateX || autoRotateY) {
      if (autoRotateY) {
        gridRotationY += autoRotateSpeed;
      }
      if (autoRotateX) {
        gridRotationX += autoRotateSpeed;
      }
      gridGroup.rotation.x = gridRotationX;
      gridGroup.rotation.y = gridRotationY;
    }
  }
  
  if (controls) {
    controls.update();
  }
  
  if (camRoll !== 0 || camShake !== 0 || camDolly !== 0) {
    camera.updateMatrixWorld();
    const originalPosition = camera.position.clone();
    const originalQuaternion = camera.quaternion.clone();
    
    if (camRoll !== 0) {
      camera.rotateZ(camRoll * 0.01);
    }
    
    if (camShake !== 0) {
      const shakeAmount = camShake * 0.1;
      camera.position.x += (Math.random() - 0.5) * shakeAmount;
      camera.position.y += (Math.random() - 0.5) * shakeAmount;
      camera.position.z += (Math.random() - 0.5) * shakeAmount;
    }
    
    if (camDolly !== 0) {
      const dollyAmount = camDolly * 0.5;
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      camera.position.addScaledVector(direction, dollyAmount);
    }
    
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
    
    camera.position.copy(originalPosition);
    camera.quaternion.copy(originalQuaternion);
  } else {
    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }
  
  if (renderer && renderer.domElement) {
    const rect = renderer.domElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      console.warn('Canvas has zero dimensions:', rect);
    }
  }
}

console.log('Starting initialization...');
console.log('Document ready state:', document.readyState);
console.log('Window dimensions:', window.innerWidth, 'x', window.innerHeight);

window.addEventListener('load', () => {
  console.log('Window fully loaded');
  init();
});

if (document.readyState === 'complete') {
  console.log('Document already complete, initializing immediately');
  init();
}
