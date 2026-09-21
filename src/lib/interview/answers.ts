/* Answer guidance, keyed by the question text exactly as it appears in bank.ts.
   Placeholders are substituted at selection time, same as the questions. Keep a
   key here in step with the bank or the viewer falls back to section advice. */
export const ANSWERS: Record<string, string> = {
  /* ── Motivation & fit ── */
  "Walk me through your background and how it led you to apply for {role}.":
    "Three beats: where you started, the thread that runs through your moves, why {role} is the next one. Two minutes, no CV recital.",
  "Why {company} specifically, rather than a competitor?":
    "Name one concrete thing — a product decision, a market, how they build. Generic praise reads as having applied everywhere.",
  "What do you know about what we do day to day?":
    "Describe the actual work, not the marketing line. Say what you are unsure about rather than guessing.",
  "What attracted you to the {role} posting?":
    "Quote something specific from the posting and connect it to work you have already done.",
  "Why are you leaving your current position?":
    "Forward-looking and never bitter. What you want next, not what you are escaping.",
  "Where do you want to be in three years, and does {role} get you there?":
    "Be ambitious about the craft, not the title. Show this job is a step on that path, not a stopgap.",
  "What would make you turn this job down?":
    "Answer honestly — no growth, no ownership, a culture that clashes. Refusing to answer reads as evasive.",
  "How does this role compare with the others you are considering?":
    "Confirm you are in demand without bluffing. Say what would make you pick this one.",
  "What do you want from your next manager?":
    "Something specific and reasonable: clear priorities, direct feedback, cover when you need it.",
  "Which of our products or services have you actually used?":
    "If you used it, say what you noticed. If not, say so and describe what you researched instead.",
  "What is your understanding of our customers?":
    "Who they are, what they are trying to get done, what frustrates them. Connect it to what you would do.",
  "If we hired you, what would you want to achieve in your first ninety days?":
    "Split it: learn (30), contribute (60), own something (90). Name a deliverable at each stage.",
  "What kind of company culture brings out your best work?":
    "Describe what you need to do good work, and check it against what you have seen here.",
  "What are your salary expectations for {role}?":
    "Give a researched range, say it is for the whole package, and ask what they have budgeted.",
  "When could you start?":
    "State your notice period plainly and offer a date. Do not undercut your current employer.",
  "How did you hear about this opening?":
    "Short factual answer, then pivot to what made you act on it.",
  "What do you think this job involves that people outside it would not guess?":
    "Shows whether you have done the job. Pick the unglamorous part and say you are fine with it.",
  "Is there anything about the posting that gave you pause?":
    "Raise a real one and ask about it. It reads as confidence, and you get the answer you need.",

  /* ── Behavioural ── */
  "Tell me about a time you failed at something that mattered.":
    "Own it in one sentence, no shared blame, then spend the rest on what you changed and what happened next.",
  "Describe a conflict with a colleague and how it ended.":
    "Focus on the disagreement, not the person. End with the working relationship intact.",
  "Tell me about the hardest problem you have solved at work.":
    "Explain why it was hard before you explain the fix. Name the constraint that made it interesting.",
  "Describe a time you had to deliver under an unreasonable deadline.":
    "Say what you cut and who you told. Heroics with no trade-offs sound invented.",
  "Tell me about a time you changed your mind after someone challenged you.":
    "They are testing ego. Name the evidence that moved you and credit whoever brought it.",
  "Describe a moment you had to give difficult feedback.":
    "Private, specific, about behaviour not character. Say how the person responded.",
  "Tell me about a time you received criticism you did not agree with.":
    "Show you took it seriously before deciding. Disagreeing well matters more than being right.",
  "Describe a project that did not go to plan. What did you do?":
    "Signal early, replan visibly, keep stakeholders informed. Silence is the failure mode they fear.",
  "Tell me about a time you had to work with incomplete information.":
    "State the assumption you made, how you flagged it, and how you would have known if it was wrong.",
  "Describe a time you went beyond what the job required.":
    "One concrete example with a result. Avoid anything that sounds like a martyr complex.",
  "Tell me about a time you had to say no.":
    "Explain the trade-off you protected and what you offered instead of a flat refusal.",
  "Describe a situation where you had to influence someone with no authority over them.":
    "Evidence, shared goals, and making their life easier. Not persistence alone.",
  "Tell me about a decision you made that turned out wrong.":
    "Describe the information you had at the time, then what you would do differently now.",
  "Describe a time you spotted a problem nobody else had noticed.":
    "How you noticed matters as much as what you found. Name the habit that surfaced it.",
  "Tell me about a time you had to learn something difficult quickly.":
    "Name the method — who you asked, what you read, what you built to test it. Not just the outcome.",
  "Describe the most tedious task you have owned and how you handled it.":
    "They are checking whether you are above the grunt work. Ideally you automated or improved it.",
  "Tell me about a time you disagreed with a decision but had to carry it out.":
    "Disagree and commit. Say how you raised it, and that you executed properly once decided.",
  "Describe a time you had to rebuild trust with someone.":
    "Consistency over apology. Describe what you changed and how long it took.",
  "Tell me about your proudest piece of work.":
    "Pick something with a measurable result and name your specific contribution within the team's.",
  "Describe a time you had to ask for help.":
    "Shows self-awareness. Say how quickly you asked — late asking is the real failure.",
  "Tell me about a time you juggled several competing priorities.":
    "Explain the basis you prioritised on and who you told about what slipped.",
  "Describe a time you improved a process nobody asked you to improve.":
    "Quantify the saving and say how you got others to adopt it.",

  /* ── Working style ── */
  "How do you plan a week when everything is urgent?":
    "Name your triage rule — impact, deadline, who is blocked — and that you renegotiate rather than silently drop.",
  "How do you prefer to receive feedback?":
    "Direct and early. Say so, and mention how you act on it.",
  "Do you work better alone or in a team? Be honest.":
    "Say which parts of the work need each, rather than claiming to love both equally.",
  "How do you keep stakeholders informed without drowning them?":
    "A regular short update beats long ad-hoc ones. Match detail to what each person decides.",
  "What does a productive day look like for you?":
    "Show you protect focus time and that you know your own rhythm.",
  "How do you handle a colleague who is not pulling their weight?":
    "Talk to them first, assume a reason, escalate only when it keeps affecting delivery.",
  "How do you work with people in other time zones?":
    "Written-first, decisions in the document, overlap hours reserved for things that need talking.",
  "What is your approach to documentation?":
    "Write what future-you would need. Say where you draw the line so it does not go stale.",
  "How do you decide when something is good enough to ship?":
    "Tie it to the risk of being wrong. Reversible decisions ship earlier than irreversible ones.",
  "How do you handle interruptions to deep work?":
    "Batching, status signals, and being reachable for genuine emergencies.",
  "Describe your ideal working environment.":
    "Be honest about what you need. Describing their exact setup back to them sounds rehearsed.",
  "How do you onboard yourself into an unfamiliar codebase, account or process?":
    "Follow one real end-to-end case, write down what confused you, then fix the docs.",
  "How do you keep your skills current?":
    "Name specifics — what you read, what you built recently. Vague answers land badly here.",
  "How do you handle stress in a bad week?":
    "Practical mechanisms, not stoicism. Say how you tell someone before it becomes a problem.",
  "What would your last manager say is your biggest weakness?":
    "A real one with the mechanism you use to manage it. \"I work too hard\" is a wasted answer.",
  "What would your closest colleague say you are best at?":
    "Pick something relevant to {role} and back it with an example they would recognise.",
  "How do you handle being the least experienced person in the room?":
    "Ask clearly, take notes, come back with something useful. Do not fake understanding.",
  "How do you handle being the most experienced person in the room?":
    "Create space for others, ask before telling, and say how you avoid becoming the bottleneck.",

  /* ── Engineering ── */
  "Walk me through the architecture of something you built end to end.":
    "Start with the constraint, then the shape, then what you would change. Name a trade-off you accepted.",
  "How do you decide between fixing technical debt and shipping features?":
    "Tie debt to a cost that is being paid now — slower delivery, incidents — not tidiness.",
  "What does a good code review look like to you?":
    "Small diffs, questions over commands, and separating blocking issues from preferences.",
  "How do you test work where the requirements keep moving?":
    "Test the behaviour that is stable, keep the rest thin, and make the suite cheap to change.",
  "Tell me about a production incident you were responsible for.":
    "Timeline, blast radius, how you stopped it, what you changed so it cannot recur. No blame.",
  "How do you approach performance problems you cannot reproduce?":
    "Measure first. Instrument, narrow by data, and resist changing things on a hunch.",
  "Explain a technical concept from your work to someone non-technical.":
    "Analogy, then consequence for them. Check they followed rather than assuming.",
  "How do you keep a large codebase understandable as a team grows?":
    "Clear boundaries, consistent conventions, and making the right thing the easy thing.",
  "What is your approach to error handling and logging?":
    "Fail loudly at boundaries, log with enough context to act, and never log secrets.",
  "How do you decide what to automate?":
    "Frequency times pain versus cost to build and maintain. Automating the rare and fiddly is a trap.",
  "Describe how you would debug a bug that only appears in production.":
    "Differences first: data, scale, config, concurrency. Add observability before guessing.",
  "What are the trade-offs between a monolith and services for a small team?":
    "A monolith until the team or the scaling story forces otherwise. Name the operational cost.",
  "How do you keep dependencies from becoming a liability?":
    "Few, well-chosen, pinned, and updated on a schedule rather than in a panic.",
  "How do you handle database migrations with zero downtime?":
    "Expand, migrate, contract. Backwards-compatible in both directions while both versions run.",
  "What does secure-by-default mean in your work?":
    "Least privilege, validate at the boundary, secrets out of code, and safe defaults over documentation.",

  /* ── Data ── */
  "Walk me through an analysis that changed a decision.":
    "The decision is the point, not the technique. Say what would have happened without the work.",
  "How do you check whether a dataset can be trusted?":
    "Row counts over time, nulls, duplicates, range checks, and reconciling against a known source.",
  "How do you explain a statistical result to a sceptical stakeholder?":
    "Lead with the decision it supports, show the uncertainty honestly, avoid jargon.",
  "Tell me about a model or report you built that was not used. Why not?":
    "Usually a stakeholder or workflow problem, not a modelling one. Show you learned that.",
  "How do you tell correlation from something worth acting on?":
    "Plausible mechanism, stability over time, and ideally an experiment. Say when you would not act.",
  "How do you handle missing or clearly wrong data?":
    "Understand why it is missing before choosing a fix, and state the assumption in the output.",
  "How do you pick a metric that will not be gamed?":
    "Pair it with a guardrail metric and measure the outcome rather than the activity.",
  "Describe your approach to designing an experiment or A/B test.":
    "Hypothesis, primary metric, power and duration up front. No peeking and no post-hoc segment hunting.",
  "How do you keep a pipeline maintainable as sources change?":
    "Contracts at the boundary, tests on the data, and alerting on shape rather than only failures.",
  "When is a simple model the right answer over a complex one?":
    "Nearly always to start: explainable, quick to ship, and a baseline the complex one must beat.",

  /* ── Design ── */
  "Walk me through one case study from research to shipped design.":
    "Problem, what you learned, what you rejected, what shipped, what the numbers did.",
  "How do you handle a stakeholder who redesigns your work for you?":
    "Get to the underlying concern. They usually have a real problem and a bad solution.",
  "How do you know a design succeeded after launch?":
    "Agree the measure before shipping — task completion, support tickets, drop-off.",
  "How do you design when there is no research budget?":
    "Support tickets, sales calls, five users, analytics. Cheap evidence beats no evidence.",
  "How do you balance accessibility against a client's visual ambitions?":
    "Treat it as a constraint like any other. Show that the accessible version is usually the better one.",
  "How do you keep a design system from drifting out of date?":
    "Ownership, contribution route, and making the component easier to use than a one-off.",
  "How do you hand work over to engineers so nothing gets lost?":
    "States and edge cases specified, not just the happy path. Be available during the build.",
  "How do you critique someone else's design without crushing them?":
    "Critique against the goal, ask before asserting, and separate taste from problems.",

  /* ── Product ── */
  "How do you decide what does not get built?":
    "Explicit criteria and a visible no. Saying no well is most of the job.",
  "Walk me through how you would prioritise a backlog you just inherited.":
    "Talk to users and the team first, find the goal, then cut ruthlessly against it.",
  "Tell me about a feature you killed.":
    "What evidence convinced you, how you told the people invested, what you did with the effort.",
  "How do you write a spec engineers actually want to read?":
    "Problem and constraints over solutions, decisions recorded, short enough to be read.",
  "How do you handle sales promising something that does not exist?":
    "Fix the immediate customer situation, then the process that allowed it.",
  "What metrics would you watch in the first month in this role?":
    "Pick two or three tied to the product's actual job, and say why the obvious ones mislead.",
  "How do you run a discovery when users are hard to reach?":
    "Proxy sources — support, sales, analytics, competitors — and be explicit about the weaker evidence.",

  /* ── Sales ── */
  "Walk me through your process from first contact to close.":
    "Stages, what qualifies a move between them, and where you most often lose deals.",
  "Tell me about the largest deal you have closed and what nearly lost it.":
    "The near-miss is the interesting half. Show you saw it coming and what you did.",
  "How do you handle a prospect who goes quiet after a good call?":
    "Give a reason to reply that helps them, set a decision date, and know when to close the file.",
  "How do you qualify out early instead of wasting a quarter?":
    "Budget, authority, a real problem, and a deadline. Say what makes you walk away.",
  "Sell me something in this room.":
    "Ask questions before pitching. Diving into features is the failure they are looking for.",
  "How do you handle a price objection without discounting?":
    "Re-anchor on value and cost of inaction, then change scope rather than price.",
  "How do you build a pipeline from nothing in a new territory?":
    "Segment, pick a beachhead, use references, and say what your weekly activity actually looks like.",

  /* ── Marketing ── */
  "Walk me through a campaign you ran end to end and its numbers.":
    "Objective, audience, channel logic, spend, result. Bring the numbers even if they are unflattering.",
  "How do you decide where a limited budget goes?":
    "Where you have evidence, plus a small deliberate share on tests.",
  "Tell me about a campaign that underperformed and what you learned.":
    "Diagnose it properly — targeting, message, offer, timing — rather than blaming the channel.",
  "How do you measure something that does not convert immediately?":
    "Leading indicators, holdout groups, and being honest about attribution limits.",
  "How do you brief a designer or writer so you get what you need?":
    "Audience, message, one action, and hard constraints. Not a description of the artwork you imagined.",
  "What would you change about our current marketing?":
    "Have two specifics ready. Be generous about intent and concrete about the fix.",

  /* ── Operations ── */
  "Tell me about a process you redesigned and what it saved.":
    "Before and after with a number — hours, errors, cost — and how you got people to adopt it.",
  "How do you keep a project on track when a dependency slips?":
    "Know the critical path, replan early, and communicate the new date once rather than daily hope.",
  "How do you handle a supplier or partner who keeps missing deadlines?":
    "Data before confrontation, then a clear expectation and a consequence you can actually apply.",
  "How do you decide what to escalate and what to absorb?":
    "Escalate what changes someone else's plan. Absorbing everything is how deadlines die quietly.",
  "How do you document a process so someone else can run it?":
    "Write it, then have someone follow it without you and fix what they trip on.",

  /* ── Support ── */
  "Tell me about the angriest customer you have turned around.":
    "Acknowledge, own, fix, follow up. The follow-up is what actually turns them.",
  "How do you handle a customer asking for something you cannot do?":
    "Say no clearly, explain why, and offer the nearest real alternative. Do not imply a maybe.",
  "How do you keep quality up when the queue is long?":
    "Triage, templates for the repeatable, and flagging when the queue is a staffing problem.",
  "How do you feed recurring complaints back to the product team?":
    "Volume and impact, not anecdotes. Make it easy for them to act on.",
  "How do you know when to escalate rather than keep trying?":
    "A time or attempt limit set in advance, so the customer is not paying for your persistence.",

  /* ── Finance ── */
  "Walk me through how you close a month.":
    "Sequence, controls, and where it usually goes wrong. Show you know the timetable pressure.",
  "Tell me about a discrepancy you found and how you resolved it.":
    "How you spotted it, how you traced it, and the control you added afterwards.",
  "How do you explain a variance to someone who is not financial?":
    "Driver, size, and what to do about it. Skip the account codes.",
  "How do you keep controls tight without slowing the business down?":
    "Risk-weight them. Heavy controls on the few things that matter, light everywhere else.",
  "What would you check first in a forecast you did not build?":
    "The assumptions and who owns them, then sensitivity on the two that move the answer most.",

  /* ── Generic role & technical ── */
  "What part of {role} do you expect to find hardest?":
    "Name something genuinely hard and your plan for it. \"Nothing\" reads as not understanding the job.",
  "What would you need in your first week to be effective?":
    "Access, a first task, and the people to meet. Shows you have started before day one.",
  "Which part of this job would you happily never do again?":
    "Be honest but professional, and confirm you will still do it well.",
  "What tools do you expect to use daily in {role}?":
    "Tests whether you read the posting. Name theirs and your depth in each honestly.",
  "How would you measure whether you were doing {role} well?":
    "Outcomes, not activity. Pick measures the team would recognise as fair.",
  "What is the most useful thing you learned in your last job?":
    "Something that changed how you work, with the moment that taught it.",
  "Which of your skills is most underused right now?":
    "Frame it as what you would bring here, not as a complaint about your current job.",
  "How do you handle work you consider beneath your level?":
    "Do it well, then fix why it needed doing manually.",
  "What would you do in your first week if nobody gave you direction?":
    "Meet people, follow the work end to end, find the obvious small fix, and check before doing it.",
  "How do you check your own work before calling it finished?":
    "A concrete routine — a checklist, a fresh pass later, someone else's eyes on the risky part.",
  "Talk me through something you built or ran that you would now do differently.":
    "Shows growth. Be specific about what you know now that you did not then.",
  "How do you estimate how long something will take?":
    "Break it down, use past comparables, give a range, and say how you handle being wrong.",
  "What is the riskiest assumption in how you work?":
    "Self-awareness question. Name a real one and the check you run against it.",
  "How do you stay accurate when you are moving fast?":
    "Say which checks you never skip, and what you deliberately accept as a risk.",

  /* ── Questions to ask them ── */
  "What does success in {role} look like after six months?":
    "Their answer tells you whether the role is defined. Vagueness here is a warning.",
  "What is the biggest challenge facing the team right now?":
    "You find out what you would walk into, and it shows you are thinking about the work.",
  "Why is this role open?":
    "Growth or backfill. If backfill, ask what the last person found hard.",
  "How is performance actually reviewed here?":
    "\"Actually\" matters. Listen for whether there is a real process or improvisation.",
  "Who would I work with most closely day to day?":
    "Tells you the real team, which is often not the org chart.",
  "What has someone in this role struggled with before?":
    "The most useful question in the set. It surfaces the thing nobody volunteers.",
  "How are decisions made when people disagree?":
    "Culture question disguised as a process question.",
  "What does the first month look like for a new starter?":
    "Reveals whether onboarding exists or you will be left to sink.",
  "How does the team handle mistakes?":
    "Listen for blame versus learning. Ask for a recent example.",
  "What is changing about {company} over the next year?":
    "Shows you are thinking beyond the vacancy, and you learn about stability.",
  "How much of the week is meetings?":
    "Practical and revealing. Ask what a typical calendar looks like.",
  "What would make you glad you hired me?":
    "Invites them to describe the ideal hire, which you can then address.",
  "Is there anything in my background that gives you doubt?":
    "Lets you answer the objection before you leave the room. Ask it near the end.",
  "What are the next steps, and when should I expect to hear?":
    "Always ask. It sets a follow-up date and closes the conversation properly.",
};
