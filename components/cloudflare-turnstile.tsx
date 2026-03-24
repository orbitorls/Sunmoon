import { useEffect, useState } from 'react';

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
}

export default function TurnstileWidget({ onVerify }: TurnstileWidgetProps) {
  const [token, setToken] = useState('');

  // In a real implementation you would load Cloudflare Turnstile script and render widget.
  // For this demo we provide a simple checkbox that returns a test token when checked.
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      const testToken = '1x00000000000000000000AA'; // Cloudflare test site key token
      setToken(testToken);
      onVerify(testToken);
    } else {
      setToken('');
      onVerify('');
    }
  };

  return (
    <label className="flex items-center gap-4 cursor-pointer group">
      <div className="relative">
        <input type="checkbox" checked={!!token} onChange={handleChange} className="peer sr-only" />
        <div className="w-7 h-7 border-2 border-white/40 rounded-md bg-white/5 peer-checked:bg-gradient-to-r peer-checked:from-green-400 peer-checked:to-emerald-500 peer-checked:border-green-400 transition-all flex items-center justify-center group-hover:border-white/60">
          {token && <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
        </div>
      </div>
      <span className="text-white font-medium">Verify you are human</span>
    </label>
  );
}
