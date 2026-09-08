export type FaqCategory =
  | "Getting started"
  | "Tracking"
  | "CV & documents"
  | "Tools"
  | "Premium"
  | "Privacy & data"
  | "Account"
  | "Troubleshooting";

export type FaqItem = {
  id: string;
  category: FaqCategory;
  q: string;
  a: string;
  links?: { label: string; href: string }[];
};

export const FAQ_CATEGORIES: FaqCategory[] = [
  "Getting started",
  "Tracking",
  "CV & documents",
  "Tools",
  "Premium",
  "Privacy & data",
  "Account",
  "Troubleshooting",
];

export const FAQ: FaqItem[] = [
  {
    id: "what-is-it",
    category: "Getting started",
    q: "What is TrackMyself?",
    a: "A job application tracker. You record the roles you have applied for, move them through ten pipeline stages, keep every CV and cover letter in one library, and generate tailored documents per application. It also includes six browser tools for the fiddly parts of applying — headshots, banners, PDFs and job-ad analysis.",
    links: [{ label: "See the pipeline", href: "/#trending" }],
  },
  {
    id: "need-account",
    category: "Getting started",
    q: "Do I need an account?",
    a: "Not for the tools. The image optimizer, PDF splitter, JD analyser, background remover, profile image generator and banner generator all work without signing in. You need an account to track applications and to save a CV, because those have to be stored somewhere.",
    links: [{ label: "Open the tools", href: "/tools" }],
  },
  {
    id: "is-it-free",
    category: "Getting started",
    q: "Is it free?",
    a: "Tracking is free and unlimited — there is no cap on applications, interview stages or documents. Premium adds AI CV tailoring, full-resolution image exports and extra file formats. The tracker itself is never limited.",
  },
  {
    id: "first-application",
    category: "Getting started",
    q: "How do I add my first application?",
    a: "Go to My Applications and choose New Application. Company and job title are the only required fields; everything else — platform, salary, contact, notes, job link — is optional and can be filled in later.",
    links: [{ label: "My Applications", href: "/me/applications" }],
  },
  {
    id: "import-spreadsheet",
    category: "Getting started",
    q: "Can I import my existing spreadsheet?",
    a: "Not yet. There is no CSV import at the moment, so existing applications have to be added manually. If this matters to you, say so — it is a straightforward feature to add.",
  },

  {
    id: "ten-stages",
    category: "Tracking",
    q: "What are the ten stages?",
    a: "Wishlist, Submitted, No Response, Interview Scheduled, four Active rounds (Written, HR, Technical, Cultural Fit), Offer Received and Rejected. The four Active rounds are separate on purpose — a technical round and a culture interview are not the same signal, and collapsing them loses the pattern.",
  },
  {
    id: "ghost-jobs",
    category: "Tracking",
    q: "What is a ghost job and how is it flagged?",
    a: "An application that has sat in Wishlist, Submitted or No Response for more than 45 days since its applied date. TrackMyself flags these automatically so you stop waiting on listings that were never going to answer. You can also mark one manually.",
  },
  {
    id: "duplicates",
    category: "Tracking",
    q: "How does duplicate detection work?",
    a: "Applications are compared on company name and job title, ignoring case and surrounding spaces. If you are about to add one that matches an existing record, you are warned before it saves — and you can save anyway if the duplicate is deliberate, such as reapplying a year later.",
  },
  {
    id: "interview-rounds",
    category: "Tracking",
    q: "Can I track individual interview rounds?",
    a: "Yes. Each application holds its own interview records with a stage name, status, scheduled date, feedback and notes, so a four-round process stays legible instead of collapsing into one status.",
  },
  {
    id: "per-application-docs",
    category: "Tracking",
    q: "Can I generate documents for a specific application?",
    a: "Yes. The Docs button on any application row gives you a CV, a resume tailored to that role, or a cover letter addressed to that company — generated as Word files. If you have starred a stored CV in My Documents, that file is served directly instead.",
  },

  {
    id: "cv-formats",
    category: "CV & documents",
    q: "Which CV formats can I export?",
    a: "Four from one set of details: ATS Friendly at three pages, ATS Compact at two, Europass with the CEFR language grid, and Designer with a dark header band. A German Lebenslauf format also exists and is restricted to superadministrator accounts.",
    links: [{ label: "Open the CV builder", href: "/me/cv" }],
  },
  {
    id: "real-docx",
    category: "CV & documents",
    q: "Are the downloads real Word files?",
    a: "Yes — genuine .docx documents with real tables, bullet numbering and embedded images, generated server-side. They are not HTML renamed to .doc, which is what most free builders hand you and what breaks when a recruiter opens it.",
  },
  {
    id: "no-pdf",
    category: "CV & documents",
    q: "Why is there no PDF export?",
    a: "Because a converted PDF is only as good as the converter, and Word and LibreOffice do it better than a browser can. Open the .docx and save as PDF from there. Send .docx to upload forms — many applicant tracking systems parse it more reliably — and PDF when emailing a human.",
  },
  {
    id: "ats-photo",
    category: "CV & documents",
    q: "Why does the ATS CV have no photo?",
    a: "Parsers choke on embedded images, and many international employers must anonymise or reject CVs with photographs before review. The photo is embedded only in the Lebenslauf and Designer formats, where it is expected.",
  },
  {
    id: "two-vs-three",
    category: "CV & documents",
    q: "Two pages or three?",
    a: "Two pages for screening, three for browsing. A recruiter deciding whether to shortlist you spends seconds — brevity wins. Someone who clicked through from your portfolio has time — depth wins. The two-page variant uses your short summary, grouped skills and fewer bullets on older roles.",
  },
  {
    id: "profile-photo-source",
    category: "CV & documents",
    q: "Where does the photo in my CV come from?",
    a: "From the profile picture you star in My Documents. It is embedded automatically at generation time, so you never paste image data into a form. A 35 × 45 mm portrait is the German standard and works everywhere else too.",
    links: [{ label: "My Documents", href: "/me/my-cv" }],
  },
  {
    id: "my-documents",
    category: "CV & documents",
    q: "What is My Documents for?",
    a: "It is your application file library, split into CVs, resumes, cover letters, certificates, a profile picture, a cover image and anything else. Starring an item in a section marks it as the one TrackMyself uses when generating documents for a job.",
  },
  {
    id: "ai-tailor",
    category: "CV & documents",
    q: "What does AI Tailor actually change?",
    a: "It rewrites your summary, sharpens your positioning line and reorders your skill groups so the closest match to the job comes first. It never rewrites your roles or bullet points — your work history stays exactly as you wrote it. Review the result before sending it anywhere.",
  },

  {
    id: "tools-upload",
    category: "Tools",
    q: "Do the tools upload my files?",
    a: "No. Every tool runs inside your browser using Canvas and, for background removal, an on-device model. Your images and PDFs never reach our servers. You can verify this by opening your browser's network tab while using them.",
  },
  {
    id: "model-download",
    category: "Tools",
    q: "Why does the background remover download something the first time?",
    a: "It fetches the MODNet portrait-matting model — roughly 25 MB — so the cutout can happen on your device instead of on a server. Your browser caches it, so it downloads once. MODNet is Apache-2.0 licensed, which is why it was chosen over the better-known alternatives.",
  },
  {
    id: "banner-sizes",
    category: "Tools",
    q: "What sizes does the banner generator produce?",
    a: "LinkedIn profile cover 1584 × 396, LinkedIn company page 1128 × 191, GitHub profile README 1776 × 592, GitHub repo social preview 1280 × 640, X header 1500 × 500, plus any custom size. It draws each platform's safe zone on the preview — LinkedIn's avatar overlap and X's mobile crop — so nothing important ends up hidden.",
    links: [{ label: "Banner generator", href: "/tools/banner-generator" }],
  },
  {
    id: "profile-shapes",
    category: "Tools",
    q: "What does the profile image generator do?",
    a: "Removes the background, corrects lighting by measuring your photo, then crops to circle, rounded square or square at LinkedIn, GitHub and CV dimensions. You can drop in any background colour or keep it transparent.",
    links: [{ label: "Profile image generator", href: "/tools/profile-image" }],
  },
  {
    id: "browser-support",
    category: "Tools",
    q: "Which browsers work?",
    a: "Any current Chrome, Edge, Firefox or Safari. The AI tools need reasonably modern hardware; they run faster where WebGPU is available but fall back to WebAssembly. On a phone the background remover works but takes noticeably longer.",
  },

  {
    id: "premium-includes",
    category: "Premium",
    q: "What does Premium add?",
    a: "AI CV tailoring, full-resolution image exports with your choice of PNG, JPG or WebP and a quality slider, 2× retina banner export, and a one-click download of every banner size. Tracking, the CV formats and the Word exports are all free.",
  },
  {
    id: "how-to-upgrade",
    category: "Premium",
    q: "How do I get Premium?",
    a: "At the moment an administrator sets it on your account — there is no automated billing and no payment details are collected. If subscriptions are introduced, pricing will be published before anyone is charged.",
  },
  {
    id: "premium-delay",
    category: "Premium",
    q: "I was upgraded but still see the free limits.",
    a: "Role and plan are cached for up to five minutes. Wait a moment and reload — you do not need to sign out and back in. Superadministrator and Paid accounts always have Premium regardless of the plan field.",
  },

  {
    id: "what-collected",
    category: "Privacy & data",
    q: "What data do you collect?",
    a: "Your account details, the applications and interviews you record, your CV profile, and any documents you upload. Files opened in the browser tools are never collected because they never leave your device. There is no advertising or cross-site tracking anywhere on the site.",
    links: [{ label: "Privacy Policy", href: "/privacy" }],
  },
  {
    id: "who-sees",
    category: "Privacy & data",
    q: "Who can see my applications?",
    a: "Other ordinary users cannot. Accounts with editor, administrator or superadministrator permissions can see application records across the platform, because the dashboard exists to maintain the service. This is stated plainly in the Privacy Policy rather than buried.",
    links: [{ label: "Privacy Policy", href: "/privacy" }],
  },
  {
    id: "delete-data",
    category: "Privacy & data",
    q: "How do I delete my data?",
    a: "Delete any individual application or document at any time from within the app. To remove the whole account, open your profile page and use Delete account under Account. You type DELETE to confirm, and enter your password if you have one. The account, its applications, interviews, reminders, CV profile and uploaded files are erased together, immediately and permanently — no support ticket, no waiting period.",
    links: [{ label: "My profile", href: "/me" }],
  },
  {
    id: "ai-training",
    category: "Privacy & data",
    q: "Is my CV used to train AI models?",
    a: "No. Text is sent to the AI provider only when you press AI Tailor or generate a banner, it is used to answer that one request, and it is not used for training. We do not sell personal data.",
  },

  {
    id: "pause-account",
    category: "Account",
    q: "Can I pause my account instead of deleting it?",
    a: "Yes. Pause it from your profile page and application tracking freezes — you cannot add or edit applications, from the site or the browser extension. Nothing is deleted: every record stays readable, and the CV builder, My Documents and all the browser tools keep working. Resume takes one click and applies instantly.",
    links: [{ label: "My profile", href: "/me" }],
  },
  {
    id: "delete-account",
    category: "Account",
    q: "How do I delete my account?",
    a: "Profile page, Account section, Delete account. Type DELETE, enter your password if your account has one, and everything goes at once. Download anything you want to keep first — CVs export as Word files from the builder. Superadministrator accounts cannot be deleted this way, because it would lock the platform.",
    links: [{ label: "My profile", href: "/me" }],
  },
  {
    id: "google-signin",
    category: "Account",
    q: "Can I sign in with Google?",
    a: "Yes, and you can also use an email and password. If you sign in with Google we store your name, email and profile picture URL. Passwords, when used, are stored only as a bcrypt hash.",
  },
  {
    id: "change-password",
    category: "Account",
    q: "How do I change my password?",
    a: "On your profile page, under Change Password. You will need your current password to set a new one.",
    links: [{ label: "My profile", href: "/me" }],
  },
  {
    id: "roles",
    category: "Account",
    q: "What are the roles?",
    a: "Superadmin, Admin, Editor, Paid and Free. The first three reach the maintenance dashboard; ordinary users do not. Superadmin and Paid accounts carry Premium automatically. Each role has its own icon across the interface so account type is visible at a glance.",
  },
  {
    id: "dashboard-access",
    category: "Account",
    q: "I am an administrator — where is the dashboard?",
    a: "In the account menu at the top right, or at /dashboard. It shows applications across all users, analytics, CV adoption, user management, settings and the access-control matrix. Free and Premium users are redirected away from it.",
  },

  {
    id: "bg-remove-fails",
    category: "Troubleshooting",
    q: "Background removal failed or hung.",
    a: "Usually the model download was interrupted or memory ran short on a very large image. Reload the page and try again, or resize the photo below about 3000 px first. A private window with a cold cache will re-download the model.",
  },
  {
    id: "docx-looks-wrong",
    category: "Troubleshooting",
    q: "My downloaded CV looks wrong.",
    a: "Check the page count after opening it — Word and LibreOffice paginate slightly differently, and the two-page variant has only a few lines of headroom. If a role pushed it over, trim a bullet rather than deleting content, so the other formats keep the detail.",
  },
  {
    id: "avatar-missing",
    category: "Troubleshooting",
    q: "My Google profile picture is not showing.",
    a: "Sign in with Google once more. The picture is only available during the sign-in exchange, so an account created before this was handled correctly will pick it up on the next sign-in. Until then you will see your role icon instead.",
  },
  {
    id: "lost-work",
    category: "Troubleshooting",
    q: "Will I lose my CV if I close the tab?",
    a: "Not if you saved it. The CV builder saves to your account when you press Save CV, and downloading a document saves first automatically. Anything typed and left unsaved is not kept.",
  },
];
