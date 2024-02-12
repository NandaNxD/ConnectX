import { AfterViewInit, Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';

@Component({
  selector: 'app-video',
  templateUrl: './video.component.html',
  styleUrls: ['./video.component.scss']
})
export class VideoComponent implements AfterViewInit,OnInit,OnChanges{

  @Input()
  mediaStream!:MediaStream;

  @Input()
  local=false;

  constructor(){

  }
  ngOnChanges(changes: SimpleChanges): void {
    
  }

  ngOnInit(): void {
   
  }
  ngAfterViewInit(): void {
   
  }

}
