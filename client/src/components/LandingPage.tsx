import { useState } from "react";
import { Gamepad2, Zap, Users, Trophy, Shield, Menu, X, Target, Clock, MessageSquare } from "lucide-react";
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
    { name: "Warzone", type: "Battle Royale" },
    { name: "Fortnite", type: "Battle Royale" },
    { name: "League of Legends", type: "MOBA" },
    { name: "Dota 2", type: "MOBA" }
  ];

  return (
    <div className="nexus-landing">
      <nav className="nexus-nav">
        <div className="nexus-container nav-container">
          <div className="logo">
            <Gamepad2 className="w-8 h-8 text-cyan-400" />
            <span className="font-bold text-xl">GameMatch</span>
          </div>
          
          <button 
            className={`hamburger ${menuOpen ? 'active' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            data-testid="button-menu-toggle"
          >
            {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          
          <div className={`nav-links ${menuOpen ? 'active' : ''}`}>
            <a href="#how" onClick={() => scrollToSection('how')} data-testid="link-how-it-works">How It Works</a>
            <a href="#games" onClick={() => scrollToSection('games')} data-testid="link-games">Games</a>
            <a href="#community" onClick={() => scrollToSection('community')} data-testid="link-community">Community</a>
            <a href="#about" onClick={() => scrollToSection('about')} data-testid="link-about">About</a>
          </div>
          
          <button 
            className="signup-btn" 
            onClick={onShowAuth}
            data-testid="button-signup-nav"
          >
            Sign Up Free
          </button>
        </div>
      </nav>

      <section className="hero nexus-container">
        <div className="hero-content">
          <h1>
            GameMatch <span className="text-cyan-400">— Connect. Play. Win.</span>
          </h1>
          <p>A next-generation social gaming matchmaking platform built for gamers who want to connect instantly, team up seamlessly, and dominate together.</p>
          <div className="btn-group">
            <button 
              className="btn btn-primary" 
              onClick={onShowAuth}
              data-testid="button-find-match"
            >
              Find a Match
            </button>
            <button 
              className="btn btn-outline"
              data-testid="button-watch-demo"
            >
              Watch Demo
            </button>
          </div>
        </div>
        <div className="hero-image">
          <div className="hero-image-glow"></div>
          <img src={heroImage} alt="Gaming Arena" className="hero-img" />
        </div>
      </section>

      <div 
        className="scroll-indicator" 
        onClick={() => scrollToSection('how')}
        data-testid="button-scroll-indicator"
      >
        <span className="text-2xl">↓</span>
        <span className="ml-2">EXPLORE MORE</span>
      </div>

      <section id="how" className="features nexus-container">
        <h2>How It Works</h2>
        <div className="feature-grid">
          <div className="card" data-testid="card-step-1">
            <h3>1. Create Profile</h3>
            <p>Sign up quickly, set your games, skill level, and play style preferences.</p>
          </div>
          <div className="card" data-testid="card-step-2">
            <h3>2. Match Instantly</h3>
            <p>Our AI finds compatible teammates in under 10 seconds using behavior and skill data.</p>
          </div>
          <div className="card" data-testid="card-step-3">
            <h3>3. Jump In-Game</h3>
            <p>Auto-join voice chat, get party invites, and launch directly into the action.</p>
          </div>
        </div>
      </section>

      <section id="games" className="games-section">
        <div className="nexus-container">
          <h2>Supported Games</h2>
          <p>Deep integration with the hottest multiplayer titles — seamless matchmaking, voice sync, and cross-play.</p>
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

        <div className="match-stats">
          <div className="stat-item">
            <Clock className="stat-icon" />
            <div>
              <div className="stat-label">Avg Match Time</div>
              <div className="stat-value">8s</div>
            </div>
          </div>
          <div className="stat-item">
            <Trophy className="stat-icon" />
            <div>
              <div className="stat-label">Win Rate Boost</div>
              <div className="stat-value">+23%</div>
            </div>
          </div>
          <div className="stat-item">
            <Users className="stat-icon" />
            <div>
              <div className="stat-label">Active Players</div>
              <div className="stat-value">50K+</div>
            </div>
          </div>
        </div>

        <h1 className="match-title">MATCH FOUND!</h1>
        <p className="match-subtitle">Your duo is ready — lock in and dominate.</p>
        <button 
          className="btn-large" 
          onClick={onShowAuth}
          data-testid="button-join-voice"
        >
          Join Voice & Launch
        </button>
      </section>

      <section className="why-section nexus-container">
        <h2 className="text-center mb-12 text-5xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
          Why GameMatch?
        </h2>
        <div className="why-grid">
          <div className="why-card" data-testid="card-why-fast">
            <div className="why-icon">
              <Zap className="w-20 h-20 text-cyan-400" />
            </div>
            <h3>Lightning-Fast Matchmaking</h3>
            <p>AI instantly finds the best teammates and drops you into the action in under 10 seconds.</p>
          </div>
          <div className="why-card" data-testid="card-why-secure">
            <div className="why-icon">
              <Shield className="w-20 h-20 text-cyan-400" />
            </div>
            <h3>Verified & Secure Community</h3>
            <p>Christian bans, verified profiles, and end-to-end encrypted voice.</p>
          </div>
          <div className="why-card" data-testid="card-why-precision">
            <div className="why-icon">
              <Target className="w-20 h-20 text-cyan-400" />
            </div>
            <h3>Smart, Precision Filters</h3>
            <p>Find enemies that match exactly what you need—rank, language, and region.</p>
          </div>
          <div className="why-card" data-testid="card-why-platform">
            <div className="why-icon">
              <MessageSquare className="w-20 h-20 text-cyan-400" />
            </div>
            <h3>Cross-Platform Sync</h3>
            <p>Play with friends on PC, console, or mobile — seamlessly.</p>
          </div>
          <div className="why-card" data-testid="card-why-toxicity">
            <div className="why-icon">
              <Shield className="w-20 h-20 text-purple-500" />
            </div>
            <h3>Zero Toxicity</h3>
            <p>AI moderation + community reporting keeps chats clean.</p>
          </div>
        </div>
      </section>

      <section id="about" className="about-section">
        <div className="nexus-container">
          <div className="about-grid">
            <div className="about-image">
              <img src={aboutImage} alt="Build Your Legacy" />
            </div>
            <div className="about-content">
              <h2>About GameMatch</h2>
              <p>We believe gaming is better together. Founded in 2025 by competitive gamers and engineers, GameMatch eliminates the frustration of solo queue and toxic lobbies.</p>
              <p className="mt-4">Our mission is to create meaningful connections through shared victories — whether you're climbing ranks or just having fun with friends.</p>
              <ul className="mt-6 space-y-2">
                <li>✓ AI-powered compatibility matching</li>
                <li>✓ Zero-to-match in under 10 seconds</li>
                <li>✓ Cross-platform voice & party sync</li>
                <li>✓ Family-safe mode with content filters</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="support-section">
        <div className="nexus-container">
          <div className="support-grid">
            <div className="support-content">
              <h2>Support & Help Center</h2>
              <p className="mb-6">Need help? We're here 24/7.</p>
              <div className="faq-list">
                <h3 className="text-cyan-400 mb-4">Frequently Asked Questions</h3>
                <div className="faq-item">
                  <strong>How do I report a player?</strong> Use the in-app report button after a match.
                </div>
                <div className="faq-item">
                  <strong>Is voice chat encrypted?</strong> Yes, end-to-end encrypted via WebRTC.
                </div>
                <div className="faq-item">
                  <strong>Can I use it on mobile?</strong> Full app coming Q1 2026 — web works on all devices now.
                </div>
              </div>
              <p className="mt-6">Email us at <a href="mailto:support@gamematch.app" className="text-cyan-400">support@gamematch.app</a></p>
            </div>
            <div className="support-image">
              <img src={supportImage} alt="Forge Your Esports Legacy" />
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
        <p>&copy; 2025 GameMatch. Built for the gaming community.</p>
      </footer>
    </div>
  );
}
