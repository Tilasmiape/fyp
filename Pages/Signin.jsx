import AuthForm from '../components/AuthForm';

const Signin = () => {
  const handleSubmit = (data) => {
    console.log('Signin:', data);
    // Add your backend auth logic here
  };

  return (
    <AuthForm title="Welcome Back" buttonText="Sign In" onSubmit={handleSubmit}>
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-3">Email Address</label>
          <input
            type="email"
            required
            className="w-full bg-white/20 border border-white/30 rounded-2xl px-5 py-4 text-white placeholder-slate-400 backdrop-blur-sm focus:outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 transition-all duration-300"
            placeholder="your@email.com"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-3">Password</label>
          <input
            type="password"
            required
            className="w-full bg-white/20 border border-white/30 rounded-2xl px-5 py-4 text-white placeholder-slate-400 backdrop-blur-sm focus:outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 transition-all duration-300"
            placeholder="••••••••"
          />
        </div>
      </div>
    </AuthForm>
  );
};

export default Signin;
