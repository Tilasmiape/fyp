const Welcome = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center text-white">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-12 border border-white/20 shadow-2xl">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent mb-8">
            Welcome
          </h1>
          <p className="text-xl text-slate-300 mb-12 leading-relaxed">
            Discover elegance in every interaction. Join our premium experience.
          </p>
          <div className="space-y-4">
            <a href="/signup" className="block w-full bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-slate-900 font-bold py-4 px-8 rounded-2xl text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300">
              Get Started
            </a>
            <a href="/signin" className="block w-full border-2 border-white/30 hover:border-white/50 text-white font-semibold py-4 px-8 rounded-2xl text-lg hover:bg-white/10 transition-all duration-300">
              Sign In
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
