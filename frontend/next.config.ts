/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ["10.20.16.191", "localhost"],
  turbopack: {
    root: process.cwd(),
  },
}

module.exports = nextConfig