import { TestBed } from '@angular/core/testing';
import { EventService } from './event.service';
import { ApiService } from './api.service';
import { CalendarEvent } from '../models/event.model';
import { take } from 'rxjs/operators';

describe('EventService', () => {
  let service: EventService;
  let apiServiceSpy: jasmine.SpyObj<ApiService>;

  const STORAGE_KEY = 'calendar_events_v1';

  const mockEvent1: CalendarEvent = {
    id: '1',
    title: 'Event 1',
    start: new Date().getTime() + 60000, // +1 min from now
    end: new Date().getTime() + 3600000, // +1 hour from now
    participants: [],
    category: 'meeting',
    color: '',
    notes: ''
  };

  const mockEvent2: CalendarEvent = {
    id: '2',
    title: 'Event 2',
    start: new Date().getTime() + 7200000, // +2 hours from now
    end: new Date().getTime() + 10800000, // +3 hours from now
    participants: [],
    category: 'status',
    color: '',
    notes: ''
  };

  beforeEach(() => {
    apiServiceSpy = jasmine.createSpyObj('ApiService', ['checkConflicts', 'suggestTimes']);
    TestBed.configureTestingModule({
      providers: [
        EventService,
        { provide: ApiService, useValue: apiServiceSpy }
      ]
    });

    // Mock localStorage
    spyOn(localStorage, 'getItem').and.callFake((key: string) => {
      if (key === STORAGE_KEY) {
        return JSON.stringify([mockEvent1]);
      }
      return null;
    });
    spyOn(localStorage, 'setItem').and.callFake(() => {});

    service = TestBed.inject(EventService);
  });

  it('should be created and load events from localStorage', () => {
    expect(service).toBeTruthy();
    expect(service.snapshot.length).toBe(1);
    expect(service.snapshot[0].id).toBe('1');
  });

  it('should save events to localStorage and update observable', (done) => {
    const newEvent = mockEvent2;

    service.events$.pipe(take(1)).subscribe(events => {
      // Initially 1 event loaded from localStorage
      expect(events.length).toBe(1);
    });

    service['save']([mockEvent1, newEvent]);
    expect(localStorage.setItem).toHaveBeenCalledWith(STORAGE_KEY, jasmine.any(String));

    service.events$.pipe(take(1)).subscribe(events => {
      expect(events.length).toBe(2);
      expect(events.find(e => e.id === newEvent.id)).toBeTruthy();
      done();
    });
  });

  describe('addEvent', () => {
    it('should add event if no conflicts', () => {
      spyOn(service as any, 'checkAndSave').and.callThrough();
      spyOn(service as any, 'getConflicts').and.returnValue([]);

      service.addEvent(mockEvent2);

      expect((service as any).checkAndSave).toHaveBeenCalledWith(mockEvent2, 'add');
      expect(service.snapshot.find(e => e.id === mockEvent2.id)).toBeTruthy();
    });

    it('should emit conflict if conflicts exist', (done) => {
      spyOn(service as any, 'getConflicts').and.returnValue([mockEvent1]);

      service.conflict$.subscribe(conflict => {
        expect(conflict.event).toEqual(mockEvent2);
        expect(conflict.conflicts.length).toBeGreaterThan(0);
        expect(conflict.mode).toBe('add');
        done();
      });

      service.addEvent(mockEvent2);
    });
  });

  describe('updateEvent', () => {
    it('should update event if no conflicts', () => {
      spyOn(service as any, 'getConflicts').and.returnValue([]);
      spyOn(service as any, 'finalizeSave').and.callThrough();

      // Add an event first so update makes sense
      service['save']([mockEvent1, mockEvent2]);

      const updatedEvent = { ...mockEvent2, title: 'Updated' };
      service.updateEvent(updatedEvent);

      expect((service as any).finalizeSave).toHaveBeenCalledWith(updatedEvent, 'update');
      expect(service.snapshot.find(e => e.title === 'Updated')).toBeTruthy();
    });

    it('should emit conflict if conflicts exist', (done) => {
      spyOn(service as any, 'getConflicts').and.returnValue([mockEvent1]);

      service.conflict$.subscribe(conflict => {
        expect(conflict.event).toEqual(mockEvent2);
        expect(conflict.conflicts.length).toBeGreaterThan(0);
        expect(conflict.mode).toBe('update');
        done();
      });

      service.updateEvent(mockEvent2);
    });
  });

  describe('deleteEvent', () => {
    it('should delete event by id', () => {
      service['save']([mockEvent1, mockEvent2]);
      service.deleteEvent(mockEvent1.id);
      expect(service.snapshot.find(e => e.id === mockEvent1.id)).toBeFalsy();
      expect(service.snapshot.length).toBe(1);
    });
  });

  describe('getConflicts', () => {
    it('should return conflicting events', () => {
      const newEvent = {
        ...mockEvent2,
        start: mockEvent1.start + 1000, // overlapping with mockEvent1
        end: mockEvent1.end - 1000
      };

      const conflicts = (service as any).getConflicts(newEvent, [mockEvent1, mockEvent2]);
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].id).toBe(mockEvent1.id);
    });

    it('should return empty if no conflicts', () => {
      const newEvent = {
        ...mockEvent2,
        start: mockEvent1.end + 10000,
        end: mockEvent1.end + 20000
      };

      const conflicts = (service as any).getConflicts(newEvent, [mockEvent1]);
      expect(conflicts.length).toBe(0);
    });
  });

  describe('isSlotFree', () => {
    it('should return false if slot overlaps any event', () => {
      const start = new Date(mockEvent1.start + 1000);
      const end = new Date(mockEvent1.end - 1000);
      const result = (service as any).isSlotFree(start, end, [mockEvent1]);
      expect(result).toBeFalse();
    });

    it('should return true if slot is free', () => {
      const start = new Date(mockEvent1.end + 10000);
      const end = new Date(mockEvent1.end + 20000);
      const result = (service as any).isSlotFree(start, end, [mockEvent1]);
      expect(result).toBeTrue();
    });
  });

  describe('generateSuggestions', () => {
    it('should return empty if no conflicting events', () => {
      const suggestions = (service as any).generateSuggestions(mockEvent2, [], [mockEvent1]);
      expect(suggestions.length).toBe(0);
    });

    it('should generate suggestions before and after conflicting event if slots are free', () => {
      const conflictEvent = mockEvent1;
      const newEvent = {
        ...mockEvent2,
        start: conflictEvent.start,
        end: conflictEvent.end
      };

      spyOn(service as any, 'isSlotFree').and.returnValue(true);

      const suggestions = (service as any).generateSuggestions(newEvent, [conflictEvent], [mockEvent1]);
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should not generate suggestion if slot is not free', () => {
      const conflictEvent = mockEvent1;
      const newEvent = {
        ...mockEvent2,
        start: conflictEvent.start,
        end: conflictEvent.end
      };

      spyOn(service as any, 'isSlotFree').and.returnValue(false);

      const suggestions = (service as any).generateSuggestions(newEvent, [conflictEvent], [mockEvent1]);
      expect(suggestions.length).toBe(0);
    });
  });

  describe('checkAndSave', () => {
    it('should finalize save if no conflicts', () => {
      spyOn(service as any, 'getConflicts').and.returnValue([]);
      spyOn(service as any, 'finalizeSave').and.callThrough();

      service['save']([mockEvent1]); // ensure initial save

      service['checkAndSave'](mockEvent2, 'add');

      expect((service as any).finalizeSave).toHaveBeenCalledWith(mockEvent2, 'add');
      expect(service.snapshot.find(e => e.id === mockEvent2.id)).toBeTruthy();
    });

    it('should emit conflict if conflicts exist', (done) => {
      spyOn(service as any, 'getConflicts').and.returnValue([mockEvent1]);

      service.conflict$.subscribe(conflict => {
        expect(conflict.event).toEqual(mockEvent2);
        expect(conflict.conflicts.length).toBeGreaterThan(0);
        done();
      });

      service['checkAndSave'](mockEvent2, 'add');
    });
  });

});
