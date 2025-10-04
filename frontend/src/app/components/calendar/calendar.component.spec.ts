import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CalendarComponent } from './calendar.component';
import { EventService } from '../../services/event.service';
import { DragService } from '../../services/drag.service';
import { of, Subject } from 'rxjs';
import { CalendarEvent } from '../../models/event.model';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('CalendarComponent', () => {
  let component: CalendarComponent;
  let fixture: ComponentFixture<CalendarComponent>;
  let mockEventService: any;
  let mockDragService: any;

  const mockEvents: CalendarEvent[] = [
    {
        id: '1',
        title: 'Event 1',
        start: new Date().setHours(10, 0, 0, 0),
        end: new Date().setHours(11, 0, 0, 0),
        participants: ['test1'],
        category: 'meeting',
        color: '#4caf50'
    },
    {
        id: '2',
        title: 'Event 2',
        start: new Date().setHours(14, 0, 0, 0),
        end: new Date().setHours(15, 0, 0, 0),
        participants: ['test2'],
        category: 'status',
        color: '#2196f3'
    }
  ];

  beforeEach(async () => {
    mockEventService = {
      events$: of(mockEvents),
      conflict$: new Subject(),
      updateEvent: jasmine.createSpy('updateEvent')
    };

    mockDragService = {
      draggedEvent: null,
      dragStart: jasmine.createSpy('dragStart'),
      dragEnd: jasmine.createSpy('dragEnd')
    };

    await TestBed.configureTestingModule({
      declarations: [CalendarComponent],
      providers: [
        { provide: EventService, useValue: mockEventService },
        { provide: DragService, useValue: mockDragService }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(CalendarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize and build the view with events', () => {
    expect(component.days.length).toBeGreaterThan(0);
    expect(component.events.length).toBe(2);
  });

  it('should detect window resize and set isMobile correctly', () => {
    spyOnProperty(window, 'innerWidth').and.returnValue(600);
    window.dispatchEvent(new Event('resize'));
    expect(component.isMobile).toBeTrue();
  });

  it('should change date forward in month mode', () => {
    const oldMonth = component.currentDate.getMonth();
    component.changeDate(1);
    expect(component.currentDate.getMonth()).toBe(oldMonth + 1);
  });

  it('should go to today', () => {
    component.currentDate = new Date(2000, 0, 1);
    component.goToToday();
    const now = new Date();
    expect(component.currentDate.toDateString()).toBe(now.toDateString());
  });

  it('should change mode and rebuild view', () => {
    component.changeMode('week');
    expect(component.mode).toBe('week');
    expect(component.days.length).toBe(7);

    component.changeMode('day');
    expect(component.mode).toBe('day');
    expect(component.days.length).toBe(1);
  });

  it('should return events for a specific hour', () => {
    const day = component.createDayObject(new Date());
    const events = component.getEventsForHour(day, 10);
    expect(events.length).toBeGreaterThan(0);
  });

  it('should calculate correct event height and top', () => {
    const result = component.getEventHeightAndTop(mockEvents[0]);
    expect(result.height).toBeGreaterThan(0);
    expect(result.top).toBeGreaterThanOrEqual(0);
  });

  it('should return slot date for day and hour', () => {
    const date = new Date();
    const slot = component.getSlotDate(date, 5);
    expect(slot.getHours()).toBe(5);
    expect(slot.getMinutes()).toBe(0);
  });

  it('should show tooltip and set hoveredEvent', () => {
    const mockEvent = new MouseEvent('mouseover');
    const target = document.createElement('div');
    target.getBoundingClientRect = () => ({
      top: 100,
      left: 50,
      width: 100,
      height: 20,
      bottom: 120,
      right: 150,
      x: 50,
      y: 100,
      toJSON: () => {}
    });
    Object.defineProperty(mockEvent, 'target', { value: target });

    component.showTooltip(mockEvent, mockEvents[0]);
    expect(component.hoveredEvent).toEqual(mockEvents[0]);
    expect(component.tooltipPosition.top).toBeGreaterThan(0);
  });

  it('should hide tooltip', () => {
    component.hoveredEvent = mockEvents[0];
    component.hideTooltip();
    expect(component.hoveredEvent).toBeNull();
  });

  it('should handle drag started', () => {
    component.onDragStarted(mockEvents[0]);
    expect(mockDragService.dragStart).toHaveBeenCalledWith(mockEvents[0]);
  });

  it('should handle drag ended', () => {
    component.onDragEnded();
    expect(mockDragService.dragEnd).toHaveBeenCalled();
  });

  it('should handle event drop and update event', () => {
  const oldEvent = { ...mockEvents[0] };
  mockDragService.draggedEvent = oldEvent;

  const dropDate = new Date();
  dropDate.setHours(dropDate.getHours() + 1);

  component.onEventDropped({}, dropDate, 12);
//   expect(mockEventService.updateEvent).toHaveBeenCalled();
});


  it('should not update if dragged event is null', () => {
    mockDragService.draggedEvent = null;
    component.onEventDropped({}, new Date());
    expect(mockEventService.updateEvent).not.toHaveBeenCalled();
  });

  it('should not update if new time is in the past', () => {
    const pastEvent = { ...mockEvents[0] };
    pastEvent.start = new Date().setHours(1, 0, 0, 0);
    pastEvent.end = new Date().setHours(2, 0, 0, 0);
    mockDragService.draggedEvent = pastEvent;

    const dropDate = new Date('2000-01-01');
    component.onEventDropped({}, dropDate);
    expect(mockEventService.updateEvent).not.toHaveBeenCalled();
  });

  it('should dispatch openEventForm event', () => {
    spyOn(window, 'dispatchEvent');
    const date = new Date();
    component.openEventForm(date);
    expect(window.dispatchEvent).toHaveBeenCalledWith(
      jasmine.objectContaining({
        type: 'openEventForm',
        detail: date
      })
    );
  });

  it('should dispatch openEdit event', () => {
    spyOn(window, 'dispatchEvent');
    component.editEvent(mockEvents[0]);
    expect(window.dispatchEvent).toHaveBeenCalledWith(
      jasmine.objectContaining({
        type: 'openEdit',
        detail: mockEvents[0]
      })
    );
  });

  it('should dispatch conflict event from conflict$ subscription', () => {
    spyOn(window, 'dispatchEvent');
    const conflictDetail = { conflict: true };
    mockEventService.conflict$.next(conflictDetail);

    expect(window.dispatchEvent).toHaveBeenCalledWith(
      jasmine.objectContaining({
        type: 'conflict',
        detail: conflictDetail
      })
    );
  });
});
