import "@/App.css";
import React, { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Lenis from "lenis";
import { Toaster } from "@/components/ui/sonner";
import { LanguageProvider } from "@/i18n";
import Landing from "@/pages/Landing";
import AuthPage from "@/pages/AuthPage";
import Legal from "@/pages/Legal";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    let raf;
    const loop = (time) => {
      lenis.raf(time);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);
  return null;
}

function App() {
  return (
    <div className="App">
      <LanguageProvider>
        <BrowserRouter>
          <SmoothScroll />
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/signup" element={<AuthPage mode="signup" />} />
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/privacy" element={<Legal type="privacy" />} />
            <Route path="/termini" element={<Legal type="termini" />} />
            <Route path="/cookie" element={<Legal type="cookie" />} />
          </Routes>
          <Toaster position="bottom-right" theme="dark" />
        </BrowserRouter>
      </LanguageProvider>
    </div>
  );
}

export default App;
