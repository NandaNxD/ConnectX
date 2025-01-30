import { AfterViewInit, ChangeDetectionStrategy, Component, OnInit, ViewChild } from '@angular/core';
import Clarity from '@microsoft/clarity';
import { environment } from 'src/environments/environment.development';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit,AfterViewInit {

  constructor(){
    Clarity.init(environment.clarityProjectId);
  }

  ngOnInit(): void {
    
  }

  ngAfterViewInit(): void {
    
  }




}
