/** @type {import('next').NextConfig} */
const nextConfig = {
  // O indicador de desenvolvimento ocupava a ação "Voltar" no canto inferior do mobile.
  devIndicators: false,
  allowedDevOrigins: ["192.168.15.5","192.168.15.11", "192.168.15.10","192.168.15.7","192.168.15.8", "192.168.15.4", "192.168.15.6","192.168.15.3","192.168.15.2","localhost"],
};

export default nextConfig;
