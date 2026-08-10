/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { LienzoJuego } from './componentes/Lienzo';
import { PantallaInicio } from './componentes/PantallaInicio';
import { inicializarLogros } from './juego/logros';

export default function App() {
  const [iniciado, setIniciado] = useState(false);

  useEffect(() => {
    inicializarLogros();
  }, []);

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-900">
      {!iniciado && <PantallaInicio alIniciar={() => setIniciado(true)} />}
      {iniciado && <LienzoJuego />}
    </div>
  );
}
