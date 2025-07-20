import React, { useEffect, useRef, useState } from 'react';
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
  Paper,
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
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
};

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#7c4dff' },
    secondary: { main: '#ff4081' },
    background: { default: '#121212', paper: '#1e1e1e' },
  },
  shape: { borderRadius: 12 },
});

export default function VideoMeetComponent() {
  const socketRef = useRef();
  const socketIdRef = useRef();
  const localVideoref = useRef();
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

  useEffect(() => { getPermissions(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { getUserMedia(); }, [video, audio]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { getDisplayMedia(); }, [screen]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const getPermissions = async () => {
    try {
      const vp = await navigator.mediaDevices.getUserMedia({ video: true });
      setVideoAvailable(!!vp);
      const ap = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioAvailable(!!ap);
      setScreenAvailable(!!navigator.mediaDevices.getDisplayMedia);

      if (vp || ap) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: vp, audio: ap });
        window.localStream = stream;
        if (localVideoref.current) localVideoref.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Permissions error:", err);
    }
  };

  const getUserMedia = () => {
    if ((video && videoAvailable) || (audio && audioAvailable)) {
      navigator.mediaDevices.getUserMedia({ video, audio })
        .then(getUserMediaSuccess)
        .catch(console.error);
    } else {
      localVideoref.current?.srcObject?.getTracks()?.forEach(t => t.stop());
    }
  };

  const getUserMediaSuccess = (stream) => {
    window.localStream?.getTracks()?.forEach(t => t.stop());
    window.localStream = stream;
    localVideoref.current.srcObject = stream;

    Object.keys(connections).forEach(id => {
      if (id === socketIdRef.current) return;
      connections[id].addStream(stream);
      connections[id].createOffer().then(desc => {
        connections[id].setLocalDescription(desc).then(() => {
          socketRef.current.emit('signal', id, JSON.stringify({ sdp: desc }));
        });
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

  const getDisplayMedia = () => {
    if (screen && navigator.mediaDevices.getDisplayMedia) {
      navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
        .then(getDisplayMediaSuccess)
        .catch(console.error);
    }
  };

  const getDisplayMediaSuccess = (stream) => {
    window.localStream?.getTracks()?.forEach(t => t.stop());
    window.localStream = stream;
    localVideoref.current.srcObject = stream;

    Object.keys(connections).forEach(id => {
      if (id === socketIdRef.current) return;
      connections[id].addStream(stream);
      connections[id].createOffer().then(desc => {
        connections[id].setLocalDescription(desc).then(() => {
          socketRef.current.emit('signal', id, JSON.stringify({ sdp: desc }));
        });
      });
    });

    stream.getTracks().forEach(track => {
      track.onended = () => {
        setScreen(false);
        getUserMedia();
      };
    });
  };

  const handleStreamEnd = () => {
    localVideoref.current?.srcObject?.getTracks()?.forEach(t => t.stop());
    const bs = new MediaStream([black(), silence()]);
    window.localStream = bs;
    localVideoref.current.srcObject = bs;

    Object.keys(connections).forEach(id => {
      connections[id].addStream(bs);
      connections[id].createOffer().then(desc => {
        connections[id].setLocalDescription(desc).then(() => {
          socketRef.current.emit('signal', id, JSON.stringify({ sdp: desc }));
        });
      });
    });
  };

  const black = ({ width = 640, height = 480 } = {}) => {
    const canvas = Object.assign(document.createElement("canvas"), { width, height });
    canvas.getContext('2d').fillRect(0, 0, width, height);
    const stream = canvas.captureStream();
    return Object.assign(stream.getVideoTracks()[0], { enabled: false });
  };

  const silence = () => {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const dst = osc.connect(ctx.createMediaStreamDestination());
    osc.start();
    ctx.resume();
    return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
  };

  const handleVideo = () => setVideo(v => !v);
  const handleAudio = () => setAudio(a => !a);
  const handleScreen = () => setScreen(s => !s);
  const handleEndCall = () => {
    localVideoref.current?.srcObject?.getTracks()?.forEach(t => t.stop());
    window.location.href = "/";
  };

  const connect = () => {
    if (!username.trim()) return;
    setAskForUsername(false);
    getUserMedia();
    connectToSocketServer();
  };

  const toggleChat = () => {
    setShowChat(s => !s);
    if (!showChat) setNewMessages(0);
  };

  const addMessage = (data, sender, sid) => {
    setMessages(m => [...m, { sender, data }]);
    if (sid !== socketIdRef.current) setNewMessages(n => n + 1);
  };

  const sendMessage = () => {
    if (message.trim()) {
      socketRef.current.emit('chat-message', message.trim(), username);
      setMessage("");
    }
  };

  const handleKeyPress = (e) => e.key === 'Enter' && sendMessage();

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

  const gotMessageFromServer = (fromId, msg) => {
    const signal = JSON.parse(msg);
    if (fromId === socketIdRef.current) return;

    const conn = connections[fromId];
    if (signal.sdp) {
      conn.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
        if (signal.sdp.type === 'offer') {
          conn.createAnswer().then(desc => {
            conn.setLocalDescription(desc).then(() => {
              socketRef.current.emit('signal', fromId, JSON.stringify({ sdp: desc }));
            });
          });
        }
      });
    } else if (signal.ice) {
      conn.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(console.error);
    }
  };

  const handleUserLeft = (id) => {
    setVideos(v => v.filter(x => x.socketId !== id));
    setParticipants(p => p.filter(x => x.socketId !== id));
  };

  const handleUserJoined = (id, clients) => {
    setParticipants(p => [...p, { socketId: id, username: `User ${id.slice(0,5)}` }]);
    clients.forEach(cid => {
      connections[cid] = new RTCPeerConnection(peerConfigConnections);
      connections[cid].onicecandidate = e => {
        e.candidate && socketRef.current.emit('signal', cid, JSON.stringify({ ice: e.candidate }));
      };
      connections[cid].onaddstream = e => {
        setVideos(prev => {
          const idx = prev.findIndex(x => x.socketId === cid);
          if (idx > -1) {
            const copy = [...prev];
            copy[idx] = { ...copy[idx], stream: e.stream };
            return copy;
          }
          return [...prev, { socketId: cid, stream: e.stream }];
        });
      };
      window.localStream
        ? connections[cid].addStream(window.localStream)
        : connections[cid].addStream(new MediaStream([black(), silence()]));
    });

    if (id === socketIdRef.current) {
      Object.keys(connections).forEach(cid => {
        if (cid === id) return;
        connections[cid].addStream(window.localStream);
        connections[cid].createOffer().then(desc => {
          connections[cid].setLocalDescription(desc).then(() => {
            socketRef.current.emit('signal', cid, JSON.stringify({ sdp: desc }));
          });
        });
      });
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ height: '100vh', width: '100vw', overflow: 'hidden', backgroundColor: 'background.default', position: 'relative' }}>
        {askForUsername ? (
          <Box sx={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100%', background:'linear-gradient(135deg, #7c4dff30 0%, #ff408130 100%)' }}>
            <Paper elevation={10} sx={{ p:4, maxWidth:400, mx:'auto', backgroundColor:'background.paper' }}>
              <Typography variant="h4" sx={{ fontWeight:600, mb:3 }}>Join Meeting</Typography>
              <Avatar sx={{ width:80, height:80, mx:'auto', mb:3, bgcolor:'primary.main' }}><PersonIcon fontSize="large" /></Avatar>
              <TextField fullWidth label="Your Name" value={username} onChange={e=>setUsername(e.target.value)} sx={{ mb:3 }} onKeyPress={handleKeyPress} />
              <Button fullWidth variant="contained" size="large" onClick={connect} disabled={!username.trim()} sx={{ py:1.5, fontWeight:600, background:'linear-gradient(45deg,#7c4dff 0%,#ff4081 100%)', '&:hover':{boxShadow:'0 4px 12px rgba(124,77,255,0.4)'} }}>Join Now</Button>
              <Box sx={{ mt:3, borderRadius:2, overflow:'hidden' }}><video ref={localVideoref} autoPlay muted style={{ width:'100%', borderRadius:8, transform:'scaleX(-1)' }} /></Box>
            </Paper>
          </Box>
        ) : (
          <Box sx={{ display:'flex', height:'100%', position:'relative' }}>
            <Box sx={{ flex:1, display:'flex', flexDirection:'column', position:'relative', overflow:'hidden' }}>
              <Box sx={{ flex:1, display:'flex', flexWrap:'wrap', justifyContent:'center', alignItems:'center', gap:2, p:2, overflow:'auto' }}>
                {videos.length > 0 ? videos.map(v => (
                  <Box key={v.socketId} sx={{ position:'relative', width:videos.length===1?'90%':'45%', height:videos.length===1?'90%':'45%', minWidth:300, borderRadius:2, overflow:'hidden', bgcolor:'background.paper', boxShadow:3 }}>
                    <video autoPlay playsInline ref={ref => ref && v.stream && (ref.srcObject = v.stream)} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    <Box sx={{ position:'absolute', bottom:8, left:8, bgcolor:'rgba(0,0,0,0.5)', px:1, py:0.5, borderRadius:1 }}>
                      <Typography variant="caption" color="white">{participants.find(p => p.socketId===v.socketId)?.username || 'Participant'}</Typography>
                    </Box>
                  </Box>
                )) : (
                  <Box sx={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', color:'text.secondary' }}>
                    <Typography variant="h6" sx={{ mb:2 }}>Waiting for others to join...</Typography>
                    <Typography variant="body2">Share the meeting link with others</Typography>
                  </Box>
                )}
              </Box>

              <Box sx={{ position:'absolute', bottom:80, right:20, width:180, height:120, borderRadius:2, overflow:'hidden', bgcolor:'background.paper', boxShadow:6, zIndex:10, border:`2px solid`, borderColor:'primary.main' }}>
                {video ? (
                  <video ref={localVideoref} autoPlay muted style={{ width:'100%', height:'100%', objectFit:'cover', transform:'scaleX(-1)' }} />
                ) : (
                  <Box sx={{ display:'flex', alignItems:'center', justifyContent:'center', width:'100%', height:'100%', bgcolor:'background.paper' }}><PersonIcon fontSize="large"/></Box>
                )}
                {!audio && (
                  <Box sx={{ position:'absolute', top:8, right:8, bgcolor:'rgba(0,0,0,0.7)', borderRadius:'50%', p:0.5 }}><MicOffIcon fontSize="small" sx={{ color:'white' }}/></Box>
                )}
              </Box>

              <Box sx={{ position:'absolute', bottom:0, left:0, right:0, display:'flex', justifyContent:'center', py:2, bgcolor:'rgba(0,0,0,0.3)', backdropFilter:'blur(10px)' }}>
                {[{
                    icon: video ? <VideocamIcon /> : <VideocamOffIcon />,
                    onClick: handleVideo, title: video ? 'Turn off camera' : 'Turn on camera',
                    bg: video ? 'primary.main' : 'error.main'
                  },
                  {
                    icon: audio ? <MicIcon /> : <MicOffIcon />,
                    onClick: handleAudio, title: audio ? 'Mute microphone' : 'Unmute microphone',
                    bg: audio ? 'primary.main' : 'error.main'
                  },
                  {
                    icon: <CallEndIcon />, onClick: handleEndCall, title: "End call",
                    bg: 'error.main'
                  },
                  screenAvailable ? {
                    icon: screen ? <StopScreenShareIcon /> : <ScreenShareIcon />,
                    onClick: handleScreen, title: screen ? 'Stop sharing' : 'Share screen',
                    bg: screen ? 'primary.main' : 'background.paper'
                  } : null,
                  {
                    icon: <ChatIcon />, onClick: toggleChat, title: "Chat",
                    bg: showChat ? 'primary.main' : 'background.paper',
                    badge: newMessages
                  }
                ].filter(Boolean).map((btn, i) => (
                  <Tooltip key={i} title={btn.title} TransitionComponent={Zoom}>
                    <Badge badgeContent={btn.badge} color="error" overlap="circular">
                      <IconButton onClick={btn.onClick} sx={{ mx:1, bgcolor: btn.bg, '&:hover':{ bgcolor:btn.bg } }}>
                        {btn.icon}
                      </IconButton>
                    </Badge>
                  </Tooltip>
                ))}
              </Box>
            </Box>

            <Dialog open={showChat} onClose={toggleChat} maxWidth="sm" fullWidth PaperProps={{ sx:{ position:'absolute', right:16, bottom:80, height:'60%', maxHeight:'calc(100%-160px)', m:0, borderRadius:2 }}} BackdropProps={{ style:{backgroundColor:'transparent'} }}>
              <Box sx={{ display:'flex', flexDirection:'column', height:'100%', bgcolor:'background.paper' }}>
                <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', p:2, borderBottom:'1px solid', borderColor:'divider' }}>
                  <Typography variant="h6">Chat</Typography>
                  <IconButton onClick={toggleChat}><CloseIcon/></IconButton>
                </Box>
                <Box ref={chatContainerRef} sx={{ flex:1, overflow:'auto', p:2 }}>
                  {messages.length > 0 ? (
                    <List>
                      {messages.map((msg, idx) => (
                        <ListItem key={idx} alignItems="flex-start" sx={{ px:0, py:1 }}>
                          <ListItemAvatar sx={{ minWidth:40 }}>
                            <Avatar sx={{ width:32, height:32, bgcolor: msg.sender===username ? 'primary.main' : 'secondary.main' }}>
                              {msg.sender.charAt(0).toUpperCase()}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={msg.sender}
                            primaryTypographyProps={{ fontWeight:600, color: msg.sender===username ? 'primary.main' : 'text.primary' }}
                            secondary={msg.data}
                            secondaryTypographyProps={{ color:'text.secondary' }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Box sx={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', color:'text.secondary' }}>
                      <ChatIcon fontSize="large" sx={{ mb:1 }}/>
                      <Typography>No messages yet</Typography>
                    </Box>
                  )}
                </Box>
                <Box sx={{ p:2, borderTop:'1px solid', borderColor:'divider' }}>
                  <Box sx={{ display:'flex', alignItems:'center' }}>
                    <TextField fullWidth placeholder="Type a message…" value={message} onChange={e=>setMessage(e.target.value)} onKeyPress={handleKeyPress} sx={{ mr:1 }} />
                    <IconButton onClick={sendMessage} disabled={!message.trim()} color="primary"><SendIcon/></IconButton>
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
