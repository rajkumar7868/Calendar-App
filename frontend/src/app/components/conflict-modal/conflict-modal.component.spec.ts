import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConflictModalComponent } from './conflict-modal.component';
import { EventService } from '../../services/event.service';
import { Subject } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('ConflictModalComponent', () => {
  let component: ConflictModalComponent;
  let fixture: ComponentFixture<ConflictModalComponent>;
  let mockEventService: any;
  let conflictSubject: Subject<any>;

  beforeEach(async () => {
    conflictSubject = new Subject<any>();

    mockEventService = {
      conflict$: conflictSubject.asObservable()
    };

    await TestBed.configureTestingModule({
      declarations: [ConflictModalComponent],
      providers: [{ provide: EventService, useValue: mockEventService }],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(ConflictModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should subscribe to conflict$ and set modal data', () => {
    const testData = {
      event: { id: 1, title: 'Test Event' },
      conflicts: [{ id: 2 }],
      suggestions: [{ id: 3 }]
    };

    conflictSubject.next(testData);
    fixture.detectChanges();

    expect(component.visible).toBeTrue();
    expect(component.event).toEqual(testData.event);
    expect(component.conflicts).toEqual(testData.conflicts);
    expect(component.suggestions).toEqual(testData.suggestions);
  });

  it('should dispatch event and hide modal on choose()', () => {
    const suggestion = { id: 101 };
    const spy = spyOn(window, 'dispatchEvent');

    component.visible = true;
    component.choose(suggestion);

    expect(spy).toHaveBeenCalledWith(new CustomEvent('conflictChoice', { detail: suggestion }));
    expect(component.visible).toBeFalse();
  });

  it('should dispatch event and hide modal on close()', () => {
    const spy = spyOn(window, 'dispatchEvent');

    component.visible = true;
    component.close();

    expect(spy).toHaveBeenCalledWith(new CustomEvent('conflictChoice', { detail: null }));
    expect(component.visible).toBeFalse();
  });

  it('should unsubscribe on destroy', () => {
    const unsubscribeSpy = spyOn(component['sub'], 'unsubscribe');
    component.ngOnDestroy();
    expect(unsubscribeSpy).toHaveBeenCalled();
  });
});
