// src/audio/sonidos.ts
const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
let audioCtx: AudioContext | null = null;

export let configuracionAudio = {
  volumenMaestro: 0.5,
  volumenMusica: 0.3,
  volumenEfectos: 0.7,
  musicaActivada: true,
  efectosActivados: true,
};

function inicializarAudioContext() {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

export function actualizarConfiguracionAudio(nuevaConfig: Partial<typeof configuracionAudio>) {
  configuracionAudio = { ...configuracionAudio, ...nuevaConfig };
}

function reproducirTono(frecuenciaInical: number, frecuenciaFinal: number, tipo: OscillatorType, duracion: number, volumenBase: number) {
  if (!configuracionAudio.efectosActivados) return;
  inicializarAudioContext();
  if (!audioCtx) return;
  
  const osc = audioCtx.createOscillator();
  const ganancia = audioCtx.createGain();
  
  osc.type = tipo;
  osc.frequency.setValueAtTime(frecuenciaInical, audioCtx.currentTime);
  if (frecuenciaFinal) {
    osc.frequency.exponentialRampToValueAtTime(frecuenciaFinal, audioCtx.currentTime + duracion);
  }
  
  const volFinal = volumenBase * configuracionAudio.volumenMaestro * configuracionAudio.volumenEfectos;
  ganancia.gain.setValueAtTime(volFinal, audioCtx.currentTime);
  ganancia.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duracion);
  
  osc.connect(ganancia);
  ganancia.connect(audioCtx.destination);
  
  osc.start();
  osc.stop(audioCtx.currentTime + duracion);
}

export const sonidos = {
  disparo: () => reproducirTono(800, 1200, 'sine', 0.1, 0.1),
  hit: () => reproducirTono(150, 50, 'sawtooth', 0.1, 0.3),
  recogerGema: () => reproducirTono(1200, 1600, 'sine', 0.1, 0.1),
  subirNivel: () => reproducirTono(400, 800, 'triangle', 0.4, 0.3),
  dash: () => reproducirTono(200, 100, 'square', 0.15, 0.2),
  gameOver: () => reproducirTono(150, 50, 'sawtooth', 1.5, 0.5),
};

// Música de fondo procedural
let musicaInterval: number | null = null;
let indiceMusica = 0;
const notasMusica = [220, 261.63, 329.63, 392.00, 440, 392.00, 329.63, 261.63];

export function iniciarMusica() {
  if (musicaInterval) return;
  inicializarAudioContext();
  
  musicaInterval = window.setInterval(() => {
    if (!configuracionAudio.musicaActivada) return;
    if (!audioCtx || audioCtx.state !== 'running') return;
    
    const freq = notasMusica[indiceMusica % notasMusica.length];
    indiceMusica++;
    
    const osc = audioCtx.createOscillator();
    const ganancia = audioCtx.createGain();
    
    // Un tono un poco más suave y sci-fi
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    
    // Acorde/nota de fondo más lenta
    if (indiceMusica % 4 === 0) {
      const oscBajo = audioCtx.createOscillator();
      const ganBajo = audioCtx.createGain();
      oscBajo.type = 'sine';
      oscBajo.frequency.setValueAtTime(freq / 2, audioCtx.currentTime);
      ganBajo.gain.setValueAtTime(0.15 * configuracionAudio.volumenMaestro * configuracionAudio.volumenMusica, audioCtx.currentTime);
      ganBajo.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1.0);
      oscBajo.connect(ganBajo);
      ganBajo.connect(audioCtx.destination);
      oscBajo.start();
      oscBajo.stop(audioCtx.currentTime + 1.0);
    }
    
    ganancia.gain.setValueAtTime(0.1 * configuracionAudio.volumenMaestro * configuracionAudio.volumenMusica, audioCtx.currentTime);
    ganancia.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    
    osc.connect(ganancia);
    ganancia.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  }, 300);
}

export function detenerMusica() {
  if (musicaInterval) {
    clearInterval(musicaInterval);
    musicaInterval = null;
  }
}
