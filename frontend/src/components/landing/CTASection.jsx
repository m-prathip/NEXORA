import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiCheck } from 'react-icons/fi';

const CTASection = () => (
  <section className="py-20 sm:py-28 relative overflow-hidden bg-white dark:bg-slate-950">
    <div className="max-w-6xl mx-auto px-5 sm:px-8">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-8 sm:p-16 text-center relative overflow-hidden shadow-2xl border border-slate-800"
      >
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.08] pointer-events-none" 
          style={{ 
            backgroundImage: `radial-gradient(#ffffff 1px, transparent 1px)`, 
            backgroundSize: '24px 24px' 
          }} 
        />

        <div className="relative z-10 max-w-3xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-primary-400 bg-primary-950/80 px-3 py-1 rounded-full border border-primary-500/30 mb-6 inline-block">
            Start Building Your Reputation
          </span>
          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white leading-[1.1] tracking-tight mb-5">
            Your work deserves a network that understands builders.
          </h2>
          <p className="text-base sm:text-lg text-slate-300 max-w-xl mx-auto leading-relaxed mb-8">
            Connect with technical peers, team up on impactful projects, publish interactive portfolios, and let opportunities find you.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-xs sm:max-w-none mx-auto">
            <Link
              to="/auth/signup"
              className="inline-flex items-center justify-center font-bold text-slate-900 bg-white hover:bg-slate-100 px-8 py-4 rounded-xl shadow-lg transition-all duration-200 text-base w-full sm:w-auto active:scale-[0.98]"
            >
              <span>Join NEXORA Free</span>
              <FiArrowRight className="w-5 h-5 ml-2" />
            </Link>
            <Link
              to="/feed"
              className="inline-flex items-center justify-center font-semibold text-white bg-slate-800/80 hover:bg-slate-800 px-7 py-4 rounded-xl border border-slate-700 transition-all text-base w-full sm:w-auto"
            >
              Browse Builder Feed
            </Link>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-6 mt-10 text-xs sm:text-sm text-slate-400 font-medium">
            <span className="flex items-center gap-2">
              <FiCheck className="w-4 h-4 text-emerald-400" /> Free forever for builders
            </span>
            <span className="flex items-center gap-2">
              <FiCheck className="w-4 h-4 text-emerald-400" /> No credit card required
            </span>
            <span className="flex items-center gap-2">
              <FiCheck className="w-4 h-4 text-emerald-400" /> Full portfolio + social network
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  </section>
);

export default CTASection;
