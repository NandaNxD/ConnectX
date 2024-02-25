import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FirebaseApp, initializeApp } from "firebase/app";
import { DataSnapshot, Database, Unsubscribe, get, getDatabase, onChildAdded, onValue, push, ref, set, update,onDisconnect, onChildRemoved } from "firebase/database";
import { Firestore, getFirestore } from "firebase/firestore";
import { FirebaseService } from '../firebase.service';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit,OnDestroy {

  constructor(private firebaseService:FirebaseService,private cdr:ChangeDetectorRef,private router:Router){

    this.firebaseApp = initializeApp(this.firebaseService.firebaseConfig);
    
    this.realtimeDb=getDatabase(this.firebaseApp);
  
    this.fireStore=getFirestore(this.firebaseApp);

    this.peerConnection=new RTCPeerConnection(this.servers);
    
    this.meetingEndedByPeer=this.firebaseService.meetingEndedByPeer || false;

    this.firebaseService.meetingEndedByPeer=false;

  }

  ngOnInit(): void {

  }

  ngOnDestroy(): void {
    if(this.offerIceCandidateUnsubscribe)
    this.offerIceCandidateUnsubscribe();
   
    if(this.answerIceCandidateUnsubscribe)
    this.answerIceCandidateUnsubscribe();

    if(this.sdpAnswerUnsubscribe)
    this.sdpAnswerUnsubscribe();

    if(this.sdpOfferUnsubscribe)
    this.sdpOfferUnsubscribe();

    if(this.meetingRoomUnsubscribe){
      this.meetingRoomUnsubscribe();
    }
  }


  permissionError=false;

  permissionsGranted=false;

  firebaseApp!:FirebaseApp;
  realtimeDb!:Database;
  fireStore!:Firestore ;


  localStream!:MediaStream;
  remoteStream!:MediaStream;

  createRoomLoader=false;
  createRoomButtonText='New Meeting'

  peerConnection!:RTCPeerConnection;


  offerRoomId=''

  answerRoomId=''

  copyIconClass='bi-copy'

  illustrationVisible=true;

  isCameraOn=false;
  isMicOn=false;
  isScreenSharing=false;

  inMeeting=false;

  videoSender!:RTCRtpSender;

  isSelectedVideo='local'

  createJoinContainerVisible=true;

  offerIceCandidateUnsubscribe!:Unsubscribe;
  answerIceCandidateUnsubscribe!:Unsubscribe;
  sdpAnswerUnsubscribe!:Unsubscribe;
  sdpOfferUnsubscribe!:Unsubscribe;
  meetingRoomUnsubscribe!:Unsubscribe;

  meetingEndedByPeer=false;

  invalidMeetingRoom=false;

  dbSDPBasePath='SDP_DATA/';
  chatBasePath='CHAT/';


  servers = {
    iceServers: [
      {
        urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
      },
    ],
    iceCandidatePoolSize: 10,
  };

  displayMediaOptions = {
    video: {
      displaySurface: "browser",
    },
    audio: {
      suppressLocalAudioPlayback: false,
    } as  MediaTrackConstraints,
    preferCurrentTab: false,
    selfBrowserSurface: "exclude",
    systemAudio: "include",
    surfaceSwitching: "include",
    monitorTypeSurfaces: "include",
  };

  
  testMode=false;
  

  turnOnShareScreen(){
    navigator.mediaDevices
    .getDisplayMedia(this.displayMediaOptions)
    .then((stream)=>{
      this.peerConnection.getSenders().forEach((res)=>{
        if(res.track?.kind=='video'){
          this.isCameraOn=false;
          res.track.stop();
          this.localStream.removeTrack(res.track);
          this.localStream.addTrack(stream.getVideoTracks()[0]);
          res.replaceTrack(stream.getVideoTracks()[0]);
        }
      })

      stream.getVideoTracks()[0].onended = ()=>{
        console.log('hello');
        this.turnOffShareScreen();
      };

    })
    .catch((err) => {
      this.isScreenSharing=false;
      console.error(err);
      return null;
    });

    this.isScreenSharing=true;
  } 

  turnOffShareScreen(){
    this.isScreenSharing=false;
    this.cdr.detectChanges();
    this.turnOffCamera();
  }

  turnOnCamera(){
    navigator.mediaDevices.getUserMedia({
      video:true
    }).then((stream)=>{
      this.peerConnection.getSenders().forEach((res)=>{
        if(res.track?.kind=='video'){
          res.track.stop();
          this.localStream.removeTrack(res.track);
          this.localStream.addTrack(stream.getVideoTracks()[0]);
          res.replaceTrack(stream.getVideoTracks()[0]);
        }
      })

    })

    this.isCameraOn=true;
    this.isScreenSharing=false;
  }

  turnOffCamera(){
    const blackCanvas = document.createElement('canvas');
    const blackCtx = blackCanvas.getContext('2d');
    blackCanvas.width = 640;
    blackCanvas.height = 480;
    blackCtx!.fillStyle = 'black';
    blackCtx!.fillRect(0, 0, blackCanvas.width, blackCanvas.height);
    const blackStream = blackCanvas.captureStream();
    const blackVideoTrack = blackStream.getVideoTracks()[0];

    this.localStream.getVideoTracks().forEach((track)=>{

      track.stop();
      this.localStream.removeTrack(track);

      this.peerConnection.getSenders().forEach((res)=>{
        if(res.track?.kind=='video'){
          this.localStream.addTrack(blackVideoTrack);
          res.replaceTrack(blackVideoTrack);
        }
      })

    })
    this.isCameraOn=false;
  }

  turnOnMic(){
    this.localStream.getAudioTracks()[0].enabled=true;
    this.isMicOn=true;
  }

  turnOffMic(){
    this.localStream.getAudioTracks()[0].enabled=false;
    this.isMicOn=false;
  }

  expandVideo(videoOrigin:string){
    this.isSelectedVideo=videoOrigin;
  }


  checkIfMeetingRoomExists(){
    let offerRef=ref(this.realtimeDb,this.dbSDPBasePath+this.answerRoomId);
    return get(offerRef).then((snapshot)=>{
      if(!snapshot.exists()){
        
        throw new Error('MeetingRoomError');
      }
    }
    );
  }


  joinMeeting(){
    this.invalidMeetingRoom=false;
    this.meetingEndedByPeer=false;
    
    this.checkIfMeetingRoomExists().then(()=>{
      return this.getPermissions();
    }).then(()=>{
      this.isCameraOn=true;
      this.isMicOn=true;
      this.illustrationVisible=false;
      this.createSdpAnswer()
    }).catch((error)=>{
      console.error(error);
      if(error.message==='MeetingRoomError'){
        this.invalidMeetingRoom=true;
      }
      else{
        this.permissionError=true;
      }
    })
    
   
  }

  createSdpAnswer(){
    let offerRef=ref(this.realtimeDb,this.dbSDPBasePath+this.answerRoomId);

    onDisconnect(ref(this.realtimeDb,this.dbSDPBasePath+this.answerRoomId)).set(null);

    this.peerConnection.onicecandidate=(event:RTCPeerConnectionIceEvent)=>{
      if(event.candidate){
       
        console.log('send ice candidate related to answer',this.answerRoomId);

        set(push(ref(this.realtimeDb,this.dbSDPBasePath+this.answerRoomId+'/answerIceCandidates')),event.candidate.toJSON());
      
      }
    }

    get(offerRef).then((value:DataSnapshot)=>{
      if(value.exists()){

        let resultObject=value.val() as any;

        let remoteDescription=resultObject.sdpOffer

        let localSdpAnswer:RTCSessionDescriptionInit;

        this.peerConnection.setRemoteDescription(remoteDescription).then(()=>{

          return this.peerConnection.createAnswer();
        }).then(sdpObject=>{

          localSdpAnswer=sdpObject

          return this.peerConnection.setLocalDescription(sdpObject);
        }).then(()=>{

          return update(offerRef,{
            'sdpAnswer':{sdp:localSdpAnswer.sdp,type:localSdpAnswer.type}
          })
          
        }).then(()=>this.listenToOfferIceCandidatesAddition())

      }
    })

  }


  createNewMeeting(){
    this.invalidMeetingRoom=false;
    this.createRoomLoader=true;
    this.meetingEndedByPeer=false;
    this.getPermissions()
    .then(()=>{
      this.isCameraOn=true;
      this.isMicOn=true;
      this.illustrationVisible=false;

      if(this.testMode){
        return;
      }


      this.createSdpOffer()
    })
    .catch(error=>{
      this.permissionError=true;
      console.log(error)
    });
  }

  getPermissions(){
    // Fetch User Permission for Camera and audio
    let permission=navigator.mediaDevices.getUserMedia({
      video:true,
      audio:true
    });

    return permission.then(res=>{
      this.permissionError=false;
      this.localStream=res;

      this.permissionsGranted=true;     

      this.localStream.getTracks().forEach((streamTrack)=>{
        console.log(streamTrack.kind)
        this.peerConnection.addTrack(streamTrack,this.localStream)
      })


      this.peerConnection.ontrack=(rtcTrackEvent)=>{
        this.remoteStream=new MediaStream();
        rtcTrackEvent.streams[0].getTracks().forEach((mediaStreamTrack)=>{
          console.log('adding remote tracks');
          this.remoteStream.addTrack(mediaStreamTrack);
        })
      }

    })  
    
  }

  cleanRTDB(){
    set(ref(this.realtimeDb,this.dbSDPBasePath+this.answerRoomId || this.offerRoomId),null);
  }

  endMeeting(){
    if(this.meetingRoomUnsubscribe){
      this.meetingRoomUnsubscribe();
    }
    this.cleanRTDB();
    this.stopLocalStreamTracks();
    this.stopRemoteStreamTracks();
    this.reloadCurrentRoute();
  }

  createSdpOffer(){

    let newMeetingRoomId=push(ref(this.realtimeDb)).key;

    let meetingRef=ref(this.realtimeDb,this.dbSDPBasePath+newMeetingRoomId as string)

    onDisconnect(ref(this.realtimeDb,this.dbSDPBasePath+newMeetingRoomId)).set(null);

    this.peerConnection.onicecandidate=(event:RTCPeerConnectionIceEvent)=>{
      if(event.candidate){
      
        console.log('send ice candidate related to offer',this.dbSDPBasePath+this.offerRoomId,event.candidate.toJSON());

        set(push(ref(this.realtimeDb,this.dbSDPBasePath+meetingRef.key+'/offerIceCandidates')),event.candidate.toJSON());
      }
    }

    let offerDescriptionObject:RTCSessionDescriptionInit;

    this.peerConnection.createOffer().then((offerDescription:RTCSessionDescriptionInit)=>{

      let offerObject={
        sdp:offerDescription.sdp,
        type:offerDescription.type
      }

      offerDescriptionObject=offerDescription;

      return set(meetingRef,
        {'sdpOffer':offerObject}
      )

    }).then(()=>{

      this.offerRoomId=newMeetingRoomId as string;
      console.log('hello');

      return this.peerConnection.setLocalDescription(offerDescriptionObject);

    }).then(()=>{

      console.log('Local Description set');

      this.createRoomLoader=false;
      
      this.listenToSdpAnswerAddition();

    })

  }

  reloadCurrentRoute() {
    let currentUrl = this.router.url;
    this.router.navigateByUrl('/video-test', {skipLocationChange: true}).then(() => {
      this.router.navigate([currentUrl]);
    });
  }

  stopLocalStreamTracks(){
    this.localStream.getTracks().forEach((track)=>{
      track.stop();
    })
  }

  stopRemoteStreamTracks(){
    this.remoteStream.getTracks().forEach((track)=>{
      track.stop();
    })
  }

  listenToPeerEndingMeeting(){
    this.meetingRoomUnsubscribe=onChildRemoved(ref(this.realtimeDb,this.dbSDPBasePath+'/'),(snapshot)=>{
      if(snapshot.exists()){
        if(snapshot.key==this.offerRoomId || snapshot.key==this.answerRoomId){
          this.meetingEndedByPeer=true;

          this.stopLocalStreamTracks();
          this.stopRemoteStreamTracks();
          
          this.firebaseService.meetingEndedByPeer=true;
          this.reloadCurrentRoute();          
        }
      }
    })
  }

  listenToOfferIceCandidatesAddition(){

    let offerIceCandidateRef=ref(this.realtimeDb,this.dbSDPBasePath+this.answerRoomId+'/offerIceCandidates');

    this.offerIceCandidateUnsubscribe=onChildAdded(offerIceCandidateRef,(snapshot:DataSnapshot)=>{
      console.log('okay')
      if(snapshot.exists()){
        console.log(snapshot.val());
        let offerIceCandidate=snapshot.val() as RTCIceCandidateInit;

        this.peerConnection.addIceCandidate(new RTCIceCandidate(offerIceCandidate));
      
        this.isSelectedVideo='remote';
        this.createJoinContainerVisible=false;

      }    
    })

    console.log(this.offerIceCandidateUnsubscribe);

    this.listenToPeerEndingMeeting();
  }


  listenToAnswerIceCandidatesAddition(){

    let answerIceCandidateRef=ref(this.realtimeDb,this.dbSDPBasePath+this.offerRoomId+'/answerIceCandidates');

    this.answerIceCandidateUnsubscribe=onChildAdded(answerIceCandidateRef,(snapshot:DataSnapshot)=>{
      console.log('added answer')
      if(snapshot.exists()){
        console.log(snapshot.val());
        let answerIceCandidate=snapshot.val() as RTCIceCandidateInit;
        this.peerConnection.addIceCandidate(new RTCIceCandidate(answerIceCandidate));
      
        this.isSelectedVideo='remote';
        this.createJoinContainerVisible=false;

      }
    })

    this.listenToPeerEndingMeeting();
  }

  listenToSdpAnswerAddition(){

    let sdpAnswerRef=ref(this.realtimeDb,this.dbSDPBasePath+this.offerRoomId+'/sdpAnswer');

    this.sdpAnswerUnsubscribe=onValue(sdpAnswerRef,(snapshot:DataSnapshot)=>{
      console.log('okay')
      if(snapshot.exists()){
        console.log(snapshot.val());
        
        let sdpAnswer:any=snapshot.val()
        if(sdpAnswer)
        this.peerConnection.setRemoteDescription(sdpAnswer as RTCSessionDescriptionInit).then(()=>  this.listenToAnswerIceCandidatesAddition())    

      }    
    })

  }

  listenToSdpOfferAddition(){

    let sdpOfferRef=ref(this.realtimeDb,this.dbSDPBasePath+this.offerRoomId+'/sdpOffer');

    this.sdpOfferUnsubscribe=onValue(sdpOfferRef,(snapshot:DataSnapshot)=>{
      console.log('Sdp Offer Received')
      if(snapshot.exists()){
        console.log(snapshot.val());
        
        let sdpAnswer:any=snapshot.val()
        if(sdpAnswer)
        this.peerConnection.setRemoteDescription(sdpAnswer as RTCSessionDescriptionInit).then(()=>  this.listenToAnswerIceCandidatesAddition())    

      }    
    })

  }

  copyOfferRoomIdToClipBoard(){
    this.copyIconClass='bi-check-all'
    navigator.clipboard.writeText(this.offerRoomId);
    setTimeout(()=>{
      this.copyIconClass='bi-copy'
    },2000)
  }

}
