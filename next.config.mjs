import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development", // ← evita el infinite compile en dev
});

const nextConfig = {};

export default withPWA(nextConfig);