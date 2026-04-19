import { SyncService } from '@services/syncService';

const EVENTBRITE_SYNC_INTERVAL_MS = Number(
  process.env.EVENTBRITE_SYNC_INTERVAL_MS || 60 * 60 * 1000
);

let eventbriteSyncTimer: NodeJS.Timeout | null = null;
let hasStarted = false;

async function runEventbriteSyncOnce(): Promise<void> {
  try {
    await SyncService.syncEventbrite();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown sync error';

    console.error(`[sync:eventbrite] cron run failed: ${message}`);
  }
}

export function startEventbriteSyncJob(): void {
  if (hasStarted) {
    return;
  }

  hasStarted = true;

  console.log(
    `[sync:eventbrite] starting interval job (${EVENTBRITE_SYNC_INTERVAL_MS}ms)`
  );

  void runEventbriteSyncOnce();

  eventbriteSyncTimer = setInterval(() => {
    void runEventbriteSyncOnce();
  }, EVENTBRITE_SYNC_INTERVAL_MS);
}

export function stopEventbriteSyncJob(): void {
  if (eventbriteSyncTimer) {
    clearInterval(eventbriteSyncTimer);
    eventbriteSyncTimer = null;
  }

  hasStarted = false;
}