import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';

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

  @ViewChild('videoElement')
  videoElement!: ElementRef<HTMLVideoElement>;

  constructor(){

  }
  ngOnChanges(changes: SimpleChanges): void {
    if(this.videoElement)
    this.videoElement.nativeElement.muted=this.local;
  }

  ngOnInit(): void {
   
  }
  ngAfterViewInit(): void {
    this.videoElement.nativeElement.muted=this.local;
  }

}
