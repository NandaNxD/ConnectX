import { Component ,OnInit,AfterViewInit} from '@angular/core';
import { FirebaseApp, initializeApp } from "firebase/app";
import { DocumentChange, DocumentData, Firestore, QuerySnapshot, addDoc, getFirestore, updateDoc } from "firebase/firestore";
import { doc, setDoc,getDoc,onSnapshot,collection,query,getDocs } from "firebase/firestore"; 
import { FirebaseService } from '../firebase.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit,AfterViewInit {

  permissionError=false;

  permissionsGranted=false;

  firebaseApp!:FirebaseApp;
  fireStore!:Firestore ;


  localStream!:MediaStream;
  remoteStream!:MediaStream;

  createRoomLoader=false;
  createRoomButtonText='New Meeting'

  peerConnection!:RTCPeerConnection;

  creator=true;

  offerRoomId=''

  answerRoomId=''

  copyIconClass='bi-copy'

  illustrationVisible=true;

  isCameraOn=false;
  isMicOn=false;
  isScreenSharing=false;

  inMeeting=false;

  videoSender!:RTCRtpSender;


  servers = {
    iceServers: [
      {
        urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
      },
    ],
    iceCandidatePoolSize: 10,
  };


  constructor(private firebaseService:FirebaseService){

    this.firebaseApp = initializeApp(this.firebaseService.firebaseConfig);
    
    this.fireStore=getFirestore(this.firebaseApp);

    this.peerConnection=new RTCPeerConnection(this.servers);

  }

  turnOnCamera(){
    // navigator.mediaDevices.getUserMedia({
    //   video:true
    // }).then((stream)=>{
    //   this.localStream.addTrack(stream.getVideoTracks()[0]);
    //   //this.peerConnection.addTrack(stream.getVideoTracks()[0],this.localStream)
    // })

    this.localStream.getVideoTracks()[0].enabled=true;

    this.isCameraOn=true;
  }

  turnOffCamera(){
    this.localStream.getVideoTracks()[0].enabled=false;

    // this.localStream.getVideoTracks().forEach((track)=>{
    //   track.stop();
    //   this.localStream.removeTrack(track);

    //   this.peerConnection.removeTrack(this.videoSender);

    // })
    this.isCameraOn=false;
  }

  turnOnMic(){
    this.isMicOn=true;
    this.localStream.getAudioTracks()[0].enabled=true;
  }

  turnOffMic(){
    this.isMicOn=false;
    this.localStream.getAudioTracks()[0].enabled=false;
  }


  joinMeeting(){
    this.creator=false;
    
    this.getPermissions()
    .then(()=>{
      this.isCameraOn=true;
      this.isMicOn=true;
      this.illustrationVisible=false;
      this.createSdpAnswer()
    })
    .catch((error)=>{
      this.permissionError=true;
      console.log(error)
    })
   
  }

  createSdpAnswer(){
    let docRef=doc(this.fireStore,'Calls',this.answerRoomId);

    this.peerConnection.onicecandidate=(event:RTCPeerConnectionIceEvent)=>{
      if(event.candidate){
        // let colRef=collection(this.fireStore,'Calls',res.id);
        console.log('send ice candidate related to answer',this.answerRoomId);
        
        addDoc(collection(this.fireStore,'Calls',this.answerRoomId+'/answerIceCandidates'),event.candidate.toJSON());
       
      }
    }

    getDoc(docRef).then(res=>{
      let resultObject=res.data() as any;

      let remoteDescription=resultObject.sdpOffer

      let localSdpAnswer:RTCSessionDescriptionInit;

      this.peerConnection.setRemoteDescription(remoteDescription).then(()=>{

        return this.peerConnection.createAnswer();
      }).then(sdpObject=>{

        localSdpAnswer=sdpObject

        return this.peerConnection.setLocalDescription(sdpObject);
      }).then(()=>{

        return updateDoc(docRef,{
          'sdpAnswer':{sdp:localSdpAnswer.sdp,type:localSdpAnswer.type}
        })
        
      }).then(()=>this.listenToOfferIceCandidatesAddition())

    })

  }


  startNewMeeting(){
    this.createRoomLoader=true;
    this.getPermissions()
    .then(()=>{
      this.isCameraOn=true;
      this.isMicOn=true;
      this.illustrationVisible=false;
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

  endMeeting(){
    location.reload();
  }

  createSdpOffer(){

    let dref=doc(collection(this.fireStore,'Calls'));

    this.peerConnection.onicecandidate=(event:RTCPeerConnectionIceEvent)=>{
      if(event.candidate){
        // let colRef=collection(this.fireStore,'Calls',res.id);
        console.log('send ice candidate related to offer',this.offerRoomId);

        addDoc(collection(this.fireStore,'Calls',this.offerRoomId+'/offerIceCandidates'),event.candidate.toJSON());
      }
    }

    let offerDescriptionObject:RTCSessionDescriptionInit;

    this.peerConnection.createOffer().then((offerDescription:RTCSessionDescriptionInit)=>{

      let offerObject={
        sdp:offerDescription.sdp,
        type:offerDescription.type
      }

      offerDescriptionObject=offerDescription;

      return setDoc(dref,{'sdpOffer':offerObject});

    }).then(res=>{

      this.offerRoomId=dref.id;

      return this.peerConnection.setLocalDescription(offerDescriptionObject);

    }).then(()=>{

      this.createRoomLoader=false;
      
      this.listenToSdpAnswerAddition();

      console.log(dref.id);

    })

  }

  listenToOfferIceCandidatesAddition(){
    let docRef=collection(this.fireStore,'Calls',this.answerRoomId+'/offerIceCandidates');
      onSnapshot(docRef,{
        next:(res:QuerySnapshot<DocumentData, DocumentData>)=>{
          if(!res.empty){
            console.log('added offer')
            res.docChanges().forEach((change:DocumentChange<DocumentData, DocumentData>)=>{
              // if(change.type=='added'){ 
                let iceCandidate=new RTCIceCandidate(change.doc.data())
                this.peerConnection.addIceCandidate(new RTCIceCandidate(change.doc.data()));
              // }
              
            })
          }
        }
      })
  }


  listenToAnswerIceCandidatesAddition(){
    let docRef=collection(this.fireStore,'Calls',this.offerRoomId+'/answerIceCandidates');
      onSnapshot(docRef,{
        next:(res:QuerySnapshot<DocumentData, DocumentData>)=>{
          if(!res.empty){
            console.log('added answer')
            res.docChanges().forEach((change:DocumentChange<DocumentData, DocumentData>)=>{

              // if(change.type=='added'){
                console.log(change.doc.data());
                let iceCandidate=new RTCIceCandidate(change.doc.data())
                this.peerConnection.addIceCandidate(new RTCIceCandidate(change.doc.data()));
              // }

            })
          }
        }
      })
  }

  listenToSdpAnswerAddition(){
    let docRef=doc(this.fireStore,'Calls',this.offerRoomId);

    let sdpAnswerSnapshotRef = onSnapshot(docRef,{
        next:(res)=>{
          if(res.exists()){
            console.log(res.data());
            let {sdpAnswer}:any=res.data()
            if(sdpAnswer)
            this.peerConnection.setRemoteDescription(sdpAnswer as RTCSessionDescriptionInit).then(()=>  this.listenToAnswerIceCandidatesAddition())          
          }
        }
      })
  }

  listenToSdpOfferAddition(){
    let docRef=doc(this.fireStore,'Calls',this.answerRoomId+'/sdpOffer');

    let sdpOfferSnapshotRef= onSnapshot(docRef,{
        next:(res)=>{
          if(res.exists()){
            console.log(res.data());
            this.peerConnection.setRemoteDescription(res.data() as RTCSessionDescriptionInit).then(()=>  this.listenToOfferIceCandidatesAddition())  
          }
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

  

  ngOnInit(): void {

  }

  ngAfterViewInit(): void {

  }

}
