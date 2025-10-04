import { Component, HostListener, OnInit } from '@angular/core';
import { EventService } from '../../services/event.service';
import { CalendarEvent } from '../../models/event.model';
import { DragService } from '../../services/drag.service';
import {
  CdkDragDrop,
  CdkDragStart,
  CdkDragEnd,
  CdkDrag
} from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.css']
})
export class CalendarComponent implements OnInit {
  isMobile = window.innerWidth < 700;
  mode: 'month' | 'week' | 'day' = 'month';
  currentDate = new Date();
  days: any[] = [];
  events: CalendarEvent[] = [];
  selectedDate = new Date();
  hours: number[] = Array.from({ length: 24 }, (_, i) => i);

  hoveredEvent: CalendarEvent | null = null;
  tooltipPosition = { top: 0, left: 0 };

  constructor(private evt: EventService, private drag: DragService) { }

  ngOnInit() {
    this.currentDate = new Date();
    this.currentDate.setHours(0, 0, 0, 0);
    this.buildView();

    this.evt.events$.subscribe(es => {
      this.events = es;
      this.buildView();
    });

    window.addEventListener('openNew', () => this.openEventForm(new Date()));
    this.evt.conflict$.subscribe(c => {
      window.dispatchEvent(new CustomEvent('conflict', { detail: c }));
    });
  }

  @HostListener('window:resize')
  onResize() {
    this.isMobile = window.innerWidth < 700;
  }

  buildView() {
    this.days = [];
    let start: Date;
    let daysToGenerate = 0;

    if (this.mode === 'month') {
      const year = this.currentDate.getFullYear();
      const month = this.currentDate.getMonth();
      const first = new Date(year, month, 1);
      start = new Date(first);
      start.setDate(first.getDate() - first.getDay());
      daysToGenerate = 42;
    } else if (this.mode === 'week') {
      start = new Date(this.currentDate);
      start.setDate(this.currentDate.getDate() - this.currentDate.getDay());
      daysToGenerate = 7;
    } else {
      start = new Date(this.currentDate);
      daysToGenerate = 1;
    }

    for (let i = 0; i < daysToGenerate; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      this.days.push(this.createDayObject(d));
    }
  }

  createDayObject(d: Date) {
    const dayStart = new Date(d);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(d);
    dayEnd.setHours(23, 59, 59, 999);

    const dayEvents = this.events.filter(e => {
      const s = new Date(+e.start);
      const t = new Date(+e.end);
      return s <= dayEnd && t >= dayStart;
    });

    return {
      date: d,
      events: dayEvents.sort((a, b) => +a.start - +b.start)
    };
  }

  changeDate(direction: number) {
    if (this.mode === 'month') {
      this.currentDate.setMonth(this.currentDate.getMonth() + direction);
    } else {
      const daysToMove = this.mode === 'week' ? 7 : 1;
      this.currentDate.setDate(this.currentDate.getDate() + direction * daysToMove);
    }
    this.currentDate = new Date(this.currentDate);
    this.buildView();
  }

  goToToday() {
    this.currentDate = new Date();
    this.buildView();
  }

  changeMode(newMode: 'month' | 'week' | 'day') {
    this.mode = newMode;
    this.currentDate = new Date(this.currentDate);
    this.currentDate.setHours(0, 0, 0, 0);
    this.buildView();
  }

  openEventForm(date: Date) {
    this.selectedDate = date;
    window.dispatchEvent(new CustomEvent('openEventForm', { detail: date }));
  }

  editEvent(event: CalendarEvent) {
    window.dispatchEvent(new CustomEvent('openEdit', { detail: event }));
  }

  getEventHeightAndTop(event: CalendarEvent): { height: number; top: number } {
    const start = +event.start;
    const end = +event.end;
    const durationMinutes = (end - start) / 60000;
    const startMinutes = new Date(start).getMinutes();

    return {
      height: durationMinutes * 1.5,
      top: startMinutes * 1.5
    };
  }

  getEventsForHour(day: any, hour: number): CalendarEvent[] {
    const hourStart = new Date(day.date);
    hourStart.setHours(hour, 0, 0, 0);
    const hourEnd = new Date(day.date);
    hourEnd.setHours(hour, 59, 59, 999);

    return day.events.filter((e: CalendarEvent) => {
      const eventStart = +e.start;
      const eventEnd = +e.end;
      return eventStart < hourEnd.getTime() && eventEnd > hourStart.getTime();
    });
  }

  onDragStarted(event: CalendarEvent) {
    console.log('Dragging started:', event);
    this.drag.dragStart(event);
  }

  onDragEnded() {
    console.log('Dragging ended');
    this.drag.dragEnd();
  }


  onEventDropped(event: any, dropDate: Date, dropHour?: number) {
    const dragged = this.drag.draggedEvent;
    this.drag.dragEnd();

    if (!dragged) return;

    const now = new Date();

    const originalStart = new Date(dragged.start);
    const originalDuration = dragged.end - dragged.start;

    const newStart = new Date(dropDate);

    if (typeof dropHour === 'number') {
      newStart.setHours(dropHour, originalStart.getMinutes(), originalStart.getSeconds(), 0);
    } else {
      newStart.setHours(originalStart.getHours(), originalStart.getMinutes(), originalStart.getSeconds(), 0);
    }

    const newEnd = new Date(newStart.getTime() + originalDuration);

    if (newStart.getTime() < now.getTime()) {
      console.warn('Cannot move event into the past');
      return;
    }

    const updatedEvent: CalendarEvent = {
      ...dragged,
      start: newStart.getTime(),
      end: newEnd.getTime()
    };

    this.evt.updateEvent(updatedEvent);
  }

  showTooltip(event: MouseEvent, ev: CalendarEvent) {
    this.hoveredEvent = ev;
    const rect = (event.target as HTMLElement).getBoundingClientRect();

    this.tooltipPosition = {
      top: rect.top + window.scrollY - 90,
      left: rect.left + rect.width / 2
    };
  }

  hideTooltip() {
    this.hoveredEvent = null;
  }

  getSlotDate(dayDate: Date, hour: number): Date {
    const date = new Date(dayDate);
    date.setHours(hour, 0, 0, 0);
    return date;
  }
}
