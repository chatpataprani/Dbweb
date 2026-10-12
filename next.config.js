/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async rewrites() {
    return [
      // Pretty URLs for static HTML tool pages under public/tools.
      // The specific /tools hub stays owned by the Next.js app route.
      { source: "/tools/:tool/", destination: "/tools/:tool/index.html" },
      { source: "/tools/:tool/:path*/", destination: "/tools/:tool/:path*/index.html" },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};
module.exports = nextConfig;
