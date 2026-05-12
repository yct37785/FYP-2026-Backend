export interface SyncItem {
  id: number;
  source: string;
  lastCreatedAt: Date | null;
  lastRunAt: Date | null;
  lastSuccessAt: Date | null;
  lastError: string | null;
  totalNewEvents: number;
  createdAt: Date;
  updatedAt: Date;
}