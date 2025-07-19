import React, { useState } from 'react';
import "../App.css";
import { Link, useNavigate } from 'react-router-dom';
import { FaBars, FaTimes } from 'react-icons/fa';

export default function LandingPage() {
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <div className="landingPageContainer">
            <nav className="navbar">
                <div className="navHeader">
                    <h2>VisionCast <span className="highlight">Video Call</span></h2>
                </div>

                <div className={`navlist ${menuOpen ? 'open' : ''}`}>
                    <button onClick={() => navigate("/rishi08")}>Join as Guest</button>
                    <button onClick={() => navigate("/auth")}>Register</button>
                    <button onClick={() => navigate("/auth")}>Login</button>
                </div>

                <div className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
                    {menuOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
                </div>
            </nav>

            <div className="landingMainContainer">
                <div className="textContent">
                    <h1>
                        <span className="connectText">Connect</span> with your loved ones
                    </h1>
                    <p className="subText">Bridge the distance with <span className="brand">VisionCast Video Call</span> <br /> <br /><span className="brand">Developed ❤️ by Rishi Shinde
</span> </p>
                     
                    <div className="getStartedBtn">
                        <Link to="/auth">Get Started</Link>
                    </div>
                </div>

                <div className="imageContent">
                    <img src="/mobile.png" alt="Mobile UI Illustration" />
                </div>
            </div>
        </div>
    );
}
