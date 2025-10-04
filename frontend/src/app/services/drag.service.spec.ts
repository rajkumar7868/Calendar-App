import { TestBed } from '@angular/core/testing';
import { DragService } from './drag.service';
import { CalendarEvent } from '../models/event.model';

describe('DragService', () => {
  let service: DragService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DragService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have initial draggedEvent as null', () => {
    expect(service.draggedEvent).toBeNull();
  });

  it('draggedEvent getter should return current value', () => {
    const mockEvent: CalendarEvent = {
      id: '4',
      title: 'Getter Event',
      start: 7000,
      end: 8000,
      participants: [],
      category: 'townhall',
      color: '',
      notes: ''
    };

    service.dragStart(mockEvent);
    expect(service.draggedEvent).toEqual(mockEvent);

    service.dragEnd();
    expect(service.draggedEvent).toBeNull();
  });
});
