export function distancia(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x2 - x1, y2 - y1);
}

export function idUnico(): string {
  return Math.random().toString(36).substring(2, 9);
}
