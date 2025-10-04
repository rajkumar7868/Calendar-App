import { Component, OnDestroy } from '@angular/core';
import { EventService } from '../../services/event.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-conflict-modal',
  templateUrl: './conflict-modal.component.html',
  styleUrls: ['./conflict-modal.component.css']
})
export class ConflictModalComponent implements OnDestroy {
  visible = false;
  event: any = null;
  conflicts: any[] = [];
  suggestions: any[] = [];

  private sub: Subscription;

  constructor(private eventService: EventService) {
    this.sub = this.eventService.conflict$.subscribe(data => {
      this.event = data.event;
      this.conflicts = data.conflicts;
      this.suggestions = data.suggestions;
      this.visible = true;
    });
  }

  choose(s: any) {
    window.dispatchEvent(new CustomEvent('conflictChoice', { detail: s }));
    this.visible = false;
  }

  close() {
    window.dispatchEvent(new CustomEvent('conflictChoice', { detail: null }));
    this.visible = false;
  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
