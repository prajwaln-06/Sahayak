/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['10.20.16.191'],
  turbopack: {
    root: './',
  },
}

module.exports = nextConfig