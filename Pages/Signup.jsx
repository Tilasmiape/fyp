import AuthForm from '../components/AuthForm';

const Signup = () => {
  const handleSubmit = (data) => {
    console.log('Signup:', data);
    // Add your backend signup logic here
  };

  return (
    <AuthForm title="Join Premium" buttonText="Create Account" onSubmit={handleSubmit}>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-3">Full Name</label>
          <input
            type="text"
            required
            className="w-full bg-white/20 border border-white/30 rounded-2xl px-5 py-4 text-white placeholder-slate-400 backdrop-blur-sm focus:outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 transition-all duration-300"
            placeholder="Your full name"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-3">Email Address</label>
          <input
            type="email"
            required
            className="w-full bg-white/20 border border-white/30 rounded-2xl px-5 py-4 text-white placeholder-slate-400 backdrop-blur-sm focus:outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 transition-all duration-300"
            placeholder="your@email.com"
          />
        </div>
        {/* Dance Styles - Only for Choreographer */}
        {formData.role === 'choreographer' && (
          <div>
            <label className={labelClass}>Dance Styles * (Select all that apply)</label>
            <div className="bg-white/5 border border-white/20 rounded-xl p-4 max-h-60 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                {availableDanceStyles.map((style) => (
                  <label
                    key={style}
                    className="flex items-center gap-2 cursor-pointer text-white text-sm hover:bg-white/10 p-2 rounded-lg transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={formData.danceStyles.includes(style)}
                      onChange={() => handleDanceStyleToggle(style)}
                      className="accent-yellow-400 w-4 h-4"
                    />
                    {style}
                  </label>
                ))}
              </div>
            </div>
            {formData.danceStyles.length > 0 && (
              <p className="text-xs text-green-300 mt-2">
                Selected: {formData.danceStyles.join(', ')}
              </p>
            )}
          </div>
        )}
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-3">Password</label>
          <input
            type="password"
            required
            className="w-full bg-white/20 border border-white/30 rounded-2xl px-5 py-4 text-white placeholder-slate-400 backdrop-blur-sm focus:outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 transition-all duration-300"
            placeholder="Create strong password"
          />
        </div>
      </div>
    </AuthForm>
  );
};

export default Signup;
