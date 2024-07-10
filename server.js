// load required modules
const http = require("http");              // http server core module
const express = require("express");        // web framework external module
const sio = require("socket.io");          // web socket external module
const easyrtc = require("easyrtc");        // EasyRTC external module
const path = require("path");

// setup and configure Express http server. Expect a subfolder called "public" to be the web root.
const httpApp = express();
httpApp.use(express.static(path.join(__dirname, "public")));
httpApp.use(express.json());

httpApp.get("/", function(req, res) {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// start Express http server
const port = process.env.PORT || 5000;
const webServer = http.createServer(httpApp).listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});

// start Socket.io so it attaches itself to Express server
const io = sio.listen(webServer, {"log level":1});

// start EasyRTC server
easyrtc.listen(httpApp, io, {logLevel:"debug", logDateEnable:true});

const userList = {};
const waitingList = {};
let socketCount = 0;

io.sockets.on("connection", function(socket) {
  socketCount++;

  socket.on("init_user", function(userData){
    // update the list of users
    userList[socket.id] = {"id": socket.id, "name": userData.name};
    
    // send the connected user list to the new user
    socket.emit("ui_user_set", userList);
    // send the new user to all other users
    socket.broadcast.emit("ui_user_add", userList[socket.id]);
  });
  
  socket.on("next_user", function() {
    if (waitingList[socket.id]) return;

    if (Object.keys(waitingList).length === 0) {
      waitingList[socket.id] = true;
    } else {
      // pick a partner from the waiting list
      socket.partnerId = Object.keys(waitingList)[0];

      // connect two users with each other
      socket.emit("connect_partner", {'caller':false, 'partnerId': socket.partnerId});
      const partnerSocket = io.sockets.connected[socket.partnerId];
      partnerSocket.partnerId = socket.id;
      partnerSocket.emit("connect_partner", {'caller':true, 'partnerId': socket.id});
      
      // delete the partner from the waiting list
      delete waitingList[socket.partnerId];
    }
  });
});

// Since "disconnect" event is consumed by easyRTC,
// socket.on("disconnect", function() {}) will not work
// use easyrtc event listener for disconnect
easyrtc.events.on("disconnect", function(connectionObj, next){
  // call the default disconnect method 
  easyrtc.events.emitDefault("disconnect", connectionObj, next);

  const socket = connectionObj.socket;
  const id = socket.id;
  // clear the server-side variables
  socketCount--;
  delete userList[id];
  delete waitingList[id];
  
  // adjust the client-side
  io.sockets.emit("ui_user_remove", id);
  if (socket.partnerId){
    const partnerSocket = io.sockets.connected[socket.partnerId];
    partnerSocket.emit("disconnect_partner", socket.id);
    socket.partnerId = null;
  }
});
