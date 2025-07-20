// // let IS_PROD = true;
// const server  =  "http://localhost:8000";

// export default server;




// environment.js

// Toggle this to `true` for production (Render), `false` for local development
const IS_PROD = true;

const server = IS_PROD
  ? "https://visioncast-rishi.onrender.com"   // Render deployment URL
  : "http://localhost:8000";                  // Localhost for dev

export default server;
