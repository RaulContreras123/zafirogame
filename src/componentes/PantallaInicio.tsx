import React from 'react';
import { configuracionAudio, actualizarConfiguracionAudio, iniciarMusica, sonidos } from '../audio/sonidos';
import { Settings, Play, Music, Volume2, VolumeX, ShieldAlert } from 'lucide-react';

export function PantallaInicio({ alIniciar }: { alIniciar: () => void }) {
  const [opcionesAbiertas, setOpcionesAbiertas] = React.useState(false);
  // Fuerza renderizado al cambiar opciones
  const [, setRefresh] = React.useState(0);

  const toggleMusica = () => {
    actualizarConfiguracionAudio({ musicaActivada: !configuracionAudio.musicaActivada });
    setRefresh(r => r + 1);
  };

  const toggleEfectos = () => {
    actualizarConfiguracionAudio({ efectosActivados: !configuracionAudio.efectosActivados });
    setRefresh(r => r + 1);
  };

  const handleComenzar = () => {
    if (configuracionAudio.musicaActivada) {
      iniciarMusica();
    }
    // Tono de inicio
    if (configuracionAudio.efectosActivados) {
      sonidos.subirNivel();
    }
    alIniciar();
  };

  if (opcionesAbiertas) {
    return (
      <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center z-50 p-8">
        <h2 className="text-4xl font-bold text-white mb-12 uppercase tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
          Opciones
        </h2>
        
        <div className="w-full max-w-md flex flex-col gap-6">
          <button 
            onClick={toggleMusica}
            className="flex items-center justify-between p-4 bg-slate-800/80 rounded-xl border border-slate-700 text-white hover:bg-slate-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Music size={24} className="text-cyan-400" />
              <span className="text-xl">Música</span>
            </div>
            {configuracionAudio.musicaActivada ? <Volume2 size={24} className="text-green-400" /> : <VolumeX size={24} className="text-red-400" />}
          </button>
          
          <button 
            onClick={toggleEfectos}
            className="flex items-center justify-between p-4 bg-slate-800/80 rounded-xl border border-slate-700 text-white hover:bg-slate-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ShieldAlert size={24} className="text-purple-400" />
              <span className="text-xl">Efectos de Sonido</span>
            </div>
            {configuracionAudio.efectosActivados ? <Volume2 size={24} className="text-green-400" /> : <VolumeX size={24} className="text-red-400" />}
          </button>
        </div>

        <button 
          onClick={() => setOpcionesAbiertas(false)}
          className="mt-12 px-8 py-3 bg-white text-slate-900 font-bold rounded-full hover:bg-slate-200 transition-colors uppercase tracking-widest"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-slate-900 flex flex-col items-center justify-center z-50 overflow-hidden">
      {/* Fondo Animado Simple CSS */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full blur-[100px] animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center text-center p-8">
        <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 uppercase tracking-tighter mb-4 drop-shadow-lg">
          Neon<br/>Survivor
        </h1>
        
        <p className="text-slate-400 text-lg md:text-xl max-w-md mb-16 uppercase tracking-widest font-light">
          Sobrevive al enjambre. Recoge cristales. Evoluciona.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-6 w-full max-w-sm">
          <button 
            onClick={handleComenzar}
            className="flex-1 flex items-center justify-center gap-2 py-4 bg-white text-slate-900 rounded-full font-bold uppercase tracking-widest hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all"
          >
            <Play size={20} /> Iniciar
          </button>
          
          <button 
            onClick={() => setOpcionesAbiertas(true)}
            className="flex-1 flex items-center justify-center gap-2 py-4 bg-slate-800 text-white rounded-full font-bold uppercase tracking-widest border border-slate-700 hover:bg-slate-700 hover:scale-105 transition-all"
          >
            <Settings size={20} /> Opciones
          </button>
        </div>
        
        <div className="mt-16 text-slate-500 text-sm">
          <p className="mb-2">Teclado: WASD para moverte, ESPACIO para Dash</p>
          <p>Táctil: Joystick virtual a la izquierda, botón Dash a la derecha</p>
        </div>
      </div>
    </div>
  );
}
