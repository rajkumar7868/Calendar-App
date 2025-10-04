import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { CalendarEvent } from '../models/event.model';

@Injectable({ providedIn: 'root' })
export class ApiService {
  // private baseUrl = 'http://localhost:3000';
  private baseUrl = 'https://calendar-app-kaio.onrender.com/'

  constructor(private http: HttpClient) {}

  checkConflicts(event: CalendarEvent, existing: CalendarEvent[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/check-conflicts`, { proposedEvent: event, existingEvents: existing });
  }

  suggestTimes(event: CalendarEvent, existing: CalendarEvent[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/suggest-times`, { proposedEvent: event, existingEvents: existing });
  }
}
