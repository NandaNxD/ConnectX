# ConnectX
Realtime Video Chat App using WebRTC built using Angular
![UI Connectx](https://github.com/NandaNxD/ConnectX/assets/65838540/6e54881d-4a44-490d-a724-32f715cb5ba7)

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 16.1.5.




# How it Works!

1. Initialize Firebase with config
2. Create a WebRTC Peer Connection Object with stun servers
3. After View is initialized, get Camera and Audio Permissions
4. After Permissions are granted, Push the tracks from local stream to Peer Connection
5. Add an Event Listener for track Addition to the peer connection, and when remote streams are added to peer connection.. add its tracks to the local remote stream
6. Set Video Dom elements to the local and remote streams
6. Send Session Description Protocol [SDP] offer to firestore
7. 