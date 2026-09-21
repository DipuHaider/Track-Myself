export const QUESTION_SECTIONS = [
  "motivation",
  "behavioural",
  "role",
  "technical",
  "working-style",
  "closing",
] as const;

export type QuestionSection = (typeof QUESTION_SECTIONS)[number];

export const SECTION_LABELS: Record<QuestionSection, string> = {
  motivation: "Motivation & fit",
  behavioural: "Behavioural — answer with STAR",
  role: "Role-specific",
  technical: "Technical depth",
  "working-style": "Working style & collaboration",
  closing: "Questions to ask them",
};

export const SECTION_INTROS: Record<QuestionSection, string> = {
  motivation: "Why this role, this company, and why now. Keep each answer under ninety seconds.",
  behavioural: "Situation, Task, Action, Result. Name the result in numbers wherever you can.",
  role: "The day-to-day of the job itself. Answer with things you have actually shipped.",
  technical: "Depth checks. Saying “I don't know, here is how I'd find out” beats bluffing.",
  "working-style": "How you work with other people. They are testing whether you are easy to work with.",
  closing: "Ask these. Going in with nothing reads as lack of interest.",
};

export const ROLE_FAMILIES = [
  "engineering",
  "data",
  "design",
  "product",
  "sales",
  "marketing",
  "operations",
  "support",
  "finance",
  "general",
] as const;

export type RoleFamily = (typeof ROLE_FAMILIES)[number];

export const FAMILY_LABELS: Record<RoleFamily, string> = {
  engineering: "Engineering",
  data: "Data & analytics",
  design: "Design",
  product: "Product",
  sales: "Sales",
  marketing: "Marketing",
  operations: "Operations",
  support: "Customer support",
  finance: "Finance",
  general: "General",
};

/* Longest match wins, so "data engineer" lands in data rather than engineering. */
export const FAMILY_KEYWORDS: { family: RoleFamily; words: string[] }[] = [
  { family: "data", words: ["data scientist", "data engineer", "data analyst", "machine learning", "ml engineer", "analytics", "bi ", "business intelligence", "statistician"] },
  { family: "design", words: ["ux", "ui designer", "product designer", "graphic designer", "design lead", "visual designer", "interaction designer", "brand designer"] },
  { family: "product", words: ["product manager", "product owner", "programme manager", "program manager", "scrum master", "delivery manager"] },
  { family: "sales", words: ["sales", "account executive", "business development", "account manager", "partnerships"] },
  { family: "marketing", words: ["marketing", "seo", "content", "social media", "growth", "copywriter", "brand manager"] },
  { family: "support", words: ["customer support", "customer success", "service desk", "helpdesk", "technical support"] },
  { family: "finance", words: ["finance", "accountant", "accounting", "controller", "auditor", "financial analyst"] },
  { family: "operations", words: ["operations", "logistics", "supply chain", "project manager", "office manager", "hr ", "recruiter", "people "] },
  { family: "engineering", words: ["engineer", "developer", "programmer", "architect", "devops", "sre", "qa", "tester", "full-stack", "fullstack", "frontend", "front-end", "backend", "back-end", "mobile", "android", "ios"] },
];

export type BankQuestion = {
  text: string;
  section: QuestionSection;
  family?: RoleFamily;
  prompt?: string;
};

/* {role} and {company} are substituted per application. */
export const QUESTION_BANK: BankQuestion[] = [
  /* ── Motivation & fit ── */
  { text: "Walk me through your background and how it led you to apply for {role}.", section: "motivation", prompt: "Two minutes, ending on why this role is the logical next step." },
  { text: "Why {company} specifically, rather than a competitor?", section: "motivation", prompt: "Name something concrete: a product decision, a market they are in, how they work." },
  { text: "What do you know about what we do day to day?", section: "motivation" },
  { text: "What attracted you to the {role} posting?", section: "motivation" },
  { text: "Why are you leaving your current position?", section: "motivation", prompt: "Forward-looking and never bitter, even if the reason is." },
  { text: "Where do you want to be in three years, and does {role} get you there?", section: "motivation" },
  { text: "What would make you turn this job down?", section: "motivation" },
  { text: "How does this role compare with the others you are considering?", section: "motivation" },
  { text: "What do you want from your next manager?", section: "motivation" },
  { text: "Which of our products or services have you actually used?", section: "motivation" },
  { text: "What is your understanding of our customers?", section: "motivation" },
  { text: "If we hired you, what would you want to achieve in your first ninety days?", section: "motivation", prompt: "Split it: learn, contribute, own." },
  { text: "What kind of company culture brings out your best work?", section: "motivation" },
  { text: "What are your salary expectations for {role}?", section: "motivation", prompt: "Give a researched range and say it is negotiable on the whole package." },
  { text: "When could you start?", section: "motivation" },
  { text: "How did you hear about this opening?", section: "motivation" },
  { text: "What do you think this job involves that people outside it would not guess?", section: "motivation" },
  { text: "Is there anything about the posting that gave you pause?", section: "motivation" },

  /* ── Behavioural ── */
  { text: "Tell me about a time you failed at something that mattered.", section: "behavioural", prompt: "Own it plainly, then spend most of the answer on what changed afterwards." },
  { text: "Describe a conflict with a colleague and how it ended.", section: "behavioural" },
  { text: "Tell me about the hardest problem you have solved at work.", section: "behavioural" },
  { text: "Describe a time you had to deliver under an unreasonable deadline.", section: "behavioural" },
  { text: "Tell me about a time you changed your mind after someone challenged you.", section: "behavioural" },
  { text: "Describe a moment you had to give difficult feedback.", section: "behavioural" },
  { text: "Tell me about a time you received criticism you did not agree with.", section: "behavioural" },
  { text: "Describe a project that did not go to plan. What did you do?", section: "behavioural" },
  { text: "Tell me about a time you had to work with incomplete information.", section: "behavioural" },
  { text: "Describe a time you went beyond what the job required.", section: "behavioural" },
  { text: "Tell me about a time you had to say no.", section: "behavioural" },
  { text: "Describe a situation where you had to influence someone with no authority over them.", section: "behavioural" },
  { text: "Tell me about a decision you made that turned out wrong.", section: "behavioural" },
  { text: "Describe a time you spotted a problem nobody else had noticed.", section: "behavioural" },
  { text: "Tell me about a time you had to learn something difficult quickly.", section: "behavioural", prompt: "Name the method, not just the outcome." },
  { text: "Describe the most tedious task you have owned and how you handled it.", section: "behavioural" },
  { text: "Tell me about a time you disagreed with a decision but had to carry it out.", section: "behavioural" },
  { text: "Describe a time you had to rebuild trust with someone.", section: "behavioural" },
  { text: "Tell me about your proudest piece of work.", section: "behavioural" },
  { text: "Describe a time you had to ask for help.", section: "behavioural" },
  { text: "Tell me about a time you juggled several competing priorities.", section: "behavioural" },
  { text: "Describe a time you improved a process nobody asked you to improve.", section: "behavioural" },

  /* ── Working style ── */
  { text: "How do you plan a week when everything is urgent?", section: "working-style" },
  { text: "How do you prefer to receive feedback?", section: "working-style" },
  { text: "Do you work better alone or in a team? Be honest.", section: "working-style" },
  { text: "How do you keep stakeholders informed without drowning them?", section: "working-style" },
  { text: "What does a productive day look like for you?", section: "working-style" },
  { text: "How do you handle a colleague who is not pulling their weight?", section: "working-style" },
  { text: "How do you work with people in other time zones?", section: "working-style" },
  { text: "What is your approach to documentation?", section: "working-style" },
  { text: "How do you decide when something is good enough to ship?", section: "working-style" },
  { text: "How do you handle interruptions to deep work?", section: "working-style" },
  { text: "Describe your ideal working environment.", section: "working-style" },
  { text: "How do you onboard yourself into an unfamiliar codebase, account or process?", section: "working-style" },
  { text: "How do you keep your skills current?", section: "working-style" },
  { text: "How do you handle stress in a bad week?", section: "working-style" },
  { text: "What would your last manager say is your biggest weakness?", section: "working-style", prompt: "A real one, plus the mechanism you use to manage it." },
  { text: "What would your closest colleague say you are best at?", section: "working-style" },
  { text: "How do you handle being the least experienced person in the room?", section: "working-style" },
  { text: "How do you handle being the most experienced person in the room?", section: "working-style" },

  /* ── Engineering ── */
  { text: "Walk me through the architecture of something you built end to end.", section: "role", family: "engineering" },
  { text: "How do you decide between fixing technical debt and shipping features?", section: "role", family: "engineering" },
  { text: "What does a good code review look like to you?", section: "role", family: "engineering" },
  { text: "How do you test work where the requirements keep moving?", section: "role", family: "engineering" },
  { text: "Tell me about a production incident you were responsible for.", section: "role", family: "engineering" },
  { text: "How do you approach performance problems you cannot reproduce?", section: "technical", family: "engineering", prompt: "Talk about measuring before changing." },
  { text: "Explain a technical concept from your work to someone non-technical.", section: "technical", family: "engineering" },
  { text: "How do you keep a large codebase understandable as a team grows?", section: "technical", family: "engineering" },
  { text: "What is your approach to error handling and logging?", section: "technical", family: "engineering" },
  { text: "How do you decide what to automate?", section: "technical", family: "engineering" },
  { text: "Describe how you would debug a bug that only appears in production.", section: "technical", family: "engineering" },
  { text: "What are the trade-offs between a monolith and services for a small team?", section: "technical", family: "engineering" },
  { text: "How do you keep dependencies from becoming a liability?", section: "technical", family: "engineering" },
  { text: "How do you handle database migrations with zero downtime?", section: "technical", family: "engineering" },
  { text: "What does secure-by-default mean in your work?", section: "technical", family: "engineering" },

  /* ── Data ── */
  { text: "Walk me through an analysis that changed a decision.", section: "role", family: "data" },
  { text: "How do you check whether a dataset can be trusted?", section: "role", family: "data" },
  { text: "How do you explain a statistical result to a sceptical stakeholder?", section: "role", family: "data" },
  { text: "Tell me about a model or report you built that was not used. Why not?", section: "role", family: "data" },
  { text: "How do you tell correlation from something worth acting on?", section: "technical", family: "data" },
  { text: "How do you handle missing or clearly wrong data?", section: "technical", family: "data" },
  { text: "How do you pick a metric that will not be gamed?", section: "technical", family: "data" },
  { text: "Describe your approach to designing an experiment or A/B test.", section: "technical", family: "data" },
  { text: "How do you keep a pipeline maintainable as sources change?", section: "technical", family: "data" },
  { text: "When is a simple model the right answer over a complex one?", section: "technical", family: "data" },

  /* ── Design ── */
  { text: "Walk me through one case study from research to shipped design.", section: "role", family: "design" },
  { text: "How do you handle a stakeholder who redesigns your work for you?", section: "role", family: "design" },
  { text: "How do you know a design succeeded after launch?", section: "role", family: "design" },
  { text: "How do you design when there is no research budget?", section: "role", family: "design" },
  { text: "How do you balance accessibility against a client's visual ambitions?", section: "technical", family: "design" },
  { text: "How do you keep a design system from drifting out of date?", section: "technical", family: "design" },
  { text: "How do you hand work over to engineers so nothing gets lost?", section: "technical", family: "design" },
  { text: "How do you critique someone else's design without crushing them?", section: "technical", family: "design" },

  /* ── Product ── */
  { text: "How do you decide what does not get built?", section: "role", family: "product" },
  { text: "Walk me through how you would prioritise a backlog you just inherited.", section: "role", family: "product" },
  { text: "Tell me about a feature you killed.", section: "role", family: "product" },
  { text: "How do you write a spec engineers actually want to read?", section: "role", family: "product" },
  { text: "How do you handle sales promising something that does not exist?", section: "technical", family: "product" },
  { text: "What metrics would you watch in the first month in this role?", section: "technical", family: "product" },
  { text: "How do you run a discovery when users are hard to reach?", section: "technical", family: "product" },

  /* ── Sales ── */
  { text: "Walk me through your process from first contact to close.", section: "role", family: "sales" },
  { text: "Tell me about the largest deal you have closed and what nearly lost it.", section: "role", family: "sales" },
  { text: "How do you handle a prospect who goes quiet after a good call?", section: "role", family: "sales" },
  { text: "How do you qualify out early instead of wasting a quarter?", section: "role", family: "sales" },
  { text: "Sell me something in this room.", section: "technical", family: "sales" },
  { text: "How do you handle a price objection without discounting?", section: "technical", family: "sales" },
  { text: "How do you build a pipeline from nothing in a new territory?", section: "technical", family: "sales" },

  /* ── Marketing ── */
  { text: "Walk me through a campaign you ran end to end and its numbers.", section: "role", family: "marketing" },
  { text: "How do you decide where a limited budget goes?", section: "role", family: "marketing" },
  { text: "Tell me about a campaign that underperformed and what you learned.", section: "role", family: "marketing" },
  { text: "How do you measure something that does not convert immediately?", section: "technical", family: "marketing" },
  { text: "How do you brief a designer or writer so you get what you need?", section: "technical", family: "marketing" },
  { text: "What would you change about our current marketing?", section: "technical", family: "marketing" },

  /* ── Operations ── */
  { text: "Tell me about a process you redesigned and what it saved.", section: "role", family: "operations" },
  { text: "How do you keep a project on track when a dependency slips?", section: "role", family: "operations" },
  { text: "How do you handle a supplier or partner who keeps missing deadlines?", section: "role", family: "operations" },
  { text: "How do you decide what to escalate and what to absorb?", section: "technical", family: "operations" },
  { text: "How do you document a process so someone else can run it?", section: "technical", family: "operations" },

  /* ── Support ── */
  { text: "Tell me about the angriest customer you have turned around.", section: "role", family: "support" },
  { text: "How do you handle a customer asking for something you cannot do?", section: "role", family: "support" },
  { text: "How do you keep quality up when the queue is long?", section: "role", family: "support" },
  { text: "How do you feed recurring complaints back to the product team?", section: "technical", family: "support" },
  { text: "How do you know when to escalate rather than keep trying?", section: "technical", family: "support" },

  /* ── Finance ── */
  { text: "Walk me through how you close a month.", section: "role", family: "finance" },
  { text: "Tell me about a discrepancy you found and how you resolved it.", section: "role", family: "finance" },
  { text: "How do you explain a variance to someone who is not financial?", section: "role", family: "finance" },
  { text: "How do you keep controls tight without slowing the business down?", section: "technical", family: "finance" },
  { text: "What would you check first in a forecast you did not build?", section: "technical", family: "finance" },

  /* ── Generic role & technical filler ── */
  { text: "What part of {role} do you expect to find hardest?", section: "role" },
  { text: "What would you need in your first week to be effective?", section: "role" },
  { text: "Which part of this job would you happily never do again?", section: "role" },
  { text: "What tools do you expect to use daily in {role}?", section: "role" },
  { text: "How would you measure whether you were doing {role} well?", section: "role" },
  { text: "What is the most useful thing you learned in your last job?", section: "role" },
  { text: "Which of your skills is most underused right now?", section: "role" },
  { text: "How do you handle work you consider beneath your level?", section: "role" },
  { text: "What would you do in your first week if nobody gave you direction?", section: "technical" },
  { text: "How do you check your own work before calling it finished?", section: "technical" },
  { text: "Talk me through something you built or ran that you would now do differently.", section: "technical" },
  { text: "How do you estimate how long something will take?", section: "technical", prompt: "They are listening for how you handle being wrong." },
  { text: "What is the riskiest assumption in how you work?", section: "technical" },
  { text: "How do you stay accurate when you are moving fast?", section: "technical" },

  /* ── Questions to ask them ── */
  { text: "What does success in {role} look like after six months?", section: "closing" },
  { text: "What is the biggest challenge facing the team right now?", section: "closing" },
  { text: "Why is this role open?", section: "closing", prompt: "The answer tells you about turnover and growth." },
  { text: "How is performance actually reviewed here?", section: "closing" },
  { text: "Who would I work with most closely day to day?", section: "closing" },
  { text: "What has someone in this role struggled with before?", section: "closing" },
  { text: "How are decisions made when people disagree?", section: "closing" },
  { text: "What does the first month look like for a new starter?", section: "closing" },
  { text: "How does the team handle mistakes?", section: "closing" },
  { text: "What is changing about {company} over the next year?", section: "closing" },
  { text: "How much of the week is meetings?", section: "closing" },
  { text: "What would make you glad you hired me?", section: "closing" },
  { text: "Is there anything in my background that gives you doubt?", section: "closing", prompt: "Asking this lets you answer the objection before you leave." },
  { text: "What are the next steps, and when should I expect to hear?", section: "closing" },
];
