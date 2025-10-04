import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { CalendarComponent } from './components/calendar/calendar.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { EventFormComponent } from './components/event-form/event-form.component';
import { ConflictModalComponent } from './components/conflict-modal/conflict-modal.component';


describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let component: AppComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
        imports:[HttpClientTestingModule],
      declarations: [AppComponent, CalendarComponent, EventFormComponent, ConflictModalComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AppComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the app component', () => {
    expect(component).toBeTruthy();
  });

  it('should render header and button', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Calendar');
    expect(compiled.querySelector('button')?.textContent).toContain('+ New');
  });

  it('openNew() should dispatch openNew event', () => {
    spyOn(window, 'dispatchEvent').and.callThrough();

    component.openNew();

    expect(window.dispatchEvent).toHaveBeenCalled();
    const dispatchedEvent = (window.dispatchEvent as jasmine.Spy).calls.mostRecent().args[0];
    expect(dispatchedEvent.type).toBe('openEventForm');
  });
});
