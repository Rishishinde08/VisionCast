import React, { useContext, useState } from 'react';
import withAuth from '../utils/withAuth';
import { useNavigate } from 'react-router-dom';
import '../App.css';
import {
  Button,
  IconButton,
  TextField,
  useMediaQuery,
  useTheme,
  Typography,
  Box,
  Grid,
  Paper,
   Container
} from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import { AuthContext } from '../contexts/AuthContext';

function HomeComponent() {
  const navigate   = useNavigate();
  const [meetingCode, setMeetingCode] = useState('');
  const { addToUserHistory } = useContext(AuthContext);

  const theme    = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const handleJoinVideoCall = async () => {
    if (meetingCode.trim()) {
      await addToUserHistory(meetingCode);
      navigate(`/${meetingCode}`);
    }
  };

  return (
    <>
      {/* animatedBg div already exists in your layout – keep only one */}
      <div className="animatedBg">
        <div className="blob b1"></div>
        <div className="blob b2"></div>
        <div className="blob b3"></div>
      </div>

      {/* ─── Navbar ───────────────────────────────────────────── */}
      <Box className="navBarGlass" px={3} py={1.5} display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" component="div" fontWeight={600}>
          VisionCast <span className="brandOr">Video Call</span>
        </Typography>

        <Box display="flex" alignItems="center" gap={1.5}>
          <IconButton
            color="primary"
            sx={{ bgcolor: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(5px)' }}
            onClick={() => navigate('/history')}
          >
            <RestoreIcon />
          </IconButton>
          <Typography variant="body1" sx={{ display: { xs: 'none', sm: 'block' } }}>
            History
          </Typography>

          <Button variant="outlined" onClick={() => { localStorage.removeItem('token'); navigate('/auth'); }}>
            Logout
          </Button>
        </Box>
      </Box>

      {/* ─── Main Section ─────────────────────────────────────── */}
      <Container maxWidth="lg" sx={{ mt: 8 }}>
        <Paper elevation={3} className="homeCard">
          <Grid container>
            {/* Text / form side */}
            <Grid item xs={12} md={6} sx={{ p: { xs: 3, md: 5 } }} display="flex" flexDirection="column" justifyContent="center">
              <Typography variant={isMobile ? 'h5' : 'h4'} fontWeight={600} gutterBottom>
                Providing quality video calls just like quality education
              </Typography>

              <Box mt={4} display="flex" flexDirection={isMobile ? 'column' : 'row'} gap={2}>
                <TextField
                  fullWidth
                  label="Meeting Code"
                  variant="outlined"
                  value={meetingCode}
                  onChange={e => setMeetingCode(e.target.value)}
                />
                <Button variant="contained" size="large" onClick={handleJoinVideoCall}>
                  Join
                </Button>
              </Box>
            </Grid>

            {/* Illustration side */}
            <Grid item xs={12} md={6} sx={{ p: 3 }} display="flex" justifyContent="center" alignItems="center">
              <Box component="img" src="/logo3.png" alt="Video Call Illustration"
                   sx={{ width: '100%', maxWidth: 420, transition: 'transform .5s' }}
                   className="hoverLift"
              />
            </Grid>
          </Grid>
        </Paper>
      </Container>
    </>
  );
}

export default withAuth(HomeComponent);
