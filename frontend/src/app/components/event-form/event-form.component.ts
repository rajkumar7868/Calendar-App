import { Component, ElementRef, OnInit, ViewChildren, QueryList } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { EventService } from '../../services/event.service';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-event-form',
  templateUrl: './event-form.component.html',
  styleUrls: ['./event-form.component.css']
})
export class EventFormComponent implements OnInit {
  form!: FormGroup;
  visible = false;
  initialDate = new Date();

  toastVisible = false;
  toastMessage = '';

  isEditing = false;

  @ViewChildren('formField') formFields!: QueryList<ElementRef>;

  categoryColors: { [key: string]: string } = {
    'meeting': '#4caf50',
    'status': '#2196f3',
    'stand up': '#ff9800',
    'townhall': '#9c27b0',
    'KT': '#f44336'
  };

  constructor(private fb: FormBuilder, private evt: EventService) { }

  ngOnInit() {
    this.form = this.fb.group({
      id: [''],
      title: ['', Validators.required],
      start: ['', [Validators.required]],
      end: ['', [Validators.required]],
      participants: ['', Validators.required],
      category: ['meeting'],
      color: [''],
      notes: ['']
    }, {
      validators: this.dateTimeValidator()
    });

    this.form.controls['color'].setValue(this.getColorForCategory('meeting'));

    this.form.controls['category'].valueChanges.subscribe(category => {
      this.form.controls['color'].setValue(this.getColorForCategory(category));
    });

    window.addEventListener('openEventForm', (ev: any) => {
      this.initialDate = ev.detail || new Date();

      // Use current time rounded to nearest 5 minutes for start
      const now = new Date(this.initialDate);
      now.setSeconds(0);
      now.setMilliseconds(0);
      const minutes = now.getMinutes();
      const roundedMinutes = Math.ceil(minutes / 5) * 5;
      now.setMinutes(roundedMinutes);

      const st = now;
      const en = new Date(st.getTime() + 60 * 60 * 1000);

      this.openForm({
        id: uuidv4(),
        title: '',
        start: st.getTime(),
        end: en.getTime(),
        category: 'meeting',
        participants: '',
        color: this.getColorForCategory('meeting'),
        notes: ''
      }, false);
    });

    window.addEventListener('openNew', () => {
      // Use current time rounded to nearest 5 minutes for start
      const now = new Date();
      now.setSeconds(0);
      now.setMilliseconds(0);
      const minutes = now.getMinutes();
      const roundedMinutes = Math.ceil(minutes / 5) * 5;
      now.setMinutes(roundedMinutes);

      const st = now;
      const en = new Date(st.getTime() + 60 * 60 * 1000);

      this.openForm({
        id: uuidv4(),
        title: '',
        start: st.getTime(),
        end: en.getTime(),
        category: 'meeting',
        participants: '',
        color: this.getColorForCategory('meeting'),
        notes: ''
      }, false);
    });

    window.addEventListener('openEdit', (ev: any) => {
      this.isEditing = true;
      const data = ev.detail;
      this.openForm({
        ...data,
        start: data.start,
        end: data.end
      }, true);
    });

    window.addEventListener('conflictChoice', (ev: any) => {
      const choice = ev.detail;
      if (choice) {
        this.form.patchValue({
          start: this.msToDatetimeLocal(choice.start),
          end: this.msToDatetimeLocal(choice.end)
        });
        this.save();
      } else {
        this.visible = false;
      }
    });
  }

  getColorForCategory(category: string): string {
    return this.categoryColors[category] || this.categoryColors['meeting'];
  }

  msToDatetimeLocal(ms: number): string {
    const date = new Date(ms);
    const year = date.getFullYear();
    const month = this.pad(date.getMonth() + 1);
    const day = this.pad(date.getDate());
    const hours = this.pad(date.getHours());
    const minutes = this.pad(date.getMinutes());

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  pad(n: number): string {
    return n < 10 ? '0' + n : '' + n;
  }

  openForm(data: any, isEdit = false) {
    this.isEditing = isEdit;
    this.form.patchValue({
      ...data,
      start: this.msToDatetimeLocal(data.start),
      end: this.msToDatetimeLocal(data.end),
      color: this.getColorForCategory(data.category)
    });
    this.visible = true;
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();

      setTimeout(() => {
        const firstInvalid = this.formFields.find((field, index) => {
          const controlName = Object.keys(this.form.controls)[index];
          const control = this.form.get(controlName);
          return control ? control.invalid : false;
        });

        if (firstInvalid) {
          firstInvalid.nativeElement.focus();
        }
      });
      return;
    }

    const v = this.form.value;

    let participantsArray: string[] = [];

    if (typeof v.participants === 'string') {
      participantsArray = v.participants
        ? v.participants.split(',').map((s: string) => s.trim())
        : [];
    } else if (Array.isArray(v.participants)) {
      participantsArray = v.participants;
    }

    const ev = {
      ...v,
      color: this.getColorForCategory(v.category),
      start: new Date(v.start).getTime(),
      end: new Date(v.end).getTime(),
      participants: participantsArray
    };

    if (this.isEditing) {
      this.evt.updateEvent(ev);
    } else {
      this.evt.addEvent(ev);
    }

    this.visible = false;
    this.showToast(this.isEditing ? 'Event successfully edited' : 'Event successfully created');
  }

  cancel() {
    this.visible = false;
  }

  hasError(controlName: string): boolean {
    const control = this.form.get(controlName);
    return !!(control && control.invalid && (control.touched || control.dirty));
  }

  showToast(message: string) {
    this.toastMessage = message;
    this.toastVisible = true;
    setTimeout(() => {
      this.toastVisible = false;
    }, 3000);
  }
  dateTimeValidator() {
    return (group: FormGroup) => {
      const start = new Date(group.get('start')?.value).getTime();
      const end = new Date(group.get('end')?.value).getTime();
      const now = Date.now();

      const errors: any = {};

      if (isNaN(start) || isNaN(end)) return null;

      if (start < now) {
        errors.startInPast = true;
      }

      if (end <= start) {
        errors.endBeforeStart = true;
      }

      return Object.keys(errors).length ? errors : null;
    };
  }

  getMinDateTime(): string {
    const now = new Date();
    now.setSeconds(0);
    now.setMilliseconds(0);
    return this.msToDatetimeLocal(now.getTime());
  }

  hasFormError(errorCode: string): boolean {
  return !!this.form.errors?.[errorCode];
}

delete() {
  const id = this.form.get('id')?.value;
  if (id) {
    this.evt.deleteEvent(id);
    this.visible = false;
    this.showToast('Event successfully deleted');
  }
}

}
