import { TestBed } from '@angular/core/testing';
import { ApiService } from './api.service';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { CalendarEvent } from '../models/event.model';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  const baseUrl = 'http://localhost:3000';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ApiService]
    });

    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify(); // Ensure no outstanding requests
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('#checkConflicts', () => {
    it('should POST to check-conflicts endpoint with correct payload and return response', () => {
      const mockEvent: CalendarEvent = { id: '1', title: 'Test', start: 1000, end: 2000, participants: [], category: 'meeting', color: '', notes: '' };
      const existingEvents: CalendarEvent[] = [
        { id: '2', title: 'Existing', start: 1500, end: 2500, participants: [], category: 'meeting', color: '', notes: '' }
      ];

      const mockResponse = { conflict: true };

      service.checkConflicts(mockEvent, existingEvents).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}/check-conflicts`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ proposedEvent: mockEvent, existingEvents });
      req.flush(mockResponse);
    });
  });

  describe('#suggestTimes', () => {
    it('should POST to suggest-times endpoint with correct payload and return response', () => {
      const mockEvent: CalendarEvent = { id: '3', title: 'Test 2', start: 3000, end: 4000, participants: [], category: 'status', color: '', notes: '' };
      const existingEvents: CalendarEvent[] = [
        { id: '4', title: 'Existing 2', start: 3500, end: 4500, participants: [], category: 'status', color: '', notes: '' }
      ];

      const mockResponse = { suggestions: [{ start: 5000, end: 6000 }] };

      service.suggestTimes(mockEvent, existingEvents).subscribe(response => {
        expect(response).toEqual(mockResponse);
      });

      const req = httpMock.expectOne(`${baseUrl}/suggest-times`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ proposedEvent: mockEvent, existingEvents });
      req.flush(mockResponse);
    });
  });
});
