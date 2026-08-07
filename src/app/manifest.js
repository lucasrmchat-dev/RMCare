export default function manifest() {
  return {
    name: "RMAgenda",
    short_name: "RMAgenda",
    description: "Agendamento clínico simples, seguro e rápido.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#fafafa",
    orientation: "portrait-primary",
    icons: [{ src: "/logo-egastro.png", sizes: "any", type: "image/png", purpose: "any maskable" }]
  };
}
