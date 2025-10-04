import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: '<div class="app-shell"><div class="header"><h1>Calendar</h1><div><button (click)="openNew()">+ New</button></div></div><app-calendar></app-calendar></div>',
  styles: []
})
export class AppComponent{
  openNew(){ window.dispatchEvent(new CustomEvent('openNew', {})); }
}
