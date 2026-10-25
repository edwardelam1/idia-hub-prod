import { useEffect, useState } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFadeOut(true);
      setTimeout(onComplete, 500); // Additional 500ms for fade out animation
    }, 3000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  // Paint the page itself purple so the browser's top/bottom bars match the splash.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.backgroundColor;
    const prevBody = body.style.backgroundColor;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const created = !meta;
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    const prevTheme = meta.content;
    html.style.backgroundColor = "#581c87";
    body.style.backgroundColor = "#581c87";
    meta.content = "#581c87";
    return () => {
      html.style.backgroundColor = prevHtml;
      body.style.backgroundColor = prevBody;
      if (created) meta?.remove();
      else if (meta) meta.content = prevTheme;
    };
  }, []);

  return (
    <div
      className={`fixed inset-0 z-50 flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 transition-opacity duration-500 ${fadeOut ? "opacity-0" : "opacity-100"}`}
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="text-center">
        <div className="mb-8 flex justify-center">
          <img src="/images/hub-logo.png" alt="IDIA Hub Logo" className="w-32 h-32 animate-pulse" />
        </div>
        <h1 className="text-4xl font-bold text-white mb-4">The IDIA Hub</h1>
        <p className="text-xl text-purple-200 max-w-md mx-auto">
          Welcome to the Living Vault and Marketplace for the IDIA Protocol and the Verified Truth Economy
        </p>
        <div className="mt-8 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
