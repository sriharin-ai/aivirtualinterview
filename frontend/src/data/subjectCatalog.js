export const SEMESTERS = [
    '1st Semester', '2nd Semester', '3rd Semester', '4th Semester',
    '5th Semester', '6th Semester', '7th Semester', '8th Semester',
];

const INDIA_SUBJECTS = [
    { name: 'Data Structures & Algorithms', icon: '🌳', topics: ['Arrays', 'Linked Lists', 'Trees', 'Graphs', 'Dynamic Programming', 'Sorting Algorithms', 'Hashing', 'Recursion', 'Stack & Queue', 'Heaps'] },
    { name: 'Database Management Systems', icon: '🗄️', topics: ['SQL', 'Normalization', 'Transactions', 'Indexing', 'ER Model', 'Joins', 'ACID Properties', 'Query Optimization', 'Triggers', 'Stored Procedures'] },
    { name: 'Operating Systems', icon: '⚙️', topics: ['Process Management', 'Memory Management', 'Deadlocks', 'CPU Scheduling', 'File Systems', 'Paging', 'Segmentation', 'Semaphores', 'Virtual Memory', 'I/O Management'] },
    { name: 'Computer Networks', icon: '🌐', topics: ['OSI Model', 'TCP/IP', 'Routing Algorithms', 'DNS', 'HTTP/HTTPS', 'Subnetting', 'Socket Programming', 'Congestion Control', 'MAC Protocols', 'Network Security'] },
    { name: 'Object Oriented Programming', icon: '🧩', topics: ['Encapsulation', 'Inheritance', 'Polymorphism', 'Abstraction', 'Design Patterns', 'SOLID Principles', 'Exception Handling', 'Generics', 'Collections', 'Interfaces'] },
    { name: 'Theory of Computation', icon: '🔬', topics: ['Finite Automata', 'Regular Languages', 'Context-Free Grammars', 'Pushdown Automata', 'Turing Machines', 'Decidability', 'Complexity Classes', 'NP-Completeness'] },
    { name: 'Compiler Design', icon: '🔧', topics: ['Lexical Analysis', 'Syntax Analysis', 'Semantic Analysis', 'Intermediate Code', 'Code Optimization', 'Code Generation', 'Symbol Tables', 'Error Recovery'] },
    { name: 'Software Engineering', icon: '🏗️', topics: ['SDLC Models', 'Agile & Scrum', 'Requirements Engineering', 'Software Testing', 'UML Diagrams', 'Project Management', 'Software Metrics', 'Version Control'] },
    { name: 'Discrete Mathematics', icon: '📐', topics: ['Logic & Proofs', 'Set Theory', 'Graph Theory', 'Combinatorics', 'Relations & Functions', 'Boolean Algebra', 'Number Theory', 'Mathematical Induction'] },
    { name: 'Digital Electronics', icon: '💡', topics: ['Logic Gates', 'Combinational Circuits', 'Sequential Circuits', 'Flip-Flops', 'Counters', 'Registers', 'Multiplexers', 'Karnaugh Maps'] },
    { name: 'Microprocessors & Assembly', icon: '🖥️', topics: ['8086 Architecture', 'Assembly Language', 'Interrupts', 'Memory Interfacing', 'I/O Ports', 'DMA', 'Peripheral Devices', 'Microcontrollers'] },
    { name: 'Artificial Intelligence', icon: '🤖', topics: ['Search Algorithms', 'Heuristic Methods', 'Knowledge Representation', 'Inference Engines', 'Expert Systems', 'Machine Learning Basics', 'Neural Networks', 'NLP Basics'] },
    { name: 'Machine Learning', icon: '📊', topics: ['Linear Regression', 'Classification', 'Clustering', 'Decision Trees', 'SVM', 'Neural Networks', 'Feature Engineering', 'Model Evaluation', 'Ensemble Methods'] },
    { name: 'Web Technologies', icon: '🌍', topics: ['HTML/CSS', 'JavaScript', 'React/Angular', 'Node.js', 'REST APIs', 'Databases', 'Authentication', 'Web Security', 'Performance Optimization'] },
    { name: 'Computer Organization & Architecture', icon: '🏛️', topics: ['CPU Design', 'Instruction Set Architecture', 'Memory Hierarchy', 'Cache Memory', 'Pipeline', 'RISC vs CISC', 'I/O Organization', 'Multiprocessors'] },
];

const GLOBAL_SUBJECTS = [
    { name: 'Data Structures & Algorithms', icon: '🌳', topics: ['Arrays', 'Linked Lists', 'Trees', 'Graphs', 'Dynamic Programming', 'Sorting', 'Hashing', 'Recursion', 'Stack & Queue', 'Heaps'] },
    { name: 'Operating Systems', icon: '⚙️', topics: ['Process Management', 'Memory Management', 'Deadlocks', 'CPU Scheduling', 'File Systems', 'Paging', 'Virtual Memory', 'Semaphores', 'I/O Management'] },
    { name: 'Database Systems', icon: '🗄️', topics: ['SQL', 'Normalization', 'Transactions', 'Indexing', 'Query Optimization', 'NoSQL', 'ACID Properties', 'ER Modeling'] },
    { name: 'Computer Networks & Security', icon: '🌐', topics: ['OSI Model', 'TCP/IP', 'Routing', 'DNS', 'HTTP/HTTPS', 'Cryptography', 'Firewalls', 'Network Security', 'Subnetting'] },
    { name: 'Software Engineering', icon: '🏗️', topics: ['Agile & Scrum', 'SDLC', 'Requirements Engineering', 'Software Testing', 'Design Patterns', 'CI/CD', 'Code Review', 'UML'] },
    { name: 'Computer Architecture', icon: '🏛️', topics: ['CPU Design', 'Memory Hierarchy', 'Pipeline', 'Cache', 'RISC vs CISC', 'Instruction Sets', 'I/O Organization'] },
    { name: 'Discrete Mathematics', icon: '📐', topics: ['Logic & Proofs', 'Set Theory', 'Graph Theory', 'Combinatorics', 'Number Theory', 'Boolean Algebra', 'Mathematical Induction'] },
    { name: 'Algorithm Design & Analysis', icon: '🔍', topics: ['Divide & Conquer', 'Greedy Algorithms', 'Dynamic Programming', 'NP-Completeness', 'Complexity Analysis', 'Amortized Analysis'] },
    { name: 'Artificial Intelligence', icon: '🤖', topics: ['Search Algorithms', 'Knowledge Representation', 'Machine Learning', 'Neural Networks', 'NLP', 'Computer Vision', 'Reasoning'] },
    { name: 'Machine Learning & Deep Learning', icon: '📊', topics: ['Supervised Learning', 'Unsupervised Learning', 'Neural Networks', 'CNNs', 'RNNs', 'Transformers', 'Model Evaluation', 'Regularization'] },
    { name: 'Web Development', icon: '🌍', topics: ['HTML/CSS', 'JavaScript', 'React', 'Node.js', 'REST APIs', 'Authentication', 'Web Security', 'Performance'] },
    { name: 'Systems Programming', icon: '🛠️', topics: ['C/C++', 'Memory Management', 'Pointers', 'Concurrency', 'System Calls', 'Processes & Threads', 'Synchronization'] },
    { name: 'Object Oriented Programming', icon: '🧩', topics: ['Encapsulation', 'Inheritance', 'Polymorphism', 'Abstraction', 'Design Patterns', 'SOLID Principles', 'Exception Handling'] },
];

export const SUBJECT_CATALOG = {
    India: INDIA_SUBJECTS,
    Global: GLOBAL_SUBJECTS,
};

export const getSubjectsForCountry = (country) =>
    SUBJECT_CATALOG[country] || SUBJECT_CATALOG['Global'];

export const getTopicsForSubject = (subjectName, country) => {
    const subjects = getSubjectsForCountry(country);
    return subjects.find(s => s.name === subjectName)?.topics || [];
};

export const getSubjectIcon = (subjectName, country) => {
    const subjects = getSubjectsForCountry(country);
    return subjects.find(s => s.name === subjectName)?.icon || '📚';
};
