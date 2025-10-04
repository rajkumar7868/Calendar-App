import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CalendarEvent } from '../models/event.model';

@Injectable({ providedIn: 'root' })
export class DragService {
  private dragged = new BehaviorSubject<CalendarEvent | null>(null);
  dragged$ = this.dragged.asObservable();

  get draggedEvent(): CalendarEvent | null {
    return this.dragged.value;
  }

  dragStart(ev: CalendarEvent) {
    this.dragged.next(ev);
  }

  dragEnd() {
    this.dragged.next(null);
  }

  clear() {
    this.dragged.next(null);
  }
}
