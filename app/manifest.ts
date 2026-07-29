import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "My Money",
    short_name: "My Money",
    description:
      "A premium way to see all your money in one place — net worth, accounts, transfers and insights.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#08090e",
    theme_color: "#08090e",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
