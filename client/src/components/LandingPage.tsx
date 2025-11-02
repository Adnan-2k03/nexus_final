import { useState } from "react";
import { Gamepad2, Zap, Users, Trophy, Shield, Menu, X } from "lucide-react";

interface LandingPageProps {
  onLogin: () => void;
}

export function LandingPage({ onLogin }: LandingPageProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setMenuOpen(false);
    }
  };

  const games = [
    { name: "Apex Legends", type: "Battle Royale", icon: "https://cdn-icons-png.flaticon.com/32/854/854894.png" },
    { name: "Valorant", type: "Tactical FPS", icon: "https://cdn-icons-png.flaticon.com/32/5969/5969276.png" },
    { name: "Warzone", type: "Battle Royale", icon: "https://cdn-icons-png.flaticon.com/32/5968/5968267.png" },
    { name: "Fortnite", type: "Battle Royale", icon: "https://cdn-icons-png.flaticon.com/32/854/854902.png" },
    { name: "League of Legends", type: "MOBA", icon: "https://cdn-icons-png.flaticon.com/32/5969/5969300.png" },
    { name: "Dota 2", type: "MOBA", icon: "https://cdn-icons-png.flaticon.com/32/5968/5968853.png" },
    { name: "Overwatch 2", type: "Hero Shooter", icon: "https://cdn-icons-png.flaticon.com/32/854/854888.png" },
    { name: "Rainbow Six", type: "Tactical FPS", icon: "https://cdn-icons-png.flaticon.com/32/5968/5968882.png" }
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
            <a href="#why" onClick={() => scrollToSection('why')} data-testid="link-why">Why Us</a>
          </div>
          
          <button 
            className="signup-btn" 
            onClick={onLogin}
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
              onClick={onLogin}
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
          <div className="glow"></div>
          <Gamepad2 className="w-64 h-64 text-cyan-400 floating" />
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
            <p>Sign up with Google, set your games, skill level, and play style preferences.</p>
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
                <img src={game.icon} alt={game.name} />
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
            <Users className="w-full h-full text-cyan-400" />
          </div>
          <div className="match-beam"></div>
          <div className="neon-gamer">
            <Users className="w-full h-full text-purple-500" />
          </div>
        </div>

        <div className="match-stats">
          <div className="stat-item">
            <Zap className="stat-icon" />
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
          onClick={onLogin}
          data-testid="button-join-voice"
        >
          Join Voice & Launch
        </button>
        <a 
          href="#how" 
          className="demo-link"
          onClick={(e) => {
            e.preventDefault();
            scrollToSection('how');
          }}
          data-testid="link-how-matching-works"
        >
          See how matching works
        </a>
      </section>

      <section id="why" className="why-section nexus-container">
        <h2 className="text-center mb-12 text-5xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
          Why GameMatch?
        </h2>
        <div className="why-grid">
          <div className="why-card" data-testid="card-why-fast">
            <div className="why-icon">
              <Zap className="w-20 h-20 text-cyan-400" />
            </div>
            <h3>Lightning-Fast Matchmaking</h3>
            <p>AI instantly finds the best teammate and drops you into the action.</p>
          </div>
          <div className="why-card" data-testid="card-why-secure">
            <div className="why-icon">
              <Shield className="w-20 h-20 text-cyan-400" />
            </div>
            <h3>Verified & Secure Community</h3>
            <p>Strict bans, verified profiles, and end-to-end encrypted voice.</p>
          </div>
          <div className="why-card" data-testid="card-why-social">
            <div className="why-icon">
              <Users className="w-20 h-20 text-cyan-400" />
            </div>
            <h3>Built for Social Gaming</h3>
            <p>Connect with like-minded players and build lasting gaming friendships.</p>
          </div>
        </div>
      </section>

      <footer className="text-center py-8 text-gray-400 text-sm border-t border-gray-800">
        <p>&copy; 2025 GameMatch. Built for the gaming community.</p>
      </footer>
    </div>
  );
}
