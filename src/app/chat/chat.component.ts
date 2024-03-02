import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { Message } from '../interfaces';
import { Subject, Unsubscribable } from 'rxjs';
import { FirebaseApp } from 'firebase/app';
import { Database, Unsubscribe, getDatabase, onChildAdded, onDisconnect, onValue, push, ref, set } from 'firebase/database';
import { getFirestore } from 'firebase/firestore';
import { FirebaseService } from '../firebase.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit,AfterViewInit,OnChanges,OnDestroy{

  @Input()
  meetingRoomId:string=''

  @Input()
  startCollaborativeWhiteboard:boolean=false;

  messages:Message[]=[]

  @Output()
  closeChatWindow:Subject<boolean>=new Subject<boolean>();
  
  @ViewChild('autoScrollHelper')
  autoScrollHelperElement!:ElementRef<HTMLDivElement>

  messageInputText='';

  realtimeDb!:Database;

  userId:string='';

  chatBasePathDb='Chat/';

  pushMessageToDbLoader=false;

  messageUnsubscribe!:Unsubscribe;

  whiteboardRoomId='';

  whiteboardUrl='https://whiteboard-1fc46.web.app/draw?roomId=';
  
  constructor(private firebaseService:FirebaseService){
    this.realtimeDb=getDatabase();
    this.userId=push(ref(this.realtimeDb,this.chatBasePathDb)).key as string;
  }

  
  ngOnInit(): void {
    
  }

  ngOnChanges(changes: SimpleChanges) {
    if(this.meetingRoomId){
      onDisconnect(ref(this.realtimeDb,this.chatBasePathDb+`/${this.meetingRoomId}`)).set(null);

      if(!this.messageUnsubscribe)
      this.listenToPeerMessages();
    }

    if(changes['startCollaborativeWhiteboard'].currentValue){
      this.createNewCollaborativeWhiteboard();
    }
    
  }

  ngAfterViewInit(): void {

  }

  ngOnDestroy(): void {
    if(this.messageUnsubscribe)
    this.messageUnsubscribe();
  }

  scrollToLatestMessage(){
    setTimeout(()=>{
      this.autoScrollHelperElement.nativeElement.scrollIntoView({behavior:'smooth'});
    },50)
  }

  listenToPeerMessages(){
    this.messageUnsubscribe=onChildAdded(ref(this.realtimeDb,this.chatBasePathDb+`/${this.meetingRoomId}`),(snapshot)=>{
      if(snapshot.exists()){
        
        let message=snapshot.val();

        if(message.senderId!==this.userId){
          this.messages.push(message);
          this.scrollToLatestMessage();
        }
        
      }
    });
  }

  sendMessage(){
    if(!this.messageInputText.length){
      return;
    }

    this.pushMessageToDbLoader=true;

    let messagePayload:Message={
      message:this.messageInputText,
      senderId:this.userId,
      senderName:'Peer',
      time:new Date().toUTCString()
    }

    push(ref(this.realtimeDb,this.chatBasePathDb+`/${this.meetingRoomId}`),
      messagePayload
    ).then((ref)=>{
      messagePayload.senderName='You';     
      this.messages.push(messagePayload);
      this.scrollToLatestMessage();
    
      this.pushMessageToDbLoader=false;
    }).catch(error=>{
      this.pushMessageToDbLoader=false;
    })

   
    this.messageInputText='';
   
  }

  closeChatContainer(){
    this.closeChatWindow.next(true);
  }

  createNewCollaborativeWhiteboard(){
    this.whiteboardRoomId=push(ref(this.realtimeDb,'Whiteboard')).key as string;

    this.sendWhiteboardUrlMessage();
  }

  sendWhiteboardUrlMessage(){
    let messagePayload:Message={
      message:'Sending a Collaborative Whiteboard: ',
      senderId:this.userId,
      senderName:'Peer',
      link:this.whiteboardUrl+this.whiteboardRoomId,
      time:new Date().toUTCString()
    }

    push(ref(this.realtimeDb,this.chatBasePathDb+`/${this.meetingRoomId}`),
    messagePayload
  ).then((ref)=>{
    messagePayload.senderName='You';     
    this.messages.push(messagePayload);
    this.scrollToLatestMessage();
  
    this.pushMessageToDbLoader=false;
  }).catch(error=>{
    this.pushMessageToDbLoader=false;
  })
  }
  
}
