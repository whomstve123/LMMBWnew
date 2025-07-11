console.log('BUILD DEBUG: SUPABASE_URL:', process.env.SUPABASE_URL)
console.log('BUILD DEBUG: SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY)

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

module.exports = nextConfig;
