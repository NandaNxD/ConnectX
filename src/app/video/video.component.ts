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

  @Input()
  isCameraOn=true;

  @Input()
  isMicOn=true;

  videoElement!:HTMLVideoElement;

  constructor(){

  }
  ngOnChanges(changes: SimpleChanges): void {
    if(changes['isCameraOn']){
      
    }

    if(changes['isMicOn']){
      this.isMicOn=changes['isMicOn'].currentValue   
    }
  }

  ngOnInit(): void {
   
  }
  ngAfterViewInit(): void {
    this.videoElement=document.querySelector('.video-element') as HTMLVideoElement;

    this.videoElement.muted=this.local;

  }

}
