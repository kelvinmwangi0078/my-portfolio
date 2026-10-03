export type ProjectCategory = 'all' | 'graphic' | 'uiux' | 'web' | 'systems';

export interface ProjectMetric {
  label: string;
  value: string;
  context: string;
}

export interface CaseStudy {
  id: string;
  title: string;
  client: string;
  year: string;
  role: string;
  category: ProjectCategory;
  summary: string;
  tagline: string;
  image: string;
  accentColor: string;
  metrics: ProjectMetric[];
  deliverables: string[];
  techStack: string[];
  overview: string;
  challenge: string;
  solution: string;
  engineeringHighlights: string[];
  designHighlights: string[];
  liveUrl?: string;
  githubUrl?: string;
  featured?: boolean;
}

export interface SkillCategory {
  title: string;
  index: string;
  description: string;
  skills: {
    name: string;
    level: string;
    description: string;
  }[];
}

export interface ExperienceItem {
  period: string;
  role: string;
  company: string;
  location: string;
  highlights: string[];
}

export interface GraphicItem {
  id: string;
  title: string;
  category: 'branding' | 'packaging' | 'logos' | 'marketing' | 'print' | 'other';
  image: string;
  fileType?: string;
  fileSize?: string;
  description?: string;
  client?: string;
  isUserUploaded?: boolean;
  dateAdded: string;
}

export interface WebProject {
  id: string;
  title: string;
  url: string;
  githubUrl?: string;
  description: string;
  technologies: string[];
  image: string;
  role: string;
  year: string;
  isUserAdded?: boolean;
}

export interface PhotoItem {
  id: string;
  title: string;
  location?: string;
  cameraInfo?: string;
  description?: string;
  image: string;
  fileType?: string;
  fileSize?: string;
  dateAdded: string;
}


