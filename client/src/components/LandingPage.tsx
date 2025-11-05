import { useState } from "react";
import { Gamepad2, Menu, X } from "lucide-react";
import heroImage from "@assets/Gemini_Generated_Image_rl0g6nrl0g6nrl0g_1762075477562.png";
import leftWarrior from "@assets/left_1762075484949.jpg";
import rightWarrior from "@assets/right_1762075491469.jpg";
import aboutImage from "@assets/abt_1762075393318.webp";
import supportImage from "@assets/sup_1762075536689.webp";

interface LandingPageProps {
  onShowAuth: () => void;
}

export function LandingPage({ onShowAuth }: LandingPageProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setMenuOpen(false);
    }
  };

  const games = [
    { name: "Apex Legends", type: "Battle Royale" },
    { name: "Valorant", type: "Tactical FPS" },
    { name: "League of Legends", type: "MOBA" },
    { name: "Fortnite", type: "Battle Royale" },
    { name: "Overwatch 2", type: "Hero Shooter" },
    { name: "Rainbow Six", type: "Tactical FPS" }
  ];

  return (
    <div className="nexus-landing">
      <nav className="nexus-nav">
        <div className="nexus-container nav-container">
          <div className="logo">
            <span className="text-cyan-400 font-bold text-2xl">N</span>
            <span className="font-bold text-xl ml-1">Nexus Match</span>
          </div>
          
          <button 
            className={`hamburger ${menuOpen ? 'active' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            data-testid="button-menu-toggle"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          
          <div className={`nav-links ${menuOpen ? 'active' : ''}`}>
            <a href="#how" onClick={() => scrollToSection('how')} data-testid="link-features">Features</a>
            <a href="#games" onClick={() => scrollToSection('games')} data-testid="link-games">Games</a>
            <a href="#community" onClick={() => scrollToSection('community')} data-testid="link-community">Community</a>
            <a href="#support" onClick={() => scrollToSection('support')} data-testid="link-support">Support</a>
            <a href="#about" onClick={() => scrollToSection('about')} data-testid="link-about">About</a>
          </div>
          
          <button 
            className="signup-btn" 
            onClick={onShowAuth}
            data-testid="button-signup-nav"
          >
            Join Now
          </button>
        </div>
      </nav>

      <section className="hero nexus-container">
        <div className="hero-content">
          <h1>
            Nexus Match <span className="text-cyan-400">— Find Your Perfect Gaming Partner</span>
          </h1>
          <p>The ultimate platform for instant matchmaking, real-time voice channels, and gamer networking. Connect by skill, game, and playstyle — in seconds.</p>
          <div className="btn-group">
            <button 
              className="btn btn-primary" 
              onClick={onShowAuth}
              data-testid="button-find-players"
            >
              Find Players
            </button>
            <button 
              className="btn btn-outline"
              onClick={() => scrollToSection('how')}
              data-testid="button-explore-features"
            >
              Explore Features
            </button>
          </div>
        </div>
        <div className="hero-image">
          <div className="hero-image-glow"></div>
          <img src={heroImage} alt="Hero Gamer" className="hero-img" />
        </div>
      </section>

      <div 
        className="scroll-indicator" 
        onClick={() => scrollToSection('how')}
        data-testid="button-scroll-indicator"
      >
        <span className="text-2xl">↓</span>
        <span className="ml-2">EXPLORE FEATURES</span>
      </div>

      <section id="how" className="features nexus-container">
        <h2>Core Features</h2>
        <div className="feature-grid">
          <div className="card" data-testid="card-feature-1">
            <h3 className="text-cyan-400">1. Authentication & Profiles</h3>
            <p>Jump in using Google, Discord, or a custom gamertag-only login. Shape your profile with stats, favorite games, and playstyle preferences — your gaming identity, redefined.</p>
          </div>
          <div className="card" data-testid="card-feature-2">
            <h3 className="text-cyan-400">2. Smart Search & Discovery</h3>
            <p>Find your ideal teammates faster than ever. Filter by skill, playstyle, language, or vibe — and instantly discover players who share your energy, not just your rank.</p>
          </div>
          <div className="card" data-testid="card-feature-3">
            <h3 className="text-cyan-400">3. Game Portfolios</h3>
            <p>Turn your gaming journey into a visual showcase. Highlight your top clips, tournament wins, or creative achievements with stylish, customizable game cards.</p>
          </div>
          <div className="card" data-testid="card-feature-4">
            <h3 className="text-cyan-400">4. Real-Time Chat & Voice</h3>
            <p>Talk, plan, or just vibe with teammates through lightning-fast voice and chat channels. Powered by 100ms — optimized for low latency, zero lag, and crystal-clear comms.</p>
          </div>
          <div className="card" data-testid="card-feature-5">
            <h3 className="text-cyan-400">5. Progressive Web App</h3>
            <p>Install Nexus Match directly on your desktop or phone. Experience native-speed performance, instant push notifications, and offline access — all in one lightweight PWA.</p>
          </div>
          <div className="card" data-testid="card-feature-6">
            <h3 className="text-cyan-400">6. Advanced Search Filters</h3>
            <p>Drill down to the perfect squad. Filter by distance, rank, gender, game mode, or even microphone preference — because the best teams start with the right chemistry.</p>
          </div>
        </div>
      </section>

      <section id="games" className="games-section">
        <div className="nexus-container">
          <h2>Supported Games</h2>
          <p>Connect instantly across major multiplayer titles. Whether you're a casual or competitive gamer, Nexus Match helps you find your squad fast.</p>
          <div className="games-grid">
            {games.map((game) => (
              <div 
                key={game.name} 
                className="game-card"
                data-testid={`card-game-${game.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <h4>{game.name}</h4>
                <p>{game.type}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="community" className="hero-match">
        <div className="match-bg"></div>

        <div className="match-players">
          <div className="neon-gamer">
            <img src={leftWarrior} alt="Player 1" className="warrior-img" />
          </div>
          <div className="match-beam"></div>
          <div className="neon-gamer">
            <img src={rightWarrior} alt="Player 2" className="warrior-img" />
          </div>
        </div>

        <h1 className="match-title">Join the Nexus Community</h1>
        <p className="match-subtitle">Meet gamers who share your passion. Discover friends, connect directly, and share your gaming journey through voice, chat, and portfolios.</p>
        
        <div className="community-features" style={{ maxWidth: '1000px', margin: '3rem auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
          <div className="card" data-testid="card-community-interests">
            <h3 className="text-cyan-400">Mutual Interests</h3>
            <p>Find players who share your hobbies — music, anime, art, books, and more — all visible through customizable profiles.</p>
          </div>
          <div className="card" data-testid="card-community-connections">
            <h3 className="text-cyan-400">Direct Connections</h3>
            <p>Send, accept, or decline friend requests. Manage connections easily and see shared games, ranks, and hobbies.</p>
          </div>
          <div className="card" data-testid="card-community-notifications">
            <h3 className="text-cyan-400">Notifications & Updates</h3>
            <p>Stay in the loop with in-app and push notifications for matches, requests, and messages — in real-time via WebSocket.</p>
          </div>
        </div>

        <button 
          className="btn-large" 
          onClick={onShowAuth}
          data-testid="button-join-community"
        >
          Join the Community
        </button>
      </section>

      <section id="about" className="about-section">
        <div className="nexus-container">
          <div className="about-grid">
            <div className="about-image">
              <img src={aboutImage} alt="About Nexus Match" />
            </div>
            <div className="about-content">
              <h2>About Nexus Match</h2>
              <p>Nexus Match is built for gamers who want smarter, faster, and more meaningful multiplayer experiences. Powered by AI matchmaking and real-time communication, it's the bridge between casual and competitive players worldwide.</p>
              
              <div className="mt-8 space-y-6">
                <div>
                  <h3 className="text-cyan-400 text-xl mb-2">Our Mission</h3>
                  <p>To eliminate solo queue frustration by connecting gamers through compatibility — skill, attitude, and playstyle — not just rank.</p>
                </div>
                
                <div>
                  <h3 className="text-cyan-400 text-xl mb-2">Our Technology</h3>
                  <p>Backed by PostgreSQL, WebSockets, Cloudflare R2, and a PWA architecture, Nexus Match delivers instant updates and seamless user experience.</p>
                </div>
                
                <div>
                  <h3 className="text-cyan-400 text-xl mb-2">Our Vision</h3>
                  <p>To redefine how players connect — not through random queues, but through shared purpose, respect, and teamwork.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="support" className="support-section">
        <div className="nexus-container">
          <div className="support-grid">
            <div className="support-content">
              <h2>Support & Help Center</h2>
              <p className="mb-6">Need assistance? We're here 24/7 to help you make the most of Nexus Match.</p>
              
              <div className="faq-list">
                <h3 className="text-cyan-400 mb-4 text-xl">FAQs</h3>
                <div className="faq-item">
                  <strong>How do I report a player?</strong> Use the in-app reporting tool available on every match and chat window.
                </div>
                <div className="faq-item">
                  <strong>Is my voice data secure?</strong> 100% — all voice channels are encrypted end-to-end via WebRTC.
                </div>
                <div className="faq-item">
                  <strong>Can I use it on mobile?</strong> Yes! Nexus Match works on all devices. Mobile apps launching in Q1 2026.
                </div>
              </div>
              
              <div className="mt-8">
                <h3 className="text-cyan-400 mb-4 text-xl">Contact Support</h3>
                <p>For technical help or bug reports, reach out to <a href="mailto:support@nexusmatch.gg" className="text-cyan-400 hover:underline">support@nexusmatch.gg</a></p>
              </div>
              
              <div className="mt-8">
                <h3 className="text-cyan-400 mb-4 text-xl">Future Updates</h3>
                <p>Mobile apps launching in Q1 2026 — stay tuned for push notifications, AI duo suggestions, and personalized stats dashboards.</p>
              </div>
            </div>
            <div className="support-image">
              <img src={supportImage} alt="Support" />
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="nexus-container text-center">
          <h2 className="text-5xl font-bold mb-4">Ready to Find Your Squad?</h2>
          <p className="text-xl text-gray-300 mb-8">Join thousands of gamers already winning together</p>
          <button 
            className="btn btn-primary btn-large" 
            onClick={onShowAuth}
            data-testid="button-cta-signup"
          >
            Sign Up Free Now
          </button>
        </div>
      </section>

      <footer className="text-center py-8 text-gray-400 text-sm border-t border-gray-800">
        <p>&copy; 2025 Nexus Match. Built for the gaming community.</p>
      </footer>
    </div>
  );
}
