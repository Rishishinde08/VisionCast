import React, { useEffect, useRef, useState } from 'react'
import io from "socket.io-client";
import { 
  Badge, 
  IconButton, 
  TextField, 
  Button,
  Avatar,
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Tooltip,
  Zoom
} from '@mui/material';
import { 
  Videocam as VideocamIcon,
  VideocamOff as VideocamOffIcon,
  CallEnd as CallEndIcon,
  Mic as MicIcon,
  MicOff as MicOffIcon,
  ScreenShare as ScreenShareIcon,
  StopScreenShare as StopScreenShareIcon,
  Chat as ChatIcon,
  Close as CloseIcon,
  Send as SendIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import server from '../environment';

const server_url = server;
const connections = {};

const peerConfigConnections = {
  "iceServers": [
    { "urls": "stun:stun.l.google.com:19302" }
  ]
}

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#7c4dff',
    },
    secondary: {
      main: '#ff4081',
    },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
  shape: {
    borderRadius: 12,
  },
});

export default function VideoMeetComponent() {
  const socketRef = useRef();
  const socketIdRef = useRef();
  const localVideoref = useRef();
  const videoRef = useRef([]);
  const chatContainerRef = useRef();

  const [videoAvailable, setVideoAvailable] = useState(true);
  const [audioAvailable, setAudioAvailable] = useState(true);
  const [video, setVideo] = useState(true);
  const [audio, setAudio] = useState(true);
  const [screen, setScreen] = useState(false);
  const [screenAvailable, setScreenAvailable] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [newMessages, setNewMessages] = useState(0);
  const [askForUsername, setAskForUsername] = useState(true);
  const [username, setUsername] = useState("");
  const [videos, setVideos] = useState([]);
  const [participants, setParticipants] = useState([]);

  // Get media permissions on mount
  useEffect(() => {
    getPermissions();
  }, []);

  // Handle video/audio changes
  useEffect(() => {
    if (video !== undefined && audio !== undefined) {
      getUserMedia();
    }
  }, [video, audio]);

  // Handle screen sharing changes
  useEffect(() => {
    if (screen !== undefined) {
      getDislayMedia();
    }
  }, [screen]);

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const getPermissions = async () => {
    try {
      const videoPermission = await navigator.mediaDevices.getUserMedia({ video: true });
      setVideoAvailable(!!videoPermission);
      
      const audioPermission = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioAvailable(!!audioPermission);
      
      setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);

      if (videoAvailable || audioAvailable) {
        const userMediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: videoAvailable, 
          audio: audioAvailable 
        });
        
        if (userMediaStream) {
          window.localStream = userMediaStream;
          if (localVideoref.current) {
            localVideoref.current.srcObject = userMediaStream;
          }
        }
      }
    } catch (error) {
      console.error("Error getting permissions:", error);
    }
  };

  const getMedia = () => {
    setVideo(videoAvailable);
    setAudio(audioAvailable);
    connectToSocketServer();
  };

  const getUserMediaSuccess = (stream) => {
    try {
      window.localStream?.getTracks().forEach(track => track.stop());
    } catch (e) { console.error(e); }

    window.localStream = stream;
    localVideoref.current.srcObject = stream;

    Object.keys(connections).forEach(id => {
      if (id === socketIdRef.current) return;

      connections[id].addStream(window.localStream);

      connections[id].createOffer()
        .then(description => {
          connections[id].setLocalDescription(description)
            .then(() => {
              socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }));
            })
            .catch(e => console.error(e));
        });
    });

    stream.getTracks().forEach(track => {
      track.onended = () => {
        setVideo(false);
        setAudio(false);
        handleStreamEnd();
      };
    });
  };

  const handleStreamEnd = () => {
    try {
      localVideoref.current?.srcObject?.getTracks()?.forEach(track => track.stop());
    } catch (e) { console.error(e); }

    const blackSilence = () => new MediaStream([black(), silence()]);
    window.localStream = blackSilence();
    localVideoref.current.srcObject = window.localStream;

    Object.keys(connections).forEach(id => {
      connections[id].addStream(window.localStream);
      connections[id].createOffer()
        .then(description => {
          connections[id].setLocalDescription(description)
            .then(() => {
              socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }));
            })
            .catch(e => console.error(e));
        });
    });
  };

  const getUserMedia = () => {
    if ((video && videoAvailable) || (audio && audioAvailable)) {
      navigator.mediaDevices.getUserMedia({ video, audio })
        .then(getUserMediaSuccess)
        .catch(e => console.error(e));
    } else {
      try {
        localVideoref.current?.srcObject?.getTracks()?.forEach(track => track.stop());
      } catch (e) { console.error(e); }
    }
  };

  const getDislayMedia = () => {
    if (screen && navigator.mediaDevices.getDisplayMedia) {
      navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
        .then(getDislayMediaSuccess)
        .catch(e => console.error(e));
    }
  };

  const getDislayMediaSuccess = (stream) => {
    try {
      window.localStream?.getTracks()?.forEach(track => track.stop());
    } catch (e) { console.error(e); }

    window.localStream = stream;
    localVideoref.current.srcObject = stream;

    Object.keys(connections).forEach(id => {
      if (id === socketIdRef.current) return;

      connections[id].addStream(window.localStream);
      connections[id].createOffer()
        .then(description => {
          connections[id].setLocalDescription(description)
            .then(() => {
              socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }));
            })
            .catch(e => console.error(e));
        });
    });

    stream.getTracks().forEach(track => {
      track.onended = () => {
        setScreen(false);
        try {
          localVideoref.current?.srcObject?.getTracks()?.forEach(track => track.stop());
        } catch (e) { console.error(e); }
        getUserMedia();
      };
    });
  };

  const gotMessageFromServer = (fromId, message) => {
    const signal = JSON.parse(message);

    if (fromId !== socketIdRef.current) {
      if (signal.sdp) {
        connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp))
          .then(() => {
            if (signal.sdp.type === 'offer') {
              connections[fromId].createAnswer()
                .then(description => {
                  connections[fromId].setLocalDescription(description)
                    .then(() => {
                      socketRef.current.emit('signal', fromId, JSON.stringify({ 'sdp': connections[fromId].localDescription }));
                    })
                    .catch(e => console.error(e));
                })
                .catch(e => console.error(e));
            }
          })
          .catch(e => console.error(e));
      }

      if (signal.ice) {
        connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice))
          .catch(e => console.error(e));
      }
    }
  };

  const connectToSocketServer = () => {
    socketRef.current = io.connect(server_url, { secure: false });

    socketRef.current.on('signal', gotMessageFromServer);
    socketRef.current.on('connect', () => {
      socketRef.current.emit('join-call', window.location.href);
      socketIdRef.current = socketRef.current.id;

      socketRef.current.on('chat-message', addMessage);
      socketRef.current.on('user-left', handleUserLeft);
      socketRef.current.on('user-joined', handleUserJoined);
    });
  };

  const handleUserLeft = (id) => {
    setVideos(videos => videos.filter(video => video.socketId !== id));
    setParticipants(prev => prev.filter(p => p.socketId !== id));
  };

  const handleUserJoined = (id, clients) => {
    setParticipants(prev => [...prev, { socketId: id, username: `User ${id.slice(0, 5)}` }]);

    clients.forEach(socketListId => {
      connections[socketListId] = new RTCPeerConnection(peerConfigConnections);
      
      connections[socketListId].onicecandidate = event => {
        if (event.candidate) {
          socketRef.current.emit('signal', socketListId, JSON.stringify({ 'ice': event.candidate }));
        }
      };

      connections[socketListId].onaddstream = event => {
        setVideos(prevVideos => {
          const existingVideo = prevVideos.find(v => v.socketId === socketListId);
          if (existingVideo) {
            return prevVideos.map(v => 
              v.socketId === socketListId ? { ...v, stream: event.stream } : v
            );
          }
          return [...prevVideos, {
            socketId: socketListId,
            stream: event.stream,
            autoplay: true,
            playsinline: true
          }];
        });
      };

      if (window.localStream) {
        connections[socketListId].addStream(window.localStream);
      } else {
        const blackSilence = () => new MediaStream([black(), silence()]);
        window.localStream = blackSilence();
        connections[socketListId].addStream(window.localStream);
      }
    });

    if (id === socketIdRef.current) {
      Object.keys(connections).forEach(id2 => {
        if (id2 === socketIdRef.current) return;

        try {
          connections[id2].addStream(window.localStream);
        } catch (e) { console.error(e); }

        connections[id2].createOffer()
          .then(description => {
            connections[id2].setLocalDescription(description)
              .then(() => {
                socketRef.current.emit('signal', id2, JSON.stringify({ 'sdp': connections[id2].localDescription }));
              })
              .catch(e => console.error(e));
          });
      });
    }
  };

  const silence = () => {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    ctx.resume();
    return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
  };

  const black = ({ width = 640, height = 480 } = {}) => {
    const canvas = Object.assign(document.createElement("canvas"), { width, height });
    canvas.getContext('2d').fillRect(0, 0, width, height);
    const stream = canvas.captureStream();
    return Object.assign(stream.getVideoTracks()[0], { enabled: false });
  };

  const handleVideo = () => setVideo(!video);
  const handleAudio = () => setAudio(!audio);
  const handleScreen = () => setScreen(!screen);

  const handleEndCall = () => {
    try {
      localVideoref.current?.srcObject?.getTracks()?.forEach(track => track.stop());
    } catch (e) { console.error(e); }
    window.location.href = "/";
  };

  const toggleChat = () => {
    setShowChat(!showChat);
    if (!showChat) setNewMessages(0);
  };

  const addMessage = (data, sender, socketIdSender) => {
    setMessages(prev => [...prev, { sender, data }]);
    if (socketIdSender !== socketIdRef.current) {
      setNewMessages(prev => prev + 1);
    }
  };

  const sendMessage = () => {
    if (message.trim()) {
      socketRef.current.emit('chat-message', message.trim(), username);
      setMessage("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  const connect = () => {
    if (username.trim()) {
      setAskForUsername(false);
      getMedia();
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ 
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: 'background.default'
      }}>
        {askForUsername ? (
          <Box sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '100%',
            background: 'linear-gradient(135deg, #7c4dff30 0%, #ff408130 100%)'
          }}>
            <Paper elevation={10} sx={{
              p: 4,
              width: '100%',
              maxWidth: 400,
              textAlign: 'center',
              backgroundColor: 'background.paper'
            }}>
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
                Join Meeting
              </Typography>
              
              <Avatar sx={{ 
                width: 80, 
                height: 80, 
                mx: 'auto', 
                mb: 3,
                bgcolor: 'primary.main'
              }}>
                <PersonIcon fontSize="large" />
              </Avatar>
              
              <TextField
                fullWidth
                label="Your Name"
                value={username}
                onChange={e => setUsername(e.target.value)}
                sx={{ mb: 3 }}
                onKeyPress={e => e.key === 'Enter' && connect()}
              />
              
              <Button
                fullWidth
                variant="contained"
                size="large"
                onClick={connect}
                disabled={!username.trim()}
                sx={{
                  py: 1.5,
                  fontWeight: 600,
                  background: 'linear-gradient(45deg, #7c4dff 0%, #ff4081 100%)',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(124, 77, 255, 0.4)'
                  }
                }}
              >
                Join Now
              </Button>
              
              <Box sx={{ mt: 3, borderRadius: 2, overflow: 'hidden' }}>
                <video 
                  ref={localVideoref} 
                  autoPlay 
                  muted 
                  style={{
                    width: '100%',
                    borderRadius: 8,
                    transform: 'scaleX(-1)'
                  }}
                />
              </Box>
            </Paper>
          </Box>
        ) : (
          <Box sx={{ 
            display: 'flex', 
            height: '100%',
            position: 'relative'
          }}>
            {/* Main Video Area */}
            <Box sx={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Conference View */}
              <Box sx={{
                flex: 1,
                display: 'flex',
                flexWrap: 'wrap',
                justifyContent: 'center',
                alignItems: 'center',
                gap: 2,
                p: 2,
                overflow: 'auto'
              }}>
                {videos.length > 0 ? (
                  videos.map((video, index) => (
                    <Box key={video.socketId} sx={{
                      position: 'relative',
                      width: videos.length === 1 ? '90%' : '45%',
                      height: videos.length === 1 ? '90%' : '45%',
                      minWidth: 300,
                      borderRadius: 2,
                      overflow: 'hidden',
                      bgcolor: 'background.paper',
                      boxShadow: 3
                    }}>
                      <video
                        ref={ref => ref && video.stream && (ref.srcObject = video.stream)}
                        autoPlay
                        playsInline
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                      <Box sx={{
                        position: 'absolute',
                        bottom: 8,
                        left: 8,
                        bgcolor: 'rgba(0,0,0,0.5)',
                        px: 1,
                        py: 0.5,
                        borderRadius: 1
                      }}>
                        <Typography variant="caption" color="white">
                          {participants.find(p => p.socketId === video.socketId)?.username || 'Participant'}
                        </Typography>
                      </Box>
                    </Box>
                  ))
                ) : (
                  <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100%',
                    color: 'text.secondary'
                  }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Waiting for others to join...
                    </Typography>
                    <Typography variant="body2">
                      Share the meeting link with others
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Local Video Preview */}
              <Box sx={{
                position: 'absolute',
                bottom: 80,
                right: 20,
                width: 180,
                height: 120,
                borderRadius: 2,
                overflow: 'hidden',
                bgcolor: 'background.paper',
                boxShadow: 6,
                zIndex: 10,
                border: '2px solid',
                borderColor: 'primary.main'
              }}>
                {video ? (
                  <video
                    ref={localVideoref}
                    autoPlay
                    muted
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      transform: 'scaleX(-1)'
                    }}
                  />
                ) : (
                  <Box sx={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: 'background.paper'
                  }}>
                    <PersonIcon fontSize="large" />
                  </Box>
                )}
                {!audio && (
                  <Box sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    bgcolor: 'rgba(0,0,0,0.7)',
                    borderRadius: '50%',
                    p: 0.5
                  }}>
                    <MicOffIcon fontSize="small" sx={{ color: 'white' }} />
                  </Box>
                )}
              </Box>

              {/* Controls */}
              <Box sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'center',
                py: 2,
                bgcolor: 'rgba(0,0,0,0.3)',
                backdropFilter: 'blur(10px)'
              }}>
                <Tooltip title={video ? 'Turn off camera' : 'Turn on camera'} TransitionComponent={Zoom}>
                  <IconButton 
                    onClick={handleVideo} 
                    sx={{ 
                      mx: 1,
                      bgcolor: video ? 'primary.main' : 'error.main',
                      '&:hover': { bgcolor: video ? 'primary.dark' : 'error.dark' }
                    }}
                  >
                    {video ? (
                      <VideocamIcon sx={{ color: 'white' }} />
                    ) : (
                      <VideocamOffIcon sx={{ color: 'white' }} />
                    )}
                  </IconButton>
                </Tooltip>

                <Tooltip title={audio ? 'Mute microphone' : 'Unmute microphone'} TransitionComponent={Zoom}>
                  <IconButton 
                    onClick={handleAudio} 
                    sx={{ 
                      mx: 1,
                      bgcolor: audio ? 'primary.main' : 'error.main',
                      '&:hover': { bgcolor: audio ? 'primary.dark' : 'error.dark' }
                    }}
                  >
                    {audio ? (
                      <MicIcon sx={{ color: 'white' }} />
                    ) : (
                      <MicOffIcon sx={{ color: 'white' }} />
                    )}
                  </IconButton>
                </Tooltip>

                <Tooltip title="End call" TransitionComponent={Zoom}>
                  <IconButton 
                    onClick={handleEndCall} 
                    sx={{ 
                      mx: 1,
                      bgcolor: 'error.main',
                      '&:hover': { bgcolor: 'error.dark' }
                    }}
                  >
                    <CallEndIcon sx={{ color: 'white' }} />
                  </IconButton>
                </Tooltip>

                {screenAvailable && (
                  <Tooltip title={screen ? 'Stop sharing' : 'Share screen'} TransitionComponent={Zoom}>
                    <IconButton 
                      onClick={handleScreen} 
                      sx={{ 
                        mx: 1,
                        bgcolor: screen ? 'primary.main' : 'background.paper',
                        '&:hover': { bgcolor: screen ? 'primary.dark' : 'background.default' }
                      }}
                    >
                      {screen ? (
                        <ScreenShareIcon sx={{ color: screen ? 'white' : 'text.primary' }} />
                      ) : (
                        <StopScreenShareIcon sx={{ color: 'text.primary' }} />
                      )}
                    </IconButton>
                  </Tooltip>
                )}

                <Tooltip title="Chat" TransitionComponent={Zoom}>
                  <Badge badgeContent={newMessages} color="error" overlap="circular">
                    <IconButton 
                      onClick={toggleChat} 
                      sx={{ 
                        mx: 1,
                        bgcolor: showChat ? 'primary.main' : 'background.paper',
                        '&:hover': { bgcolor: showChat ? 'primary.dark' : 'background.default' }
                      }}
                    >
                      <ChatIcon sx={{ color: showChat ? 'white' : 'text.primary' }} />
                    </IconButton>
                  </Badge>
                </Tooltip>
              </Box>
            </Box>

            {/* Chat Panel */}
            <Dialog
              open={showChat}
              onClose={toggleChat}
              maxWidth="sm"
              fullWidth
              PaperProps={{
                sx: {
                  position: 'absolute',
                  right: 16,
                  bottom: 80,
                  height: '60%',
                  maxHeight: 'calc(100% - 160px)',
                  m: 0,
                  borderRadius: 2
                }
              }}
              BackdropProps={{
                style: { backgroundColor: 'transparent' }
              }}
            >
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                height: '100%',
                bgcolor: 'background.paper'
              }}>
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 2,
                  borderBottom: '1px solid',
                  borderColor: 'divider'
                }}>
                  <Typography variant="h6">Chat</Typography>
                  <IconButton onClick={toggleChat}>
                    <CloseIcon />
                  </IconButton>
                </Box>

                <Box ref={chatContainerRef} sx={{
                  flex: 1,
                  overflow: 'auto',
                  p: 2
                }}>
                  {messages.length > 0 ? (
                    <List>
                      {messages.map((msg, index) => (
                        <ListItem key={index} alignItems="flex-start" sx={{
                          px: 0,
                          py: 1
                        }}>
                          <ListItemAvatar sx={{ minWidth: 40 }}>
                            <Avatar sx={{ 
                              width: 32, 
                              height: 32,
                              bgcolor: msg.sender === username ? 'primary.main' : 'secondary.main'
                            }}>
                              {msg.sender.charAt(0).toUpperCase()}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={msg.sender}
                            primaryTypographyProps={{
                              fontWeight: 600,
                              color: msg.sender === username ? 'primary.main' : 'text.primary'
                            }}
                            secondary={msg.data}
                            secondaryTypographyProps={{ color: 'text.secondary' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Box sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      color: 'text.secondary'
                    }}>
                      <ChatIcon fontSize="large" sx={{ mb: 1 }} />
                      <Typography>No messages yet</Typography>
                    </Box>
                  )}
                </Box>

                <Box sx={{
                  p: 2,
                  borderTop: '1px solid',
                  borderColor: 'divider'
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TextField
                      fullWidth
                      variant="outlined"
                      placeholder="Type a message..."
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      sx={{ mr: 1 }}
                    />
                    <IconButton 
                      onClick={sendMessage}
                      disabled={!message.trim()}
                      color="primary"
                    >
                      <SendIcon />
                    </IconButton>
                  </Box>
                </Box>
              </Box>
            </Dialog>
          </Box>
        )}
      </Box>
    </ThemeProvider>
  );
}