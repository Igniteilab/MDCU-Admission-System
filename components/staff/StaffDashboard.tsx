
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Applicant, ApplicationStatus, DocumentStatus, DocumentItem, CustomFieldDefinition, CustomFieldType, PaymentConfig, FieldConfig, Gender, ExamSuite, ExamQuestion, QuestionType, QuestionOption, FeeStatus, DocumentConfig, InterviewSlot, InterviewType, InterviewGroup, Announcement, StaffUser, StaffRole } from '../../types';
import { getApplicants, saveApplicant, addCustomFieldToConfig, deleteCustomField, getPaymentConfig, savePaymentConfig, getFieldConfigs, saveFieldConfigs, MOCK_DOCS_TEMPLATE, EDUCATION_LEVELS, getExamSuites, saveExamSuite, deleteExamSuite, getExams, saveExam, deleteExam, getDocumentConfigs, saveDocumentConfigs, getEducationMajors, saveEducationMajors, getInterviewSlots, saveInterviewSlot, deleteInterviewSlot, bookInterviewSlot, addDocumentConfig, deleteDocumentConfig, getAnnouncements, saveAnnouncement, deleteAnnouncement, getStaffUsers, saveStaffUser, deleteStaffUser } from '../../services/storage';
import { Button } from '../ui/Button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
// Add UserX to the list of icons imported from lucide-react
import { Users, FileText, CheckSquare, UserCheck, AlertTriangle, Search, Clock, CreditCard, Eye, RefreshCw, Check, X, PenTool, Plus, Trash2, Settings as SettingsIcon, ToggleLeft, ToggleRight, DollarSign, ArrowUp, ArrowDown, EyeOff, QrCode, Pencil, Save, GripVertical, Filter, Calculator, Wand2, GraduationCap, ClipboardList, BookOpen, FileWarning, AlertCircle, ChevronRight, ScrollText, Calendar, MapPin, Star, Send, FilePlus, ChevronLeft, MoreVertical, LayoutGrid, List, ChevronDown, ChevronUp, UserPlus, UserX, Trophy, ExternalLink, BarChart3, Upload, Megaphone, Repeat, Columns, ArrowUpDown, FileInput, UserCog, Shield, Activity } from 'lucide-react';

interface Props {
  currentUser: StaffUser;
  onLogout: () => void;
}

// Semantic Palette
const PALETTE = {
    brand: '#2563eb',
    success: '#10b981', // Green
    warning: '#f59e0b', // Amber
    danger: '#ef4444', // Red
    info: '#3b82f6',    // Blue
    purple: '#8b5cf6',  // Violet
    neutral: '#6b7280', // Gray
    gender: { Male: '#3b82f6', Female: '#ec4899', Other: '#8b5cf6' }
};

const DS = {
    status: {
        [ApplicationStatus.DRAFT]: 'bg-gray-100 text-gray-600 border-gray-200',
        [ApplicationStatus.SUBMITTED]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        [ApplicationStatus.DOCS_APPROVED]: 'bg-blue-100 text-blue-800 border-blue-200',
        [ApplicationStatus.DOCS_REJECTED]: 'bg-red-100 text-red-800 border-red-200',
        [ApplicationStatus.INTERVIEW_READY]: 'bg-purple-100 text-purple-800 border-purple-200',
        [ApplicationStatus.INTERVIEW_BOOKED]: 'bg-purple-100 text-purple-800 border-purple-200',
        [ApplicationStatus.PASSED]: 'bg-green-100 text-green-800 border-green-200',
        [ApplicationStatus.ENROLLED]: 'bg-brand-100 text-brand-800 border-brand-200',
        [ApplicationStatus.FAILED]: 'bg-gray-200 text-gray-800 border-gray-300',
    },
    actionIcon: {
        primary: 'text-gray-400 hover:text-brand-600 transition-colors cursor-pointer',
        danger: 'text-gray-400 hover:text-red-600 transition-colors cursor-pointer',
        neutral: 'text-gray-400 hover:text-gray-600 transition-colors cursor-pointer'
    }
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-lg text-sm">
                <p className="font-bold text-gray-900 mb-1">{label}</p>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].payload.fill || PALETTE.brand }}></span>
                    <span className="text-gray-600">Count: <span className="font-bold text-gray-900">{payload[0].value}</span></span>
                </div>
            </div>
        );
    }
    return null;
};

export const StaffDashboard: React.FC<Props> = ({ currentUser, onLogout }) => {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [draftApplicant, setDraftApplicant] = useState<Applicant | null>(null);
  const [view, setView] = useState<'dashboard' | 'applicants' | 'appointments' | 'exams' | 'form-builder' | 'settings' | 'announcements' | 'users'>('dashboard');
  
  // Dashboard Logic
  const [dashboardStatusFilter, setDashboardStatusFilter] = useState<string>('ALL');
  const [drilldownData, setDrilldownData] = useState<{ title: string, applicants: Applicant[] } | null>(null);

  // Review Modal State
  const [reviewTab, setReviewTab] = useState<'profile' | 'docs' | 'exam' | 'fees' | 'evaluation'>('profile');
  const [activeEditField, setActiveEditField] = useState<string | null>(null);
  const [showSignature, setShowSignature] = useState(false);
  const [isReadOnlyView, setIsReadOnlyView] = useState(false);
  
  // Admin Attach Doc State
  const [adminDocName, setAdminDocName] = useState('');
  const [adminDocFile, setAdminDocFile] = useState<File | null>(null);

  // Filter & Table State
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [minRankFilter, setMinRankFilter] = useState<number>(0);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['age', 'reviewerId']);
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [activeColumnFilter, setActiveColumnFilter] = useState<string | null>(null);

  // Form Builder State
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>([]);
  const [docConfigs, setDocConfigs] = useState<DocumentConfig[]>([]);
  
  // Modal State for Add/Edit Field
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldDesc, setNewFieldDesc] = useState('');
  const [newFieldType, setNewFieldType] = useState<CustomFieldType>('text');
  const [newFieldOptions, setNewFieldOptions] = useState(''); 
  const [newFieldMinScore, setNewFieldMinScore] = useState<string>('');
  const [newFieldMaxScore, setNewFieldMaxScore] = useState<string>('');
  const [newFieldItemCount, setNewFieldItemCount] = useState<string>('');
  const [scoreConfigList, setScoreConfigList] = useState<{ exam: string, min: number, max: number }[]>([]);
  const [newScoreExamName, setNewScoreExamName] = useState('');
  const [newScoreExamMin, setNewScoreExamMin] = useState('');
  const [newScoreExamMax, setNewScoreExamMax] = useState('');

  // Interview Slot State
  const [interviewSlots, setInterviewSlots] = useState<InterviewSlot[]>([]);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<InterviewSlot | null>(null);
  const [newSlotDate, setNewSlotDate] = useState('');
  const [newSlotTimeStart, setNewSlotTimeStart] = useState('');
  const [newSlotTimeEnd, setNewSlotTimeEnd] = useState('');
  const [newSlotLocation, setNewSlotLocation] = useState('');
  const [newSlotCapacity, setNewSlotCapacity] = useState('10');
  const [newSlotType, setNewSlotType] = useState<InterviewType>('Onsite');
  const [expandedGroupIds, setExpandedGroupIds] = useState<Set<string>>(new Set());

  // Exam Management State
  const [examSuites, setExamSuites] = useState<ExamSuite[]>([]);
  const [selectedSuite, setSelectedSuite] = useState<ExamSuite | null>(null);
  const [suiteQuestions, setSuiteQuestions] = useState<ExamQuestion[]>([]);
  const [isSuiteModalOpen, setIsSuiteModalOpen] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [allQuestions, setAllQuestions] = useState<ExamQuestion[]>([]);
  
  const [suiteTitle, setSuiteTitle] = useState('');
  const [suiteDesc, setSuiteDesc] = useState('');
  const [editingSuiteId, setEditingSuiteId] = useState<string | null>(null);

  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState<QuestionType>(QuestionType.MCQ_SINGLE);
  const [qScore, setQScore] = useState<string>('5');
  const [qIsGraded, setQIsGraded] = useState<boolean>(true);
  const [qOptions, setQOptions] = useState<QuestionOption[]>([]);

  // Announcements State
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [newAnnTitle, setNewAnnTitle] = useState('');
  const [newAnnMessage, setNewAnnMessage] = useState('');
  const [newAnnType, setNewAnnType] = useState<'info' | 'urgent' | 'success'>('info');

  // User Management State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserRole, setNewUserRole] = useState<StaffRole>(StaffRole.REVIEWER);
  const [newUserAssignedGroups, setNewUserAssignedGroups] = useState<string[]>([]);

  // Payment Config State
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>({ 
      kplus: true, 
      qrcode: true,
      requireApplicationFee: true,
      requireInterviewFee: true,
      requireTuitionFee: true
  });

  // Drag and Drop Refs
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const dragItemDoc = useRef<number | null>(null);
  const dragOverItemDoc = useRef<number | null>(null);

  // --- Initial Data Load & Role Redirect ---
  useEffect(() => {
      if (currentUser.role === StaffRole.PROCTOR) {
          setView('appointments');
      } else if (currentUser.role === StaffRole.REVIEWER) {
          setView('applicants');
      } else {
          setView('dashboard');
      }
      refreshData();
  }, [currentUser]);

  useEffect(() => {
      if (selectedApplicant) {
          setDraftApplicant(JSON.parse(JSON.stringify(selectedApplicant)));
          setReviewTab('profile');
          setActiveEditField(null);
          setShowSignature(false);
          setAdminDocName('');
          setAdminDocFile(null);
      } else {
          setDraftApplicant(null);
      }
  }, [selectedApplicant]);

  useEffect(() => {
      if (selectedSuite) {
          const exams = getExams();
          setSuiteQuestions(exams.filter(q => q.suiteId === selectedSuite.id));
      } else {
          setSuiteQuestions([]);
      }
  }, [selectedSuite, view]);

  useEffect(() => {
      if (selectedSlot) {
          const fresh = interviewSlots.find(s => s.id === selectedSlot.id);
          if (fresh) setSelectedSlot(fresh);
      }
  }, [interviewSlots]);

  const refreshData = () => {
    setApplicants(getApplicants());
    setFieldConfigs(getFieldConfigs());
    setPaymentConfig(getPaymentConfig());
    setExamSuites(getExamSuites());
    setAllQuestions(getExams());
    setDocConfigs(getDocumentConfigs());
    setInterviewSlots(getInterviewSlots());
    setAnnouncements(getAnnouncements());
    setStaffUsers(getStaffUsers());
  };

  const getAvailableReviewers = () => staffUsers.filter(u => u.role === StaffRole.REVIEWER || u.role === StaffRole.SUPER_ADMIN);

  // --- Table & Filter Helpers ---
  const columnsOptions = useMemo(() => {
      const cols: { id: string, label: string }[] = [];
      cols.push({ id: 'reviewerId', label: 'Reviewer' });
      fieldConfigs.forEach(f => { if (f.id === 'fullName') return; cols.push({ id: f.id, label: f.label }); });
      docConfigs.forEach(d => { cols.push({ id: `doc_${d.id}`, label: `Doc: ${d.label}` }); });
      cols.push({ id: 'examScore', label: 'Online Score' });
      cols.push({ id: 'writtenScore', label: 'Written Score' });
      cols.push({ id: 'interviewScore', label: 'Interview Score' });
      return cols;
  }, [fieldConfigs, docConfigs]);

  const renderCellContent = (app: Applicant, colId: string) => {
      if (colId === 'reviewerId') { 
          const r = staffUsers.find(u => u.id === app.reviewerId); 
          if (currentUser.role === StaffRole.SUPER_ADMIN && r) {
              return (
                  <button 
                      onClick={(e) => { e.stopPropagation(); handleColumnFilter('reviewerId', r.id); }}
                      className="text-xs bg-gray-100 px-2 py-1 rounded border hover:bg-brand-100 hover:text-brand-700 hover:border-brand-300 transition-colors"
                      title="Filter by this Admin"
                  >
                      {r.fullName}
                  </button>
              );
          }
          return r ? <span className="text-xs bg-gray-100 px-2 py-1 rounded border">{r.fullName}</span> : <span className="text-xs text-gray-400">-</span>; 
      }
      if (colId.startsWith('doc_')) { const confId = colId.replace('doc_', ''); const doc = Object.values(app.documents).find(d => d.configId === confId); const status = doc ? doc.status : 'missing'; let color = 'bg-gray-100 text-gray-500'; if (status === DocumentStatus.APPROVED) color = 'bg-green-100 text-green-700'; if (status === DocumentStatus.REJECTED) color = 'bg-red-100 text-red-700'; if (status === DocumentStatus.UPLOADED) color = 'bg-yellow-100 text-yellow-800'; return <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${color}`}>{status}</span>; }
      if (['examScore', 'writtenScore', 'interviewScore'].includes(colId)) { const val = (app as any)[colId]; return val !== undefined ? val : '-'; }
      if ((app as any)[colId] !== undefined) { const val = (app as any)[colId]; if (colId === 'educations') { return (val as any[] || []).map(e => e.level).join(', '); } return val; }
      if (app.customData && app.customData[colId] !== undefined) { const val = app.customData[colId]; if (typeof val === 'object' && val !== null) { if ((val as any).exam) return `${(val as any).exam}: ${(val as any).score}`; return JSON.stringify(val); } if (Array.isArray(val)) return val.join(', '); return val.toString(); }
      return '-';
  };

  // --- Dashboard Logic ---
  const getDashboardFilteredApplicants = (): Applicant[] => {
        if (dashboardStatusFilter === 'ALL') return applicants;
        return applicants.filter((app: Applicant) => {
             if (dashboardStatusFilter === 'PENDING') return [ApplicationStatus.SUBMITTED, ApplicationStatus.DOCS_REJECTED].includes(app.status);
             if (dashboardStatusFilter === 'INTERVIEW') return [ApplicationStatus.DOCS_APPROVED, ApplicationStatus.INTERVIEW_READY, ApplicationStatus.INTERVIEW_BOOKED].includes(app.status);
             if (dashboardStatusFilter === 'FINAL') return [ApplicationStatus.PASSED, ApplicationStatus.ENROLLED].includes(app.status);
             if (dashboardStatusFilter === 'FAILED') return app.status === ApplicationStatus.FAILED;
             return true;
        });
  };
  const dashboardApplicants: Applicant[] = getDashboardFilteredApplicants();
  const stats = { total: dashboardApplicants.length, pendingDocs: dashboardApplicants.filter(a => [ApplicationStatus.SUBMITTED, ApplicationStatus.DOCS_REJECTED].includes(a.status)).length, interviewReady: dashboardApplicants.filter(a => [ApplicationStatus.DOCS_APPROVED, ApplicationStatus.INTERVIEW_READY, ApplicationStatus.INTERVIEW_BOOKED].includes(a.status)).length, passed: dashboardApplicants.filter(a => [ApplicationStatus.PASSED, ApplicationStatus.ENROLLED].includes(a.status)).length };
  
  let chartTitle = "Status"; let chartData: { name: string, value: number, fill?: string }[] = [];
  if (dashboardStatusFilter === 'ALL') { chartTitle = "Status Overview"; chartData = [ { name: 'Draft', value: applicants.filter(a => a.status === ApplicationStatus.DRAFT).length, fill: PALETTE.neutral }, { name: 'Pending', value: applicants.filter(a => [ApplicationStatus.SUBMITTED, ApplicationStatus.DOCS_REJECTED].includes(a.status)).length, fill: PALETTE.warning }, { name: 'Interview', value: applicants.filter(a => [ApplicationStatus.DOCS_APPROVED, ApplicationStatus.INTERVIEW_READY, ApplicationStatus.INTERVIEW_BOOKED].includes(a.status)).length, fill: PALETTE.purple }, { name: 'Final', value: applicants.filter(a => [ApplicationStatus.PASSED, ApplicationStatus.ENROLLED].includes(a.status)).length, fill: PALETTE.success }, { name: 'Failed', value: applicants.filter(a => a.status === ApplicationStatus.FAILED).length, fill: PALETTE.danger } ]; } 
  else if (dashboardStatusFilter === 'PENDING') { chartTitle = "Pending Breakdown"; chartData = [ { name: 'Submitted', value: applicants.filter(a => a.status === ApplicationStatus.SUBMITTED).length, fill: PALETTE.warning }, { name: 'Docs Rejected', value: applicants.filter(a => a.status === ApplicationStatus.DOCS_REJECTED).length, fill: PALETTE.danger } ]; }
  else if (dashboardStatusFilter === 'INTERVIEW') { chartTitle = "Interview Breakdown"; chartData = [ { name: 'Approved', value: applicants.filter(a => a.status === ApplicationStatus.DOCS_APPROVED).length, fill: PALETTE.info }, { name: 'Ready', value: applicants.filter(a => a.status === ApplicationStatus.INTERVIEW_READY).length, fill: PALETTE.purple }, { name: 'Booked', value: applicants.filter(a => a.status === ApplicationStatus.INTERVIEW_BOOKED).length, fill: '#7e22ce' } ]; }
  else if (dashboardStatusFilter === 'FINAL') { chartTitle = "Final Breakdown"; chartData = [ { name: 'Passed', value: applicants.filter(a => a.status === ApplicationStatus.PASSED).length, fill: PALETTE.success }, { name: 'Enrolled', value: applicants.filter(a => a.status === ApplicationStatus.ENROLLED).length, fill: '#15803d' } ]; }
  else if (dashboardStatusFilter === 'FAILED') { chartTitle = "Failure Analysis"; chartData = [ { name: 'Failed', value: applicants.filter(a => a.status === ApplicationStatus.FAILED).length, fill: PALETTE.danger } ]; }
  
  const rankingDataRaw = dashboardApplicants.reduce((acc, app: Applicant) => { const score = app.rankingScore || 0; const label = score === 0 ? 'Unranked' : `Rank ${score}`; acc[label] = (acc[label] || 0) + 1; return acc; }, {} as Record<string, number>);
  const rankingChartData = Object.keys(rankingDataRaw).sort((a, b) => { if (a === 'Unranked') return -1; if (b === 'Unranked') return 1; return parseInt(a.replace('Rank ', '')) - parseInt(b.replace('Rank ', '')); }).map(key => ({ name: key, value: rankingDataRaw[key] }));
  const genderData = [ { name: 'Male', value: dashboardApplicants.filter(a => a.gender === 'Male').length }, { name: 'Female', value: dashboardApplicants.filter(a => a.gender === 'Female').length }, ];
  const ageGroups = { '< 18': 0, '18-21': 0, '22-25': 0, '26+': 0 }; dashboardApplicants.forEach(app => { if (app.age < 18) ageGroups['< 18']++; else if (app.age <= 21) ageGroups['18-21']++; else if (app.age <= 25) ageGroups['22-25']++; else ageGroups['26+']++; }); const ageChartData = Object.keys(ageGroups).map(key => ({ name: key, value: ageGroups[key as keyof typeof ageGroups] }));
  const educationDataRaw = dashboardApplicants.reduce((acc, app: Applicant) => { let highestLevel = 'Unknown'; let highestLevelVal = 0; if (app.educations && app.educations.length > 0) { app.educations.forEach(edu => { const levelObj = EDUCATION_LEVELS.find(l => l.label === edu.level); const val = levelObj ? levelObj.level : 0; if (val > highestLevelVal) { highestLevelVal = val; highestLevel = edu.level; } }); } else { highestLevel = 'None'; } acc[highestLevel] = (acc[highestLevel] || 0) + 1; return acc; }, {} as Record<string, number>); const educationChartData = Object.keys(educationDataRaw).map(key => ({ name: key, value: educationDataRaw[key] }));

  // --- Actions ---
  const handleChartClick = (type: 'gender' | 'age' | 'education' | 'status' | 'ranking', value: string) => { if (!value) return; let filtered: Applicant[] = []; if (type === 'status') { filtered = dashboardApplicants.filter((app: Applicant) => { if (value === 'Pending') return [ApplicationStatus.SUBMITTED, ApplicationStatus.DOCS_REJECTED].includes(app.status); if (value === 'Interview') return [ApplicationStatus.DOCS_APPROVED, ApplicationStatus.INTERVIEW_READY, ApplicationStatus.INTERVIEW_BOOKED].includes(app.status); if (value === 'Final') return [ApplicationStatus.PASSED, ApplicationStatus.ENROLLED].includes(app.status); return app.status === value || (value==='Draft' && app.status===ApplicationStatus.DRAFT) || (value==='Failed' && app.status===ApplicationStatus.FAILED); }); } else if (type === 'ranking') { filtered = dashboardApplicants.filter((app: Applicant) => { const score = app.rankingScore || 0; const label = score === 0 ? 'Unranked' : `Rank ${score}`; return label === value; }); } else if (type === 'gender') { filtered = dashboardApplicants.filter((a: Applicant) => a.gender === value); } else if (type === 'age') { filtered = dashboardApplicants.filter((app: Applicant) => { if (value === '< 18') return app.age < 18; if (value === '18-21') return app.age >= 18 && app.age <= 21; if (value === '22-25') return app.age >= 22 && app.age <= 25; if (value === '26+') return app.age > 25; return false; }); } else if (type === 'education') { filtered = dashboardApplicants.filter((app: Applicant) => { let highestLevel = 'None'; let highestLevelVal = 0; if (app.educations && app.educations.length > 0) { app.educations.forEach(edu => { const levelObj = EDUCATION_LEVELS.find(l => l.label === edu.level); const val = levelObj ? levelObj.level : 0; if (val > highestLevelVal) { highestLevelVal = val; highestLevel = edu.level; } }); } if (app.educations.length === 0 && value === 'None') return true; return highestLevel === value; }); } setDrilldownData({ title: `${type.charAt(0).toUpperCase() + type.slice(1)}: ${value}`, applicants: filtered }); };
  const handleSort = (key: string) => { let direction: 'asc' | 'desc' = 'asc'; if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') { direction = 'desc'; } setSortConfig({ key, direction }); };
  const getUniqueColumnValues = (colId: string) => { const values = new Set<string>(); applicants.forEach(app => { if (colId === 'status') values.add(app.status); else { const val = (app as any)[colId] || app.customData?.[colId]; if (val) values.add(val.toString()); } }); return Array.from(values); };
  const handleColumnFilter = (colId: string, val: string) => { setColumnFilters(prev => val ? { ...prev, [colId]: val } : (() => { const n = { ...prev }; delete n[colId]; return n; })()); setActiveColumnFilter(null); };
  
  const filteredApplicants = applicants.filter(app => { 
      // Restriction removed: Admin can see all data
      // if (currentUser.role === StaffRole.REVIEWER && app.reviewerId !== currentUser.id) return false;
      if (minRankFilter > 0 && (app.rankingScore || 0) < minRankFilter) return false; 
      for (const [colKey, colVal] of Object.entries(columnFilters)) {
          if (colKey === 'status') { if (app.status !== colVal) return false; } else { const rawVal = (app as any)[colKey] || app.customData?.[colKey]; if (rawVal?.toString() !== colVal) return false; }
      }
      if (statusFilter === 'ALL') return true; 
      if (statusFilter === 'PENDING_DOCS') return app.status === ApplicationStatus.SUBMITTED || app.status === ApplicationStatus.DOCS_REJECTED; 
      if (statusFilter === 'INTERVIEW_STAGE') return [ApplicationStatus.DOCS_APPROVED, ApplicationStatus.INTERVIEW_READY, ApplicationStatus.INTERVIEW_BOOKED].includes(app.status); 
      if (statusFilter === 'FINISHED') return [ApplicationStatus.PASSED, ApplicationStatus.ENROLLED].includes(app.status); 
      if (statusFilter === 'FAILED') return app.status === ApplicationStatus.FAILED; 
      return true; 
  }).sort((a, b) => { if (a.isStarred && !b.isStarred) return -1; if (!a.isStarred && b.isStarred) return 1; if (sortConfig) { const valA = (a as any)[sortConfig.key] || ''; const valB = (b as any)[sortConfig.key] || ''; if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1; if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1; } return 0; });

  const toggleColumn = (id: string) => { setVisibleColumns(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]); };
  const toggleStar = (applicantId: string) => { const app = applicants.find(a => a.id === applicantId); if (app) { saveApplicant({ ...app, isStarred: !app.isStarred }); refreshData(); } };
  const handleUpdateRanking = (applicant: Applicant, score: number) => { saveApplicant({ ...applicant, rankingScore: score }); refreshData(); };
  const handleQuickStatusChange = (applicant: Applicant, action: 'pass' | 'fail') => { let newStatus = applicant.status; if (action === 'fail') newStatus = ApplicationStatus.FAILED; else { if (applicant.status === ApplicationStatus.SUBMITTED || applicant.status === ApplicationStatus.DOCS_REJECTED) newStatus = ApplicationStatus.DOCS_APPROVED; else if ([ApplicationStatus.DOCS_APPROVED, ApplicationStatus.INTERVIEW_READY, ApplicationStatus.INTERVIEW_BOOKED].includes(applicant.status)) newStatus = ApplicationStatus.PASSED; } let updatedDocs = applicant.documents; if (action === 'pass' && (applicant.status === ApplicationStatus.SUBMITTED || applicant.status === ApplicationStatus.DOCS_REJECTED)) { updatedDocs = { ...applicant.documents }; Object.keys(updatedDocs).forEach(k => updatedDocs[k].status = DocumentStatus.APPROVED); } saveApplicant({ ...applicant, status: newStatus, documents: updatedDocs }); refreshData(); };
  const handlePublishUpdates = () => { if (!confirm("Are you sure you want to publish all status updates?")) return; applicants.forEach(app => saveApplicant({ ...app, lastNotifiedStatus: app.status })); refreshData(); alert("Updates sent."); };
  const updateDraftFieldRejection = (fieldId: string) => { if (!draftApplicant || isReadOnlyView) return; const current = { ...draftApplicant.fieldRejections }; if (current[fieldId]) delete current[fieldId]; else { const r = prompt("Reason?"); if(r) current[fieldId] = r; } setDraftApplicant({ ...draftApplicant, fieldRejections: current }); setActiveEditField(null); };
  
  const updateDraftDocStatus = (docId: string, status: DocumentStatus) => { if (!draftApplicant || isReadOnlyView) return; let note = ""; if (status === DocumentStatus.REJECTED) { note = prompt("Reason?") || "Rejected"; } const docs = { ...draftApplicant.documents }; docs[docId] = { ...docs[docId], status, reviewNote: note }; setDraftApplicant({ ...draftApplicant, documents: docs }); };
  const handleAdminAttachDoc = () => { if (!draftApplicant || !adminDocName || isReadOnlyView) return; const id = `doc_admin_${Date.now()}`; setDraftApplicant({ ...draftApplicant, documents: { ...draftApplicant.documents, [id]: { id, name: adminDocName, status: DocumentStatus.APPROVED, fileName: adminDocFile?.name || 'admin.pdf', uploadedBy: 'admin' } } }); setAdminDocName(''); setAdminDocFile(null); };
  const updateDraftExamGrading = (qid: string, s: number) => { if (!draftApplicant || isReadOnlyView) return; setDraftApplicant({ ...draftApplicant, examGrading: { ...draftApplicant.examGrading, [qid]: s } }); };
  const updateDraftFeeStatus = (t: any, s: FeeStatus) => { if (!draftApplicant || isReadOnlyView) return; setDraftApplicant({ ...draftApplicant, feeStatuses: { ...draftApplicant.feeStatuses!, [t]: s } }); };
  const saveAndNotifyApplicant = () => { if (!draftApplicant || isReadOnlyView) return; let s = draftApplicant.status; if (s === ApplicationStatus.SUBMITTED && (Object.values(draftApplicant.documents) as DocumentItem[]).some(d => d.status === DocumentStatus.REJECTED)) s = ApplicationStatus.DOCS_REJECTED; saveApplicant({ ...draftApplicant, status: s }); setSelectedApplicant(null); refreshData(); };
  const handleDecision = (s: ApplicationStatus) => { if (!draftApplicant || isReadOnlyView) return; setDraftApplicant({ ...draftApplicant, status: s }); };
  
  // --- Config Handlers ---
  const handleAddOrUpdateCustomField = () => { const opts = newFieldOptions ? newFieldOptions.split(',').map(s=>s.trim()).filter(s=>s) : undefined; const field = { id: editingFieldId || `cf_${Date.now()}`, label: newFieldLabel, type: newFieldType, options: opts, minScore: Number(newFieldMinScore), maxScore: Number(newFieldMaxScore), description: newFieldDesc, scoreConfig: newFieldType==='score'?scoreConfigList:undefined, itemCount: Number(newFieldItemCount) }; if(editingFieldId) { const configs = fieldConfigs.map(f=>f.id===editingFieldId ? {...f, ...field} : f); saveFieldConfigs(configs); setFieldConfigs(configs); } else { addCustomFieldToConfig(field as any); setFieldConfigs(getFieldConfigs()); } setIsFieldModalOpen(false); };
  const handleEditCustomField = (f: FieldConfig) => { setEditingFieldId(f.id); setNewFieldLabel(f.label); setNewFieldDesc(f.description||''); setNewFieldType(f.type as any); setNewFieldOptions(f.options?.join(', ')||''); setNewFieldMinScore(f.minScore?.toString()||''); setNewFieldMaxScore(f.maxScore?.toString()||''); setScoreConfigList(f.scoreConfig||[]); setNewFieldItemCount(f.itemCount?.toString()||''); setIsFieldModalOpen(true); };
  const openAddFieldModal = () => { setEditingFieldId(null); setNewFieldLabel(''); setNewFieldDesc(''); setNewFieldType('text'); setNewFieldOptions(''); setScoreConfigList([]); setIsFieldModalOpen(true); };
  const handleDeleteCustomField = (id: string) => { if(confirm("Delete?")) { deleteCustomField(id); setFieldConfigs(getFieldConfigs()); } };
  const toggleFieldVisibility = (id: string) => { const u = fieldConfigs.map(f=>f.id===id?{...f,isHidden:!f.isHidden}:f); saveFieldConfigs(u); setFieldConfigs(u); };
  const handleAddDocumentConfig = () => { const l = prompt("Name:"); if(l) { addDocumentConfig(l); setDocConfigs(getDocumentConfigs()); } };
  const handleDeleteDocumentConfig = (id: string) => { if(confirm("Delete?")) { deleteDocumentConfig(id); setDocConfigs(getDocumentConfigs()); } };
  const handleToggleDocVisibility = (id: string) => { const u = docConfigs.map(d=>d.id===id?{...d,isHidden:!d.isHidden}:d); saveDocumentConfigs(u); setDocConfigs(u); };
  const handleEditDocLabel = (id: string) => { const l = prompt("New Label:"); if(l) { const u = docConfigs.map(d=>d.id===id?{...d,label:l}:d); saveDocumentConfigs(u); setDocConfigs(u); } };
  const handleAddScoreConfig = () => { if (!newScoreExamName || !newScoreExamMin || !newScoreExamMax) return; setScoreConfigList([...scoreConfigList, { exam: newScoreExamName, min: parseFloat(newScoreExamMin), max: parseFloat(newScoreExamMax) }]); setNewScoreExamName(''); setNewScoreExamMin(''); setNewScoreExamMax(''); };
  const handleRemoveScoreConfig = (index: number) => { const updated = [...scoreConfigList]; updated.splice(index, 1); setScoreConfigList(updated); };
  
  // --- Slot Handlers ---
  const handleSaveSlot = () => { if(!newSlotDate) return; const capacity = parseInt(newSlotCapacity); if (editingSlotId) { const original = interviewSlots.find(s => s.id === editingSlotId); if (original) { if (capacity < original.booked) { alert(`Capacity error.`); return; } saveInterviewSlot({ ...original, dateTime: `${newSlotDate}T${newSlotTimeStart}:00`, endTime: `${newSlotDate}T${newSlotTimeEnd}:00`, location: newSlotLocation, type: newSlotType, capacity: capacity }); } } else { saveInterviewSlot({ id: `slot_${Date.now()}`, dateTime: `${newSlotDate}T${newSlotTimeStart}:00`, endTime: `${newSlotDate}T${newSlotTimeEnd}:00`, location: newSlotLocation, type: newSlotType, capacity: capacity, booked: 0, groups: [] }); } refreshData(); setIsSlotModalOpen(false); };
  const handleDeleteSlot = (e: any, id: string) => { e.stopPropagation(); const s = interviewSlots.find(x=>x.id===id); if(s && s.booked > 0) return alert("Has bookings"); if(confirm("Delete?")) { deleteInterviewSlot(id); refreshData(); } };
  const handleCreateGroup = () => { if(selectedSlot) { const u = { ...selectedSlot, groups: [...(selectedSlot.groups||[]), { id: `grp_${Date.now()}`, name: `Group ${(selectedSlot.groups?.length||0)+1}`, applicantIds: [] }] }; saveInterviewSlot(u); refreshData(); } };
  const handleRenameGroup = (e: any, gid: string) => { e.stopPropagation(); if(selectedSlot) { const n = prompt("Name:"); if(n) { const u = { ...selectedSlot, groups: selectedSlot.groups?.map(g=>g.id===gid?{...g,name:n}:g) }; saveInterviewSlot(u); refreshData(); } } };
  const handleDeleteGroup = (gid: string) => { if(selectedSlot && confirm("Delete?")) { const u = { ...selectedSlot, groups: selectedSlot.groups?.filter(g=>g.id!==gid) }; saveInterviewSlot(u); refreshData(); } };
  const handleMoveApplicantToGroup = (aid: string, gid: string|null) => { if(selectedSlot) { let grps = selectedSlot.groups ? [...selectedSlot.groups] : []; grps = grps.map(g => ({ ...g, applicantIds: g.applicantIds.filter(id=>id!==aid) })); if(gid) { const idx = grps.findIndex(g=>g.id===gid); if(idx!==-1) grps[idx].applicantIds.push(aid); } saveInterviewSlot({ ...selectedSlot, groups: grps }); refreshData(); } };
  const handleMoveApplicantOrder = (aid: string, gid: string, dir: 'up'|'down') => { if(selectedSlot) { const gIdx = selectedSlot.groups?.findIndex(g=>g.id===gid); if(gIdx!==undefined && gIdx!==-1) { const grp = selectedSlot.groups![gIdx]; const aIdx = grp.applicantIds.indexOf(aid); if(aIdx!==-1) { const newIds = [...grp.applicantIds]; if(dir==='up' && aIdx>0) [newIds[aIdx], newIds[aIdx-1]] = [newIds[aIdx-1], newIds[aIdx]]; else if(dir==='down' && aIdx<newIds.length-1) [newIds[aIdx], newIds[aIdx+1]] = [newIds[aIdx+1], newIds[aIdx]]; const newGrps = [...selectedSlot.groups!]; newGrps[gIdx] = { ...grp, applicantIds: newIds }; saveInterviewSlot({ ...selectedSlot, groups: newGrps }); refreshData(); } } } };
  const toggleGroupExpansion = (gid: string) => { const s = new Set(expandedGroupIds); if(s.has(gid)) s.delete(gid); else s.add(gid); setExpandedGroupIds(s); };
  const handleSwitchApplicantSlot = (applicantId: string, targetSlotId: string) => { if (!selectedSlot || !targetSlotId) return; const targetSlot = interviewSlots.find(s => s.id === targetSlotId); if (!targetSlot || targetSlot.booked >= targetSlot.capacity) return alert("Target slot is full."); const app = applicants.find(a => a.id === applicantId); if (!app) return; const updatedApp = { ...app, interviewSlotId: targetSlot.id, interviewSlot: targetSlot.dateTime }; saveApplicant(updatedApp); const updatedCurrentSlot = { ...selectedSlot, booked: Math.max(0, selectedSlot.booked - 1) }; saveInterviewSlot(updatedCurrentSlot); setSelectedSlot(updatedCurrentSlot); saveInterviewSlot({ ...targetSlot, booked: targetSlot.booked + 1 }); refreshData(); alert("Moved."); };
  const handleDragStart = (e: any, i: number) => dragItem.current = i; const handleDragEnter = (e: any, i: number) => dragOverItem.current = i; const handleDragEndField = () => { if (dragItem.current!==null && dragOverItem.current!==null) { const c = [...fieldConfigs]; const i = c.splice(dragItem.current, 1)[0]; c.splice(dragOverItem.current, 0, i); saveFieldConfigs(c); setFieldConfigs(c); dragItem.current=null; dragOverItem.current=null; } }; const handleDragStartDoc = (e: any, i: number) => dragItemDoc.current = i; const handleDragEnterDoc = (e: any, i: number) => dragOverItemDoc.current = i; const handleDragEndDoc = () => { if (dragItemDoc.current!==null && dragOverItemDoc.current!==null) { const c = [...docConfigs]; const i = c.splice(dragItemDoc.current, 1)[0]; c.splice(dragOverItemDoc.current, 0, i); saveDocumentConfigs(c); setDocConfigs(c); dragItemDoc.current=null; dragOverItemDoc.current=null; } };
  
  // --- Exam & Announcement & User Handlers ---
  const handleEditSuite = (s: ExamSuite) => { setEditingSuiteId(s.id); setSuiteTitle(s.title); setSuiteDesc(s.description); setIsSuiteModalOpen(true); }; const handleSaveSuite = () => { saveExamSuite({ id: editingSuiteId||`s_${Date.now()}`, title: suiteTitle, description: suiteDesc }); setExamSuites(getExamSuites()); setIsSuiteModalOpen(false); }; const handleDeleteSuite = (id: string) => { if(confirm("Delete?")) { deleteExamSuite(id); setExamSuites(getExamSuites()); setSelectedSuite(null); } }; const handleEditQuestion = (q: ExamQuestion) => { setEditingQuestionId(q.id); setQText(q.text); setQType(q.type); setQScore(q.score.toString()); setQIsGraded(q.isGraded!==false); setQOptions(q.options||[]); setIsQuestionModalOpen(true); }; const handleSaveQuestion = () => { if(!selectedSuite) return; saveExam({ id: editingQuestionId||`q_${Date.now()}`, suiteId: selectedSuite.id, text: qText, type: qType, score: qIsGraded ? Number(qScore) : 0, isGraded: qIsGraded, options: qType!==QuestionType.ESSAY?qOptions:undefined }); setSuiteQuestions(getExams().filter(q=>q.suiteId===selectedSuite.id)); setIsQuestionModalOpen(false); }; const handleDeleteQuestion = (id: string) => { if(confirm("Delete?")) { deleteExam(id); setSuiteQuestions(getExams().filter(q=>q.suiteId===selectedSuite?.id)); } }; const handleAddOption = () => setQOptions([...qOptions, { id: `opt_${Date.now()}`, text: '', isCorrect: false }]); const handleAddOtherOption = () => setQOptions([...qOptions, { id: `opt_${Date.now()}`, text: 'Other', isCorrect: false, allowInput: true }]); const handleUpdateOption = (id: string, t: string) => setQOptions(qOptions.map(o=>o.id===id?{...o,text:t}:o)); const handleToggleOption = (id: string) => { if(qType===QuestionType.MCQ_SINGLE) setQOptions(qOptions.map(o=>({...o,isCorrect:o.id===id}))); else setQOptions(qOptions.map(o=>o.id===id?{...o,isCorrect:!o.isCorrect}:o)); }; const handleRemoveOption = (id: string) => setQOptions(qOptions.filter(o=>o.id!==id));
  const handleSaveAnnouncement = () => { if(!newAnnTitle || !newAnnMessage) return; saveAnnouncement({ id: `ann_${Date.now()}`, title: newAnnTitle, message: newAnnMessage, type: newAnnType, timestamp: new Date().toISOString() }); setAnnouncements(getAnnouncements()); setIsAnnouncementModalOpen(false); setNewAnnTitle(''); setNewAnnMessage(''); }; const handleDeleteAnnouncement = (id: string) => { if(confirm("Delete?")) { deleteAnnouncement(id); setAnnouncements(getAnnouncements()); } };
  const togglePaymentSetting = (k: keyof PaymentConfig) => { const c = { ...paymentConfig, [k]: !paymentConfig[k] }; setPaymentConfig(c); savePaymentConfig(c); };
  const handleSaveUser = () => { if(!newUserUsername || !newUserFullName) return; const u = { id: editingUserId || `admin_${Date.now()}`, username: newUserUsername, fullName: newUserFullName, role: newUserRole, assignedGroupIds: newUserRole === StaffRole.PROCTOR ? newUserAssignedGroups : undefined }; saveStaffUser(u); refreshData(); setIsUserModalOpen(false); }; const handleDeleteUser = (id: string) => { if(id===currentUser.id) return alert("Cannot delete self."); if(confirm("Delete?")) { deleteStaffUser(id); refreshData(); } }; const openUserModal = (u?: StaffUser) => { if(u) { setEditingUserId(u.id); setNewUserUsername(u.username); setNewUserFullName(u.fullName); setNewUserRole(u.role); setNewUserAssignedGroups(u.assignedGroupIds||[]); } else { setEditingUserId(null); setNewUserUsername(''); setNewUserFullName(''); setNewUserRole(StaffRole.REVIEWER); setNewUserAssignedGroups([]); } setIsUserModalOpen(true); };
  const handleAssignReviewer = (reviewerId: string) => { if (!confirm("Assign to this reviewer?")) return; applicants.forEach(app => { if (filteredApplicants.find(fa => fa.id === app.id)) saveApplicant({ ...app, reviewerId }); }); refreshData(); alert("Assigned."); };

  // Demo Controls
  const demoGenerateApplicant = () => { const a = getApplicants()[0]; saveApplicant({ ...a, id: `u_${Date.now()}`, fullName: `Demo ${Math.floor(Math.random()*100)}`, status: ApplicationStatus.SUBMITTED }); refreshData(); }; const demoApproveCurrentDocs = () => { if(selectedApplicant) { const u = { ...selectedApplicant, status: ApplicationStatus.DOCS_APPROVED }; Object.keys(u.documents).forEach(k=>u.documents[k].status=DocumentStatus.APPROVED); saveApplicant(u); refreshData(); setSelectedApplicant(null); } }; const demoFillScores = () => { if(selectedApplicant) { saveApplicant({ ...selectedApplicant, writtenScore: 85, interviewScore: 90, status: ApplicationStatus.PASSED }); refreshData(); setSelectedApplicant(null); } }; const demoAddApplicantToSlot = () => { if(selectedSlot) { const id = `slot_u_${Date.now()}`; saveApplicant({ ...getApplicants()[0], id, fullName: `Slot User ${Math.floor(Math.random()*100)}`, status: ApplicationStatus.INTERVIEW_BOOKED, interviewSlotId: selectedSlot.id }); bookInterviewSlot(selectedSlot.id, id); refreshData(); alert("Added"); } };
  
  const slotApplicants = selectedSlot ? applicants.filter(a => a.interviewSlotId === selectedSlot.id) : []; const slotGroups = selectedSlot?.groups || []; const assignedApplicantIds = new Set(slotGroups.flatMap(g => g.applicantIds)); const unassignedApplicants = slotApplicants.filter(a => !assignedApplicantIds.has(a.id)); const isEditingStandardField = editingFieldId ? fieldConfigs.find(f => f.id === editingFieldId)?.isStandard : false; const inputStyle = "w-full border border-gray-300 rounded-md p-2.5 focus:outline-none focus:ring-1 focus:ring-brand-600 focus:border-brand-600 bg-white shadow-sm text-gray-900 text-sm disabled:bg-gray-100 disabled:text-gray-500"; const labelStyle = "block text-sm font-medium text-gray-700 mb-1";
  const openSlotModal = (slot?: InterviewSlot) => { if (slot) { setEditingSlotId(slot.id); setNewSlotDate(slot.dateTime.split('T')[0]); setNewSlotTimeStart(slot.dateTime.split('T')[1].substring(0, 5)); setNewSlotTimeEnd(slot.endTime.split('T')[1].substring(0, 5)); setNewSlotLocation(slot.location); setNewSlotCapacity(slot.capacity.toString()); setNewSlotType(slot.type); } else { setEditingSlotId(null); setSelectedSlot(null); setNewSlotDate(''); setNewSlotTimeStart(''); setNewSlotTimeEnd(''); setNewSlotLocation(''); setNewSlotCapacity('10'); setNewSlotType('Onsite'); } setIsSlotModalOpen(true); }; const closeFieldModal = () => { setIsFieldModalOpen(false); };
  const showApplicationFee = true; const showInterviewFee = draftApplicant && [ApplicationStatus.DOCS_APPROVED, ApplicationStatus.INTERVIEW_READY, ApplicationStatus.INTERVIEW_BOOKED, ApplicationStatus.PASSED, ApplicationStatus.ENROLLED].includes(draftApplicant.status); const showTuitionFee = draftApplicant && [ApplicationStatus.PASSED, ApplicationStatus.ENROLLED].includes(draftApplicant.status);

  return (
    <div className="min-h-screen bg-gray-100 flex font-sans pb-20 md:pb-0">
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-white hidden md:block fixed h-full shadow-xl z-10">
        <div className="p-6 font-bold text-xl text-brand-500 flex items-center space-x-2 border-b border-gray-800">
          <span>Admin Portal</span>
        </div>
        <div className="px-6 py-4">
            <div className="text-xs text-gray-500 uppercase">Logged in as</div>
            <div className="text-sm font-bold text-white">{currentUser.fullName}</div>
            <div className="text-xs text-brand-400 capitalize">{currentUser.role.replace('_', ' ').toLowerCase()}</div>
        </div>
        <nav className="mt-2 space-y-1">
          {currentUser.role === StaffRole.SUPER_ADMIN && (
              <>
                {['dashboard', 'applicants', 'appointments', 'exams', 'form-builder', 'announcements', 'users', 'settings'].map((item) => (
                    <a key={item} onClick={() => { setView(item as any); if(item==='appointments') setSelectedSlot(null); }} className={`flex items-center py-3 px-6 cursor-pointer transition-all border-r-4 ${view === item ? 'bg-gray-800 border-brand-500 text-white' : 'border-transparent text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                        {item === 'dashboard' && <BarChart3 className={`mr-3 w-5 h-5 ${view === 'dashboard' ? 'text-brand-400' : ''}`} />}
                        {item === 'applicants' && <FileText className={`mr-3 w-5 h-5 ${view === 'applicants' ? 'text-brand-400' : ''}`} />}
                        {item === 'appointments' && <Calendar className={`mr-3 w-5 h-5 ${view === 'appointments' ? 'text-brand-400' : ''}`} />}
                        {item === 'exams' && <BookOpen className={`mr-3 w-5 h-5 ${view === 'exams' ? 'text-brand-400' : ''}`} />}
                        {item === 'form-builder' && <PenTool className={`mr-3 w-5 h-5 ${view === 'form-builder' ? 'text-brand-400' : ''}`} />}
                        {item === 'announcements' && <Megaphone className={`mr-3 w-5 h-5 ${view === 'announcements' ? 'text-brand-400' : ''}`} />}
                        {item === 'users' && <UserCog className={`mr-3 w-5 h-5 ${view === 'users' ? 'text-brand-400' : ''}`} />}
                        {item === 'settings' && <SettingsIcon className={`mr-3 w-5 h-5 ${view === 'settings' ? 'text-brand-400' : ''}`} />}
                        <span className="capitalize">{item.replace('-', ' ')}</span>
                    </a>
                ))}
              </>
          )}
          {currentUser.role === StaffRole.REVIEWER && (
              <>
                {['dashboard', 'applicants', 'exams'].map((item) => (
                    <a key={item} onClick={() => setView(item as any)} className={`flex items-center py-3 px-6 cursor-pointer transition-all border-r-4 ${view === item ? 'bg-gray-800 border-brand-500 text-white' : 'border-transparent text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                        {item === 'dashboard' && <BarChart3 className={`mr-3 w-5 h-5 ${view === 'dashboard' ? 'text-brand-400' : ''}`} />}
                        {item === 'applicants' && <FileText className={`mr-3 w-5 h-5 ${view === 'applicants' ? 'text-brand-400' : ''}`} />}
                        {item === 'exams' && <BookOpen className={`mr-3 w-5 h-5 ${view === 'exams' ? 'text-brand-400' : ''}`} />}
                        <span className="capitalize">{item.replace('-', ' ')}</span>
                    </a>
                ))}
              </>
          )}
          {currentUser.role === StaffRole.PROCTOR && (
              <a onClick={() => setView('appointments')} className={`flex items-center py-3 px-6 cursor-pointer transition-all border-r-4 ${view === 'appointments' ? 'bg-gray-800 border-brand-500 text-white' : 'border-transparent text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                  <Calendar className={`mr-3 w-5 h-5 ${view === 'appointments' ? 'text-brand-400' : ''}`} />
                  <span className="capitalize">Appointments</span>
              </a>
          )}
        </nav>
        <div className="absolute bottom-0 w-full p-6 bg-gray-900 border-t border-gray-800 mb-16 md:mb-0">
          <Button variant="danger" className="w-full" onClick={onLogout}>Logout</Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 md:ml-64 p-8 overflow-y-auto mb-16 md:mb-0">
        
        {view === 'users' && currentUser.role === StaffRole.SUPER_ADMIN && (
            <div className="space-y-6 max-w-7xl mx-auto">
                <div className="flex justify-between items-center"><h2 className="text-3xl font-bold text-gray-900">User Management</h2><Button onClick={() => openUserModal()}><Plus className="w-4 h-4 mr-2"/> Add User</Button></div>
                <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50"><tr><th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">User</th><th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase">Role</th><th className="px-6 py-3 text-right">Actions</th></tr></thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {staffUsers.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4"><div className="font-bold text-gray-900">{user.fullName}</div><div className="text-xs text-gray-500">{user.username}</div></td>
                                    <td className="px-6 py-4"><span className="text-xs px-2 py-1 rounded bg-gray-100 font-bold border">{user.role}</span></td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2"><button onClick={() => openUserModal(user)} className="text-brand-600 hover:text-brand-800"><Pencil className="w-4 h-4"/></button><button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-800"><Trash2 className="w-4 h-4"/></button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {view === 'dashboard' && (
          <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-end gap-4 mb-2"><h2 className="text-3xl font-bold text-gray-900">Dashboard Overview</h2></div>
            <div className="flex bg-white rounded-xl p-1 shadow-sm border border-gray-200 overflow-x-auto w-fit mb-4">{['ALL', 'PENDING', 'INTERVIEW', 'FINAL', 'FAILED'].map(stage => (<button key={stage} onClick={() => setDashboardStatusFilter(stage)} className={`px-6 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${dashboardStatusFilter === stage ? 'bg-gray-900 text-white shadow-md' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'}`}>{stage}</button>))}</div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6"><div className="bg-gradient-to-br from-white to-blue-50 p-6 rounded-xl shadow-sm border border-blue-100 flex items-center justify-between"><div><div className="text-blue-500 text-xs font-bold uppercase tracking-wider mb-1">Total Applicants</div><div className="text-3xl font-extrabold text-gray-900">{stats.total}</div></div><div className="p-3 bg-blue-100 rounded-full text-blue-600"><Users className="w-6 h-6"/></div></div><div className="bg-gradient-to-br from-white to-yellow-50 p-6 rounded-xl shadow-sm border border-yellow-100 flex items-center justify-between"><div><div className="text-yellow-600 text-xs font-bold uppercase tracking-wider mb-1">Pending Review</div><div className="text-3xl font-extrabold text-gray-900">{stats.pendingDocs}</div></div><div className="p-3 bg-yellow-100 rounded-full text-yellow-600"><Clock className="w-6 h-6"/></div></div><div className="bg-gradient-to-br from-white to-purple-50 p-6 rounded-xl shadow-sm border border-purple-100 flex items-center justify-between"><div><div className="text-purple-600 text-xs font-bold uppercase tracking-wider mb-1">Interview Ready</div><div className="text-3xl font-extrabold text-gray-900">{stats.interviewReady}</div></div><div className="p-3 bg-purple-100 rounded-full text-purple-600"><Calendar className="w-6 h-6"/></div></div><div className="bg-gradient-to-br from-white to-green-50 p-6 rounded-xl shadow-sm border border-green-100 flex items-center justify-between"><div><div className="text-green-600 text-xs font-bold uppercase tracking-wider mb-1">Passed</div><div className="text-3xl font-extrabold text-gray-900">{stats.passed}</div></div><div className="p-3 bg-green-100 rounded-full text-green-600"><Trophy className="w-6 h-6"/></div></div></div>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"><h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center"><BarChart3 className="w-5 h-5 mr-2 text-brand-600"/>{chartTitle}</h3><div className="h-72 outline-none"><ResponsiveContainer width="100%" height="100%" className="outline-none"><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#6b7280', fontSize:12, fontWeight: 500}} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{fill:'#6b7280', fontSize:12}} allowDecimals={false} /><Tooltip content={<CustomTooltip />} cursor={{fill: '#f3f4f6'}} /><Bar dataKey="value" radius={[6, 6, 0, 0]} onClick={(data: any) => handleChartClick('status', data.name)} className="cursor-pointer" barSize={50}>{chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill || PALETTE.brand} className="hover:opacity-80 transition-opacity" />))}</Bar></BarChart></ResponsiveContainer></div></div><div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"><h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center"><Trophy className="w-5 h-5 mr-2 text-yellow-500"/>Applicant Rankings</h3><div className="h-72 outline-none"><ResponsiveContainer width="100%" height="100%" className="outline-none"><BarChart data={rankingChartData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill:'#6b7280', fontSize:12}} dy={10} /><YAxis axisLine={false} tickLine={false} tick={{fill:'#6b7280', fontSize:12}} allowDecimals={false} /><Tooltip content={<CustomTooltip />} cursor={{fill: '#f3f4f6'}} /><Bar dataKey="value" radius={[6, 6, 0, 0]} fill={PALETTE.warning} onClick={(data: any) => handleChartClick('ranking', data.name)} className="cursor-pointer" barSize={40} /></BarChart></ResponsiveContainer></div></div></div>
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6"><div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"><h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><Users className="w-5 h-5 mr-2 text-brand-600"/>Demographics (Gender)</h3><div className="h-64 outline-none"><ResponsiveContainer width="100%" height="100%" className="outline-none"><PieChart><Pie data={genderData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" onClick={(data: any) => handleChartClick('gender', data.name)} className="cursor-pointer outline-none">{genderData.map((entry, index) => (<Cell key={`cell-${index}`} fill={PALETTE.gender[entry.name as keyof typeof PALETTE.gender] || PALETTE.neutral} />))}</Pie><Tooltip content={<CustomTooltip />} /><Legend verticalAlign="bottom" height={36}/></PieChart></ResponsiveContainer></div></div><div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"><h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><Users className="w-5 h-5 mr-2 text-brand-600"/>Age Distribution</h3><div className="h-64 outline-none"><ResponsiveContainer width="100%" height="100%" className="outline-none"><BarChart data={ageChartData} layout="vertical"><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" /><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={50} tick={{fontSize: 12}} axisLine={false} tickLine={false} /><Tooltip content={<CustomTooltip />} cursor={{fill: '#f3f4f6'}} /><Bar dataKey="value" radius={[0, 4, 4, 0]} fill={PALETTE.info} barSize={20} onClick={(data: any) => handleChartClick('age', data.name)} className="cursor-pointer" /></BarChart></ResponsiveContainer></div></div><div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"><h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><GraduationCap className="w-5 h-5 mr-2 text-brand-600"/>Education Background</h3><div className="h-64 outline-none"><ResponsiveContainer width="100%" height="100%" className="outline-none"><BarChart data={educationChartData} layout="vertical"><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" /><XAxis type="number" hide /><YAxis dataKey="name" type="category" width={80} tick={{fontSize: 10}} axisLine={false} tickLine={false} /><Tooltip content={<CustomTooltip />} cursor={{fill: '#f3f4f6'}} /><Bar dataKey="value" radius={[0, 4, 4, 0]} fill={PALETTE.purple} barSize={20} onClick={(data: any) => handleChartClick('education', data.name)} className="cursor-pointer" /></BarChart></ResponsiveContainer></div></div></div>
          </div>
        )}

        {view === 'applicants' && (
          <div className="space-y-6 max-w-7xl mx-auto">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"><div><h2 className="text-3xl font-bold text-gray-900">Manage Applicants</h2><p className="text-gray-500 text-sm mt-1">Review applications and update statuses.</p></div><Button className="flex items-center bg-gray-800 hover:bg-gray-900" onClick={handlePublishUpdates}><Send className="w-4 h-4 mr-2"/> Send Updates to Applicants</Button></div>
             <div className="flex flex-wrap items-center gap-4 w-full">
                 <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200 overflow-x-auto">{['ALL', 'PENDING_DOCS', 'INTERVIEW_STAGE', 'FINISHED', 'FAILED'].map(f => (<button key={f} onClick={() => setStatusFilter(f)} className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${statusFilter === f ? 'bg-brand-600 text-white' : 'text-gray-500 hover:text-gray-900'}`}>{f.replace('_', ' ')}</button>))}</div>
                 <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm border border-gray-200"><span className="text-xs font-bold text-gray-500 px-2 uppercase flex items-center"><Trophy className="w-3 h-3 mr-1"/> Ranking:</span><select value={minRankFilter} onChange={(e) => setMinRankFilter(Number(e.target.value))} className="text-sm border-none focus:ring-0 text-gray-700 bg-transparent cursor-pointer"><option value={0}>All Ranks</option><option value={10}>Rank 10 (Top)</option><option value={9}>Rank 9+</option><option value={8}>Rank 8+</option><option value={7}>Rank 7+</option><option value={5}>Rank 5+</option></select></div>
                 <div className="relative">
                     <button onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm"><Columns className="w-4 h-4"/> Columns</button>
                     {isColumnMenuOpen && (
                         <div className="absolute right-0 top-12 w-64 bg-white border border-gray-200 rounded-lg shadow-xl z-20 p-2 max-h-80 overflow-y-auto">
                             <div className="text-xs font-bold text-gray-500 mb-2 px-2 uppercase">Toggle Columns</div>
                             {columnsOptions.map(col => (
                                 <label key={col.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                                     <input type="checkbox" checked={visibleColumns.includes(col.id)} onChange={() => toggleColumn(col.id)} className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"/>
                                     <span className="text-sm text-gray-700 truncate">{col.label}</span>
                                 </label>
                             ))}
                         </div>
                     )}
                 </div>
                 {currentUser.role === StaffRole.SUPER_ADMIN && (
                     <div className="flex items-center gap-2">
                         <span className="text-sm font-bold text-gray-600">Assign All Filtered To:</span>
                         <select onChange={(e) => e.target.value && handleAssignReviewer(e.target.value)} className="border rounded-md px-2 py-1.5 text-sm bg-white cursor-pointer hover:border-brand-500" value="">
                             <option value="">Select Reviewer</option>
                             {getAvailableReviewers().map(r => <option key={r.id} value={r.id}>{r.fullName}</option>)}
                         </select>
                     </div>
                 )}
             </div>

             <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200">
                 <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 w-10 sticky left-0 bg-gray-50 z-10"></th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 sticky left-10 bg-gray-50 z-10" onClick={() => handleSort('fullName')}>
                                    <div className="flex items-center">Applicant {sortConfig?.key === 'fullName' && <ArrowUpDown className="w-3 h-3 ml-1"/>}</div>
                                </th>
                                {visibleColumns.map(colId => {
                                    const colDef = columnsOptions.find(c => c.id === colId);
                                    return (
                                        <th key={colId} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap relative group" onClick={() => handleSort(colId)}>
                                            <div className="flex items-center gap-1">
                                                {colDef?.label || colId} 
                                                {sortConfig?.key === colId && <ArrowUpDown className="w-3 h-3 ml-1"/>}
                                                <button onClick={(e) => { e.stopPropagation(); setActiveColumnFilter(activeColumnFilter === colId ? null : colId); }} className={`p-1 rounded hover:bg-gray-200 ${columnFilters[colId] ? 'text-brand-600' : 'text-gray-400 group-hover:text-gray-600'}`}><Filter className="w-3 h-3"/></button>
                                            </div>
                                            {activeColumnFilter === colId && (
                                                <div className="absolute top-10 left-0 bg-white shadow-xl border rounded-lg z-50 min-w-[150px] p-2">
                                                    <div className="text-xs font-bold text-gray-500 mb-2">Filter by {colDef?.label}</div>
                                                    <button onClick={() => handleColumnFilter(colId, '')} className="block w-full text-left px-2 py-1 text-xs hover:bg-gray-50 rounded mb-1 text-red-500">Clear Filter</button>
                                                    {getUniqueColumnValues(colId).map(val => (
                                                        <button key={val} onClick={() => handleColumnFilter(colId, val)} className="block w-full text-left px-2 py-1 text-xs hover:bg-gray-50 rounded text-gray-700 truncate">{val}</button>
                                                    ))}
                                                </div>
                                            )}
                                        </th>
                                    );
                                })}
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap" onClick={() => handleSort('status')}>
                                    <div className="flex items-center">Status {sortConfig?.key === 'status' && <ArrowUpDown className="w-3 h-3 ml-1"/>}</div>
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 whitespace-nowrap" onClick={() => handleSort('rankingScore')}>
                                    <div className="flex items-center">Ranking {sortConfig?.key === 'rankingScore' && <ArrowUpDown className="w-3 h-3 ml-1"/>}</div>
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Quick Actions</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 z-10">Manage</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredApplicants.map(app => (
                                <tr key={app.id} className={`hover:bg-gray-50 ${app.isStarred ? 'bg-yellow-50/50' : ''}`}>
                                    <td className="px-4 py-4 sticky left-0 bg-white z-10"><button onClick={() => toggleStar(app.id)} className="text-yellow-400 hover:text-yellow-500 focus:outline-none"><Star className={`w-5 h-5 ${app.isStarred ? 'fill-yellow-400' : ''}`} /></button></td>
                                    <td className="px-4 py-4 sticky left-10 bg-white z-10"><div className="text-sm font-bold text-gray-900">{app.fullName}</div><div className="text-xs text-gray-500">{app.email}</div></td>
                                    {visibleColumns.map(colId => (
                                        <td key={colId} className="px-4 py-4 text-sm text-gray-700 whitespace-nowrap">
                                            {renderCellContent(app, colId)}
                                        </td>
                                    ))}
                                    <td className="px-4 py-4 whitespace-nowrap"><div className="flex flex-col"><span className={`px-3 py-1 text-xs rounded-full border font-bold w-fit ${DS.status[app.status]}`}>{app.status}</span>{app.status !== app.lastNotifiedStatus && (<span className="text-[10px] text-orange-500 font-medium mt-1 flex items-center"><AlertCircle className="w-3 h-3 mr-1"/> Unsent Update</span>)}</div></td>
                                    <td className="px-4 py-4 whitespace-nowrap"><select value={app.rankingScore || 0} onChange={(e) => handleUpdateRanking(app, Number(e.target.value))} className={`text-xs border rounded p-1 font-bold cursor-pointer focus:ring-brand-500 focus:border-brand-500 ${(app.rankingScore||0)>=8 ? 'text-green-600 border-green-200 bg-green-50' : (app.rankingScore||0)>=5 ? 'text-blue-600 border-blue-200 bg-blue-50' : 'text-gray-600 border-gray-200'}`}><option value={0}>-</option>{[1,2,3,4,5,6,7,8,9,10].map(n => (<option key={n} value={n}>{n}</option>))}</select></td>
                                    <td className="px-4 py-4 whitespace-nowrap"><div className="flex gap-2">{app.status !== ApplicationStatus.PASSED && app.status !== ApplicationStatus.ENROLLED && app.status !== ApplicationStatus.FAILED && (<><Button size="sm" className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700" onClick={() => handleQuickStatusChange(app, 'pass')}>Pass</Button><Button size="sm" className="h-7 px-2 text-xs bg-red-600 hover:bg-red-700" onClick={() => handleQuickStatusChange(app, 'fail')}>Fail</Button></>)}</div></td>
                                    <td className="px-4 py-4 text-right sticky right-0 bg-white z-10"><button onClick={() => { setSelectedApplicant(app); setIsReadOnlyView(false); }} className="text-brand-600 hover:text-brand-800 font-bold text-sm border border-brand-200 hover:border-brand-400 px-3 py-1 rounded transition-all">Manage</button></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
             </div>
          </div>
        )}

        {view === 'appointments' && (
            <div className="space-y-6 max-w-7xl mx-auto">
                {selectedSlot ? (
                    <div className="space-y-6">
                        <div className="flex items-center gap-4"><button onClick={() => setSelectedSlot(null)} className="p-2 rounded-full hover:bg-gray-200"><ChevronLeft className="w-6 h-6 text-gray-600"/></button><div><h2 className="text-2xl font-bold text-gray-900">Manage Slot</h2><div className="flex items-center text-sm text-gray-500 mt-1"><Clock className="w-4 h-4 mr-1"/> {new Date(selectedSlot.dateTime).toLocaleString()} | <MapPin className="w-4 h-4 mr-1 ml-2"/> {selectedSlot.location}</div></div></div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm"><h3 className="font-bold text-gray-800 mb-3">Unassigned ({unassignedApplicants.length})</h3><div className="space-y-2 min-h-[200px]">{unassignedApplicants.map(app => (<div key={app.id} className="p-3 bg-gray-50 rounded border border-gray-200"><div className="font-bold text-sm text-gray-900">{app.fullName}</div><div className="text-xs text-gray-500 mb-2">ID: {app.id}</div><div className="flex gap-2 items-center"><Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={() => { setSelectedApplicant(app); setIsReadOnlyView(true); }}>View Profile</Button><select className="h-8 text-xs border border-gray-300 rounded bg-white px-2 text-gray-900 cursor-pointer min-w-[90px]" onChange={(e) => { if(e.target.value === 'change_slot') return; handleMoveApplicantToGroup(app.id, e.target.value || null); }} value=""><option value="" disabled>Move to</option>{slotGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select>
                            <select className="h-8 text-xs border border-gray-300 rounded bg-white px-2 text-gray-900 cursor-pointer min-w-[90px]" value="" onChange={(e) => handleSwitchApplicantSlot(app.id, e.target.value)}><option value="" disabled>Change Slot</option>{interviewSlots.filter(s => s.id !== selectedSlot.id && s.booked < s.capacity).map(s => (<option key={s.id} value={s.id}>{new Date(s.dateTime).toLocaleDateString()} {new Date(s.dateTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</option>))}</select></div></div>))}</div></div>
                            <div className="lg:col-span-2 space-y-4"><div className="flex justify-between items-center"><h3 className="font-bold text-gray-800">Groups</h3>{currentUser.role !== StaffRole.PROCTOR && <Button size="sm" onClick={handleCreateGroup}><Plus className="w-4 h-4 mr-2"/> Create Group</Button>}</div>{slotGroups.length === 0 ? (<div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl text-gray-400">No groups created.</div>) : (<div className="grid grid-cols-1 gap-4">{slotGroups.map(group => { 
                                const isExpanded = expandedGroupIds.has(group.id); 
                                if (currentUser.role === StaffRole.PROCTOR && !currentUser.assignedGroupIds?.includes(group.id)) return null;
                                return (<div key={group.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"><div className="flex justify-between items-center p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => toggleGroupExpansion(group.id)}><div className="flex items-center gap-3">{isExpanded ? <ChevronUp className="w-5 h-5 text-gray-500"/> : <ChevronDown className="w-5 h-5 text-gray-500"/>}<div><h4 className="font-bold text-brand-700 flex items-center gap-2 group/title">{group.name}</h4><span className="text-xs text-gray-500">{group.applicantIds.length} Applicants</span></div></div><div className="flex items-center gap-2">{currentUser.role !== StaffRole.PROCTOR && (<><button type="button" onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }} className="text-gray-400 hover:text-red-500 p-1.5" title="Delete"><Trash2 className="w-4 h-4"/></button><button type="button" onClick={(e) => handleRenameGroup(e, group.id)} className="text-gray-400 hover:text-brand-600 p-1.5" title="Rename"><Pencil className="w-4 h-4"/></button></>)}</div></div>{isExpanded && (<div className="p-4 border-t border-gray-200 bg-white">{group.applicantIds.length > 0 ? (<div className="space-y-2">{group.applicantIds.map((appId, index) => { const app = applicants.find(a => a.id === appId); if (!app) return null; return (<div key={appId} className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-100 hover:border-brand-200"><div className="flex items-center gap-3"><div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700">{index + 1}</div><div><div className="text-sm font-bold text-gray-900">{app.fullName}</div><div className="text-xs text-gray-500"><button onClick={() => { setSelectedApplicant(app); setIsReadOnlyView(true); }} className="text-brand-600 hover:underline">View Profile</button></div></div></div><div className="flex items-center gap-2">{currentUser.role !== StaffRole.PROCTOR && (<><div className="flex flex-col gap-1 mr-2"><button onClick={() => handleMoveApplicantOrder(appId, group.id, 'up')} disabled={index === 0} className="text-gray-400 hover:text-gray-600 disabled:opacity-30"><ArrowUp className="w-3 h-3"/></button><button onClick={() => handleMoveApplicantOrder(appId, group.id, 'down')} disabled={index === group.applicantIds.length - 1} className="text-gray-400 hover:text-gray-600 disabled:opacity-30"><ArrowDown className="w-3 h-3"/></button></div><button onClick={() => handleMoveApplicantToGroup(appId, null)} className="text-gray-400 hover:text-red-500" title="Remove"><X className="w-4 h-4"/></button></>)}</div></div>); })}</div>) : (<p className="text-sm text-gray-400 italic text-center py-4">No applicants.</p>)}</div>)}</div>);})}</div>)}</div>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-between items-center"><h2 className="text-3xl font-bold text-gray-900">Interview Schedule</h2>{currentUser.role !== StaffRole.PROCTOR && <Button onClick={() => openSlotModal()} className="flex items-center"><Plus className="w-4 h-4 mr-2"/> Add Slot</Button>}</div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{interviewSlots.sort((a,b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()).map(slot => { const isFull = slot.booked >= slot.capacity; return (<div key={slot.id} onClick={() => setSelectedSlot(slot)} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between cursor-pointer hover:border-brand-400 hover:shadow-md transition-all group"><div><div className="flex justify-between items-start mb-2"><div><div className="text-xs font-bold uppercase text-brand-600 mb-1">{new Date(slot.dateTime).toDateString()}</div><h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 group-hover:text-brand-700 transition-colors"><Clock className="w-4 h-4 text-gray-400"/> {new Date(slot.dateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(slot.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</h3></div><span className={`px-3 py-1 text-xs rounded-full font-bold border ${slot.type === 'Online' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-green-50 text-green-700 border-green-200'}`}>{slot.type}</span></div><div className="text-sm text-gray-600 mb-4 flex items-center"><MapPin className="w-4 h-4 mr-2 text-gray-400"/> {slot.location}</div></div><div><div className="flex justify-between text-xs font-semibold text-gray-500 mb-1"><span>Capacity</span><span className={isFull ? 'text-red-500' : 'text-brand-600'}>{slot.booked} / {slot.capacity}</span></div><div className="w-full bg-gray-100 rounded-full h-2 mb-4 overflow-hidden"><div className={`h-2 rounded-full ${isFull ? 'bg-red-500' : 'bg-brand-500'}`} style={{ width: `${Math.min((slot.booked / slot.capacity) * 100, 100)}%` }}></div></div><div className="flex justify-between items-center"><span className="text-xs text-brand-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Click to Manage</span><div className="flex items-center gap-2">{currentUser.role !== StaffRole.PROCTOR && (<><button type="button" onClick={(e) => { e.stopPropagation(); openSlotModal(slot); }} className="text-xs text-gray-500 hover:text-brand-600 font-medium flex items-center bg-transparent border-0 cursor-pointer p-1"><Pencil className="w-3 h-3"/></button><button type="button" onClick={(e) => handleDeleteSlot(e, slot.id)} className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center bg-transparent border-0 cursor-pointer p-1"><Trash2 className="w-3 h-3"/></button></>)}</div></div></div></div>); })}</div>
                    </>
                )}
            </div>
        )}

        {view === 'exams' && (
            <div className="space-y-6 max-w-7xl mx-auto flex flex-col h-[calc(100vh-140px)]">
                <div className="flex justify-between items-center"><h2 className="text-3xl font-bold text-gray-900">Exam Management</h2></div>
                <div className="flex gap-6 h-full"><div className="w-1/3 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col"><div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl"><h3 className="font-bold text-brand-600 flex items-center"><ClipboardList className="w-4 h-4 mr-2"/>Exam Suites</h3><Button size="sm" onClick={() => { setIsSuiteModalOpen(true); setEditingSuiteId(null); setSuiteTitle(''); setSuiteDesc(''); }}><Plus className="w-4 h-4 mr-1"/> New Suite</Button></div><div className="flex-1 overflow-y-auto p-2 space-y-2">{examSuites.map(suite => (<div key={suite.id} onClick={() => setSelectedSuite(suite)} className={`p-4 rounded-lg cursor-pointer border transition-all ${selectedSuite?.id === suite.id ? 'bg-brand-50 border-brand-500 ring-1 ring-brand-500' : 'bg-white border-gray-200 hover:bg-gray-50'}`}><div className="flex justify-between items-center"><h4 className={`font-bold text-sm ${selectedSuite?.id === suite.id ? 'text-brand-700' : 'text-gray-900'}`}>{suite.title}</h4><div className="flex gap-2"><button onClick={(e) => { e.stopPropagation(); handleEditSuite(suite); }} className={DS.actionIcon.primary} title="Edit"><Pencil className="w-4 h-4"/></button><button onClick={(e) => { e.stopPropagation(); handleDeleteSuite(suite.id); }} className={DS.actionIcon.danger} title="Delete"><Trash2 className="w-4 h-4"/></button></div></div><p className="text-xs text-gray-500 truncate">{suite.description}</p></div>))}</div></div><div className="w-2/3 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">{selectedSuite ? (<><div className="p-4 border-b bg-gray-50 flex justify-between items-center"><h3 className="font-bold text-gray-800 flex items-center"><BookOpen className="w-4 h-4 mr-2 text-brand-600"/>Questions ({suiteQuestions.length})</h3><Button size="sm" onClick={() => { setIsQuestionModalOpen(true); setEditingQuestionId(null); setQText(''); setQOptions([]); setQIsGraded(true); setQScore('5'); }}><Plus className="w-4 h-4"/> Add</Button></div><div className="flex-1 overflow-y-auto p-4 space-y-4">{suiteQuestions.map((q, idx) => (<div key={q.id} className="border rounded-lg p-4 relative group hover:border-brand-300 transition-colors"><div className="flex justify-between mb-2"><div className="flex items-center gap-2"><span className="font-bold text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">Q{idx+1} ({q.type})</span>{!q.isGraded && <span className="font-bold text-xs bg-yellow-100 px-2 py-1 rounded text-yellow-700">Not Graded</span>}</div><div className="flex gap-2"><button onClick={() => handleEditQuestion(q)} className={DS.actionIcon.primary}><Pencil className="w-4 h-4"/></button><button onClick={() => handleDeleteQuestion(q.id)} className={DS.actionIcon.danger}><Trash2 className="w-4 h-4"/></button></div></div><p className="text-sm font-medium text-gray-900">{q.text}</p>{q.type !== QuestionType.ESSAY && (<ul className="mt-2 pl-4 list-disc text-xs text-gray-500">{q.options?.map(o => (<li key={o.id} className={o.isCorrect && q.isGraded ? 'text-green-600 font-bold' : ''}>{o.text} {o.allowInput && <span className="text-gray-400 italic">(User Input)</span>}</li>))}</ul>)}</div>))}</div></>) : <div className="flex-1 flex flex-col items-center justify-center text-gray-400"><BookOpen className="w-12 h-12 mb-2 opacity-20"/>Select a suite to manage questions</div>}</div></div></div>
        )}

        {view === 'form-builder' && (
            <div className="space-y-6 max-w-7xl mx-auto"><div className="flex justify-between items-center"><h2 className="text-3xl font-bold text-gray-900">Form Builder</h2></div><div className="grid grid-cols-1 lg:grid-cols-2 gap-6"><div className="space-y-4"><div className="flex justify-between items-center"><h3 className="text-xl font-bold text-gray-800 flex items-center"><LayoutGrid className="w-5 h-5 mr-2 text-brand-600"/> Profile Fields</h3><Button onClick={openAddFieldModal} size="sm" className="flex items-center"><Plus className="w-4 h-4 mr-2"/> Add Field</Button></div><div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-2 min-h-[300px]">{fieldConfigs.map((field, index) => (<div key={field.id} className="p-3 border rounded flex justify-between items-center bg-white hover:border-brand-300 transition-colors cursor-move group" draggable onDragStart={(e) => handleDragStart(e, index)} onDragEnter={(e) => handleDragEnter(e, index)} onDragEnd={handleDragEndField}><div className="flex items-center gap-3"><GripVertical className="text-gray-400 cursor-grab" /><div><span className="font-bold text-gray-900 text-sm">{field.label}</span><span className="ml-2 text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-600 uppercase">{field.type}</span></div></div><div className="flex gap-2 items-center"><button onClick={() => handleEditCustomField(field)} className={DS.actionIcon.primary} title="Edit"><Pencil className="w-4 h-4"/></button><button onClick={() => toggleFieldVisibility(field.id)} className={DS.actionIcon.neutral} title="Toggle Visibility">{field.isHidden ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}</button>{!field.isStandard && <button onClick={() => handleDeleteCustomField(field.id)} className={DS.actionIcon.danger} title="Delete"><Trash2 className="w-4 h-4"/></button></div></div>))}</div></div><div className="space-y-4"><div className="flex justify-between items-center"><h3 className="text-xl font-bold text-gray-800 flex items-center"><Upload className="w-5 h-5 mr-2 text-brand-600"/> Document Requirements</h3><Button onClick={handleAddDocumentConfig} size="sm" className="flex items-center"><Plus className="w-4 h-4 mr-2"/> Add Document</Button></div><div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 space-y-2 min-h-[300px]">{docConfigs.map((doc, index) => (<div key={doc.id} className="p-3 border rounded flex justify-between items-center bg-white hover:border-brand-300 transition-colors cursor-move group" draggable onDragStart={(e) => handleDragStartDoc(e, index)} onDragEnter={(e) => handleDragEnterDoc(e, index)} onDragEnd={handleDragEndDoc}><div className="flex items-center gap-3"><GripVertical className="text-gray-400 cursor-grab" /><div><span className="font-bold text-gray-900 text-sm">{doc.label}</span>{doc.isStandard && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded uppercase border border-blue-200">Standard</span>}</div></div><div className="flex gap-2 items-center"><button onClick={() => handleEditDocLabel(doc.id)} className={DS.actionIcon.primary} title="Edit Label"><Pencil className="w-4 h-4"/></button><button onClick={() => handleToggleDocVisibility(doc.id)} className={DS.actionIcon.neutral} title="Toggle Visibility">{doc.isHidden ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4"/>}</button>{!doc.isStandard && <button onClick={() => handleDeleteDocumentConfig(doc.id)} className={DS.actionIcon.danger} title="Delete"><Trash2 className="w-4 h-4"/></button></div></div>))}</div></div></div></div>
        )}

        {view === 'announcements' && (
            <div className="space-y-6 max-w-7xl mx-auto"><div className="flex justify-between items-center"><h2 className="text-3xl font-bold text-gray-900">Announcements</h2><Button onClick={() => setIsAnnouncementModalOpen(true)} className="flex items-center"><Plus className="w-4 h-4 mr-2"/> Create Notice</Button></div><div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"><div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center"><h3 className="font-bold text-gray-700">System Messages</h3><span className="text-xs text-gray-500">{announcements.length} messages</span></div><div className="p-4 space-y-4">{announcements.length === 0 ? (<div className="text-center py-8 text-gray-400">No announcements yet.</div>) : (announcements.map(ann => (<div key={ann.id} className="p-4 border rounded-lg bg-white flex justify-between items-start hover:shadow-md transition-shadow"><div className="flex gap-4"><div className={`p-2 rounded-full h-fit mt-1 ${ann.type === 'urgent' ? 'bg-red-100 text-red-600' : ann.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}><Megaphone className="w-5 h-5"/></div><div><h4 className="font-bold text-gray-900 text-lg">{ann.title}</h4><p className="text-gray-600 mt-1">{ann.message}</p><div className="flex items-center gap-2 mt-2"><span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${ann.type === 'urgent' ? 'bg-red-100 text-red-700' : ann.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>{ann.type}</span><span className="text-xs text-gray-400">{new Date(ann.timestamp).toLocaleString()}</span></div></div></div><button onClick={() => handleDeleteAnnouncement(ann.id)} className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-gray-100"><Trash2 className="w-5 h-5"/></button></div>)))}</div></div></div>
        )}

        {view === 'settings' && (
            <div className="space-y-6 max-w-7xl mx-auto"><h2 className="text-3xl font-bold text-gray-900">Settings</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"><h3 className="font-bold mb-4 flex items-center text-gray-900"><CreditCard className="w-5 h-5 mr-2 text-brand-600"/> Payment Methods</h3><div className="space-y-4">{['kplus', 'qrcode'].map(key => (<div key={key} className="flex justify-between items-center p-3 border rounded bg-gray-50"><span className="uppercase font-medium text-sm text-gray-700">{key}</span><button onClick={() => togglePaymentSetting(key as any)} className={`flex items-center px-3 py-1 rounded-full text-xs font-bold transition-colors ${paymentConfig[key as any] ? 'bg-brand-600 text-white' : 'bg-gray-300 text-gray-600'}`}>{paymentConfig[key as any] ? <ToggleRight className="w-4 h-4 mr-1"/> : <ToggleLeft className="w-4 h-4 mr-1"/>}{paymentConfig[key as any] ? 'Enabled' : 'Disabled'}</button></div>))}</div></div><div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200"><h3 className="font-bold mb-4 flex items-center text-gray-900"><DollarSign className="w-5 h-5 mr-2 text-brand-600"/> Fees Requirement</h3><div className="space-y-4">{['requireApplicationFee', 'requireInterviewFee', 'requireTuitionFee'].map(key => (<div key={key} className="flex justify-between items-center p-3 border rounded bg-gray-50"><span className="capitalize font-medium text-sm text-gray-700">{key.replace('require', '').replace('Fee', ' Fee')}</span><button onClick={() => togglePaymentSetting(key as any)} className={`flex items-center px-3 py-1 rounded-full text-xs font-bold transition-colors ${paymentConfig[key as any] ? 'bg-brand-600 text-white' : 'bg-gray-300 text-gray-600'}`}>{paymentConfig[key as any] ? <ToggleRight className="w-4 h-4 mr-1"/> : <ToggleLeft className="w-4 h-4 mr-1"/>}{paymentConfig[key as any] ? 'Required' : 'Optional'}</button></div>))}</div></div></div></div>
        )}

        {/* --- MODALS --- */}
        {isUserModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
                    <h3 className="text-xl font-bold mb-4">{editingUserId ? 'Edit User' : 'Create Staff User'}</h3>
                    <div className="space-y-3">
                        <div><label className={labelStyle}>Full Name</label><input type="text" className={inputStyle} value={newUserFullName} onChange={e=>setNewUserFullName(e.target.value)} /></div>
                        <div><label className={labelStyle}>Username</label><input type="text" className={inputStyle} value={newUserUsername} onChange={e=>setNewUserUsername(e.target.value)} /></div>
                        <div><label className={labelStyle}>Role</label><select className={inputStyle} value={newUserRole} onChange={e=>setNewUserRole(e.target.value as StaffRole)}><option value={StaffRole.SUPER_ADMIN}>Super Admin</option><option value={StaffRole.REVIEWER}>Reviewer</option><option value={StaffRole.PROCTOR}>Proctor (Exam/Interview)</option></select></div>
                        {newUserRole === StaffRole.PROCTOR && (
                            <div className="border p-3 rounded bg-gray-50 max-h-40 overflow-y-auto">
                                <label className="block text-xs font-bold mb-2 text-gray-500 uppercase">Assign Interview Groups</label>
                                {interviewSlots.flatMap(s => s.groups || []).map(g => (
                                    <label key={g.id} className="flex items-center gap-2 mb-2 cursor-pointer">
                                        <input type="checkbox" checked={newUserAssignedGroups.includes(g.id)} onChange={e => { const s = new Set(newUserAssignedGroups); if(e.target.checked) s.add(g.id); else s.delete(g.id); setNewUserAssignedGroups(Array.from(s)); }} />
                                        <span className="text-sm text-gray-700">{g.name}</span>
                                    </label>
                                ))}
                                {interviewSlots.flatMap(s => s.groups || []).length === 0 && <p className="text-xs text-gray-400 italic">No groups available. Create slots first.</p>}
                            </div>
                        )}
                    </div>
                    <div className="mt-6 flex justify-end space-x-2"><Button variant="secondary" onClick={() => setIsUserModalOpen(false)}>Cancel</Button><Button onClick={handleSaveUser}>Save</Button></div>
                </div>
            </div>
        )}

        {isFieldModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
                    <h3 className="text-xl font-bold mb-4">{editingFieldId ? 'Edit Field' : 'Add Custom Field'}</h3>
                    <div className="space-y-3">
                        {!isEditingStandardField && (
                            <>
                                <div><label className={labelStyle}>Label</label><input type="text" className={inputStyle} value={newFieldLabel} onChange={e=>setNewFieldLabel(e.target.value)} /></div>
                                <div><label className={labelStyle}>Type</label><select className={inputStyle} value={newFieldType} onChange={e=>setNewFieldType(e.target.value as any)}><option value="text">Text</option><option value="dropdown">Dropdown</option><option value="checkbox">Checkbox</option><option value="radio">Radio</option><option value="score">Score</option></select></div>
                                {(newFieldType==='dropdown' || newFieldType==='radio' || newFieldType==='checkbox') && (<div><label className={labelStyle}>Options (comma separated)</label><input type="text" className={inputStyle} value={newFieldOptions} onChange={e=>setNewFieldOptions(e.target.value)} /></div>)}
                                {newFieldType==='score' && (
                                    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                                        <label className="block text-sm font-bold text-gray-800 mb-2">Score Configuration</label>
                                        <div className="space-y-2 mb-3">{scoreConfigList.map((conf, idx) => (<div key={idx} className="flex justify-between items-center bg-white p-2 border rounded text-xs"><span className="font-medium text-gray-700">{conf.exam} ({conf.min}-{conf.max})</span><button onClick={() => handleRemoveScoreConfig(idx)} className="text-red-500 hover:text-red-700"><Trash2 className="w-3 h-3"/></button></div>))}</div>
                                        <div className="grid grid-cols-2 gap-2 mb-2"><div className="col-span-2"><input type="text" placeholder="Score Name / Exam Name (e.g. TOEIC, Thai)" className="w-full border rounded p-1.5 text-xs" value={newScoreExamName} onChange={e=>setNewScoreExamName(e.target.value)} /></div><div><input type="number" placeholder="Min Score" className="w-full border rounded p-1.5 text-xs" value={newScoreExamMin} onChange={e=>setNewScoreExamMin(e.target.value)} /></div><div><input type="number" placeholder="Max Score" className="w-full border rounded p-1.5 text-xs" value={newScoreExamMax} onChange={e=>setNewScoreExamMax(e.target.value)} /></div></div>
                                        <Button size="sm" variant="secondary" onClick={handleAddScoreConfig} className="w-full text-xs">Add Score Name</Button>
                                    </div>
                                )}
                            </>
                        )}
                        <div><label className={labelStyle}>Description</label><textarea className={inputStyle} rows={3} value={newFieldDesc} onChange={e=>setNewFieldDesc(e.target.value)} /></div>
                    </div>
                    <div className="mt-6 flex justify-end space-x-2"><Button variant="secondary" onClick={closeFieldModal}>Cancel</Button><Button onClick={handleAddOrUpdateCustomField}>Save</Button></div>
                </div>
            </div>
        )}

        {drilldownData && (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh] shadow-2xl animate-fade-in"><div className="p-4 border-b border-gray-200 bg-gray-900 text-white flex justify-between items-center"><div><h3 className="font-bold text-lg">{drilldownData.title}</h3><span className="text-xs text-gray-400">{drilldownData.applicants.length} Applicants</span></div><button onClick={() => setDrilldownData(null)}><X className="w-5 h-5 text-gray-400 hover:text-white"/></button></div><div className="flex-1 overflow-y-auto p-4 bg-gray-50">{drilldownData.applicants.length > 0 ? (<div className="space-y-3">{drilldownData.applicants.map(app => (<div key={app.id} className="p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow flex justify-between items-center"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold">{app.fullName ? app.fullName.charAt(0) : 'U'}</div><div><div className="font-bold text-sm text-gray-900">{app.fullName}</div><span className={`text-[10px] px-2 py-0.5 rounded-full border ${DS.status[app.status]}`}>{app.status}</span></div></div><Button size="sm" variant="outline" onClick={() => { setSelectedApplicant(app); setDrilldownData(null); setIsReadOnlyView(true); }}>View</Button></div>))}</div>) : (<div className="text-center py-8 text-gray-400">No applicants found in this category.</div>)}</div></div></div>)}
        {isSlotModalOpen && (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl animate-fade-in"><h3 className="text-xl font-bold mb-4">{editingSlotId ? 'Edit Slot' : 'Create Interview Slot'}</h3><div className="space-y-3"><div><label className={labelStyle}>Date</label><input type="date" className={inputStyle} value={newSlotDate} onChange={e=>setNewSlotDate(e.target.value)} /></div><div className="grid grid-cols-2 gap-4"><div><label className={labelStyle}>Start Time</label><input type="time" className={inputStyle} value={newSlotTimeStart} onChange={e=>setNewSlotTimeStart(e.target.value)} /></div><div><label className={labelStyle}>End Time</label><input type="time" className={inputStyle} value={newSlotTimeEnd} onChange={e=>setNewSlotTimeEnd(e.target.value)} /></div></div><div><label className={labelStyle}>Type</label><select className={inputStyle} value={newSlotType} onChange={e=>setNewSlotType(e.target.value as any)}><option value="Onsite">Onsite</option><option value="Online">Online</option></select></div><div><label className={labelStyle}>Location / Link</label><input type="text" className={inputStyle} value={newSlotLocation} onChange={e=>setNewSlotLocation(e.target.value)} placeholder={newSlotType==='Online'?'Zoom Link':'Room Number'} /></div><div><label className={labelStyle}>Capacity</label><input type="number" className={inputStyle} value={newSlotCapacity} onChange={e=>setNewSlotCapacity(e.target.value)} /></div></div><div className="mt-6 flex justify-end space-x-2"><Button variant="secondary" onClick={() => setIsSlotModalOpen(false)}>Cancel</Button><Button onClick={handleSaveSlot}>Save Slot</Button></div></div></div>)}
        {isAnnouncementModalOpen && (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl"><h3 className="text-xl font-bold mb-4">Create Announcement</h3><div className="space-y-3"><div><label className={labelStyle}>Title</label><input type="text" className={inputStyle} value={newAnnTitle} onChange={e=>setNewAnnTitle(e.target.value)} /></div><div><label className={labelStyle}>Type</label><select className={inputStyle} value={newAnnType} onChange={e=>setNewAnnType(e.target.value as any)}><option value="info">Info (Blue)</option><option value="urgent">Urgent (Red)</option><option value="success">Success (Green)</option></select></div><div><label className={labelStyle}>Message</label><textarea className={inputStyle} rows={3} value={newAnnMessage} onChange={e=>setNewAnnMessage(e.target.value)} /></div></div><div className="mt-6 flex justify-end space-x-2"><Button variant="secondary" onClick={() => setIsAnnouncementModalOpen(false)}>Cancel</Button><Button onClick={handleSaveAnnouncement}>Post</Button></div></div></div>)}
        {isSuiteModalOpen && (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl"><h3 className="text-xl font-bold mb-4">{editingSuiteId ? 'Edit Suite' : 'Create Exam Suite'}</h3><div className="space-y-3"><div><label className={labelStyle}>Title</label><input type="text" className={inputStyle} value={suiteTitle} onChange={e=>setSuiteTitle(e.target.value)} /></div><div><label className={labelStyle}>Description</label><textarea className={inputStyle} rows={3} value={suiteDesc} onChange={e=>setSuiteDesc(e.target.value)} /></div></div><div className="mt-6 flex justify-end space-x-2"><Button variant="secondary" onClick={() => setIsSuiteModalOpen(false)}>Cancel</Button><Button onClick={handleSaveSuite}>Save</Button></div></div></div>)}
        {isQuestionModalOpen && (<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto"><h3 className="text-xl font-bold mb-4">{editingQuestionId ? 'Edit Question' : 'Add Question'}</h3><div className="space-y-3"><div><label className={labelStyle}>Question Text</label><textarea className={inputStyle} rows={2} value={qText} onChange={e=>setQText(e.target.value)} /></div><div className="flex gap-4"> <div className="w-1/2"><label className={labelStyle}>Type</label><select className={inputStyle} value={qType} onChange={e=>setQType(e.target.value as any)}><option value={QuestionType.MCQ_SINGLE}>Multiple Choice (Single)</option><option value={QuestionType.MCQ_MULTI}>Multiple Choice (Multi)</option><option value={QuestionType.ESSAY}>Essay</option></select></div><div className="w-1/2 pt-6"><label className="flex items-center"><input type="checkbox" checked={qIsGraded} onChange={e=>setQIsGraded(e.target.checked)} className="mr-2"/> Graded Question</label></div></div>{qIsGraded && (<div><label className={labelStyle}>Score</label><input type="number" className={inputStyle} value={qScore} onChange={e=>setQScore(e.target.value)} /></div>)}{qType !== QuestionType.ESSAY && (<div className="border p-3 rounded bg-gray-50"><div className="flex justify-between mb-2"><span className="text-sm font-bold">Options</span><div className="flex gap-2"><Button size="sm" variant="secondary" onClick={handleAddOtherOption} className="text-xs">+ 'Other'</Button><Button size="sm" onClick={handleAddOption} className="text-xs">+ Option</Button></div></div><div className="space-y-2">{qOptions.map((opt, idx) => (<div key={opt.id} className="flex gap-2 items-center"><input type={qType===QuestionType.MCQ_SINGLE?'radio':'checkbox'} name="correct-opt" checked={opt.isCorrect} onChange={() => handleToggleOption(opt.id)} disabled={!qIsGraded} title="Mark Correct"/><input type="text" className="flex-1 border rounded p-1.5 text-sm" value={opt.text} onChange={e=>handleUpdateOption(opt.id, e.target.value)} placeholder={opt.allowInput ? "User Input (Other)" : `Option ${idx+1}`} disabled={opt.allowInput} /><button onClick={() => handleRemoveOption(opt.id)} className="text-red-500"><Trash2 className="w-4 h-4"/></button></div>))}</div></div>)}</div><div className="mt-6 flex justify-end space-x-2"><Button variant="secondary" onClick={() => setIsQuestionModalOpen(false)}>Cancel</Button><Button onClick={handleSaveQuestion}>Save</Button></div></div></div>)}

        {/* Review Modal */}
        {selectedApplicant && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl animate-fade-in overflow-hidden">
                    <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                        <div><h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">{selectedApplicant.fullName} {isReadOnlyView && <span className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded">Read Only</span>}</h3><div className="flex gap-2 mt-1"><span className={`px-2 py-0.5 text-xs rounded border ${DS.status[selectedApplicant.status]}`}>{selectedApplicant.status}</span></div></div>
                        <button onClick={() => setSelectedApplicant(null)} className="text-gray-400 hover:text-gray-600"><X className="w-6 h-6"/></button>
                    </div>
                    
                    {!isReadOnlyView && (
                        <div className="flex border-b border-gray-200 bg-white">
                            {['profile', 'docs', 'exam', 'fees', 'evaluation'].map(t => (<button key={t} onClick={() => setReviewTab(t as any)} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors capitalize ${reviewTab === t ? 'border-brand-600 text-brand-600 bg-brand-50' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>{t}</button>))}
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto p-6 bg-white">
                        {(reviewTab === 'profile' || isReadOnlyView) && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    {fieldConfigs.filter(f => !f.isHidden).map(field => {
                                        const val = field.type === 'standard' ? (selectedApplicant as any)[field.id] : selectedApplicant.customData?.[field.id];
                                        let displayVal = val;
                                        if (field.id === 'educations') displayVal = (selectedApplicant.educations || []).map(e => `${e.level}: ${e.degreeName} @ ${e.institution || '-'} (GPA: ${e.gpax})`).join('; ');
                                        if (field.type === 'score' && val) displayVal = val.noScore ? 'No score' : `${val.exam}: ${val.score}`;
                                        const isRejected = draftApplicant?.fieldRejections?.[field.id];
                                        return (
                                            <div key={field.id} className="p-3 border rounded-lg bg-white relative group">
                                                <div className="flex justify-between"><span className="text-xs font-bold text-gray-500 uppercase">{field.label}</span>{!isReadOnlyView && <div className="opacity-0 group-hover:opacity-100 flex gap-1"><button onClick={() => setActiveEditField(field.id)} className="text-gray-400 hover:text-brand-600"><Pencil className="w-3 h-3"/></button></div>}</div>
                                                <div className="text-sm font-medium text-gray-900 mt-1 break-words">{String(displayVal || '-')}</div>
                                                {activeEditField === field.id && !isReadOnlyView && (<div className="absolute top-0 right-0 bg-white shadow-lg border p-2 rounded z-10 flex flex-col gap-2 min-w-[150px]"><div className="text-xs font-bold">Reject Field?</div><Button size="sm" className="h-6 text-xs bg-red-600" onClick={() => updateDraftFieldRejection(field.id)}>Reject / Revise</Button><button onClick={() => setActiveEditField(null)} className="text-xs text-gray-500 hover:underline">Cancel</button></div>)}
                                                {isRejected && <div className="mt-2 text-xs bg-red-50 text-red-600 p-1 rounded font-bold border border-red-100">Correction Requested</div>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {reviewTab === 'docs' && !isReadOnlyView && (
                            <div className="space-y-6">
                                <div className="border rounded-lg p-4 bg-gray-50 flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-brand-100 p-2 rounded-full"><ScrollText className="w-5 h-5 text-brand-600"/></div>
                                        <div><h4 className="font-bold text-gray-900 text-sm">Legal Declaration (E-Sign)</h4><p className="text-xs text-gray-500">{selectedApplicant.isESigned ? `Signed on ${new Date(selectedApplicant.eSignTimestamp!).toLocaleString()}` : 'Not signed yet'}</p></div>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        {selectedApplicant.signatureImage && <button onClick={() => setShowSignature(!showSignature)} className="bg-white border p-1.5 rounded hover:bg-gray-100" title="View Signature"><Eye className="w-4 h-4 text-gray-600"/></button>}
                                        {!draftApplicant?.fieldRejections?.['eSignature'] && <button onClick={() => updateDraftFieldRejection('eSignature')} className="bg-red-50 text-red-600 border border-red-200 p-1.5 rounded hover:bg-red-100 font-bold text-xs uppercase">Reject</button>}
                                        {draftApplicant?.fieldRejections?.['eSignature'] && <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200">Rejected</span>}
                                    </div>
                                </div>
                                {showSignature && selectedApplicant.signatureImage && (<div className="p-4 border rounded bg-white flex justify-center mb-4"><img src={selectedApplicant.signatureImage} alt="Signature" className="max-h-32"/></div>)}

                                <h4 className="font-bold text-gray-800 mb-2">Submitted Documents</h4>
                                {Object.values(draftApplicant?.documents || {}).map((doc: any) => (
                                    <div key={doc.id} className="flex justify-between items-center p-4 border rounded-lg bg-white shadow-sm mb-2">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-gray-100 rounded text-gray-500"><FileText className="w-6 h-6"/></div>
                                            <div>
                                                <div className="font-bold text-gray-900">{doc.name}</div>
                                                <div className="text-xs text-gray-500">{doc.fileName || 'No file'}</div>
                                                {doc.reviewNote && <div className="text-xs text-red-500 font-bold mt-1">Note: {doc.reviewNote}</div>}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button className="p-2 hover:bg-gray-100 rounded text-gray-500" title="View File"><Eye className="w-4 h-4"/></button>
                                            <div className="h-6 w-px bg-gray-300 mx-1"></div>
                                            {doc.status === DocumentStatus.APPROVED ? (
                                                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center border border-green-200"><Check className="w-3 h-3 mr-1"/> Approved</span>
                                            ) : (
                                                <button onClick={() => updateDraftDocStatus(doc.id, DocumentStatus.APPROVED)} className="hover:bg-green-50 text-gray-400 hover:text-green-600 p-2 rounded transition-colors" title="Approve"><Check className="w-5 h-5"/></button>
                                            )}
                                            {doc.status === DocumentStatus.REJECTED ? (
                                                <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold flex items-center border border-red-200"><X className="w-3 h-3 mr-1"/> Rejected</span>
                                            ) : (
                                                <button onClick={() => updateDraftDocStatus(doc.id, DocumentStatus.REJECTED)} className="hover:bg-red-50 text-gray-400 hover:text-red-600 p-2 rounded transition-colors" title="Reject"><X className="w-5 h-5"/></button>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                <div className="mt-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                    <h4 className="font-bold text-gray-800 mb-3 flex items-center"><FilePlus className="w-4 h-4 mr-2 text-brand-600"/> Attach Admin Document</h4>
                                    <div className="flex gap-3 items-center">
                                        <input type="text" placeholder="Document Name (e.g. Official Transcript Verified)" className="flex-1 border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-500" value={adminDocName} onChange={e=>setAdminDocName(e.target.value)} />
                                        <div className="relative">
                                            <input type="file" onChange={e=>setAdminDocFile(e.target.files?.[0]||null)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                            <div className="flex items-center px-3 py-2 border border-gray-300 rounded-md bg-white text-sm text-gray-600 hover:bg-gray-50 cursor-pointer"><Upload className="w-4 h-4 mr-2"/> {adminDocFile ? adminDocFile.name : 'Choose File'}</div>
                                        </div>
                                        <Button size="sm" onClick={handleAdminAttachDoc}>Upload & Attach</Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {reviewTab === 'exam' && !isReadOnlyView && (
                            <div className="space-y-8">
                                <div className="flex justify-between items-center bg-gray-900 text-white p-4 rounded-xl shadow-md">
                                    <div><div className="text-xs font-bold uppercase text-gray-400">Total Score</div><div className="text-3xl font-bold">{selectedApplicant.examScore || 0}</div></div>
                                    <div className="text-right"><div className="text-xs font-bold uppercase text-gray-400">Written Score</div><input type="number" className="bg-transparent border-b border-gray-600 text-white font-bold text-2xl w-24 text-right focus:outline-none focus:border-white" value={draftApplicant?.writtenScore || 0} onChange={(e) => setDraftApplicant({...draftApplicant!, writtenScore: Number(e.target.value)})} placeholder="0" /></div>
                                </div>
                                {examSuites.map(suite => {
                                    const qs = allQuestions.filter(q => q.suiteId === suite.id);
                                    if(qs.length === 0) return null;
                                    const suiteScore = qs.reduce((acc, q) => { const graded = draftApplicant?.examGrading?.[q.id]; if (graded !== undefined) return acc + graded; const ans = draftApplicant?.examAnswers?.[q.id]; if (!ans) return acc; if (q.type === QuestionType.MCQ_SINGLE) { const correct = q.options?.find(o => o.isCorrect)?.id; if (ans === correct) return acc + q.score; } return acc; }, 0);
                                    return (
                                        <div key={suite.id} className="space-y-4">
                                            <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                                                <h4 className="font-bold text-lg text-brand-700">{suite.title}</h4>
                                                <span className="text-sm font-bold text-gray-500">Suite Score: ~{suiteScore}</span>
                                            </div>
                                            {qs.map((q, i) => {
                                                const answer = draftApplicant?.examAnswers?.[q.id];
                                                return (
                                                    <div key={q.id} className="p-4 border rounded-lg bg-white shadow-sm">
                                                        <div className="flex justify-between mb-2"><span className="font-bold text-gray-900">Q{i+1}: {q.text}</span><span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded text-gray-500">{q.type} | Max: {q.score}</span></div>
                                                        <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded mb-2 border border-gray-100"><span className="font-bold text-gray-500 text-xs uppercase block mb-1">User Answer</span>{Array.isArray(answer) ? answer.join(', ') : answer || '-'}</div>
                                                        {q.type === QuestionType.ESSAY ? (
                                                            <div className="flex items-center gap-3 mt-2 bg-yellow-50 p-2 rounded border border-yellow-100"><span className="text-sm font-bold text-yellow-800">Manual Grading:</span><input type="number" className="w-20 border border-yellow-300 rounded p-1 text-sm text-center font-bold" value={draftApplicant?.examGrading?.[q.id] || 0} onChange={(e) => updateDraftExamGrading(q.id, Number(e.target.value))} /><span className="text-xs text-gray-500">/ {q.score}</span></div>
                                                        ) : (<div className="text-xs text-green-600 mt-1 flex items-center"><Check className="w-3 h-3 mr-1"/> Auto-graded</div>)}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {reviewTab === 'fees' && !isReadOnlyView && (
                            <div className="space-y-4">
                                {showApplicationFee && (<div className="flex justify-between items-center p-4 border rounded bg-white"><div className="font-bold capitalize text-gray-900">Application Fee</div><select value={draftApplicant?.feeStatuses?.application} onChange={(e) => updateDraftFeeStatus('application', e.target.value as FeeStatus)} className={`border rounded p-1 text-sm font-bold ${draftApplicant?.feeStatuses?.application === 'PAID' ? 'text-green-600 bg-green-50' : 'text-yellow-600 bg-yellow-50'}`}><option value="PENDING">Pending</option><option value="PAID">Paid</option><option value="REJECTED">Rejected</option></select></div>)}
                                {showInterviewFee && (<div className="flex justify-between items-center p-4 border rounded bg-white"><div className="font-bold capitalize text-gray-900">Interview Fee</div><select value={draftApplicant?.feeStatuses?.interview} onChange={(e) => updateDraftFeeStatus('interview', e.target.value as FeeStatus)} className={`border rounded p-1 text-sm font-bold ${draftApplicant?.feeStatuses?.interview === 'PAID' ? 'text-green-600 bg-green-50' : 'text-yellow-600 bg-yellow-50'}`}><option value="PENDING">Pending</option><option value="PAID">Paid</option><option value="REJECTED">Rejected</option></select></div>)}
                                {showTuitionFee && (<div className="flex justify-between items-center p-4 border rounded bg-white"><div className="font-bold capitalize text-gray-900">Tuition Fee</div><select value={draftApplicant?.feeStatuses?.tuition} onChange={(e) => updateDraftFeeStatus('tuition', e.target.value as FeeStatus)} className={`border rounded p-1 text-sm font-bold ${draftApplicant?.feeStatuses?.tuition === 'PAID' ? 'text-green-600 bg-green-50' : 'text-yellow-600 bg-yellow-50'}`}><option value="PENDING">Pending</option><option value="PAID">Paid</option><option value="REJECTED">Rejected</option></select></div>)}
                                {!showInterviewFee && !showTuitionFee && !showApplicationFee && <div className="text-center text-gray-400 py-8">No active fees for this stage.</div>}
                            </div>
                        )}

                        {reviewTab === 'evaluation' && !isReadOnlyView && draftApplicant && (
                            <div className="space-y-8 animate-fade-in">
                                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 shadow-sm">
                                    <h4 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><CheckSquare className="w-5 h-5 text-brand-600"/> Scores & Feedback</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <div><label className={labelStyle}>Interview Score (0-100)</label><input type="number" className={inputStyle} value={draftApplicant.interviewScore || ''} onChange={(e) => setDraftApplicant({...draftApplicant, interviewScore: Number(e.target.value)})} /></div>
                                            <div><label className={labelStyle}>Total Evaluation Score</label><div className="bg-gray-200 p-2.5 rounded text-lg font-bold text-gray-900">{(draftApplicant.examScore || 0) + (draftApplicant.writtenScore || 0) + (draftApplicant.interviewScore || 0)}</div></div>
                                        </div>
                                        <div><label className={labelStyle}>Final Evaluator Comment</label><textarea className={inputStyle} rows={5} value={draftApplicant.evaluation?.comment || ''} onChange={(e) => setDraftApplicant({...draftApplicant, evaluation: { ...draftApplicant.evaluation, comment: e.target.value } as any})} placeholder="Provide reasoning for Pass/Fail decision..."/></div>
                                    </div>
                                </div>

                                <div className="bg-brand-50 border border-brand-200 rounded-xl p-8 shadow-md">
                                    <h4 className="text-xl font-bold text-brand-900 mb-2 flex items-center gap-2"><Activity className="w-6 h-6 text-brand-600"/> Stage Decision</h4>
                                    <p className="text-sm text-brand-700 mb-6">Select the outcome for the current stage. This action updates the applicant's status once saved.</p>
                                    
                                    <div className="grid grid-cols-1 gap-6">
                                        {/* DOCUMENT SCREENING DECISION */}
                                        {[ApplicationStatus.SUBMITTED, ApplicationStatus.DOCS_REJECTED].includes(selectedApplicant.status) && (
                                            <div className="bg-white p-6 rounded-xl border border-brand-100 shadow-sm animate-fade-in">
                                                <h5 className="font-bold text-gray-900 mb-1 flex items-center gap-2">Round 1: Document Screening</h5>
                                                <p className="text-xs text-gray-500 mb-6 uppercase tracking-wider font-semibold">Current State: {selectedApplicant.status}</p>
                                                <div className="flex flex-col sm:flex-row gap-4">
                                                    <button 
                                                        onClick={() => handleDecision(ApplicationStatus.FAILED)}
                                                        className={`flex-1 flex flex-col items-center justify-center p-6 border-2 rounded-2xl transition-all ${draftApplicant.status === ApplicationStatus.FAILED ? 'bg-red-50 border-red-600 ring-2 ring-red-100' : 'bg-white border-gray-100 hover:border-red-200 hover:bg-red-50/30'}`}
                                                    >
                                                        <X className={`w-8 h-8 mb-2 ${draftApplicant.status === ApplicationStatus.FAILED ? 'text-red-600' : 'text-gray-300'}`}/>
                                                        <span className={`font-bold ${draftApplicant.status === ApplicationStatus.FAILED ? 'text-red-700' : 'text-gray-700'}`}>Fail Applicant</span>
                                                        <span className="text-[10px] text-gray-400 mt-1">Application Terminal Failure</span>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDecision(ApplicationStatus.DOCS_APPROVED)}
                                                        className={`flex-1 flex flex-col items-center justify-center p-6 border-2 rounded-2xl transition-all ${draftApplicant.status === ApplicationStatus.DOCS_APPROVED ? 'bg-green-50 border-green-600 ring-2 ring-green-100' : 'bg-white border-gray-100 hover:border-green-200 hover:bg-green-50/30'}`}
                                                    >
                                                        <CheckSquare className={`w-8 h-8 mb-2 ${draftApplicant.status === ApplicationStatus.DOCS_APPROVED ? 'text-green-600' : 'text-gray-300'}`}/>
                                                        <span className={`font-bold ${draftApplicant.status === ApplicationStatus.DOCS_APPROVED ? 'text-green-700' : 'text-gray-700'}`}>Pass to Interview</span>
                                                        <span className="text-[10px] text-gray-400 mt-1">Unlock slot booking phase</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* INTERVIEW DECISION */}
                                        {[ApplicationStatus.DOCS_APPROVED, ApplicationStatus.INTERVIEW_READY, ApplicationStatus.INTERVIEW_BOOKED].includes(selectedApplicant.status) && (
                                            <div className="bg-white p-6 rounded-xl border border-brand-100 shadow-sm animate-fade-in">
                                                <h5 className="font-bold text-gray-900 mb-1 flex items-center gap-2">Round 2: Interview Evaluation</h5>
                                                <p className="text-xs text-gray-500 mb-6 uppercase tracking-wider font-semibold">Current State: {selectedApplicant.status}</p>
                                                <div className="flex flex-col sm:flex-row gap-4">
                                                    <button 
                                                        onClick={() => handleDecision(ApplicationStatus.FAILED)}
                                                        className={`flex-1 flex flex-col items-center justify-center p-6 border-2 rounded-2xl transition-all ${draftApplicant.status === ApplicationStatus.FAILED ? 'bg-red-50 border-red-600 ring-2 ring-red-100' : 'bg-white border-gray-100 hover:border-red-200 hover:bg-red-50/30'}`}
                                                    >
                                                        <UserX className={`w-8 h-8 mb-2 ${draftApplicant.status === ApplicationStatus.FAILED ? 'text-red-600' : 'text-gray-300'}`}/>
                                                        <span className={`font-bold ${draftApplicant.status === ApplicationStatus.FAILED ? 'text-red-700' : 'text-gray-700'}`}>Fail Interview</span>
                                                        <span className="text-[10px] text-gray-400 mt-1">Final Rejection</span>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDecision(ApplicationStatus.PASSED)}
                                                        className={`flex-1 flex flex-col items-center justify-center p-6 border-2 rounded-2xl transition-all ${draftApplicant.status === ApplicationStatus.PASSED ? 'bg-green-50 border-green-600 ring-2 ring-green-100' : 'bg-white border-gray-100 hover:border-green-200 hover:bg-green-50/30'}`}
                                                    >
                                                        <Trophy className={`w-8 h-8 mb-2 ${draftApplicant.status === ApplicationStatus.PASSED ? 'text-green-600' : 'text-gray-300'}`}/>
                                                        <span className={`font-bold ${draftApplicant.status === ApplicationStatus.PASSED ? 'text-green-700' : 'text-gray-700'}`}>Pass to Final Result</span>
                                                        <span className="text-[10px] text-gray-400 mt-1">Unlock tuition payment phase</span>
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* COMPLETED STAGES */}
                                        {[ApplicationStatus.PASSED, ApplicationStatus.ENROLLED, ApplicationStatus.FAILED].includes(selectedApplicant.status) && (
                                            <div className="bg-gray-100 p-8 rounded-xl border border-gray-200 text-center animate-fade-in">
                                                <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3"/>
                                                <h5 className="font-bold text-gray-500 uppercase tracking-widest text-xs">Lifecycle Phase Completed</h5>
                                                <p className="text-gray-400 text-sm mt-2">This applicant has reached a terminal status. To restart the process, reset the application from the database.</p>
                                                <div className="mt-6">
                                                    <span className={`px-4 py-2 rounded-full font-bold border text-sm ${DS.status[selectedApplicant.status]}`}>Final Status: {selectedApplicant.status}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {!isReadOnlyView && (
                        <div className="p-5 border-t border-gray-200 bg-gray-50 flex justify-between items-center shadow-inner">
                            <div className="flex items-center gap-2 text-xs text-gray-500 font-medium bg-white px-3 py-1.5 rounded-full border shadow-sm">
                                <Activity className="w-3.5 h-3.5 text-brand-600"/>
                                Draft mode active. Decisions must be saved to notify applicant.
                            </div>
                            <div className="flex gap-3">
                                <Button variant="secondary" onClick={() => setSelectedApplicant(null)}>Cancel Changes</Button>
                                <Button onClick={saveAndNotifyApplicant} className="shadow-lg shadow-brand-200 px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white font-bold flex items-center gap-2">
                                    <Save className="w-4 h-4"/> Save & Notify Applicant
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}

        <div className="fixed bottom-0 right-0 p-4 flex gap-2 z-50">
            {view === 'applicants' && (<Button size="sm" className="bg-gray-800 shadow-lg text-xs" onClick={demoGenerateApplicant}><UserPlus className="w-3 h-3 mr-1"/> New Applicant (Submitted)</Button>)}
            {selectedApplicant && !isReadOnlyView && selectedApplicant.status === ApplicationStatus.SUBMITTED && (<Button size="sm" className="bg-green-700 shadow-lg text-xs" onClick={demoApproveCurrentDocs}><Check className="w-3 h-3 mr-1"/> Auto Approve Docs</Button>)}
            {selectedApplicant && !isReadOnlyView && [ApplicationStatus.INTERVIEW_READY, ApplicationStatus.INTERVIEW_BOOKED].includes(selectedApplicant.status) && (<Button size="sm" className="bg-purple-700 shadow-lg text-xs" onClick={demoFillScores}><Calculator className="w-3 h-3 mr-1"/> Auto Fill Scores</Button>)}
            {view === 'appointments' && selectedSlot && (<Button size="sm" className="bg-gray-800 shadow-lg text-xs" onClick={demoAddApplicantToSlot}><UserPlus className="w-3 h-3 mr-1"/> Add Applicant to Slot</Button>)}
        </div>

      </div>
    </div>
  );
};
