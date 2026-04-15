import type { Response } from "express";

// ── SSE client registry ──────────────────────────────────────────────────────
// מנהל את כל הלקוחות המחוברים לסטרים /api/jobs/stream

const clients = new Set<Response>();

export function addClient(res: Response): void {
  clients.add(res);
}

export function removeClient(res: Response): void {
  clients.delete(res);
}

/** שולח אירוע new_job לכל הלקוחות המחוברים */
export function emitNewJob(publicJob: object): void {
  if (clients.size === 0) return;
  const data = `event: new_job\ndata: ${JSON.stringify(publicJob)}\n\n`;
  clients.forEach(res => {
    try {
      res.write(data);
    } catch {
      // אם הלקוח נותק, נסיר אותו
      clients.delete(res);
    }
  });
}
