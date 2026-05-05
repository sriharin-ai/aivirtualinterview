export const EXPERIENCE_LEVELS = ['Junior', 'Mid-Level', 'Senior'];

const ROLES_DATA = [
    {
        name: 'MERN Stack Developer', icon: '⚛️', category: 'Engineering',
        topics: {
            Junior:      ['HTML/CSS/JS Basics', 'React Fundamentals', 'Node.js Intro', 'MongoDB CRUD', 'REST APIs', 'Git Basics'],
            'Mid-Level': ['React Hooks & Context', 'Redux/Zustand', 'Express Middleware', 'Mongoose ODM', 'JWT Auth', 'Unit Testing', 'Docker'],
            Senior:      ['Microservices', 'System Design', 'Performance Optimization', 'CI/CD Pipelines', 'Redis Caching', 'WebSockets', 'Security Hardening'],
        },
    },
    {
        name: 'Frontend Developer', icon: '🖥️', category: 'Engineering',
        topics: {
            Junior:      ['HTML/CSS', 'JavaScript ES6+', 'React Basics', 'Responsive Design', 'Browser APIs', 'Git'],
            'Mid-Level': ['TypeScript', 'React Hooks', 'State Management', 'Component Testing', 'Web Performance', 'Webpack/Vite', 'CSS-in-JS'],
            Senior:      ['System Design', 'Micro Frontends', 'Core Web Vitals', 'Accessibility (a11y)', 'Architecture Patterns', 'Design Systems'],
        },
    },
    {
        name: 'Backend Developer', icon: '☕', category: 'Engineering',
        topics: {
            Junior:      ['REST APIs', 'SQL Basics', 'HTTP Protocol', 'Authentication', 'Error Handling', 'Git'],
            'Mid-Level': ['Database Design', 'API Security', 'Caching Strategies', 'Message Queues', 'Integration Testing', 'Docker'],
            Senior:      ['Distributed Systems', 'System Design', 'Database Optimization', 'High Availability', 'Event-Driven Architecture', 'gRPC'],
        },
    },
    {
        name: 'Full Stack Developer', icon: '💻', category: 'Engineering',
        topics: {
            Junior:      ['HTML/CSS/JS', 'React/Vue Basics', 'Node.js', 'REST APIs', 'SQL/NoSQL', 'Git'],
            'Mid-Level': ['TypeScript', 'State Management', 'Auth & Sessions', 'Testing (unit + e2e)', 'Docker', 'CI/CD'],
            Senior:      ['System Design', 'Microservices', 'Performance', 'Security Architecture', 'Cloud Deployment', 'Tech Leadership'],
        },
    },
    {
        name: 'Data Scientist', icon: '📊', category: 'Data',
        topics: {
            Junior:      ['Python', 'Pandas & NumPy', 'Data Visualization', 'Descriptive Statistics', 'SQL', 'Jupyter Notebooks'],
            'Mid-Level': ['Machine Learning', 'scikit-learn', 'Feature Engineering', 'Model Evaluation', 'A/B Testing', 'Statistical Inference'],
            Senior:      ['Deep Learning', 'MLOps', 'Experiment Design', 'Causal Inference', 'Business Strategy', 'Stakeholder Communication'],
        },
    },
    {
        name: 'Data Analyst', icon: '📈', category: 'Data',
        topics: {
            Junior:      ['SQL', 'Excel / Google Sheets', 'Data Visualization', 'Basic Statistics', 'Tableau / Power BI'],
            'Mid-Level': ['Advanced SQL', 'Python (pandas)', 'Statistical Analysis', 'Dashboard Design', 'Data Modeling', 'ETL Basics'],
            Senior:      ['Business Intelligence Strategy', 'Data Governance', 'Stakeholder Management', 'Predictive Analytics', 'Team Leadership'],
        },
    },
    {
        name: 'Machine Learning Engineer', icon: '🤖', category: 'Data',
        topics: {
            Junior:      ['Python', 'ML Basics', 'scikit-learn', 'Data Preprocessing', 'Model Training & Evaluation', 'Git'],
            'Mid-Level': ['Deep Learning', 'PyTorch / TensorFlow', 'MLOps', 'Model Deployment', 'Feature Stores', 'Monitoring & Drift'],
            Senior:      ['Large-Scale ML Systems', 'LLMs & Fine-Tuning', 'Platform Architecture', 'Research to Production', 'Team Leadership'],
        },
    },
    {
        name: 'DevOps Engineer', icon: '⚙️', category: 'Engineering',
        topics: {
            Junior:      ['Linux Basics', 'Docker', 'Git & Branching', 'CI/CD Concepts', 'Cloud Basics', 'Shell Scripting'],
            'Mid-Level': ['Kubernetes', 'Terraform', 'AWS / GCP / Azure', 'Observability & Monitoring', 'Security Scanning', 'Ansible'],
            Senior:      ['Platform Engineering', 'SRE Practices', 'Incident Management', 'FinOps', 'Org-Level Architecture', 'Chaos Engineering'],
        },
    },
    {
        name: 'Cloud Engineer', icon: '☁️', category: 'Engineering',
        topics: {
            Junior:      ['Cloud Fundamentals', 'IAM & Access Control', 'Networking Basics', 'Storage Services', 'Compute (VMs)', 'CLI Tools'],
            'Mid-Level': ['Infrastructure as Code', 'Serverless', 'Cost Optimization', 'Cloud Security Best Practices', 'Multi-region Architecture'],
            Senior:      ['Cloud Architecture Patterns', 'Enterprise Migration', 'Cost Governance', 'Disaster Recovery', 'Multi-cloud Strategy'],
        },
    },
    {
        name: 'Product Manager', icon: '📝', category: 'Product',
        topics: {
            Junior:      ['Product Thinking', 'Writing User Stories', 'Agile / Scrum Basics', 'Roadmap Planning', 'Success Metrics', 'Stakeholder Communication'],
            'Mid-Level': ['OKRs & KPIs', 'Go-to-Market Strategy', 'Competitive Analysis', 'Data-Driven Decisions', 'A/B Testing', 'Cross-functional Leadership'],
            Senior:      ['Product Vision & Strategy', 'Business Model Thinking', 'Executive Communication', 'Platform & Ecosystem Thinking', 'Building PM Teams'],
        },
    },
    {
        name: 'UI/UX Designer', icon: '🎨', category: 'Design',
        topics: {
            Junior:      ['Design Principles', 'Figma Basics', 'User Research Methods', 'Wireframing', 'Prototyping', 'Color & Typography'],
            'Mid-Level': ['Design Systems', 'Usability Testing', 'Interaction Design', 'Accessibility (a11y)', 'User Flows', 'Dev Handoff'],
            Senior:      ['UX Strategy', 'Design Leadership', 'Research Ops', 'Product Thinking', 'Brand & Visual Systems', 'Mentoring Designers'],
        },
    },
    {
        name: 'Cybersecurity Engineer', icon: '🛡️', category: 'Engineering',
        topics: {
            Junior:      ['Network Fundamentals', 'Security Concepts', 'Vulnerability Scanning', 'Linux CLI', 'OWASP Top 10', 'Basic Cryptography'],
            'Mid-Level': ['Penetration Testing', 'Incident Response', 'Security Architecture', 'SIEM Tools', 'Cloud Security', 'Threat Modeling'],
            Senior:      ['Security Strategy', 'Red & Blue Team Ops', 'Compliance Frameworks', 'Risk Management', 'Zero-Trust Architecture', 'Leadership'],
        },
    },
    {
        name: 'QA Automation Engineer', icon: '🧪', category: 'Engineering',
        topics: {
            Junior:      ['Manual Testing', 'Writing Test Cases', 'Bug Reporting', 'Selenium Basics', 'API Testing (Postman)', 'Git'],
            'Mid-Level': ['Test Automation Frameworks', 'CI/CD Integration', 'Performance Testing', 'Mobile Testing', 'BDD / Gherkin', 'Contract Testing'],
            Senior:      ['Test Strategy & Architecture', 'Quality Gates', 'Shift-Left Testing', 'Test Observability', 'Team Leadership & Coaching'],
        },
    },
    {
        name: 'Mobile Developer', icon: '📱', category: 'Engineering',
        topics: {
            Junior:      ['React Native / Flutter Basics', 'Mobile UI Patterns', 'Consuming APIs', 'App Store Submission', 'Git'],
            'Mid-Level': ['State Management', 'Native Modules / Platform Channels', 'Performance Profiling', 'Push Notifications', 'Deep Linking', 'Testing'],
            Senior:      ['Architecture Patterns (MVI/MVVM)', 'CI/CD for Mobile', 'App Security', 'Platform Optimization', 'Tech Leadership'],
        },
    },
];

export const ROLE_CATALOG = ROLES_DATA;

export const getAllRoles = () => ROLES_DATA.map(r => r.name);

export const getTopicsForRole = (roleName, level = 'Mid-Level') => {
    const role = ROLES_DATA.find(r => r.name === roleName);
    if (!role) return [];
    return role.topics[level] || role.topics['Mid-Level'] || [];
};

export const getRoleIcon = (roleName = '') => {
    const role = ROLES_DATA.find(r => r.name === roleName);
    if (role) return role.icon;
    if (roleName.includes('Python') || roleName.includes('MERN') || roleName.includes('React') || roleName.includes('Frontend')) return '⚛️';
    if (roleName.includes('Data') || roleName.includes('Machine') || roleName.includes('AI') || roleName.includes('ML')) return '📊';
    if (roleName.includes('DevOps') || roleName.includes('Cloud')) return '☁️';
    if (roleName.includes('Security') || roleName.includes('Cyber')) return '🛡️';
    if (roleName.includes('Mobile') || roleName.includes('iOS') || roleName.includes('Android')) return '📱';
    if (roleName.includes('UI') || roleName.includes('UX') || roleName.includes('Designer')) return '🎨';
    if (roleName.includes('QA') || roleName.includes('Test')) return '🧪';
    if (roleName.includes('Product') || roleName.includes('Manager')) return '📝';
    if (roleName.includes('Java') || roleName.includes('Backend')) return '☕';
    return '💻';
};
