import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { AppComponent } from './app.component';
import { CalendarComponent } from './components/calendar/calendar.component';
import { EventFormComponent } from './components/event-form/event-form.component';
import { ConflictModalComponent } from './components/conflict-modal/conflict-modal.component';

@NgModule({
  declarations: [AppComponent, CalendarComponent, EventFormComponent, ConflictModalComponent],
  imports: [BrowserModule, ReactiveFormsModule, HttpClientModule, DragDropModule, FormsModule],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule {}
