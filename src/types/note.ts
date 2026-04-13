export interface Note {
  id: number;
  title: string;
  content: string;
  created_at: Date;
}

export interface CreateNoteInput {
  title: string;
  content: string;
}