const Profile = require('../models/Profile');
const Skills = require('../models/Skills');
const Projects = require('../models/Projects');
const Experience = require('../models/Experience');
const User = require('../models/User');

const GEMINI_KEY = process.env.GEMINI_API_KEY;

// Secure server-side Gemini API caller with timeout & heuristic fallback
async function callGemini(prompt, systemInstruction) {
  if (!GEMINI_KEY) {
    return null; // Triggers offline heuristic fallback
  }

  const baseInstruction = (systemInstruction || 'You are an expert AI software architect and technical mentor for developers.') +
    ' STRICT GUARDRAIL: DO NOT hallucinate fake credentials, fake companies, fake degrees, or unverifiable achievements. Ground all analysis strictly in the provided builder data.';

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: baseInstruction }] },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 1000
        }
      })
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn('Gemini API returned status:', response.status);
      return null;
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (err) {
    console.warn('Gemini call failed or timed out:', err.message);
    return null;
  }
}

// ── FEATURE 1: AI PROFESSIONAL PROFILE IMPROVEMENT ─────────────────────────
// @desc   Analyze candidate profile & suggest actionable improvements
// @route  POST /api/ai/profile-improve
const improveProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const [user, profile, skills, projects, experience] = await Promise.all([
      User.findById(userId).select('username primaryRole headline reputationPoints college department graduationYear').lean(),
      Profile.findOne({ user: userId }).lean(),
      Skills.find({ user: userId }).lean(),
      Projects.find({ user: userId }).lean(),
      Experience.find({ user: userId }).lean()
    ]);

    const candidateData = {
      name: profile?.name || user?.name || user?.username,
      headline: profile?.headline || user?.headline || user?.primaryRole || 'Software Engineer',
      about: profile?.about || '',
      college: profile?.college || user?.college || 'University',
      department: profile?.department || user?.department || 'Computer Science',
      graduationYear: profile?.graduationYear || user?.graduationYear || '2026',
      skills: (profile?.skills?.length ? profile.skills : skills.map(s => s.name)),
      projects: projects.map(p => ({ title: p.title, tech: p.techStack, desc: p.description })),
      experience: experience.map(e => ({ role: e.role, company: e.company, desc: e.description }))
    };

    const prompt = `Analyze this software developer / student profile. DO NOT invent fake past employers or credentials.
Profile Data:
- Name: ${candidateData.name}
- Headline: ${candidateData.headline}
- College/Dept: ${candidateData.college} (${candidateData.department}, Class of ${candidateData.graduationYear})
- About: ${candidateData.about || 'Not provided'}
- Skills: ${candidateData.skills.join(', ') || 'None listed'}
- Projects Count: ${candidateData.projects.length}
- Experience Count: ${candidateData.experience.length}

Provide a structured evaluation in JSON with keys:
"overallScore" (number from 40 to 95 based on completeness),
"strengths" (array of 3 specific strengths based on their real data),
"improvements" (array of 3 actionable, high-impact improvements to boost credibility),
"recommendedAdditions" (array of 2 specific technical artifacts they should add to their portfolio).`;

    const aiResponse = await callGemini(prompt, 'You are a staff engineering recruiter and technical profile reviewer.');

    let parsed = null;
    if (aiResponse) {
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch (e) {
        parsed = null;
      }
    }

    // High-fidelity fallback heuristic based on real candidate data
    if (!parsed) {
      let score = 55;
      const strengths = [];
      const improvements = [];
      const additions = [];

      if (candidateData.skills.length > 0) {
        score += 15;
        strengths.push(`Strong technical foundation in core technologies: ${candidateData.skills.slice(0, 3).join(', ')}.`);
      } else {
        improvements.push('Add at least 5 primary programming languages and frameworks to your skills section.');
      }

      if (candidateData.projects.length > 0) {
        score += 15;
        strengths.push(`Demonstrated hands-on experience through ${candidateData.projects.length} documented technical project(s).`);
      } else {
        improvements.push('Publish at least one deep architectural project with GitHub repository and live demo links.');
        additions.push('Add an end-to-end full-stack or systems project with benchmarked performance metrics.');
      }

      if (candidateData.about && candidateData.about.length > 80) {
        score += 10;
        strengths.push('Comprehensive professional summary outlining development philosophy.');
      } else {
        improvements.push('Expand your About section to describe your system architecture focus and engineering philosophy.');
      }

      if (candidateData.college) {
        additions.push(`Highlight key academic coursework or engineering club leadership at ${candidateData.college}.`);
      }

      parsed = {
        overallScore: Math.min(score, 94),
        strengths: strengths.length ? strengths : ['Clear initial builder foundation established on NEXORA.'],
        improvements: improvements.length ? improvements : ['Link verified GitHub repositories to your showcase projects.'],
        recommendedAdditions: additions.length ? additions : ['Include architecture diagrams for your primary repository.']
      };
    }

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── FEATURE 2: AI HEADLINE & SUMMARY SUGGESTIONS ───────────────────────────
// @desc   Suggest punchy headlines and executive summaries
// @route  POST /api/ai/headline-summary
const suggestHeadlinesAndSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const [profile, skills, user] = await Promise.all([
      Profile.findOne({ user: userId }).lean(),
      Skills.find({ user: userId }).lean(),
      User.findById(userId).select('primaryRole college department graduationYear').lean()
    ]);

    const skillsList = (profile?.skills?.length ? profile.skills : skills.map(s => s.name)).slice(0, 5).join(', ') || 'React, Node.js, Python';
    const role = profile?.headline || user?.primaryRole || 'Software Engineer';
    const college = profile?.college || user?.college || '';

    const prompt = `Generate 3 punchy, credible professional headlines (under 90 chars each) and 2 executive summaries (2-3 sentences each) for a technical builder.
DO NOT fabricate fake companies, titles, or awards. Ground suggestions in these actual facts:
- Target Role: ${role}
- Verified Skills: ${skillsList}
- University: ${college || 'Computer Science'}

Respond in JSON with format:
{
  "headlines": ["headline 1", "headline 2", "headline 3"],
  "summaries": ["summary 1", "summary 2"]
}`;

    const aiResponse = await callGemini(prompt);
    let result = null;

    if (aiResponse) {
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) result = JSON.parse(jsonMatch[0]);
      } catch (e) {
        result = null;
      }
    }

    if (!result) {
      result = {
        headlines: [
          `${role} | Specialized in ${skillsList.split(',').slice(0, 2).join(' & ')}${college ? ` • ${college}` : ''}`,
          `Software Engineer & Builder • ${skillsList} • Scalable Systems`,
          `Full-Stack Builder & Open-Source Contributor | ${skillsList.split(',')[0] || 'Modern Web'}`
        ],
        summaries: [
          `Software engineer focused on architecting resilient, responsive applications using ${skillsList}. Passionate about clean abstractions, automated testing, and collaborating with cross-functional builder teams.`,
          `Builder with hands-on experience designing end-to-end architectures and high-throughput services with ${skillsList}. Dedicated to continuous technical mastery and open-source contributions.`
        ]
      };
    }

    result.summary = result.summaries?.[0] || '';
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── FEATURE 3: AI PROJECT DESCRIPTION GENERATOR ───────────────────────────
// @desc   Generate technical project overview, architecture, and impact
// @route  POST /api/ai/project-description
const generateProjectDescription = async (req, res) => {
  try {
    const { title, techStack, highlights, problemSolved } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ message: 'Project title is required' });
    }

    const techString = Array.isArray(techStack) ? techStack.join(', ') : (techStack || 'Full-Stack');

    const prompt = `Write a technical, credible project showcase description for a software project titled "${title.trim()}".
DO NOT invent fake customer metrics, fake company sponsorships, or fake awards. Ground in realistic engineering principles.
- Technologies: ${techString}
- Problem Solved: ${problemSolved || 'High latency, complex state, or manual workflow bottlenecks'}
- Key Highlights: ${highlights || 'Component modularity, scalable API design, resilient database schema'}

Structure the output into 3 distinct sections:
1. Overview & Problem: What technical challenge does this solve?
2. Architecture & Design: Key technical trade-offs and component design.
3. Performance & Impact: How it delivers reliable execution and maintainability.`;

    const aiText = await callGemini(prompt);

    const description = aiText || `### 1. Overview & Problem
${title} was developed to address critical performance bottlenecks in distributed data movement, leveraging ${techString} for high-throughput processing and clean separation of concerns.

### 2. Architecture & Design
Engineered with modular service boundaries, robust input validation, and responsive UI components. State transitions are managed deterministically to prevent memory leaks and race conditions.

### 3. Performance & Impact
Tested with automated verification harnesses to guarantee sub-100ms response latencies and high test coverage across core application flows.`;

    res.json({ description, title: title.trim(), techStack: techString });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── FEATURE 4: AI POST-WRITING ASSISTANT ───────────────────────────────────
// @desc   Polish devlogs, announcements, and technical updates
// @route  POST /api/ai/polish-post
const polishPost = async (req, res) => {
  try {
    const { draft, postType = 'build_in_public' } = req.body;
    if (!draft || !draft.trim()) {
      return res.status(400).json({ message: 'Draft content is required' });
    }

    const prompt = `Act as an expert technical editor for a developer social network (NEXORA).
Polish this "${postType}" post draft to be concise, engaging for engineers, and structurally clean.
Keep any code snippets or markdown formatting intact. Suggest 3 relevant technical hashtags at the end.
DO NOT use overly commercial buzzwords. Maintain a humble, builder-first tone.
Draft:
${draft.trim()}`;

    const aiText = await callGemini(prompt);
    const polished = aiText || `${draft.trim()}\n\n#buildinpublic #webdev #engineering`;

    res.json({ polished });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ── FEATURE 5: AI SKILL IMPROVEMENT SUGGESTIONS ───────────────────────────
// @desc   Suggest high-value complementary skills & learning roadmaps
// @route  POST /api/ai/skill-suggestions
const suggestSkillImprovements = async (req, res) => {
  try {
    const userId = req.user.id;
    const { targetRole } = req.body;

    const [profile, skills, user] = await Promise.all([
      Profile.findOne({ user: userId }).lean(),
      Skills.find({ user: userId }).lean(),
      User.findById(userId).select('primaryRole').lean()
    ]);

    const currentSkills = (profile?.skills?.length ? profile.skills : skills.map(s => s.name));
    const roleGoal = targetRole || profile?.headline || user?.primaryRole || 'Senior Full-Stack Engineer';

    const prompt = `A software developer has current skills: [${currentSkills.join(', ') || 'JavaScript, HTML, CSS'}].
Their career or learning goal is: "${roleGoal}".
Recommend:
1. "complementarySkills": 4 high-demand technical skills they should learn next.
2. "modernTools": 3 modern libraries or infrastructure tools relevant to their stack.
3. "projectIdeas": 2 concrete, realistic project ideas they can build to prove these skills (DO NOT suggest impossible projects).
4. "learningResources": 3 recommended official docs, specifications, or benchmark guides.

Respond in JSON with those 4 keys.`;

    const aiResponse = await callGemini(prompt);
    let result = null;

    if (aiResponse) {
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) result = JSON.parse(jsonMatch[0]);
      } catch (e) {
        result = null;
      }
    }

    if (!result) {
      result = {
        complementarySkills: ['TypeScript Strict Typing', 'PostgreSQL & Database Indexing', 'Docker & Containerization', 'Asynchronous Event Queues (Redis/Kafka)'],
        modernTools: ['Tailwind CSS v4 / Radix UI', 'Prisma / Mongoose ORM', 'GitHub Actions CI/CD'],
        projectIdeas: [
          'Build a real-time collaborative workspace with WebSockets and optimistic UI updates.',
          'Develop a high-throughput REST API with Redis caching and rate-limiting middleware.'
        ],
        learningResources: [
          'Official React Documentation (react.dev)',
          'PostgreSQL Official Indexing & Performance Guide',
          'Docker Architecture & Container Best Practices'
        ]
      };
    }

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  improveProfile,
  suggestHeadlinesAndSummary,
  generateProjectDescription,
  polishPost,
  suggestSkillImprovements
};
