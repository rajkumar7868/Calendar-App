export interface CalendarEvent {
  id: string;
  title: string;
  start: number;
  end: number;
  participants: string[]; 
  category: string;
  color: string;
  notes?: string;
}