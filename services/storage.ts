
import { Applicant, ApplicationStatus, DocumentStatus, ExamQuestion, ExamSuite, Gender, QuestionType, CustomFieldDefinition, PaymentConfig, FieldConfig, CustomFieldType, FeeStatus, DocumentConfig, DocumentItem, InterviewSlot, Announcement, StaffUser, StaffRole } from '../types';

const STORAGE_KEY_APPLICANTS = 'uniadmit_applicants';
const STORAGE_KEY_EXAMS = 'uniadmit_exams';
const STORAGE_KEY_EXAM_SUITES = 'uniadmit_exam_suites';
const STORAGE_KEY_FIELD_CONFIGS = 'uniadmit_field_configs';
const STORAGE_KEY_DOC_CONFIGS = 'uniadmit_doc_configs';
const STORAGE_KEY_PAYMENT_CONFIG = 'uniadmit_payment_config';
const STORAGE_KEY_EDUCATION_MAJORS = 'uniadmit_edu_majors';
const STORAGE_KEY_INTERVIEW_SLOTS = 'uniadmit_interview_slots';
const STORAGE_KEY_ANNOUNCEMENTS = 'uniadmit_announcements';
const STORAGE_KEY_STAFF_USERS = 'uniadmit_staff_users';

// --- Constants ---
export const EDUCATION_LEVELS = [
  { id: 'doctoral', label: "Doctoral Degree", level: 4 },
  { id: 'master', label: "Master's Degree", level: 3 },
  { id: 'bachelor', label: "Bachelor's Degree", level: 2 },
  { id: 'diploma', label: "Diploma / Associate Degree", level: 1.5 },
  { id: 'high_school', label: "High School", level: 1 }
];

const INITIAL_EDUCATION_MAJORS = [
    "Computer Engineering", "Computer Science", "Business Administration", "Medicine", "Law", "Communication Arts", "Architecture", "Economics", "Psychology", "Other"
];

// --- Mock Data Initialization ---

export const INITIAL_EXAM_SUITES: ExamSuite[] = [
  { id: 'suite_apt', title: 'ความถนัด (Aptitude Test)', description: 'Logic, Math, and General Knowledge' },
  { id: 'suite_att', title: 'ทัศนคติ (Attitude Test)', description: 'Personality and situational judgment' }
];

const INITIAL_EXAMS: ExamQuestion[] = [
  // Aptitude Suite
  {
    id: 'q1',
    suiteId: 'suite_apt',
    text: 'What is the capital of France?',
    type: QuestionType.MCQ_SINGLE,
    score: 5,
    isGraded: true,
    options: [
      { id: 'o1', text: 'London', isCorrect: false },
      { id: 'o2', text: 'Berlin', isCorrect: false },
      { id: 'o3', text: 'Paris', isCorrect: true },
      { id: 'o4', text: 'Madrid', isCorrect: false },
    ]
  },
  {
    id: 'q2',
    suiteId: 'suite_apt',
    text: 'Select all prime numbers below 10.',
    type: QuestionType.MCQ_MULTI,
    score: 5,
    isGraded: true,
    options: [
      { id: 'o1', text: '2', isCorrect: true },
      { id: 'o2', text: '3', isCorrect: true },
      { id: 'o3', text: '4', isCorrect: false },
      { id: 'o4', text: '5', isCorrect: true },
      { id: 'o5', text: '9', isCorrect: false },
    ]
  },
  // Attitude Suite
  {
    id: 'q3',
    suiteId: 'suite_att',
    text: 'Why do you want to join our university?',
    type: QuestionType.ESSAY,
    score: 10,
    isGraded: true
  },
  {
    id: 'q4',
    suiteId: 'suite_att',
    text: 'You see a classmate cheating. What do you do?',
    type: QuestionType.MCQ_SINGLE,
    score: 5,
    isGraded: true,
    options: [
        { id: 'a1', text: 'Ignore it', isCorrect: false},
        { id: 'a2', text: 'Report to teacher', isCorrect: true},
        { id: 'a3', text: 'Join them', isCorrect: false}
    ]
  }
];

const INITIAL_INTERVIEW_SLOTS: InterviewSlot[] = [
    { 
        id: 'slot_1', 
        dateTime: '2023-12-01T09:00:00', 
        endTime: '2023-12-01T12:00:00', 
        location: 'Building A, Room 101', 
        type: 'Onsite', 
        capacity: 10, 
        booked: 2,
        groups: []
    },
    { 
        id: 'slot_2', 
        dateTime: '2023-12-01T13:00:00', 
        endTime: '2023-12-01T16:00:00', 
        location: 'Zoom Meeting Link', 
        type: 'Online', 
        capacity: 20, 
        booked: 5,
        groups: [] 
    }
];

const INITIAL_ANNOUNCEMENTS: Announcement[] = [
    {
        id: 'ann_1',
        title: 'System Announcement',
        message: 'The admission deadline is approaching (Dec 31st). Please ensure all documents are submitted.',
        timestamp: new Date().toISOString(),
        type: 'info'
    }
];

const INITIAL_STAFF_USERS: StaffUser[] = [
    { id: 'admin_1', username: 'superadmin', fullName: 'Super Admin', role: StaffRole.SUPER_ADMIN },
    { id: 'reviewer_1', username: 'reviewer1', fullName: 'Dr. Reviewer One', role: StaffRole.REVIEWER },
    { id: 'proctor_1', username: 'proctor1', fullName: 'Exam Proctor A', role: StaffRole.PROCTOR, assignedGroupIds: [] }
];

// Base documents required for everyone
export const MOCK_DOCS_TEMPLATE = {
  'doc_profile_pic': { id: 'doc_profile_pic', name: 'Profile Picture', status: DocumentStatus.PENDING, configId: 'doc_conf_pic' },
  'doc_trans': { id: 'doc_trans', name: 'Transcript (P.1)', status: DocumentStatus.PENDING, configId: 'doc_conf_trans' },
  'doc_id': { id: 'doc_id', name: 'ID Card Copy', status: DocumentStatus.PENDING, configId: 'doc_conf_id' },
  // House Registration Removed
};

const DEFAULT_FEE_STATUSES = {
    application: 'PENDING' as FeeStatus,
    interview: 'PENDING' as FeeStatus,
    tuition: 'PENDING' as FeeStatus
};

const INITIAL_APPLICANTS: Applicant[] = [
  {
    id: 'user_1',
    fullName: 'John Doe',
    age: 20,
    birthDate: '2003-05-15',
    gender: Gender.MALE,
    email: 'john@example.com',
    phone: '0812345678',
    address: '123 Bangkok',
    educations: [
        { id: 'edu_1', level: "Bachelor's Degree", degreeName: 'B.Eng Computer', institution: 'Chula', gpax: '3.50', fieldOfStudy: 'Computer Engineering', startYear: '2020', endYear: '2024' }
    ],
    status: ApplicationStatus.SUBMITTED,
    lastNotifiedStatus: ApplicationStatus.SUBMITTED,
    examAnswers: { 'q1': 'o3', 'q2': ['o1', 'o2', 'o4'] },
    examScore: 10,
    documents: {
      ...MOCK_DOCS_TEMPLATE,
      'doc_cert_edu_1': { id: 'doc_cert_edu_1', name: "Bachelor's Degree Certificate - B.Eng Computer", status: DocumentStatus.PENDING, isDynamic: true, configId: 'doc_conf_edu' },
      'doc_trans': { ...MOCK_DOCS_TEMPLATE['doc_trans'], status: DocumentStatus.UPLOADED, fileName: 'transcript.pdf' },
      'doc_id': { ...MOCK_DOCS_TEMPLATE['doc_id'], status: DocumentStatus.UPLOADED, fileName: 'id_card.jpg' },
      'doc_profile_pic': { ...MOCK_DOCS_TEMPLATE['doc_profile_pic'], status: DocumentStatus.UPLOADED, fileName: 'me.jpg' }
    },
    customData: {},
    isESigned: true,
    eSignTimestamp: new Date().toISOString(),
    feeStatuses: { ...DEFAULT_FEE_STATUSES, application: 'PAID' },
    fieldRejections: {},
    examGrading: {},
    isStarred: false,
    rankingScore: 8,
    reviewerId: 'reviewer_1'
  },
  {
    id: 'user_2',
    fullName: 'Jane Smith',
    age: 22,
    birthDate: '2001-08-20',
    gender: Gender.FEMALE,
    email: 'jane@example.com',
    phone: '0898765432',
    address: '456 Chiang Mai',
    educations: [
        { id: 'edu_1', level: "Bachelor's Degree", degreeName: 'B.Sc. Physics', institution: 'CMU', gpax: '3.85' },
        { id: 'edu_2', level: "Master's Degree", degreeName: 'M.Sc. Physics', institution: 'CMU', gpax: '4.00' }
    ],
    status: ApplicationStatus.DOCS_APPROVED,
    lastNotifiedStatus: ApplicationStatus.DOCS_APPROVED,
    examAnswers: {},
    documents: {
       'doc_trans': { ...MOCK_DOCS_TEMPLATE['doc_trans'], status: DocumentStatus.APPROVED, fileName: 'trans.pdf' },
       'doc_id': { ...MOCK_DOCS_TEMPLATE['doc_id'], status: DocumentStatus.APPROVED, fileName: 'id.png' },
       'doc_cert_edu_1': { id: 'doc_cert_edu_1', name: "Bachelor's Degree Certificate - B.Sc. Physics", status: DocumentStatus.APPROVED, fileName: 'cert_bach.pdf', isDynamic: true, configId: 'doc_conf_edu' },
       'doc_cert_edu_2': { id: 'doc_cert_edu_2', name: "Master's Degree Certificate - M.Sc. Physics", status: DocumentStatus.APPROVED, fileName: 'cert_mast.pdf', isDynamic: true, configId: 'doc_conf_edu' },
       'doc_profile_pic': { ...MOCK_DOCS_TEMPLATE['doc_profile_pic'], status: DocumentStatus.APPROVED, fileName: 'jane.jpg' }
    },
    customData: {},
    isESigned: true,
    eSignTimestamp: new Date(Date.now() - 86400000).toISOString(),
    feeStatuses: { ...DEFAULT_FEE_STATUSES, application: 'PAID' },
    fieldRejections: {},
    examGrading: {},
    isStarred: true,
    rankingScore: 5
  },
   {
    id: 'user_3',
    fullName: 'Alice Walker',
    age: 19,
    birthDate: '2004-02-10',
    gender: Gender.FEMALE,
    email: 'alice@example.com',
    phone: '0811112222',
    address: '789 Phuket',
    educations: [
        { id: 'edu_1', level: "Bachelor's Degree", degreeName: 'B.A. Arts', institution: 'PSU', gpax: '2.90' }
    ],
    status: ApplicationStatus.PASSED,
    lastNotifiedStatus: ApplicationStatus.PASSED,
    interviewSlotId: 'slot_1',
    interviewSlot: '2023-12-01T09:00:00',
    evaluation: { score: 9, comment: 'Excellent candidate' },
    documents: { ...MOCK_DOCS_TEMPLATE, 'doc_cert_edu_1': { id: 'doc_cert_edu_1', name: "Bachelor's Degree Certificate - B.A. Arts", status: DocumentStatus.PENDING, isDynamic: true, configId: 'doc_conf_edu' } },
    examAnswers: {},
    customData: {},
    isESigned: true,
    eSignTimestamp: new Date(Date.now() - 172800000).toISOString(),
    feeStatuses: { ...DEFAULT_FEE_STATUSES, application: 'PAID', interview: 'PAID' },
    fieldRejections: {},
    examGrading: {},
    isStarred: false,
    rankingScore: 9
  }
];

const INITIAL_FIELD_CONFIGS: FieldConfig[] = [
    { id: 'fullName', label: 'Full Name', type: 'standard', isStandard: true, isHidden: false, order: 0 },
    { id: 'birthDate', label: 'Date of Birth', type: 'standard', isStandard: true, isHidden: false, order: 1 },
    { id: 'age', label: 'Age', type: 'standard', isStandard: true, isHidden: false, order: 2 },
    { id: 'gender', label: 'Gender', type: 'standard', isStandard: true, isHidden: false, order: 3 },
    { id: 'phone', label: 'Phone', type: 'standard', isStandard: true, isHidden: false, order: 4 },
    { id: 'email', label: 'Email', type: 'standard', isStandard: true, isHidden: false, order: 5 },
    { id: 'address', label: 'Address', type: 'standard', isStandard: true, isHidden: false, order: 6 },
    { id: 'educations', label: 'Education History', type: 'standard', isStandard: true, isHidden: false, order: 7 },
    // Custom Fields
    { id: 'cf_1', label: 'Nickname', type: 'text', isStandard: false, isHidden: false, order: 8 },
    { 
        id: 'cf_2', 
        label: 'English Score', 
        type: 'score', 
        options: ['TOEFL', 'IELTS', 'CU-TEP'],
        description: 'Please submit your official score.',
        scoreConfig: [
            { exam: 'TOEFL iBT', min: 0, max: 120 },
            { exam: 'TOEFL ITP', min: 310, max: 677 },
            { exam: 'IELTS', min: 0, max: 9.0 },
            { exam: 'CU-TEP', min: 0, max: 120 }
        ],
        allowNoScore: true,
        isStandard: true, 
        isHidden: false, 
        order: 9 
    },
    { 
        id: 'recommendations', 
        label: 'Letter of Recommendation', 
        type: 'standard', 
        isStandard: true, 
        isHidden: false, 
        order: 10, 
        itemCount: 3, 
        description: 'Please provide names of your recommenders.' 
    }
];

const INITIAL_DOC_CONFIGS: DocumentConfig[] = [
    { id: 'doc_conf_pic', label: 'Profile Picture', isStandard: true, isHidden: false, order: 0 },
    // Transcript removed from initial doc configs as per user request history, keeping it out.
    { id: 'doc_conf_id', label: 'ID Card Copy', isStandard: true, isHidden: false, order: 2 },
    { id: 'doc_conf_edu', label: 'Education Certificate', isStandard: true, isHidden: false, order: 3 },
    { id: 'doc_conf_eng', label: 'English Score Report', isStandard: true, isHidden: false, order: 4 },
];

const INITIAL_PAYMENT_CONFIG: PaymentConfig = {
  kplus: true,
  qrcode: true,
  requireApplicationFee: true,
  requireInterviewFee: true,
  requireTuitionFee: true
};

// --- Helper Functions ---

export const getApplicants = (): Applicant[] => {
  const stored = localStorage.getItem(STORAGE_KEY_APPLICANTS);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY_APPLICANTS, JSON.stringify(INITIAL_APPLICANTS));
    return INITIAL_APPLICANTS;
  }
  try {
      const applicants = JSON.parse(stored);
      // Migration: Ensure feeStatuses, fieldRejections, and other arrays exist
      if (!Array.isArray(applicants)) return INITIAL_APPLICANTS;
      return applicants.map((app: any) => ({
          ...app,
          documents: app.documents || {},
          educations: Array.isArray(app.educations) ? app.educations : [],
          feeStatuses: app.feeStatuses || { ...DEFAULT_FEE_STATUSES },
          fieldRejections: app.fieldRejections || {},
          examGrading: app.examGrading || {},
          isStarred: app.isStarred || false,
          rankingScore: app.rankingScore || 0,
          lastNotifiedStatus: app.lastNotifiedStatus || app.status,
          reviewerId: app.reviewerId || null
      }));
  } catch (e) {
      return INITIAL_APPLICANTS;
  }
};

export const getApplicantById = (id: string): Applicant | undefined => {
  const applicants = getApplicants();
  return applicants.find(a => a.id === id);
};

export const saveApplicant = (applicant: Applicant): void => {
  const applicants = getApplicants();
  const index = applicants.findIndex(a => a.id === applicant.id);
  if (index >= 0) {
    applicants[index] = applicant;
  } else {
    applicants.push(applicant);
  }
  localStorage.setItem(STORAGE_KEY_APPLICANTS, JSON.stringify(applicants));
};

export const getExams = (): ExamQuestion[] => {
  const stored = localStorage.getItem(STORAGE_KEY_EXAMS);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY_EXAMS, JSON.stringify(INITIAL_EXAMS));
    return INITIAL_EXAMS;
  }
  return JSON.parse(stored);
};

export const saveExam = (exam: ExamQuestion): void => {
  const exams = getExams();
  const index = exams.findIndex(e => e.id === exam.id);
  if (index >= 0) {
    exams[index] = exam;
  } else {
    exams.push(exam);
  }
  localStorage.setItem(STORAGE_KEY_EXAMS, JSON.stringify(exams));
};

export const deleteExam = (id: string): void => {
  const exams = getExams().filter(e => e.id !== id);
  localStorage.setItem(STORAGE_KEY_EXAMS, JSON.stringify(exams));
};

// --- Exam Suite Helpers ---

export const getExamSuites = (): ExamSuite[] => {
  const stored = localStorage.getItem(STORAGE_KEY_EXAM_SUITES);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY_EXAM_SUITES, JSON.stringify(INITIAL_EXAM_SUITES));
    return INITIAL_EXAM_SUITES;
  }
  return JSON.parse(stored);
};

export const saveExamSuite = (suite: ExamSuite): void => {
    const suites = getExamSuites();
    const idx = suites.findIndex(s => s.id === suite.id);
    if (idx >= 0) {
        suites[idx] = suite;
    } else {
        suites.push(suite);
    }
    localStorage.setItem(STORAGE_KEY_EXAM_SUITES, JSON.stringify(suites));
};

export const deleteExamSuite = (id: string): void => {
    const suites = getExamSuites().filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY_EXAM_SUITES, JSON.stringify(suites));
};

// --- Interview Slot Helpers ---

export const getInterviewSlots = (): InterviewSlot[] => {
    const stored = localStorage.getItem(STORAGE_KEY_INTERVIEW_SLOTS);
    if (!stored) {
        localStorage.setItem(STORAGE_KEY_INTERVIEW_SLOTS, JSON.stringify(INITIAL_INTERVIEW_SLOTS));
        return INITIAL_INTERVIEW_SLOTS;
    }
    const slots = JSON.parse(stored);
    // Migration for groups
    return slots.map((s: any) => ({ ...s, groups: s.groups || [] }));
};

export const saveInterviewSlot = (slot: InterviewSlot): void => {
    const slots = getInterviewSlots();
    const idx = slots.findIndex(s => s.id === slot.id);
    if (idx >= 0) {
        slots[idx] = slot;
    } else {
        slots.push(slot);
    }
    localStorage.setItem(STORAGE_KEY_INTERVIEW_SLOTS, JSON.stringify(slots));
};

export const deleteInterviewSlot = (id: string): void => {
    const slots = getInterviewSlots().filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY_INTERVIEW_SLOTS, JSON.stringify(slots));
};

export const bookInterviewSlot = (slotId: string, applicantId: string): boolean => {
    const slots = getInterviewSlots();
    const slotIndex = slots.findIndex(s => s.id === slotId);
    
    if (slotIndex === -1) return false;
    if (slots[slotIndex].booked >= slots[slotIndex].capacity) return false;

    // Decrement old slot if exists
    const applicant = getApplicantById(applicantId);
    if (applicant?.interviewSlotId) {
        const oldSlotIndex = slots.findIndex(s => s.id === applicant.interviewSlotId);
        if (oldSlotIndex !== -1) {
            slots[oldSlotIndex].booked = Math.max(0, slots[oldSlotIndex].booked - 1);
        }
    }

    slots[slotIndex].booked += 1;
    localStorage.setItem(STORAGE_KEY_INTERVIEW_SLOTS, JSON.stringify(slots));
    return true;
};

// --- Field Layout Management ---

export const getFieldConfigs = (): FieldConfig[] => {
  const stored = localStorage.getItem(STORAGE_KEY_FIELD_CONFIGS);
  if (!stored) {
    const defaults = [...INITIAL_FIELD_CONFIGS].sort((a,b) => a.order - b.order);
    localStorage.setItem(STORAGE_KEY_FIELD_CONFIGS, JSON.stringify(defaults));
    return defaults;
  }
  return JSON.parse(stored).sort((a: FieldConfig, b: FieldConfig) => a.order - b.order);
};

export const saveFieldConfigs = (configs: FieldConfig[]): void => {
    const sorted = configs.map((c, idx) => ({ ...c, order: idx }));
    localStorage.setItem(STORAGE_KEY_FIELD_CONFIGS, JSON.stringify(sorted));
};

export const addCustomFieldToConfig = (def: CustomFieldDefinition): void => {
    const configs = getFieldConfigs();
    const maxOrder = Math.max(...configs.map(c => c.order), 0);
    const newConfig: FieldConfig = {
        id: def.id,
        label: def.label,
        type: def.type,
        options: def.options,
        isStandard: false,
        isHidden: false,
        order: maxOrder + 1,
        minScore: def.minScore,
        maxScore: def.maxScore,
        description: def.description,
        scoreConfig: def.scoreConfig,
        allowNoScore: def.allowNoScore,
        itemCount: def.itemCount
    };
    configs.push(newConfig);
    saveFieldConfigs(configs);
};

export const getCustomFields = (): CustomFieldDefinition[] => {
  return getFieldConfigs().filter(f => !f.isStandard).map(f => ({
      id: f.id,
      label: f.label,
      type: f.type as CustomFieldType,
      options: f.options,
      minScore: f.minScore,
      maxScore: f.maxScore,
      description: f.description,
      allowNoScore: f.allowNoScore,
      itemCount: f.itemCount
  }));
};

export const deleteCustomField = (id: string): void => {
    const configs = getFieldConfigs().filter(f => f.id !== id);
    saveFieldConfigs(configs);
};

// --- Document Config Helpers ---

export const getDocumentConfigs = (): DocumentConfig[] => {
    const stored = localStorage.getItem(STORAGE_KEY_DOC_CONFIGS);
    if (!stored) {
        const defaults = [...INITIAL_DOC_CONFIGS].sort((a,b) => a.order - b.order);
        localStorage.setItem(STORAGE_KEY_DOC_CONFIGS, JSON.stringify(defaults));
        return defaults;
    }
    return JSON.parse(stored).sort((a: DocumentConfig, b: DocumentConfig) => a.order - b.order);
};

export const saveDocumentConfigs = (configs: DocumentConfig[]): void => {
    const sorted = configs.map((c, idx) => ({ ...c, order: idx }));
    localStorage.setItem(STORAGE_KEY_DOC_CONFIGS, JSON.stringify(sorted));
};

export const addDocumentConfig = (label: string): void => {
    const configs = getDocumentConfigs();
    const maxOrder = Math.max(...configs.map(c => c.order), 0);
    const newDoc: DocumentConfig = {
        id: `doc_conf_${Date.now()}`,
        label,
        isStandard: false,
        isHidden: false,
        order: maxOrder + 1
    };
    configs.push(newDoc);
    saveDocumentConfigs(configs);
};

export const deleteDocumentConfig = (id: string): void => {
    const configs = getDocumentConfigs().filter(c => c.id !== id);
    saveDocumentConfigs(configs);
};

// --- Education Majors Helpers ---
export const getEducationMajors = (): string[] => {
    const stored = localStorage.getItem(STORAGE_KEY_EDUCATION_MAJORS);
    if (!stored) {
        return INITIAL_EDUCATION_MAJORS;
    }
    try {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : INITIAL_EDUCATION_MAJORS;
    } catch {
        return INITIAL_EDUCATION_MAJORS;
    }
};

export const saveEducationMajors = (majors: string[]): void => {
    localStorage.setItem(STORAGE_KEY_EDUCATION_MAJORS, JSON.stringify(majors));
};

// --- Payment Config Helpers ---

export const getPaymentConfig = (): PaymentConfig => {
  const stored = localStorage.getItem(STORAGE_KEY_PAYMENT_CONFIG);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY_PAYMENT_CONFIG, JSON.stringify(INITIAL_PAYMENT_CONFIG));
    return INITIAL_PAYMENT_CONFIG;
  }
  return JSON.parse(stored);
};

export const savePaymentConfig = (config: PaymentConfig): void => {
  localStorage.setItem(STORAGE_KEY_PAYMENT_CONFIG, JSON.stringify(config));
};

// --- Announcement Helpers ---
export const getAnnouncements = (): Announcement[] => {
    const stored = localStorage.getItem(STORAGE_KEY_ANNOUNCEMENTS);
    if (!stored) {
        localStorage.setItem(STORAGE_KEY_ANNOUNCEMENTS, JSON.stringify(INITIAL_ANNOUNCEMENTS));
        return INITIAL_ANNOUNCEMENTS;
    }
    return JSON.parse(stored);
};

export const saveAnnouncement = (ann: Announcement): void => {
    const anns = getAnnouncements();
    const idx = anns.findIndex(a => a.id === ann.id);
    if (idx >= 0) {
        anns[idx] = ann;
    } else {
        anns.unshift(ann); // Add to top
    }
    localStorage.setItem(STORAGE_KEY_ANNOUNCEMENTS, JSON.stringify(anns));
};

export const deleteAnnouncement = (id: string): void => {
    const anns = getAnnouncements().filter(a => a.id !== id);
    localStorage.setItem(STORAGE_KEY_ANNOUNCEMENTS, JSON.stringify(anns));
};

// --- Staff User Helpers ---
export const getStaffUsers = (): StaffUser[] => {
    const stored = localStorage.getItem(STORAGE_KEY_STAFF_USERS);
    if (!stored) {
        localStorage.setItem(STORAGE_KEY_STAFF_USERS, JSON.stringify(INITIAL_STAFF_USERS));
        return INITIAL_STAFF_USERS;
    }
    return JSON.parse(stored);
};

export const saveStaffUser = (user: StaffUser): void => {
    const users = getStaffUsers();
    const idx = users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
        users[idx] = user;
    } else {
        users.push(user);
    }
    localStorage.setItem(STORAGE_KEY_STAFF_USERS, JSON.stringify(users));
};

export const deleteStaffUser = (id: string): void => {
    const users = getStaffUsers().filter(u => u.id !== id);
    localStorage.setItem(STORAGE_KEY_STAFF_USERS, JSON.stringify(users));
};

export const createNewApplicant = (): Applicant => {
  const newId = `user_${Date.now()}`;
  const newApplicant: Applicant = {
    id: newId,
    fullName: '',
    age: 0,
    gender: Gender.OTHER,
    email: '',
    phone: '',
    address: '',
    educations: [], 
    status: ApplicationStatus.DRAFT,
    lastNotifiedStatus: ApplicationStatus.DRAFT,
    examAnswers: {},
    documents: JSON.parse(JSON.stringify(MOCK_DOCS_TEMPLATE)),
    customData: {},
    feeStatuses: { ...DEFAULT_FEE_STATUSES },
    fieldRejections: {},
    examGrading: {},
    isStarred: false,
    rankingScore: 0
  };
  saveApplicant(newApplicant);
  return newApplicant;
};
