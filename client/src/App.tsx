import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { BackgroundProvider, useBackground } from "@/components/BackgroundProvider";
import { LayoutProvider, useLayout } from "@/contexts/LayoutContext";
import { HMSProvider } from "@/contexts/HMSContext";
import { useState, useEffect } from "react";

// Hooks
import { useAuth } from "@/hooks/useAuth";
import { getApiUrl } from "@/lib/api";

// Components
import { LandingPage } from "@/components/LandingPage";
import { AuthPage } from "@/components/AuthPage";
import { GameNavigation } from "@/components/GameNavigation";
import { MatchFeed } from "@/components/MatchFeed";
import { CreateMatchForm } from "@/components/CreateMatchForm";
import { UserProfile } from "@/components/UserProfile";
import { ProfileSetup } from "@/components/ProfileSetup";
import { Connections } from "@/components/Connections";
import { Messages } from "@/components/Messages";
import { Discover } from "@/components/Discover";
import { Settings } from "@/components/Settings";
import { VoiceChannelsPage } from "@/pages/VoiceChannelsPage";
import { JoinChannelPage } from "@/pages/JoinChannelPage";
import NotFound from "@/pages/not-found";
import { StarBackground } from "@/components/StarBackground";
import { WebGLStarBackground } from "@/components/WebGLStarBackground";
import { PushNotificationPrompt } from "@/components/PushNotificationPrompt";
import { registerServiceWorker } from "@/registerSW";
import { initializeAdMob } from "@/lib/admob";
import { FloatingVoiceOverlay } from "@/components/FloatingVoiceOverlay";
import { subscribeToOverlayState } from "@/lib/voice-overlay-plugin";

// Types
import type { User } from "@shared/schema";

// Utility function to convert database User (with nulls) to component-compatible user (with undefined)
function mapUserForComponents(user: User) {
  return {
    id: user.id,
    gamertag: user.gamertag || "",
    firstName: user.firstName ?? undefined,
    lastName: user.lastName ?? undefined,
    profileImageUrl: user.profileImageUrl ?? undefined,
    bio: user.bio ?? undefined,
    location: user.location ?? undefined,
    latitude: user.latitude ?? undefined,
    longitude: user.longitude ?? undefined,
    age: user.age ?? undefined,
    preferredGames: user.preferredGames ?? undefined,
  };
}

function Router() {
  // Real authentication using useAuth hook
  const { user, isLoading, isFetching, isAuthenticated } = useAuth();
  const { getContainerClass } = useLayout();
  const [location, setLocation] = useLocation();

  // Helper to map URL to page name
  const getPageFromUrl = (url: string): "home" | "search" | "create" | "profile" | "messages" | "voice-channels" | "settings" | "profile-setup" | "connections" => {
    const urlToPage: { [key: string]: "home" | "search" | "profile" | "messages" | "voice-channels" | "settings" | "profile-setup" | "connections" } = {
      "/": "home",
      "/discover": "search",
      "/connections": "connections",
      "/messages": "messages",
      "/voice-channels": "voice-channels",
      "/profile": "profile",
      "/settings": "settings",
      "/profile-setup": "profile-setup",
    };
    return urlToPage[url] || "home";
  };

  // ALL hooks must be called before any early returns
  // Initialize currentPage based on the current URL location
  const [currentPage, setCurrentPage] = useState<
    | "home"
    | "search"
    | "create"
    | "profile"
    | "messages"
    | "voice-channels"
    | "settings"
    | "profile-setup"
    | "connections"
  >(() => getPageFromUrl(location));
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAuthPage, setShowAuthPage] = useState(false);

  // Helper function to map page names to URLs and navigate
  const handleNavigation = (page: string) => {
    const pageToUrl: { [key: string]: string } = {
      "home": "/",
      "search": "/discover",
      "connections": "/connections",
      "messages": "/messages",
      "voice-channels": "/voice-channels",
      "profile": "/profile",
      "settings": "/settings",
      "profile-setup": "/profile-setup",
    };

    // Pages with dedicated routes - navigate to URL
    if (pageToUrl[page]) {
      const url = pageToUrl[page];
      if (location !== url) {
        setLocation(url);
      }
    }
    
    // Always update state
    setCurrentPage(page as any);
    setShowCreateForm(false);
  };

  // Sync currentPage state with URL location changes
  useEffect(() => {
    const pageFromUrl = getPageFromUrl(location);
    if (pageFromUrl !== currentPage) {
      setCurrentPage(pageFromUrl);
    }
  }, [location, currentPage]);

  // Auto-redirect authenticated users without gamertag to profile setup
  useEffect(() => {
    if (
      isAuthenticated &&
      user &&
      !user.gamertag &&
      currentPage !== "profile-setup"
    ) {
      setLocation("/profile-setup");
    }
  }, [isAuthenticated, user, currentPage]);

  // Show loading while authentication is being checked or refetched - MUST come after ALL hooks
  if (isLoading || (isFetching && !isAuthenticated)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const handleShowAuth = () => {
    setShowAuthPage(true);
  };

  const handleAuthSuccess = () => {
    // Invalidate auth query to refetch user data without page reload
    queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    setShowAuthPage(false);
    
    // Check if there's a pending invite code from pre-login attempt
    const pendingInviteCode = sessionStorage.getItem('pendingInviteCode');
    if (pendingInviteCode) {
      setLocation(`/join-channel/${pendingInviteCode}`);
    }
  };

  const handleBackToLanding = () => {
    setShowAuthPage(false);
  };

  const handleLogout = async () => {
    try {
      // Use fetch with getApiUrl to ensure it hits the backend, even in cross-origin deployments
      const response = await fetch(getApiUrl("/api/logout"), {
        method: "GET",
        credentials: "include",
      });
      
      // Redirect to home page after logout, whether successful or not
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
      // Even if logout fails, redirect to home
      window.location.href = "/";
    }
  };

  const handleCreateMatch = () => {
    setShowCreateForm(true);
  };

  const handleCancelCreate = () => {
    setShowCreateForm(false);
  };

  const handleSubmitMatch = async (data: any) => {
    try {
      const response = await fetch(getApiUrl("/api/match-requests"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to create match request");
      }

      const newMatch = await response.json();
      console.log("Match request created successfully:", newMatch);
      setShowCreateForm(false);

      // Optionally show success message to user
    } catch (error) {
      console.error("Error creating match request:", error);
      // TODO: Show error message to user
    }
  };

  const handleAcceptMatch = async (matchId: string, accepterId: string) => {
    try {
      // Create a match connection
      const response = await fetch(getApiUrl("/api/match-connections"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          requestId: matchId,
          accepterId: accepterId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to apply to match");
      }

      const connection = await response.json();
      console.log("Match application sent successfully:", connection);

      // Invalidate queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ["/api/match-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/connections"] });

      // The WebSocket will handle real-time updates
    } catch (error) {
      console.error("Error applying to match:", error);
      // TODO: Show error message to user
    }
  };

  const handleDeclineMatch = async (matchId: string) => {
    try {
      const response = await fetch(getApiUrl("/api/hidden-matches"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          matchRequestId: matchId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to hide match request");
      }

      console.log("Match request hidden successfully");

      // Refresh hidden matches list and match feed
      queryClient.invalidateQueries({ queryKey: ["/api/hidden-matches"] });
      queryClient.invalidateQueries({ queryKey: ["/api/match-requests"] });
    } catch (error) {
      console.error("Error hiding match request:", error);
      // TODO: Show error message to user
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    try {
      const response = await fetch(getApiUrl(`/api/match-requests/${matchId}`), {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete match request");
      }

      console.log("Match request deleted successfully");

      // Refresh match feed to remove the deleted request
      queryClient.invalidateQueries({ queryKey: ["/api/match-requests"] });
    } catch (error) {
      console.error("Error deleting match request:", error);
      // TODO: Show error message to user
    }
  };

  const renderMainContent = () => {
    if (showCreateForm) {
      return (
        <div className="md:ml-20 pt-16 md:pt-6 pb-16 md:pb-6 px-4">
          <CreateMatchForm
            onSubmit={handleSubmitMatch}
            onCancel={handleCancelCreate}
          />
        </div>
      );
    }

    switch (currentPage) {
      case "home":
        return (
          <div className="md:ml-20 pt-16 md:pt-6 pb-16 md:pb-6 px-4">
            <PushNotificationPrompt />
            <MatchFeed
              onCreateMatch={handleCreateMatch}
              onAcceptMatch={handleAcceptMatch}
              onDeclineMatch={handleDeclineMatch}
              onDeleteMatch={handleDeleteMatch}
              currentUserId={user?.id}
            />
          </div>
        );
      case "profile":
        return (
          <div className="md:ml-20 pt-16 md:pt-6 pb-16 md:pb-6 px-4">
            <div className={`${getContainerClass()} mx-auto`}>
              <h1 className="text-2xl font-bold text-foreground mb-6">
                My Profile
              </h1>
              {user && user.gamertag && (
                <UserProfile
                  {...mapUserForComponents(user)}
                  isOwn={true}
                  onEdit={() => handleNavigation("profile-setup")}
                />
              )}
              {user && !user.gamertag && (
                <div className="p-6 bg-card rounded-lg border">
                  <h3 className="font-semibold mb-2">Complete Your Profile</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    You need to set up your gamertag and profile to use the
                    matchmaking system.
                  </p>
                  <button
                    onClick={() => handleNavigation("profile-setup")}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
                    data-testid="button-setup-profile"
                  >
                    Setup Profile
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      case "connections":
        return (
          <div className="md:ml-20 pt-16 md:pt-6 pb-16 md:pb-6 px-4">
            <Connections currentUserId={user?.id} />
          </div>
        );
      case "search":
        return (
          <div className="md:ml-20 pt-16 md:pt-6 pb-16 md:pb-6 px-4">
            <Discover currentUserId={user?.id} />
          </div>
        );
      case "messages":
        return (
          <div className="md:ml-20 pt-16 md:pt-6 pb-16 md:pb-6 px-4">
            <Messages 
              currentUserId={user?.id}
              onNavigateToVoiceChannels={() => handleNavigation("voice-channels")}
            />
          </div>
        );
      case "voice-channels":
        return (
          <div className="md:ml-20 pt-16 md:pt-6 pb-16 md:pb-6 px-4">
            <VoiceChannelsPage currentUserId={user?.id} />
          </div>
        );
      case "settings":
        return (
          <div className="md:ml-20 pt-16 md:pt-6 pb-16 md:pb-6 px-4">
            <Settings user={user} />
          </div>
        );
      case "profile-setup":
        return (
          <div className="md:ml-20 pt-16 md:pt-6 pb-16 md:pb-6 px-4">
            <ProfileSetup
              user={user}
              onComplete={() => {
                handleNavigation("profile");
                // Trigger a refresh of user data
              }}
              onCancel={() => {
                handleNavigation(user?.gamertag ? "profile" : "home");
              }}
            />
          </div>
        );
      default:
        return (
          <div className="md:ml-20 pt-16 md:pt-6 pb-16 md:pb-6 px-4">
            <MatchFeed
              onCreateMatch={handleCreateMatch}
              onAcceptMatch={handleAcceptMatch}
              onDeclineMatch={handleDeclineMatch}
              onDeleteMatch={handleDeleteMatch}
              currentUserId={user?.id}
            />
          </div>
        );
    }
  };

  return (
    <Switch>
      {/* Public route for join-channel (works for everyone) */}
      <Route path="/join-channel/:inviteCode">
        {() => (
          <div className="min-h-screen relative">
            <JoinChannelPage />
          </div>
        )}
      </Route>
      
      {!isAuthenticated && !isLoading ? (
        <Route
          path="/"
          component={() => 
            showAuthPage ? (
              <AuthPage onAuthSuccess={handleAuthSuccess} />
            ) : (
              <LandingPage onShowAuth={handleShowAuth} />
            )
          }
        />
      ) : isAuthenticated ? (
        <>
          <Route path="/connections">
            {() => {
              if (currentPage !== "connections") {
                setCurrentPage("connections");
              }
              return (
                <div className="min-h-screen relative">
                  {user && user.gamertag && (
                    <GameNavigation
                      currentPage={currentPage}
                      onNavigate={handleNavigation}
                      user={mapUserForComponents(user)}
                      onLogout={handleLogout}
                    />
                  )}
                  <div className="relative z-10">
                    {renderMainContent()}
                  </div>
                </div>
              );
            }}
          </Route>
          <Route path="/voice-channels">
            {() => {
              if (currentPage !== "voice-channels") {
                setCurrentPage("voice-channels");
              }
              return (
                <div className="min-h-screen relative">
                  {user && user.gamertag && (
                    <GameNavigation
                      currentPage={currentPage}
                      onNavigate={handleNavigation}
                      user={mapUserForComponents(user)}
                      onLogout={handleLogout}
                    />
                  )}
                  <div className="relative z-10">
                    {renderMainContent()}
                  </div>
                </div>
              );
            }}
          </Route>
          <Route path="/messages">
            {() => {
              if (currentPage !== "messages") {
                setCurrentPage("messages");
              }
              return (
                <div className="min-h-screen relative">
                  {user && user.gamertag && (
                    <GameNavigation
                      currentPage={currentPage}
                      onNavigate={handleNavigation}
                      user={mapUserForComponents(user)}
                      onLogout={handleLogout}
                    />
                  )}
                  <div className="relative z-10">
                    {renderMainContent()}
                  </div>
                </div>
              );
            }}
          </Route>
          <Route path="/profile-setup">
            {() => {
              if (currentPage !== "profile-setup") {
                setCurrentPage("profile-setup");
              }
              return (
                <div className="min-h-screen relative">
                  <div className="relative z-10">
                    {renderMainContent()}
                  </div>
                </div>
              );
            }}
          </Route>
          <Route path="/discover">
            {() => {
              if (currentPage !== "search") {
                setCurrentPage("search");
              }
              return (
                <div className="min-h-screen relative">
                  {user && user.gamertag && (
                    <GameNavigation
                      currentPage={currentPage}
                      onNavigate={handleNavigation}
                      user={mapUserForComponents(user)}
                      onLogout={handleLogout}
                    />
                  )}
                  <div className="relative z-10">
                    {renderMainContent()}
                  </div>
                </div>
              );
            }}
          </Route>
          <Route path="/profile">
            {() => {
              if (currentPage !== "profile") {
                setCurrentPage("profile");
              }
              return (
                <div className="min-h-screen relative">
                  {user && user.gamertag && (
                    <GameNavigation
                      currentPage={currentPage}
                      onNavigate={handleNavigation}
                      user={mapUserForComponents(user)}
                      onLogout={handleLogout}
                    />
                  )}
                  <div className="relative z-10">
                    {renderMainContent()}
                  </div>
                </div>
              );
            }}
          </Route>
          <Route path="/settings">
            {() => {
              if (currentPage !== "settings") {
                setCurrentPage("settings");
              }
              return (
                <div className="min-h-screen relative">
                  {user && user.gamertag && (
                    <GameNavigation
                      currentPage={currentPage}
                      onNavigate={handleNavigation}
                      user={mapUserForComponents(user)}
                      onLogout={handleLogout}
                    />
                  )}
                  <div className="relative z-10">
                    {renderMainContent()}
                  </div>
                </div>
              );
            }}
          </Route>
          <Route path="/">
            {() => {
              if (currentPage !== "home") {
                setCurrentPage("home");
              }
              return (
                <div className="min-h-screen relative">
                  {user && user.gamertag && (
                    <GameNavigation
                      currentPage={currentPage}
                      onNavigate={handleNavigation}
                      user={mapUserForComponents(user)}
                      onLogout={handleLogout}
                    />
                  )}
                  <div className="relative z-10">
                    {renderMainContent()}
                  </div>
                </div>
              );
            }}
          </Route>
        </>
      ) : null}
      <Route component={NotFound} />
    </Switch>
  );
}

function BackgroundRenderer() {
  const { background } = useBackground();
  
  if (background === "webgl") {
    return <WebGLStarBackground />;
  }
  
  if (background === "solid") {
    return <div className="fixed inset-0 bg-background -z-10 pointer-events-none" />;
  }
  
  return <StarBackground />;
}

function App() {
  const [, setLocation] = useLocation();
  const [isOverlayVisible, setIsOverlayVisible] = useState(() => {
    return localStorage.getItem('voice-overlay-enabled') === 'true';
  });

  // Register service worker for PWA and push notifications
  useEffect(() => {
    registerServiceWorker();
    initializeAdMob();
  }, []);

  // Subscribe to overlay state changes
  useEffect(() => {
    const unsubscribe = subscribeToOverlayState((enabled) => {
      setIsOverlayVisible(enabled);
    });
    return unsubscribe;
  }, []);

  // Listen for navigation messages from service worker
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'NAVIGATE') {
        const { url } = event.data;
        setLocation(url);
      }
    };

    navigator.serviceWorker?.addEventListener('message', handleMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, [setLocation]);

  const handleCloseOverlay = async () => {
    const VoiceOverlay = (await import('@/lib/voice-overlay-plugin')).default;
    await VoiceOverlay.disableOverlay();
  };

  return (
    <QueryClientProvider client={queryClient}>
      <HMSProvider>
        <ThemeProvider defaultTheme="dark" storageKey="gamematch-ui-theme">
          <BackgroundProvider>
            <LayoutProvider>
              <TooltipProvider>
                {/* Background layer */}
                <BackgroundRenderer />

                {/* Foreground content */}
                <Router />
                <Toaster />
                
                {/* Floating voice overlay */}
                <FloatingVoiceOverlay
                  isVisible={isOverlayVisible}
                  onClose={handleCloseOverlay}
                />
              </TooltipProvider>
            </LayoutProvider>
          </BackgroundProvider>
        </ThemeProvider>
      </HMSProvider>
    </QueryClientProvider>
  );
}

export default App;
