import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("React Error Boundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: "20px", 
          textAlign: "center", 
          fontFamily: "system-ui",
          backgroundColor: "#1a1a1a",
          color: "#fff",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center"
        }}>
          <h1 style={{ color: "#ef4444" }}>Something went wrong</h1>
          <p style={{ marginTop: "10px", color: "#9ca3af" }}>
            {this.state.error?.message || "Unknown error"}
          </p>
          <pre style={{ 
            marginTop: "20px", 
            padding: "15px", 
            backgroundColor: "#262626",
            borderRadius: "8px",
            overflow: "auto",
            maxWidth: "90%",
            textAlign: "left",
            fontSize: "12px"
          }}>
            {this.state.error?.stack}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            style={{
              marginTop: "20px",
              padding: "10px 20px",
              backgroundColor: "#6366f1",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "16px"
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Global error handler
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
});

try {
  const root = document.getElementById("root");
  if (!root) {
    throw new Error("Root element not found");
  }
  createRoot(root).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
} catch (error) {
  console.error("Failed to initialize app:", error);
  document.body.innerHTML = `
    <div style="padding: 20px; text-align: center; font-family: system-ui;">
      <h1 style="color: red;">Failed to initialize app</h1>
      <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
    </div>
  `;
}
