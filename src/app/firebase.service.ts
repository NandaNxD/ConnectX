import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FirebaseService {

  firebaseConfig = {
    apiKey: "AIzaSyAbHb2DoQJBZXmwn7tXI3xwJqxogtxL42w",
    authDomain: "connect-x-1.firebaseapp.com",
    databaseURL: "https://connect-x-1-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "connect-x-1",
    storageBucket: "connect-x-1.appspot.com",
    messagingSenderId: "1092078779809",
    appId: "1:1092078779809:web:cc6da91f6c73d65bd45fe0",
    measurementId: "G-7Y12Z3H9HP"
  };

  meetingEndedByPeer=false;  

  whiteboardCollaborativeUrl='';

  constructor() {
    
  }
}
