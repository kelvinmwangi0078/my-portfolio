import { GraphicItem, WebProject } from '../types/portfolio';

export const INITIAL_GRAPHIC_GALLERY: GraphicItem[] = [];

export const INITIAL_WEB_PROJECTS: WebProject[] = [
  {
    id: 'kimc-website',
    title: 'KIMC — Kenya Institute of Mass Communication',
    url: 'https://kimc-website.vercel.app?_vercel_share=9RoHHJU3cZmc7F0OIJyvg56PWF70VwSI',
    description: 'Official academic website and student portal for the Kenya Institute of Mass Communication (KIMC), featuring dynamic course listings, faculty departments, campus media publications, and responsive mobile architecture.',
    technologies: ['React', 'TypeScript', 'Tailwind CSS', 'Next.js', 'Vercel'],
    image: new URL('../assets/images/kimc_website_preview_1791048017903.jpg', import.meta.url).href,
    role: 'Full-Stack Web Developer & UI Designer',
    year: '2026'
  },
  {
    id: 'mydms-system',
    title: 'MYDMS — Designer Marketplace & Escrow Platform',
    url: 'https://mydms-system.vercel.app/',
    description: 'A specialized creative marketplace connecting corporate clients with verified Kenyan graphic, brand, and UI/UX designers. Engineered with role-based governance for Clients, Designers, and Administrators with guaranteed milestone security through Safaricom M-Pesa escrow.',
    technologies: ['React', 'TypeScript', 'Tailwind CSS', 'Node.js', 'Safaricom M-Pesa API', 'Vercel'],
    image: new URL('../assets/images/project_cloud_os_interface_1791045085789.jpg', import.meta.url).href,
    role: 'Lead UI/UX Designer & Full-Stack Developer',
    year: '2026'
  },
  {
    id: 'unifound-system',
    title: 'UniFound — Campus Lost & Found Asset Management System',
    url: 'https://unifoundsystem.vercel.app/',
    description: 'Campus-wide lost and found web management system enabling university students and administrators to report, index, verify, and safely recover lost IDs, gadgets, and personal belongings with real-time status tracking.',
    technologies: ['React', 'TypeScript', 'Tailwind CSS', 'Database Management', 'Vercel'],
    image: new URL('../assets/images/unifound_preview_1791048032222.jpg', import.meta.url).href,
    role: 'System Architect & Full-Stack Developer',
    year: '2025 – 2026'
  }
];

export const COURSEWORK_INFO = {
  title: 'Specialized Coursework & Technical Training',
  courseworkList: [
    'System Analysis and Design',
    'Programming & Software Logic',
    'Web Hosting & Maintenance',
    'Database Management Systems (DBMS)',
    'Photoshop Techniques & Image Processing',
    'Electronic Commerce (E-Commerce)',
    'Multimedia Production',
    'Advertising & Brand Strategy'
  ],
  keyLearningAreas: [
    'Developing the ability to create compelling visual content that strengthens brand identity, captures attention, and enhances audience engagement.',
    'Building strong visual communication skills to effectively convey ideas through design.',
    'Gaining an understanding of how different systems (technological, organizational, and business) operate and can be improved.',
    'Acquiring skills in designing, editing, and enhancing digital images using modern design tools.',
    'Strengthening logical thinking and problem-solving abilities to develop efficient and effective software and digital solutions.'
  ]
};

export const CAREER_EXPERIENCES = [
  {
    period: 'May 2026 – August 2026',
    company: 'JHUB Africa',
    role: 'Creative Media Intern — Industrial Attachment Student',
    location: 'Nairobi, Kenya',
    responsibilities: [
      'Designed graphics and visual content for digital campaigns, promotional materials, and internal communications using tools such as Canva, Illustrator and Photoshop.',
      'Conducted professional photography sessions for events, projects, and content creation, ensuring high-quality visual representation of the hub\'s activities.',
      'Edited and produced video content for social media, presentations, and promotional use.',
      'Managed and maintained JHub Africa\'s social media platforms (e.g. Instagram, LinkedIn, X/Twitter, Facebook), including scheduling posts, engaging with followers, and tracking performance metrics.',
      'Collaborated with the communications team to develop and execute content strategies aligned with the hub\'s brand identity and digital transformation mission.'
    ]
  },
  {
    period: 'January 2025 – May 2025',
    company: 'Octagon Data System Limited',
    role: 'Industrial Attachment Student',
    location: 'Nairobi, Kenya',
    responsibilities: [
      'Designed posters, presentations, and branded materials for both internal and external communication.',
      'Assisted in website content updates and basic layout improvements.',
      'Maintained consistency across visual and branding materials.',
      'Collaborated with different departments to deliver creative communication solutions.',
      'Created and edited digital content using Adobe Illustrator and Photoshop. Ensured all designs aligned with company standards and professional guidelines.'
    ]
  }
];

export const CORE_COMPETENCIES = [
  {
    title: 'High-Pressure Delivery & Tight Deadlines',
    description: 'Ability to work under pressure and consistently meet tight deadlines while maintaining uncompromising quality standards.'
  },
  {
    title: 'Attention to Detail & Accuracy',
    description: 'Strong attention to detail and accuracy in graphic design, web content creation, and technical task execution.'
  },
  {
    title: 'Interpersonal & Team Communication',
    description: 'Excellent interpersonal and communication skills, with the ability to collaborate effectively in diverse cross-functional environments.'
  },
  {
    title: 'Multitasking & Workload Organization',
    description: 'Ability to multitask, organize workload, and prioritize tasks efficiently in fast-paced operational settings.'
  },
  {
    title: 'Self-Driven Learning & Adaptability',
    description: 'Self-driven, adaptable, and flexible with a proactive, inquisitive approach to continuous learning and problem-solving.'
  },
  {
    title: 'Creative Problem-Solving & Practical Innovation',
    description: 'Creative thinker with the innate ability to generate innovative visual ideas and build practical, real-world digital solutions.'
  }
];