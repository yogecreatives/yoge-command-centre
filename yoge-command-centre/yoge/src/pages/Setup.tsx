export function Setup() {
  return (
    <div className="auth"><div className="setup">
      <div className="mark">YOGE</div>
      <h1>Connect Supabase</h1>
      <p className="row-sub">This app needs your Supabase project’s public URL and anon (publishable) key.</p>
      <ol>
        <li>Copy <code>.env.example</code> to <code>.env.local</code></li>
        <li>Fill in <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code></li>
        <li>Restart <code>npm run dev</code></li>
      </ol>
      <p className="row-sub">On Vercel or Netlify, add the same two variables in the project settings and redeploy. Never use the service-role key.</p>
    </div></div>
  )
}
