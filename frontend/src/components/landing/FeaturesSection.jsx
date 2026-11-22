import { motion } from 'framer-motion';
import { 
  FiLayers, FiUsers, FiCpu, FiAward, FiBriefcase, FiCompass, 
  FiShare2, FiGitBranch, FiMessageSquare, FiZap 
} from 'react-icons/fi';

const features = [
  {
    title: 'Build in Public',
    badge: 'Core Feature',
    description: 'Share your engineering journey with milestones, devlogs, and repository commit updates. Get recognized before you even launch.',
    icon: <FiGitBranch className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />,
    gradient: 'from-indigo-500/10 to-blue-500/10'
  },
  {
    title: 'Find My Teammate',
    badge: 'Collaboration',
    description: 'Discover collaborators with complementary skills. If you are a backend engineer, match with designers and frontend builders to bring ideas alive.',
    icon: <FiUsers className="w-6 h-6 text-primary-600 dark:text-primary-400" />,
    gradient: 'from-primary-500/10 to-emerald-500/10'
  },
  {
    title: 'Skill Proof & Portfolios',
    badge: 'Evidence-Based',
    description: 'No more exaggerated resumes. Attach live projects, GitHub code, and certifications as tangible skill proof, paired with 3D WebGL portfolios.',
    icon: <FiAward className="w-6 h-6 text-amber-600 dark:text-amber-400" />,
    gradient: 'from-amber-500/10 to-orange-500/10'
  },
  {
    title: 'Developer Communities',
    badge: 'Discussions',
    description: 'Join specialized technical clubs in AI/ML, Frontend, Cloud/DevOps, and UI/UX. Ask architecture questions and participate in community events.',
    icon: <FiMessageSquare className="w-6 h-6 text-sky-600 dark:text-sky-400" />,
    gradient: 'from-sky-500/10 to-cyan-500/10'
  },
  {
    title: 'Opportunity Radar',
    badge: 'Careers',
    description: 'Targeted internships, entry-level roles, freelance gigs, and peer referrals matched to your verified skills and project achievements.',
    icon: <FiBriefcase className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />,
    gradient: 'from-emerald-500/10 to-teal-500/10'
  },
  {
    title: 'Gemini AI Career Roadmap',
    badge: 'AI Powered',
    description: 'AI-generated personalized career progression pathways, automated project summaries from GitHub, and recruiter-focused profile optimization.',
    icon: <FiCpu className="w-6 h-6 text-purple-600 dark:text-purple-400" />,
    gradient: 'from-purple-500/10 to-pink-500/10'
  }
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-24 bg-slate-50/70 dark:bg-slate-900/40 border-y border-slate-200/80 dark:border-slate-800">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 bg-primary-100 dark:bg-primary-950 px-3 py-1 rounded-full border border-primary-500/20">
            A Complete Builder Ecosystem
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white mt-4 tracking-tight">
            Designed for those who ship real code and products.
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
            Stop sending static PDF resumes into black-hole applicant tracking systems. NEXORA gives builders a collaborative community to showcase skills through proof-of-work.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.08, duration: 0.5 }}
              className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-primary-500/40 dark:hover:border-primary-500/40 transition-all duration-300 shadow-xs hover:shadow-xl hover:-translate-y-1 relative flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200/60 dark:border-slate-700">
                    {feature.icon}
                  </div>
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                    {feature.badge}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2.5">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
