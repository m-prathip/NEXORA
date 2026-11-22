import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiUsers, FiCode, FiZap, FiCheckCircle, FiStar } from 'react-icons/fi';

const HeroSection = () => {
  return (
    <section className="relative min-h-[92vh] flex flex-col items-center justify-center pt-28 pb-20 bg-white dark:bg-slate-950 overflow-hidden">
      {/* Background dot grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.35] dark:opacity-[0.15] pointer-events-none" 
        style={{ 
          backgroundImage: `radial-gradient(#94a3b8 1px, transparent 1px)`, 
          backgroundSize: '28px 28px' 
        }} 
      />

      {/* Ambient gradient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] sm:w-[900px] h-[450px] bg-gradient-to-tr from-primary-200/40 via-indigo-100/30 to-sky-100/20 dark:from-primary-950/40 dark:via-indigo-950/30 dark:to-slate-900/10 rounded-full blur-3xl opacity-70 pointer-events-none" />

      <div className="relative z-10 max-w-5xl mx-auto px-5 sm:px-8 text-center">
        {/* Network Announcement Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 mb-8 shadow-xs backdrop-blur-sm"
        >
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 tracking-wide">
            NEXORA 2.0 • The Professional Network for Builders
          </span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300">
            Open Alpha
          </span>
        </motion.div>

        {/* Main Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.1] mb-6"
        >
          Where Builders Connect, <br className="hidden sm:inline" />
          <span className="bg-gradient-to-r from-primary-600 via-indigo-600 to-sky-500 bg-clip-text text-transparent">
            Collaborate & Get Hired.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed mb-10"
        >
          Publish proof-of-work portfolios, build in public, discover complementary teammates, engage in developer communities, and unlock career opportunities with AI guidance.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full max-w-md sm:max-w-none mx-auto mb-16"
        >
          <Link
            to="/auth/signup"
            className="w-full sm:w-auto px-8 py-4 bg-slate-900 dark:bg-primary-600 hover:bg-slate-800 dark:hover:bg-primary-500 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 dark:shadow-primary-600/30 transition-all active:scale-[0.98]"
          >
            <span>Join NEXORA Free</span>
            <FiArrowRight className="w-5 h-5" />
          </Link>
          <Link
            to="/feed"
            className="w-full sm:w-auto px-7 py-4 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-xs"
          >
            <FiUsers className="w-4 h-4 text-primary-600 dark:text-primary-400" />
            <span>Explore Community Feed</span>
          </Link>
          <Link
            to="/u/demo"
            className="w-full sm:w-auto px-5 py-4 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium text-sm flex items-center justify-center gap-1.5 transition-colors"
          >
            <FiStar className="w-4 h-4 text-amber-500" />
            <span>Live 3D Portfolio Demo</span>
          </Link>
        </motion.div>

        {/* Builder Interactive Mock Preview Card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="relative max-w-3xl mx-auto rounded-3xl bg-slate-900 dark:bg-slate-900 text-white p-6 sm:p-8 border border-slate-800 shadow-2xl text-left overflow-hidden"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-sky-400 flex items-center justify-center font-bold text-lg text-white">
                AR
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-base">Alex Rivera</h3>
                  <span className="text-xs bg-primary-500/20 text-primary-400 font-semibold px-2 py-0.5 rounded-full border border-primary-500/30">
                    Lead AI Architect
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">@alex • Building in Public: AutonomAI</p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold px-2.5 py-1 rounded-lg flex items-center gap-1">
                <FiZap className="w-3.5 h-3.5" /> Looking for Frontend Lead
              </span>
            </div>
          </div>

          <div className="pt-5">
            <h4 className="text-lg font-bold text-white mb-2">
              AutonomAI — Distributed Multi-Agent LLM Orchestrator
            </h4>
            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              Processing 50,000+ semantic queries per second with sub-100ms latency. Seeking a React 19 / Canvas wizard to build our real-time agent observability graph.
            </p>
            <div className="flex flex-wrap items-center gap-2 mb-6">
              {['Python', 'PyTorch', 'FastAPI', 'Docker', 'React', 'TypeScript'].map((tech) => (
                <span key={tech} className="text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
                  {tech}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-800 text-xs text-slate-400">
              <div className="flex items-center gap-4">
                <span>🔥 24 Collaborators applied</span>
                <span>⭐ 184 Builder upvotes</span>
              </div>
              <div className="flex items-center gap-3">
                <Link to="/auth/signup" className="text-primary-400 font-bold hover:underline flex items-center gap-1">
                  Apply to Join Team →
                </Link>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feature Highlights Grid */}
        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-6 text-left border-t border-slate-200 dark:border-slate-800 pt-8">
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">100%</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Proof-of-work based skill verification</p>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">Complementary</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Teammate matching by missing skills</p>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">Build in Public</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Devlog sharing & milestone tracking</p>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">Gemini AI</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Personalized roadmaps & repo summaries</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
