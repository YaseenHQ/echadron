import { useState, useEffect } from "react";
import { useExtensionImageUrl } from "./hooks/useExtensionImageUrl";

export function EchadronMascot({ className }: { className?: string }) {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  const imageName = isDark ? "echadron-banner-dark.svg" : "echadron-banner-light.svg";
  const logoUrl = useExtensionImageUrl(imageName);

  if (!logoUrl) {
    return null;
  }

  return <img src={logoUrl} alt="Echadron" className={className} aria-label="Echadron" />;
}
