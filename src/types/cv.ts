export const CV_FORMATS = ["ats", "europass", "designer", "lebenslauf"] as const;
export type CVFormat = (typeof CV_FORMATS)[number];

export const CV_VARIANTS = ["full", "compact"] as const;
export type CVVariant = (typeof CV_VARIANTS)[number];

export const CV_FILE_CATEGORIES = [
  "cv",
  "resume",
  "cover-letter",
  "certificate",
  "profile-photo",
  "cover-image",
  "other",
] as const;
export type CVFileCategory = (typeof CV_FILE_CATEGORIES)[number];

export type CVContact = {
  city: string;
  addressFull: string;
  phone: string;
  email: string;
  linkedin: string;
  github: string;
  portfolio: string;
  huggingface: string;
};

export type CVPersonal = {
  dob: string;
  dobLong: string;
  nationality: string;
};

export type CVSkillGroup = { label: string; items: string };

export type CVExperience = {
  company: string;
  location: string;
  title: string;
  grade: string;
  dates: string;
  bullets: string[];
};

export type CVProject = { name: string; stack: string; text: string };

export type CVEducation = { degree: string; school: string; dates: string; note: string };

export type CEFRGrid = {
  listening: string;
  reading: string;
  spokenInteraction: string;
  spokenProduction: string;
  writing: string;
};

export type CVLanguage = {
  name: string;
  level: string;
  mother: boolean;
  cefr: CEFRGrid;
};

export type CVContent = {
  name: string;
  positioning: string;
  gradeTitle: string;
  contact: CVContact;
  personal: CVPersonal;
  summary: string;
  summaryShort: string;
  availability: string;
  skills: CVSkillGroup[];
  skillsCompact: CVSkillGroup[];
  experience: CVExperience[];
  projects: CVProject[];
  education: CVEducation[];
  certifications: string[];
  awards: string[];
  languages: CVLanguage[];
  photo: string;
  signatureCity: string;
};

export type CVFileMeta = {
  _id: string;
  name: string;
  size: number;
  mimeType: string;
  category: CVFileCategory;
  uploadedAt?: string;
  /* set on documents this app produced, not files the user uploaded */
  generated?: boolean;
  genFormat?: string;
  genVariant?: string;
  genDocType?: string;
  genOutput?: string;
  genFor?: string;
};

export type CVPrimaryFiles = {
  cv: string;
  resume: string;
  coverLetter: string;
  profilePhoto: string;
  coverImage: string;
};
