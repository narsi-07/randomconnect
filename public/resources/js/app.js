(function($) {
    var self = {
        id: null,
        partnerId: null,
        username: 'User_' + Math.random().toString(36).substring(4, 8)
    };

    var elMessages = $('#messages_container');
    var elText = $('#message');
    var btnSend = $('#send_btn');
    var chatButton = $('#chat_button');
    var chatPopup = $('#chat_popup');
    var statusPopup = $('#status_popup');
    var statusMessage = $('.status_message');
    var redDot = $('.red_dot');
    var closeButton = $('.close_btn');

    btnSend.on('click', function() {
        var text = elText.val().trim();
        if (text) {
            elText.val('');
            easyrtc.sendPeerMessage(self.partnerId, 'send_peer_msg', text);
            addMessage(text, self.id);
        }
    });

    $('#next2_btn').on('click', function() {
        hangupCall();
        showStatusPopup('Searching...');
        easyrtc.webSocket.emit('next_user');
      });
      

    $('#next_btn').on('click', function() {
        hangupCall();
        showStatusPopup('Searching...');
        easyrtc.webSocket.emit('next_user');
    });

    $('#stop_btn').on('click', hangupCall);

    $('#clear_btn').on('click', function() {
        elMessages.html('');
    });

    chatButton.on('click', function() {
        chatPopup.toggle();
        redDot.hide();
        scrollToBottom();
    });

    closeButton.on('click', function() {
        chatPopup.hide();
        statusPopup.hide();
    });

    elText.on('keypress', function(e) {
        if (e.keyCode == 13 && !e.shiftKey && !btnSend.hasClass('disabled')) {
            btnSend.trigger('click');
            return false;
        }
    });

    easyrtc.setPeerListener(function(senderId, msgType, msgData, targeting) {
        if (msgType === 'send_peer_msg') {
            addMessage(msgData, senderId);
            redDot.show();
        } else if (msgType === 'send_peer_disconnect') {
            disconnectMeFromPartner();
        }
    });

    easyrtc.setStreamAcceptor(function(callerId, stream) {
        var video = document.getElementById('partnerVideo');
        easyrtc.setVideoObjectSrc(video, stream);
    });

    easyrtc.setOnStreamClosed(function(callerId) {
        var video = document.getElementById('partnerVideo');
        easyrtc.setVideoObjectSrc(video, '');
    });

    function connect() {
        easyrtc.setUsername(self.username);
        easyrtc.initMediaSource(
            function() {
                var selfVideo = document.getElementById('selfVideo');
                easyrtc.setVideoObjectSrc(selfVideo, easyrtc.getLocalStream());
                // Mute the local video element
                selfVideo.muted = true;
            },
            function(errorCode, errmesg) {
                console.error('Failed to get your media: ' + errmesg);
            }
        );

        easyrtc.connect('enlargify_app',
            function(socketId) {
                self.id = socketId;

                easyrtc.webSocket.on('ui_user_add', function(userData) {
                    elUsers.append('<div id=' + userData.id + '>' + userData.name + '</div>');
                });
                easyrtc.webSocket.on('ui_user_remove', function(userId) {
                    elUsers.find('#' + userId).remove();
                });
                easyrtc.webSocket.on('ui_user_set', function(userList) {
                    for (id in userList) {
                        elUsers.append('<div id=' + userList[id].id + '>' + userList[id].name + '</div>');
                    }
                });

                easyrtc.webSocket.on('connect_partner', function(user) {
                    if (user.caller) {
                        performCall(user.partnerId);
                    } else {
                        connectMeToPartner(user.partnerId);
                    }
                });
                easyrtc.webSocket.on('disconnect_partner', function(partnerId) {
                    if (partnerId == self.partnerId) {
                        disconnectMeFromPartner();
                    }
                });

                easyrtc.webSocket.emit('init_user', { 'name': self.username });
            },
            function(errCode, message) {
                console.error('Failed to connect to the server: ' + message);
            }
        );
    }
  

    function addMessage(text, senderId) {
        var content = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br />');
        var messageClass = senderId === self.id ? 'me' : 'stranger';
        elMessages.append('<div class="message-container ' + messageClass + '"><div class="message ' + messageClass + '">' + content + '</div></div>');
        scrollToBottom();
    }

    function scrollToBottom() {
        elMessages.scrollTop(elMessages.prop("scrollHeight"));
    }

    function performCall(id) {
        connectMeToPartner(id);

        var successCB = function() {};
        var failureCB = function() {
            disconnectMeFromPartner();
        };
        var acceptedCB = function(isAccepted, callerId) {};
        easyrtc.call(self.partnerId, successCB, failureCB, acceptedCB);
    }

    function connectMeToPartner(id) {
        self.partnerId = id;
    }

    function disconnectMeFromPartner() {
        self.partnerId = null;
        var video = document.getElementById('partnerVideo');
        easyrtc.setVideoObjectSrc(video, '');
        showStatusPopup('Disconnected');
    }

    function hangupCall() {
        easyrtc.hangupAll();
        disconnectMeFromPartner();
    }

    function showStatusPopup(message) {
        statusMessage.text(message);
        statusPopup.show();
    }

    $(document).ready(function() {
        connect();
    });

})(jQuery);
