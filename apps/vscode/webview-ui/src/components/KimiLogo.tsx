import { useExtensionImageUrl } from "./hooks/useExtensionImageUrl";

export function KimiLogo({ className }: { className?: string }) {
  const logoUrl = useExtensionImageUrl("echadron-icon-storefront.png");

  if (!logoUrl) {
    return null;
  }

  return <img src={logoUrl} alt="Echadron" className={className} aria-label="Echadron" />;
}
