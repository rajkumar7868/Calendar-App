import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { EventFormComponent } from './event-form.component';
import { EventService } from '../../services/event.service';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { of, Subject } from 'rxjs';

describe('EventFormComponent', () => {
    let component: EventFormComponent;
    let fixture: ComponentFixture<EventFormComponent>;
    let eventServiceSpy: any;

    beforeEach(async () => {
        eventServiceSpy = jasmine.createSpyObj('EventService', ['addEvent', 'updateEvent', 'deleteEvent']);

        await TestBed.configureTestingModule({
            imports: [ReactiveFormsModule],
            declarations: [EventFormComponent],
            providers: [
                FormBuilder,
                { provide: EventService, useValue: eventServiceSpy }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(EventFormComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create component and initialize form with default values', () => {
        expect(component).toBeTruthy();
        expect(component.form).toBeDefined();
        expect(component.form.get('category')!.value).toBe('meeting');
        expect(component.form.get('color')!.value).toBe(component.getColorForCategory('meeting'));
    });

    it('should update color when category changes', () => {
        component.form.get('category')!.setValue('stand up');
        expect(component.form.get('color')!.value).toBe(component.getColorForCategory('stand up'));
    });

    it('should open form with correct values and visible true', () => {
        const testData = {
            id: 'abc',
            title: 'Test',
            start: Date.now(),
            end: Date.now() + 3600000,
            category: 'status',
            participants: 'a,b',
            color: '',
            notes: 'note'
        };
        component.openForm(testData, true);
        expect(component.visible).toBeTrue();
        expect(component.isEditing).toBeTrue();
        expect(component.form.get('title')!.value).toBe('Test');
        expect(component.form.get('color')!.value).toBe(component.getColorForCategory('status'));
    });

    it('should show toast message for 3 seconds', fakeAsync(() => {
        component.showToast('Hello');
        expect(component.toastMessage).toBe('Hello');
        expect(component.toastVisible).toBeTrue();

        tick(3000);
        expect(component.toastVisible).toBeFalse();
    }));

    it('should validate form: start in past error', () => {
        const pastDate = new Date(Date.now() - 60000).toISOString().slice(0, 16);
        const futureDate = new Date(Date.now() + 60000).toISOString().slice(0, 16);

        component.form.get('start')!.setValue(pastDate);
        component.form.get('end')!.setValue(futureDate);
        const errors = component.form.errors || {};
        expect(errors['startInPast']).toBeTrue();
    });

    it('should validate form: end before start error', () => {
        const now = new Date().toISOString().slice(0, 16);

        component.form.get('start')!.setValue(now);
        component.form.get('end')!.setValue(now);
        const errors = component.form.errors || {};
        expect(errors['endBeforeStart']).toBeTrue();
    });

    it('should return min datetime string', () => {
        const minDate = component.getMinDateTime();
        expect(minDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    });

    it('should mark form control as error when invalid and touched or dirty', () => {
        const control = component.form.get('title')!;
        control.setValue('');
        control.markAsTouched();
        fixture.detectChanges();

        expect(component.hasError('title')).toBeTrue();
    });

    it('should handle save when form invalid', fakeAsync(() => {
        component.form.get('title')!.setValue('');
        component.save();

        expect(component.visible).toBeFalse();
        tick(10);
    }));

    it('should call addEvent when saving new event', () => {
        component.isEditing = false;
        component.form.patchValue({
            id: 'id1',
            title: 'Title',
            start: component.msToDatetimeLocal(Date.now() + 60000),
            end: component.msToDatetimeLocal(Date.now() + 3600000),
            participants: 'a,b,c',
            category: 'meeting'
        });

        component.save();

        expect(eventServiceSpy.addEvent).toHaveBeenCalled();
        expect(component.visible).toBeFalse();
    });

    it('should call updateEvent when editing event', () => {
        component.isEditing = true;
        component.form.patchValue({
            id: 'id2',
            title: 'Title Edit',
            start: component.msToDatetimeLocal(Date.now() + 60000),
            end: component.msToDatetimeLocal(Date.now() + 3600000),
            participants: ['x', 'y'],
            category: 'status'
        });

        component.save();

        expect(eventServiceSpy.updateEvent).toHaveBeenCalled();
        expect(component.visible).toBeFalse();
    });

    it('should convert participants string to array when saving', () => {
        component.isEditing = false;
        component.form.patchValue({
            id: 'id3',
            title: 'Title',
            start: component.msToDatetimeLocal(Date.now() + 60000),
            end: component.msToDatetimeLocal(Date.now() + 3600000),
            participants: 'x, y ,z',
            category: 'meeting'
        });

        component.save();

        const arg = eventServiceSpy.addEvent.calls.mostRecent().args[0];
        expect(arg.participants).toEqual(['x', 'y', 'z']);
    });

    it('should handle cancel', () => {
        component.visible = true;
        component.cancel();
        expect(component.visible).toBeFalse();
    });

    it('should handle delete event', () => {
        component.visible = true;
        component.form.get('id')!.setValue('del-id');

        component.delete();

        expect(eventServiceSpy.deleteEvent).toHaveBeenCalledWith('del-id');
        expect(component.visible).toBeFalse();
    });

    it('should do nothing on delete if no id', () => {
        component.visible = true;
        component.form.get('id')!.setValue(null);

        component.delete();

        expect(eventServiceSpy.deleteEvent).not.toHaveBeenCalled();
        expect(component.visible).toBeTrue();
    });

    it('should correctly pad numbers in msToDatetimeLocal', () => {
        expect(component.pad(0)).toBe('00');
        expect(component.pad(9)).toBe('09');
        expect(component.pad(10)).toBe('10');
    });

    // Test event listeners by dispatching window events
    it('should open form on "openEventForm" event', () => {
        const spyOpenForm = spyOn(component, 'openForm').and.callThrough();
        const testDate = new Date();

        window.dispatchEvent(new CustomEvent('openEventForm', { detail: testDate }));

        expect(spyOpenForm).toHaveBeenCalled();
        expect(component.visible).toBeTrue();
    });

    it('should open form on "openNew" event', () => {
        const spyOpenForm = spyOn(component, 'openForm').and.callThrough();

        window.dispatchEvent(new CustomEvent('openNew'));

        expect(spyOpenForm).toHaveBeenCalled();
        expect(component.visible).toBeTrue();
    });

    it('should open form on "openEdit" event and set isEditing true', () => {
        const spyOpenForm = spyOn(component, 'openForm').and.callThrough();
        const testEvent = {
            id: '1',
            title: 'Edit Event',
            start: Date.now(),
            end: Date.now() + 1000
        };

        window.dispatchEvent(new CustomEvent('openEdit', { detail: testEvent }));

        expect(spyOpenForm).toHaveBeenCalled();
        expect(component.visible).toBeTrue();
        expect(component.isEditing).toBeTrue();
    });

    it('should handle conflictChoice event with choice and save', () => {
        const saveSpy = spyOn(component, 'save').and.callThrough();

        const choice = {
            start: Date.now() + 1000,
            end: Date.now() + 3600000
        };

        window.dispatchEvent(new CustomEvent('conflictChoice', { detail: choice }));

        expect(component.form.get('start')!.value).toBe(component.msToDatetimeLocal(choice.start));
        expect(component.form.get('end')!.value).toBe(component.msToDatetimeLocal(choice.end));
        expect(saveSpy).toHaveBeenCalled();
    });

    it('should handle conflictChoice event with null choice and hide form', () => {
        window.dispatchEvent(new CustomEvent('conflictChoice', { detail: null }));
        expect(component.visible).toBeFalse();
    });
});
