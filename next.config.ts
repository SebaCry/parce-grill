import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // La raíz no renderiza: sólo existen /es y /en, y así el canonical de
      // cada idioma es inequívoco para los buscadores.
      { source: "/", destination: "/es", permanent: false },
    ];
  },
};

export default nextConfig;
