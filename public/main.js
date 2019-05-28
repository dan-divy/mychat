$(function() {
  window.onload = function () {
    Notification.requestPermission()
  }
  var FADE_TIME = 150; // ms
  var TYPING_TIMER_LENGTH = 400; // ms
  var COLORS = [
    '#e21400', '#91580f', '#f8a700', '#f78b00',
    '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
    '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
  ];

  // Initialize variables
  var $window = $(window);
  var $usernameInput = $('.usernameInput'); // Input for username
  var $messages = $('.messages'); // Messages area
  var $inputMessage = $('.inputMessage'); // Input message input box

  var $loginPage = $('.login.page'); // The login page
  var $chatPage = $('.chat.page'); // The chatroom page

  // Prompt for setting a username
  var username;
  var connected = false;
  var typing = false;
  var lastTypingTime;
  var $currentInput = $usernameInput.focus();
  var room = window.location.pathname.slice(1);
  document.title = room;
  var socket = io();
  const addParticipantsMessage = (data) => {
  if(!document.getElementById('welcome')) return;
    document.getElementById('welcome').innerHTML = "Welcome to the " + room + " made by DanCodes to test Socket.io";
  }
  function gotoBottom(id){
   var element = document.getElementById(id);
   element.scrollTop = element.scrollHeight - element.clientHeight;
   element.scrollTo(0, element.scrollTop);
   window.scrollTo(0,document.body.scrollHeight);
   return element.scrollTop;
  }
  document.body.ondragover = function (e) {
    e.preventDefault();
    document.body.style.filter = 'blur(2mm)';
  }
  document.body.ondragleave = function (e) {
    e.preventDefault();
    document.body.style.filter = '';
  }
  document.body.ondrop = function (e) {
    e.preventDefault();
    if (e.dataTransfer.items) {
    for (var i = 0; i < e.dataTransfer.items.length; i++) {
      if (e.dataTransfer.items[i].kind === 'file') {
        var file = e.dataTransfer.items[i].getAsFile();
        handleFile(file);
      }
    }
  } else {
    for (var i = 0; i < e.dataTransfer.files.length; i++) {
      handleFile(e.dataTransfer.files[i]);
    }
  }
  }
  
  function handleFile(files) {
    if(this.files) var file = this.files[0];
      else var file = files;
    var reader = new FileReader();
    reader.onloadend = function() {
      sendMessage(reader.result);
    }
    reader.readAsDataURL(file);
    document.body.style.filter = '';
    gotoBottom('msgs');
    
  }
  
  
  
  
  // Sets the client's username
  const setUsername = () => {
    username = cleanInput($usernameInput.val().trim());

    // If the username is valid
    if (username) {
      $loginPage.fadeOut();
      $chatPage.show();
      $loginPage.off('click');
      $currentInput = $inputMessage.focus();

      // Tell the server your username
      socket.emit('add user', {username, room});
    }
  }

  // Sends a chat message
  const sendMessage = (message) => {
    if(!message) message = $inputMessage.val();
    // Prevent markup from being injected into the message
    message = cleanInput(message);
    // if there is a non-empty message and a socket connection
    if (message && connected) {
      $inputMessage.val('');
      addChatMessage({
        username: username,
        message: message
      });
      // tell server to execute 'new message' and send along one parameter
      console.log(message)
      socket.emit('new message', {message, room});
    }
  }

  // Log a message
    const log = (message, options) => {
    var $el = $(`<li>`).addClass('log').text(message);
    addMessageElement($el, options);
  }

  // Adds the visual chat message to the message list
  const addChatMessage = (data, options, notif) => {
    if(Array.from(document.getElementById('msgs').getElementsByTagName('li')).length > 3) gotoBottom('msgs');
    // Don't fade the message in if there is an 'X was typing'
    var $typingMessages = getTypingMessages(data);
    options = options || {};
    if ($typingMessages.length !== 0) {
      options.fade = false;
      $typingMessages.remove();
    }

    var $usernameDiv = $('<span class="username"/>')
      .text(data.username)
      .css('color', getUsernameColor(data.username));
    let id = Math.random();
    if(data.message.startsWith('data')) var $messageBodyDiv = $(`<img id="${id}" style="width:20%; height: 20%" src="${data.message}" class="messageBody">`)
      else var $messageBodyDiv = $(`<span id="${id}" class="messageBody">`).html(data.message);
    var typingClass = data.typing ? 'typing' : '';
    var $messageDiv = $('<li class="message"/>')
      .data('username', data.username)
      .addClass(typingClass)
      .append($usernameDiv, $messageBodyDiv);
      
    if(!data.typing && data.username != username && !notif) {
      
    var n = new Notification('New notification in MyChat!', {
        body: data.username + ': ' + data.message,
        icon: 'https://mychat.glitch.me/logo.png'
      });
      n.onclick = function () {window.focus(); parent.focus(); this.close()}
    }
    
    addMessageElement($messageDiv, options);
  }

  // Adds the visual chat typing message
  const addChatTyping = (data) => {
    if(data.room != room) return;
    data.typing = true;
    data.message = 'is typing';
    addChatMessage(data);
  }

  // Removes the visual chat typing message
  const removeChatTyping = (data) => {
    getTypingMessages(data).fadeOut(function () {
      $(this).remove();
    });
  }

  // Adds a message element to the messages and scrolls to the bottom
  // el - The element to add as a message
  // options.fade - If the element should fade-in (default = true)
  // options.prepend - If the element should prepend
  //   all other messages (default = false)
  const addMessageElement = (el, options) => {
    console.log(el);
    var $el = $(el);

    // Setup default options
    if (!options) {
      options = {};
    }
    if (typeof options.fade === 'undefined') {
      options.fade = true;
    }
    if (typeof options.prepend === 'undefined') {
      options.prepend = false;
    }

    // Apply options
    if (options.fade) {
      $el.hide().fadeIn(FADE_TIME);
    }
    if (options.prepend) {
      $messages.prepend($el);
    } else {
      $messages.append($el);
    }
    $messages[0].scrollTop = $messages[0].scrollHeight;
  }

  // Prevents input from having injected markup
  const cleanInput = (input) => {
    return $('<div/>').text(input).html();
  }

  // Updates the typing event
  const updateTyping = () => {
    if (connected) {
      if (!typing) {
        typing = true;
        socket.emit('typing');
      }
      lastTypingTime = (new Date()).getTime();

      setTimeout(() => {
        var typingTimer = (new Date()).getTime();
        var timeDiff = typingTimer - lastTypingTime;
        if (timeDiff >= TYPING_TIMER_LENGTH && typing) {
          socket.emit('stop typing');
          typing = false;
        }
      }, TYPING_TIMER_LENGTH);
    }
  }

  // Gets the 'X is typing' messages of a user
  const getTypingMessages = (data) => {
    return $('.typing.message').filter(function (i) {
      return $(this).data('username') === data.username;
    });
  }

  // Gets the color of a username through our hash function
  const getUsernameColor = (username) => {
    if(!username) username = 'test'
    // Compute hash code
    var hash = 7;
    for (var i = 0; i < username.length; i++) {
       hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    // Calculate color
    var index = Math.abs(hash % COLORS.length);
    return COLORS[index];
  }

  // Keyboard events

  $window.keydown(event => {
    // Auto-focus the current input when a key is typed
    if (!(event.ctrlKey || event.metaKey || event.altKey)) {
      $currentInput.focus();
    }
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
      if (username) {
        sendMessage();
        socket.emit('stop typing');
        typing = false;
      } else {
        setUsername();
      }
    }
  });

  $inputMessage.on('input', () => {
    updateTyping();
  });

  // Click events

  // Focus input when clicking anywhere on login page
  $loginPage.click(() => {
    $currentInput.focus();
  });

  // Focus input when clicking on the message input's border
  $inputMessage.click(() => {
    $inputMessage.focus();
  });

  // Socket events

  // Whenever the server emits 'login', log the login message
  socket.on('login', (data) => {
    console.log(data)
    data.msgs.forEach(m => {
      addChatMessage(m, {}, true);
    })
    
    if(Array.from(document.getElementById('msgs').getElementsByTagName('li')).length > 3) gotoBottom('msgs');
    $('#loading').fadeOut(500);
    connected = true;
    // Display the welcome message
    var message = "Welcome to the " + room + " made by DanCodes to test Socket.io"
    $('.chatArea').append(`<div style="
    font-size: 150%;
    position: fixed;
    width: 100%;
    background-color: white;
    top: 0;
    padding: 1%;
"> <li id="welcome" class="log" style="display: list-item;">${message}</li></div>`)
    addParticipantsMessage(data);
  });
  // Whenever the server emits 'new message', update the chat body
  socket.on('new message', (data) => {
    if(data.room != room) return;
    addChatMessage(data);
  });

  // Whenever the server emits 'user joined', log it in the chat body
  socket.on('user joined', (data) => {
    addParticipantsMessage(data);
  });

  // Whenever the server emits 'user left', log it in the chat body
  socket.on('user left', (data) => {
    addParticipantsMessage(data);
    removeChatTyping(data);
  });

  // Whenever the server emits 'typing', show the typing message
  socket.on('typing', (data) => {
    if(data.room != room) return;
    addChatTyping(data);
  });

  // Whenever the server emits 'stop typing', kill the typing message
  socket.on('stop typing', (data) => {
    if(data.room != room) return;
    removeChatTyping(data);
  });

  socket.on('disconnect', () => {
    log('you have been disconnected');
  });

  socket.on('reconnect', () => {
    log('you have been reconnected');
    if (username) {
      socket.emit('add user', {username, room});
    }
  });

  socket.on('reconnect_error', () => {
    log('attempt to reconnect has failed');
  });

});
