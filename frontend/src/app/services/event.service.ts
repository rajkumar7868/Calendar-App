import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { CalendarEvent } from '../models/event.model';
import { ApiService } from './api.service';

const STORAGE_KEY = 'calendar_events_v1';
const MINUTE = 60000;
const BUFFER_MINUTES = 15;

@Injectable({ providedIn: 'root' })
export class EventService {
  private eventsSub = new BehaviorSubject<CalendarEvent[]>(this.load());
  events$ = this.eventsSub.asObservable();

  conflict$ = new Subject<{ event: CalendarEvent, conflicts: any[], suggestions: any[], mode: 'add'|'update' }>();

  constructor(private api: ApiService) {}

  private load(): CalendarEvent[] {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  private save(events: CalendarEvent[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    this.eventsSub.next(events);
  }

  get snapshot() {
    return this.eventsSub.getValue();
  }

  addEvent(ev: CalendarEvent) {
    this.checkAndSave(ev, 'add');
  }

  updateEvent(ev: CalendarEvent) {
    this.checkAndSave(ev, 'update');
  }

  deleteEvent(id: string) {
    this.save(this.snapshot.filter(e => e.id !== id));
  }

  private finalizeSave(ev: CalendarEvent, mode: 'add'|'update') {
    if (mode === 'add') {
      this.save([...this.snapshot, ev]);
    } else {
      this.save(this.snapshot.map(e => e.id === ev.id ? ev : e));
    }
  }

  private getConflicts(newEvent: CalendarEvent, existingEvents: CalendarEvent[]): CalendarEvent[] {
    const newStart = +newEvent.start;
    const newEnd = +newEvent.end;

    return existingEvents.filter(existing => {
      const existingStart = +existing.start;
      const existingEnd = +existing.end;
      return newStart < existingEnd && newEnd > existingStart;
    });
  }

  private isSlotFree(start: Date, end: Date, existingEvents: CalendarEvent[]): boolean {
    return !existingEvents.some(ev => {
      const evStart = +ev.start;
      const evEnd = +ev.end;
      return start.getTime() < evEnd && end.getTime() > evStart;
    });
  }

  private generateSuggestions(newEvent: CalendarEvent, conflictingEvents: CalendarEvent[], existingEvents: CalendarEvent[]): CalendarEvent[] {
    const suggestions: CalendarEvent[] = [];
    const newDurationMs = +newEvent.end - +newEvent.start;
    const bufferMs = BUFFER_MINUTES * MINUTE;
    const now = Date.now();

    const conflictEvent = conflictingEvents[0];
    if (!conflictEvent) return [];

    const conflictStartMs = +conflictEvent.start;
    const conflictEndMs = +conflictEvent.end;

    const suggestedEndMs = conflictStartMs - bufferMs;
    const suggestedStartMs = suggestedEndMs - newDurationMs;

    if (suggestedEndMs > now) {
      const suggestedStart = new Date(suggestedStartMs);
      const suggestedEnd = new Date(suggestedEndMs);
      if (this.isSlotFree(suggestedStart, suggestedEnd, existingEvents)) {
        suggestions.push({ ...newEvent, start: suggestedStart.getTime(), end: suggestedEnd.getTime() });
      }
    }

    const suggestedStartAfterMs = conflictEndMs + bufferMs;
    const suggestedEndAfterMs = suggestedStartAfterMs + newDurationMs;

    const suggestedStartAfter = new Date(suggestedStartAfterMs);
    const suggestedEndAfter = new Date(suggestedEndAfterMs);

    if (suggestedStartAfterMs > now && this.isSlotFree(suggestedStartAfter, suggestedEndAfter, existingEvents)) {
      suggestions.push({ ...newEvent, start: suggestedStartAfter.getTime(), end: suggestedEndAfter.getTime() });
    }

    return suggestions;
  }

  private checkAndSave(ev: CalendarEvent, mode: 'add' | 'update') {
    const existing = this.snapshot.filter(e => e.id !== ev.id);
    const conflicts = this.getConflicts(ev, existing);

    if (conflicts.length > 0) {
      const suggestions = this.generateSuggestions(ev, conflicts, existing);
      this.conflict$.next({ event: ev, conflicts: conflicts.map(c => ({ event: c })), suggestions, mode });
    } else {
      this.finalizeSave(ev, mode);
    }
  }
}
