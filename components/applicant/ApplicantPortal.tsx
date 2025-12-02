import React, { useState, useEffect, useRef } from 'react';
import { Applicant, ApplicationStatus, DocumentStatus, QuestionType, DocumentItem, Gender, PaymentConfig, EducationRecord, FieldConfig, ExamSuite, InterviewSlot, Announcement, FeeStatus } from '../../types';
import { getExams, saveApplicant, getExamSuites, MOCK_DOCS_TEMPLATE, getFieldConfigs, getPaymentConfig, EDUCATION_LEVELS, getInterviewSlots, bookInterviewSlot, getDocumentConfigs, getAnnouncements } from '../../services/storage';
import { Button } from '../ui/Button';
import { 
  CheckCircle, AlertCircle, Clock, Upload, FileText, Calendar, 
  Check, X, User, FileCheck, CreditCard, PenTool, Settings, RefreshCw, Wand2, Trash2, ChevronLeft, ArrowRight,
  Smartphone, QrCode, Image as ImageIcon, ToggleLeft, ToggleRight, GraduationCap, AlertTriangle, Mail, MapPin, Phone, Plus,
  Globe, Bell, LogOut, HelpCircle, Award, MessageSquare, DollarSign, ZoomIn, ZoomOut, Move
} from 'lucide-react';

interface Props {
  applicant: Applicant;
  onUpdate: (updated: Applicant) => void;
  onLogout: () => void;
}

// Sub-sections for Step 1
type ApplicationSubSection = 'profile' | 'docs' | 'test' | 'esign' | 'payment' | 'my_purchases';

export const ApplicantPortal: React.FC<Props> = ({ applicant, onUpdate, onLogout }) => {
  // Use lastNotifiedStatus for visual logic if available, fallback to status
  const displayStatus = applicant.lastNotifiedStatus || applicant.status;

  // Main Steps: 1. Application, 2. Verification, 3. Interview, 4. Result
  const [activeSubSection, setActiveSubSection] = useState<ApplicationSubSection>('profile');
  const [formData, setFormData] = useState(applicant);
  const [eSignChecked, setESignChecked] = useState(applicant.isESigned || false);
  const [isPayLoading, setIsPayLoading] = useState(false);
  const [forceEditMode, setForceEditMode] = useState(false);
  
  // Navbar State
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [isNotiDropdownOpen, setIsNotiDropdownOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState<'EN' | 'TH'>('EN');

  // Field Config State (for dynamic rendering and order)
  const [fieldConfigs, setFieldConfigs] = useState<FieldConfig[]>([]);
  const [docConfigs, setDocConfigs] = useState<any[]>([]);

  // Exam Suites State (Dynamic)
  const [examSuites, setExamSuites] = useState<ExamSuite[]>([]);

  // Interview Slots (Dynamic)
  const [interviewSlots, setInterviewSlots] = useState<InterviewSlot[]>([]);

  // Announcements
  const [systemAnnouncements, setSystemAnnouncements] = useState<Announcement[]>([]);

  // Education Logic State
  const [newEduLevel, setNewEduLevel] = useState<string>(EDUCATION_LEVELS[0].label);

  // New state to handle view navigation without changing status (e.g., going back to fix docs)
  const [viewStepOverride, setViewStepOverride] = useState<number | null>(null);

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'kplus' | 'qrcode'>('kplus');
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);

  // Payment Configuration State (fetched from storage)
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>({ kplus: true, qrcode: true });

  // Signature Pad State
  const [signatureImage, setSignatureImage] = useState<string | null>(applicant.signatureImage || null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // --- Image Cropper State ---
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [cropScale, setCropScale] = useState(1);
  const [cropPos, setCropPos] = useState({ x: 0, y: 0 });
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const cropImgRef = useRef<HTMLImageElement>(null);
  // ---------------------------

  // Exam Logic State
  const [selectedSuiteId, setSelectedSuiteId] = useState<string | null>(null);
  
  const exams = getExams();

  // --- Computed State for Restricted Editing ---
  // If status is DOCS_REJECTED, user can ONLY edit rejected documents. Everything else is read-only.
  const isEditRestricted = displayStatus === ApplicationStatus.DOCS_REJECTED;

  useEffect(() => {
    setFormData(applicant);
    setESignChecked(applicant.isESigned || false);
    setSignatureImage(applicant.signatureImage || null);
    setForceEditMode(false);
    setViewStepOverride(null);
    setFieldConfigs(getFieldConfigs());
    setDocConfigs(getDocumentConfigs());
    setPaymentConfig(getPaymentConfig());
    setExamSuites(getExamSuites()); // Fetch dynamic suites
    setInterviewSlots(getInterviewSlots());
    setSystemAnnouncements(getAnnouncements());
  }, [applicant]);

  // Ensure at least one payment method is selected if available
  useEffect(() => {
    if (!paymentConfig.kplus && paymentConfig.qrcode && paymentMethod !== 'qrcode') {
        setPaymentMethod('qrcode');
    } else if (paymentConfig.kplus && !paymentConfig.qrcode && paymentMethod !== 'kplus') {
        setPaymentMethod('kplus');
    }
  }, [paymentConfig]);

  // --- Logic Helpers ---

  const isProfileComplete = () => {
    const requiredFields = fieldConfigs.filter(f => !f.isHidden && f.id !== 'customData');
    // Basic check for standard fields
    if (!formData.fullName || !formData.age || !formData.educations || formData.educations.length === 0 || !formData.phone || !formData.address) return false;
    
    const lorField = fieldConfigs.find(f => f.id === 'recommendations');
    if (lorField && !lorField.isHidden) {
        const recs = (formData.customData?.recommendations as string[]) || [];
        const requiredCount = lorField.itemCount || 3;
        if (recs.length < requiredCount || recs.some(r => !r || r.trim() === '')) return false;
    }
    return true;
  };

  const isDocsComplete = () => {
    return Object.values(formData.documents).every((d: DocumentItem) => 
      d.status === DocumentStatus.UPLOADED || d.status === DocumentStatus.APPROVED
    );
  };

  const getCompletedQuestionCount = () => {
      const totalQuestions = exams.length;
      if (totalQuestions === 0) return 0;
      // Count how many questions have answers in formData.examAnswers
      const answeredCount = exams.filter(q => {
         const ans = formData.examAnswers?.[q.id];
         return ans !== undefined && ans !== '' && (Array.isArray(ans) ? ans.length > 0 : true);
      }).length;
      return answeredCount;
  };

  const isExamComplete = () => {
    const totalQuestions = exams.length;
    return totalQuestions > 0 && getCompletedQuestionCount() === totalQuestions;
  };

  const canProceedToReview = () => {
    return isProfileComplete() && isDocsComplete() && isExamComplete();
  };

  // --- Notification Logic ---
  const getNotifications = () => {
      const notis = [];
      
      // Dynamic System Notices from Admin
      systemAnnouncements.forEach(ann => {
          notis.push({
              id: ann.id,
              title: ann.title,
              message: ann.message,
              time: new Date(ann.timestamp).toLocaleDateString(),
              type: ann.type,
              read: false
          });
      });

      // Status Based Notifications
      if (displayStatus === ApplicationStatus.DOCS_REJECTED) {
          notis.push({
              id: 'st_rej',
              title: 'Action Required',
              message: 'Your documents have been returned by the staff. Please check the rejection reason and re-upload.',
              time: 'Just now',
              type: 'urgent',
              read: false
          });
      } else if (displayStatus === ApplicationStatus.DOCS_APPROVED) {
          notis.push({
              id: 'st_app',
              title: 'Documents Approved',
              message: 'Your documents have been verified. You can now proceed to the Interview stage.',
              time: '1 day ago',
              type: 'success',
              read: true
          });
      } else if (displayStatus === ApplicationStatus.INTERVIEW_READY) {
           notis.push({
              id: 'st_int_r',
              title: 'Ready to Book',
              message: 'Interview fee received. Please select your preferred interview time slot.',
              time: '10 mins ago',
              type: 'success',
              read: false
          });
      } else if (displayStatus === ApplicationStatus.PASSED) {
          notis.push({
              id: 'st_pass',
              title: 'Congratulations!',
              message: 'You have passed the interview! Welcome to UniAdmit. Please proceed to enrollment.',
              time: 'Recently',
              type: 'success',
              read: false
          });
      } else if (displayStatus === ApplicationStatus.FAILED) {
          notis.push({
              id: 'st_fail',
              title: 'Application Update',
              message: 'We regret to inform you that your application was not successful. View details for more info.',
              time: 'Recently',
              type: 'info',
              read: false
          });
      }

      return notis;
  };

  const notifications = getNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;

  // --- Education List Management Logic ---

  const handleAddEducation = () => {
    if (isEditRestricted) return;
    
    const selectedConfig = EDUCATION_LEVELS.find(l => l.label === newEduLevel);
    if (!selectedConfig) return;

    let currentEdus = [...(formData.educations || [])];

    // Auto-add lower degrees logic
    for (let l = selectedConfig.level; l >= 2; l--) {
        const config = EDUCATION_LEVELS.find(el => el.level === l);
        if (config) {
            const exists = currentEdus.some(e => e.level === config.label);
            if (!exists) {
                currentEdus.push({
                    id: `edu_${Date.now()}_${l}`,
                    level: config.label,
                    degreeName: '',
                    institution: '',
                    gpax: '',
                    startYear: '',
                    endYear: ''
                });
            }
        }
    }
    
    const getLevelVal = (lbl: string) => EDUCATION_LEVELS.find(el => el.label === lbl)?.level || 0;
    currentEdus.sort((a, b) => getLevelVal(a.level) - getLevelVal(b.level)); 

    setFormData(prev => ({ ...prev, educations: currentEdus }));
  };

  const handleRemoveEducation = (id: string) => {
    if (isEditRestricted) return;
    setFormData(prev => ({
        ...prev,
        educations: prev.educations.filter(e => e.id !== id)
    }));
  };

  const handleEducationUpdate = (id: string, field: keyof EducationRecord, value: string) => {
    if (isEditRestricted) return;
    setFormData(prev => ({
        ...prev,
        educations: prev.educations.map(e => e.id === id ? { ...e, [field]: value } : e)
    }));
  };

  // --- Dynamic Document Generation based on Config and Education ---
  useEffect(() => {
      if (displayStatus !== ApplicationStatus.DRAFT && displayStatus !== ApplicationStatus.DOCS_REJECTED) return;

      const currentDocs: Record<string, DocumentItem> = { ...formData.documents };
      const educations = formData.educations || [];
      const configs = docConfigs.length > 0 ? docConfigs : []; 

      if (configs.length === 0) return; 

      // 1. Sync based on Configs
      configs.forEach(conf => {
          if (conf.isHidden) return;
          if (conf.id === 'doc_conf_edu') return;

          const existingDoc = (Object.values(currentDocs) as DocumentItem[]).find(d => d.configId === conf.id);
          
          if (!existingDoc) {
              const newId = `doc_${conf.id}_${Date.now()}`;
              currentDocs[newId] = {
                  id: newId,
                  name: conf.label,
                  status: DocumentStatus.PENDING,
                  configId: conf.id
              };
          } else if (existingDoc.name !== conf.label) {
              currentDocs[existingDoc.id].name = conf.label;
          }
      });

      // 2. Handle Education Certificates (Dynamic)
      Object.keys(currentDocs).forEach(key => {
          if (currentDocs[key].isDynamic && currentDocs[key].configId === 'doc_conf_edu') {
              const eduId = key.replace('doc_cert_', '');
              if (!educations.find(e => e.id === eduId)) {
                  delete currentDocs[key];
              }
          }
      });

      const eduConfig = configs.find(c => c.id === 'doc_conf_edu');
      if (eduConfig && !eduConfig.isHidden) {
          educations.forEach(edu => {
              const docId = `doc_cert_${edu.id}`;
              const docName = `${eduConfig.label} - ${edu.level}${edu.degreeName ? ` (${edu.degreeName})` : ''}`;

              if (!currentDocs[docId]) {
                  currentDocs[docId] = {
                      id: docId,
                      name: docName,
                      status: DocumentStatus.PENDING,
                      isDynamic: true,
                      configId: 'doc_conf_edu'
                  };
              } else if (currentDocs[docId].name !== docName) {
                  currentDocs[docId].name = docName;
              }
          });
      }

      if (JSON.stringify(currentDocs) !== JSON.stringify(formData.documents)) {
          setFormData(prev => ({ ...prev, documents: currentDocs }));
      }
  }, [formData.educations, displayStatus, docConfigs]);


  // --- Handlers ---

  const handleProfileSave = () => {
    if (!isProfileComplete()) {
        alert("Please complete all required fields including Recommendations.");
        return;
    }
    if (!isEditRestricted) {
        const updated = { ...formData };
        saveApplicant(updated);
        onUpdate(updated);
    }
    setActiveSubSection('docs');
  };

  const handleCustomDataChange = (fieldId: string, value: any) => {
      const updatedCustomData = { ...formData.customData, [fieldId]: value };
      setFormData({ ...formData, customData: updatedCustomData });
  };

  // Generic file upload
  const handleFileUpload = (docId: string) => {
    const updatedDocs = { ...formData.documents };
    const mockFileName = `${updatedDocs[docId].name.replace(/[^a-zA-Z0-9]/g, '_')}_scanned.pdf`;
    
    updatedDocs[docId] = {
      ...updatedDocs[docId],
      status: DocumentStatus.UPLOADED,
      fileUrl: 'mock_url_blob',
      fileName: mockFileName,
      reviewNote: undefined 
    };
    const updatedApplicant = { ...formData, documents: updatedDocs };
    setFormData(updatedApplicant);
    saveApplicant(updatedApplicant);
    onUpdate(updatedApplicant);
  };

  // --- Profile Pic Cropping Handlers ---
  const handleProfilePicSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              if (ev.target?.result) {
                  setOriginalImage(ev.target.result as string);
                  setCropScale(1);
                  setCropPos({ x: 0, y: 0 });
                  setIsCropOpen(true);
                  // Reset input value so same file can be selected again if needed
                  e.target.value = '';
              }
          };
          reader.readAsDataURL(e.target.files[0]);
      }
  };

  const handleCropMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      setIsDraggingCrop(true);
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      setDragStart({ x: clientX - cropPos.x, y: clientY - cropPos.y });
  };

  const handleCropMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDraggingCrop) return;
      e.preventDefault();
      const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      setCropPos({
          x: clientX - dragStart.x,
          y: clientY - dragStart.y
      });
  };

  const handleCropMouseUp = () => {
      setIsDraggingCrop(false);
  };

  const handleCropSave = () => {
      // 1. Create canvas
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = cropImgRef.current;
      
      // Crop dimensions (e.g., 300x300 for visible area)
      const cropSize = 300;
      canvas.width = cropSize;
      canvas.height = cropSize;

      if (ctx && img) {
          // Draw the image transformed by current pan/zoom
          // The image is visually centered in the 300x300 container
          // transform: translate(cropPos.x, cropPos.y) scale(cropScale)
          // We need to map this CSS transform to Canvas drawImage
          
          // Image natural dimensions
          const naturalWidth = img.naturalWidth;
          const naturalHeight = img.naturalHeight;
          
          // Current rendered dimensions (without zoom) inside the flex container?
          // Simplification: We draw the image onto the canvas at the calculated offsets
          
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, cropSize, cropSize);
          
          ctx.save();
          // Move to center of canvas
          ctx.translate(cropSize/2, cropSize/2);
          // Apply scale
          ctx.scale(cropScale, cropScale);
          // Apply panning (offset from center)
          ctx.translate(cropPos.x, cropPos.y);
          
          // Draw image centered at current origin
          // We need to know the base display size. Assume 'contain' logic or similar.
          // Let's assume the image is drawn based on its natural aspect ratio to fit/cover?
          // To simplify: we render the image at its natural size? No, that's too big.
          // We render it such that the larger dimension fits the box initially?
          
          // Let's align with the visual CSS logic:
          // In CSS, we will display <img style={{ transform: ... }} /> inside a 300x300 overflow:hidden box.
          // The image needs a base size. Let's say we set image width to 100% of container initially?
          // Actually, typical croppers fit the image to the box.
          
          const aspectRatio = naturalWidth / naturalHeight;
          let drawWidth, drawHeight;
          
          // Fit to cover or contain logic? Let's use 'contain' base size for visual consistency
          if (aspectRatio > 1) {
              drawWidth = cropSize;
              drawHeight = cropSize / aspectRatio;
          } else {
              drawHeight = cropSize;
              drawWidth = cropSize * aspectRatio;
          }

          // Draw centered
          ctx.drawImage(img, -drawWidth/2, -drawHeight/2, drawWidth, drawHeight);
          ctx.restore();
          
          // Export
          const base64 = canvas.toDataURL('image/jpeg', 0.9);
          
          // Save to document
          // Find Profile Pic Doc ID
          const picDoc = (Object.values(formData.documents) as DocumentItem[]).find(d => d.configId === 'doc_conf_pic');
          if (picDoc) {
              const updatedDocs = { ...formData.documents };
              updatedDocs[picDoc.id] = {
                  ...updatedDocs[picDoc.id],
                  status: DocumentStatus.UPLOADED,
                  fileUrl: base64, // Store base64 directly for preview
                  fileName: 'profile_pic_cropped.jpg',
                  reviewNote: undefined 
              };
              const updated = { ...formData, documents: updatedDocs };
              setFormData(updated);
              saveApplicant(updated);
              onUpdate(updated);
          }
          
          setIsCropOpen(false);
          setOriginalImage(null);
      }
  };

  const handleFileDelete = (docId: string) => {
    if(!confirm('Are you sure you want to remove this document?')) return;

    if (!formData.documents[docId]) return;

    const updatedDocs = { ...formData.documents };
    const currentDoc = updatedDocs[docId];

    const newStatus = isEditRestricted ? DocumentStatus.REJECTED : DocumentStatus.PENDING;
    const newNote = isEditRestricted ? (currentDoc.reviewNote || "Document removed. Please re-upload.") : undefined;

    updatedDocs[docId] = {
      ...currentDoc,
      status: newStatus,
      fileUrl: undefined, 
      fileName: undefined, 
      reviewNote: newNote
    };

    const updatedApplicant = { ...formData, documents: updatedDocs };
    setFormData(updatedApplicant); 
    saveApplicant(updatedApplicant);
    onUpdate(updatedApplicant);
  }

  const handleDocsNext = () => {
    if (isEditRestricted) {
        const hasRejectedDocs = Object.values(formData.documents).some((d: DocumentItem) => d.status === DocumentStatus.REJECTED);
        
        if (hasRejectedDocs) {
            alert("Please re-upload all rejected documents before proceeding.");
            return;
        }
        
        setActiveSubSection('esign');
    } else {
        setActiveSubSection('test');
    }
  };

  const handleExamAnswerChange = (qId: string, value: string | string[]) => {
      if (isEditRestricted) return; 
      const updatedAnswers = { ...formData.examAnswers, [qId]: value };
      const updatedApplicant = { ...formData, examAnswers: updatedAnswers };
      setFormData(updatedApplicant);
      saveApplicant(updatedApplicant); 
  };

  const handleSuiteReturn = () => {
      setSelectedSuiteId(null);
      onUpdate(formData); // Sync up
  };

  const calculateSuiteProgress = (suiteId: string) => {
     const questionsInSuite = exams.filter(e => e.suiteId === suiteId);
     if (questionsInSuite.length === 0) return { current: 0, total: 0, percentage: 0 };
     
     const answeredInSuite = questionsInSuite.filter(q => {
        const ans = formData.examAnswers?.[q.id];
        return ans !== undefined && ans !== '' && (Array.isArray(ans) ? ans.length > 0 : true);
     }).length;

     return { current: answeredInSuite, total: questionsInSuite.length, percentage: Math.round((answeredInSuite / questionsInSuite.length) * 100) };
  };

  const handleSlipUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSlipFile(file);
      setSlipPreview(URL.createObjectURL(file));
    }
  };

  // --- Signature Logic ---
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
      if (isEditRestricted || !canvasRef.current) return;
      setIsDrawing(true);
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
          ctx.beginPath();
          const rect = canvasRef.current.getBoundingClientRect();
          const x = 'touches' in e ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).nativeEvent.offsetX;
          const y = 'touches' in e ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).nativeEvent.offsetY;
          ctx.moveTo(x, y);
      }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || isEditRestricted || !canvasRef.current) return;
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
          const rect = canvasRef.current.getBoundingClientRect();
          const x = 'touches' in e ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).nativeEvent.offsetX;
          const y = 'touches' in e ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).nativeEvent.offsetY;
          ctx.lineTo(x, y);
          ctx.stroke();
      }
  };

  const endDrawing = () => {
      if(isDrawing && canvasRef.current) {
          setSignatureImage(canvasRef.current.toDataURL());
      }
      setIsDrawing(false);
  };

  const clearSignature = () => {
      if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          setSignatureImage(null);
      }
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const reader = new FileReader();
          reader.onload = (ev) => {
              if(ev.target?.result) setSignatureImage(ev.target.result as string);
          };
          reader.readAsDataURL(e.target.files[0]);
      }
  };

  const handleApplicationFeePayment = () => {
    if (!eSignChecked || !signatureImage) return alert("Please sign the application first.");
    
    if (!isEditRestricted && paymentMethod === 'qrcode' && !slipFile) return alert("Please upload the payment slip.");
    
    setIsPayLoading(true);
    setTimeout(() => {
      setIsPayLoading(false);
      
      let score = 0;
      exams.forEach(q => {
         score += 5; // Mock score
      });

      const updated = { 
          ...formData, 
          status: ApplicationStatus.SUBMITTED,
          lastNotifiedStatus: ApplicationStatus.SUBMITTED, // User sees submission immediately
          examScore: score,
          isESigned: true,
          signatureImage: signatureImage,
          eSignTimestamp: new Date().toISOString(),
          feeStatuses: { 
            application: 'PAID' as FeeStatus, 
            interview: formData.feeStatuses?.interview || 'PENDING' as FeeStatus,
            tuition: formData.feeStatuses?.tuition || 'PENDING' as FeeStatus
          }
      };
      saveApplicant(updated);
      onUpdate(updated);
      
      if (isEditRestricted) {
          alert("Application Resubmitted Successfully. Returning to verification status.");
          setForceEditMode(false); 
          setViewStepOverride(null);
      } else {
          alert("Payment Successful! Application Submitted.");
      }
      
      setSlipFile(null);
      setSlipPreview(null);
    }, 2000);
  };

  const handleInterviewFeePayment = () => {
    if (paymentMethod === 'qrcode' && !slipFile) return alert("Please upload the payment slip.");

    setIsPayLoading(true);
    setTimeout(() => {
      setIsPayLoading(false);
      const updated = { 
          ...formData, 
          status: ApplicationStatus.INTERVIEW_READY,
          lastNotifiedStatus: ApplicationStatus.INTERVIEW_READY,
          feeStatuses: { 
             application: formData.feeStatuses?.application || 'PENDING' as FeeStatus,
             interview: 'PAID' as FeeStatus,
             tuition: formData.feeStatuses?.tuition || 'PENDING' as FeeStatus
          }
      };
      saveApplicant(updated);
      onUpdate(updated);
      alert("Interview Fee Paid! You can now select a time slot.");
      setSlipFile(null);
      setSlipPreview(null);
    }, 2000);
  }

  const handleTuitionPayment = () => {
    if (paymentMethod === 'qrcode' && !slipFile) return alert("Please upload the payment slip.");

    setIsPayLoading(true);
    setTimeout(() => {
      setIsPayLoading(false);
      const updated = { 
          ...formData, 
          status: ApplicationStatus.ENROLLED,
          lastNotifiedStatus: ApplicationStatus.ENROLLED,
          feeStatuses: { 
             application: formData.feeStatuses?.application || 'PENDING' as FeeStatus,
             interview: formData.feeStatuses?.interview || 'PENDING' as FeeStatus,
             tuition: 'PAID' as FeeStatus
          }
      };
      saveApplicant(updated);
      onUpdate(updated);
      alert("Tuition Fee Paid! Welcome to UniAdmit.");
      setSlipFile(null);
      setSlipPreview(null);
    }, 2000);
  };

  const handleDownloadReceipt = (feeType: string) => {
      const text = `RECEIPT\n\nFee Type: ${feeType}\nDate: ${new Date().toLocaleString()}\nAmount: Paid\nApplicant: ${applicant.fullName}`;
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Receipt_${feeType}.txt`;
      a.click();
      URL.revokeObjectURL(url);
  };

  const handleInterviewBook = (slotId: string) => {
    const slot = interviewSlots.find(s => s.id === slotId);
    if (!slot) return;

    const success = bookInterviewSlot(slotId, formData.id);
    if (success) {
        const updated = { 
          ...formData, 
          interviewSlotId: slotId,
          interviewSlot: slot.dateTime, 
          status: ApplicationStatus.INTERVIEW_BOOKED,
          lastNotifiedStatus: ApplicationStatus.INTERVIEW_BOOKED
        };
        saveApplicant(updated);
        onUpdate(updated);
        setInterviewSlots(getInterviewSlots()); // Refresh slots
    } else {
        alert("Slot booking failed. It might be full.");
        setInterviewSlots(getInterviewSlots());
    }
  };

  const handleFixApplication = () => {
    setViewStepOverride(1); 
    setForceEditMode(true);
    setActiveSubSection('docs'); 
  };

  // --- Prototype Navigation Handler ---
  const handleStepClick = (stepId: number) => {
    if (displayStatus === ApplicationStatus.DOCS_REJECTED) {
        if (stepId === 1) {
            setViewStepOverride(1);
            setForceEditMode(true);
            setActiveSubSection('docs'); 
            return;
        }
        if (stepId === 2) {
            setViewStepOverride(2);
            return;
        }
    }

    let nextStatus = ApplicationStatus.DRAFT;
    if (stepId === 2) nextStatus = ApplicationStatus.SUBMITTED;
    if (stepId === 3) nextStatus = ApplicationStatus.DOCS_APPROVED;
    if (stepId === 4) nextStatus = ApplicationStatus.PASSED;

    const updated = { ...formData, status: nextStatus, lastNotifiedStatus: nextStatus };
    setFormData(updated);
    saveApplicant(updated);
    onUpdate(updated);
    
    setViewStepOverride(null);
    setForceEditMode(false);
    setSlipFile(null);
    setSlipPreview(null);
  };

  // --- DEMO CONTROL ACTIONS ---

  const demoAutoFill = (e: React.MouseEvent) => {
    e.preventDefault(); 
    
    let updated = { ...formData };

    if (activeSubSection === 'profile') {
      updated = {
        ...updated,
        fullName: 'Somchai Jai-dee',
        age: 18,
        gender: Gender.MALE,
        phone: '081-234-5678',
        educations: [
            { id: 'edu_demo_1', level: "Bachelor's Degree", degreeName: "B.Eng", institution: "Chula", gpax: "3.50" }
        ],
        address: '99/9 Rama 9 Road, Huai Khwang, Bangkok 10310',
        email: 'somchai.demo@example.com'
      };
    } else if (activeSubSection === 'docs') {
      const updatedDocs = { ...updated.documents };
      Object.keys(updatedDocs).forEach(key => {
        const isRejected = updatedDocs[key].status === DocumentStatus.REJECTED;
        if (!isEditRestricted || isRejected) {
          updatedDocs[key] = {
            ...updatedDocs[key],
            status: DocumentStatus.UPLOADED,
            fileUrl: 'mock_url_blob',
            fileName: `demo_${updatedDocs[key].name.replace(/\s+/g, '_').toLowerCase()}.pdf`,
            reviewNote: undefined
          };
        }
      });
      updated.documents = updatedDocs;
    } else if (activeSubSection === 'test') {
      const updatedAnswers = { ...updated.examAnswers };
      exams.forEach(q => {
        if (q.type === QuestionType.MCQ_SINGLE) {
          updatedAnswers[q.id] = q.options?.[0].id || ''; 
        } else if (q.type === QuestionType.MCQ_MULTI) {
          updatedAnswers[q.id] = [q.options?.[0].id || '']; 
        } else if (q.type === QuestionType.ESSAY) {
          updatedAnswers[q.id] = "This is a generated automated answer for the demo.";
        }
      });
      updated.examAnswers = updatedAnswers;
    }

    setFormData(updated);
    saveApplicant(updated);
    onUpdate(updated);
  };

  const demoResetApplication = (e: React.MouseEvent) => {
    e.preventDefault();
    
    const cleanDocs = JSON.parse(JSON.stringify(MOCK_DOCS_TEMPLATE));

    const updated: Applicant = {
      id: formData.id,
      fullName: '',
      age: 0,
      gender: Gender.OTHER,
      email: formData.email,
      phone: '',
      address: '',
      educations: [], 
      status: ApplicationStatus.DRAFT,
      lastNotifiedStatus: ApplicationStatus.DRAFT,
      documents: cleanDocs,
      examScore: undefined,
      examAnswers: {}, 
      interviewSlot: undefined,
      evaluation: undefined,
      customData: {},
      isESigned: false,
      eSignTimestamp: undefined
    };

    setFormData(updated);
    saveApplicant(updated);
    onUpdate(updated);
    
    setActiveSubSection('profile');
    setESignChecked(false);
    setSelectedSuiteId(null);
    setSlipFile(null);
    setSlipPreview(null);
    setForceEditMode(false);
    setViewStepOverride(null);
    
    window.scrollTo(0, 0);
    alert("The application has been reset. Please start again.");
  };

  const demoSimulateStaffApproval = () => {
     const updatedDocs = { ...formData.documents };
     Object.keys(updatedDocs).forEach(key => {
       updatedDocs[key].status = DocumentStatus.APPROVED;
     });
     const updated = { ...formData, documents: updatedDocs, status: ApplicationStatus.DOCS_APPROVED, lastNotifiedStatus: ApplicationStatus.DOCS_APPROVED };
     saveApplicant(updated);
     onUpdate(updated);
  };

  const demoSimulateStaffReject = () => {
    const updatedDocs = { ...formData.documents };
     const firstKey = Object.keys(updatedDocs)[0];
     updatedDocs[firstKey].status = DocumentStatus.REJECTED;
     updatedDocs[firstKey].reviewNote = "Image is blurry. Please re-upload.";
     
     const updated = { ...formData, documents: updatedDocs, status: ApplicationStatus.DOCS_REJECTED, lastNotifiedStatus: ApplicationStatus.DOCS_REJECTED };
     saveApplicant(updated);
     onUpdate(updated);
  };

  const demoFailScreening = () => {
    const updated = {...formData, status: ApplicationStatus.FAILED, lastNotifiedStatus: ApplicationStatus.FAILED, evaluation: {score: 0, comment: 'Did not meet screening criteria'}};
    saveApplicant(updated);
    onUpdate(updated);
  };

  const demoPassInterview = () => {
    const updated = {...formData, status: ApplicationStatus.PASSED, lastNotifiedStatus: ApplicationStatus.PASSED, evaluation: {score: 9, comment: 'Great personality!'}};
    saveApplicant(updated);
    onUpdate(updated);
  };

  const demoFailInterview = () => {
    const updated = {...formData, status: ApplicationStatus.FAILED, lastNotifiedStatus: ApplicationStatus.FAILED, evaluation: {score: 4, comment: 'Needs improvement.'}};
    saveApplicant(updated);
    onUpdate(updated);
  };
  
  const demoEnroll = () => {
    const updated = {...formData, status: ApplicationStatus.ENROLLED, lastNotifiedStatus: ApplicationStatus.ENROLLED};
    saveApplicant(updated);
    onUpdate(updated);
  };

  const togglePaymentMethod = (method: 'kplus' | 'qrcode') => {
    setPaymentConfig(prev => ({...prev, [method]: !prev[method]}));
  };

  // --- Status Mapping ---
  let computedStep = 1;
  if (displayStatus === ApplicationStatus.DRAFT) computedStep = 1;
  else if (displayStatus === ApplicationStatus.DOCS_REJECTED) computedStep = 2; 
  else if (displayStatus === ApplicationStatus.SUBMITTED) computedStep = 2;
  else if (displayStatus === ApplicationStatus.DOCS_APPROVED || displayStatus === ApplicationStatus.INTERVIEW_READY || displayStatus === ApplicationStatus.INTERVIEW_BOOKED) computedStep = 3;
  else if (displayStatus === ApplicationStatus.PASSED || displayStatus === ApplicationStatus.ENROLLED || displayStatus === ApplicationStatus.FAILED) computedStep = 4;

  const currentStep = viewStepOverride !== null ? viewStepOverride : computedStep;

  const steps = [
    { id: 1, name: 'ยื่นใบสมัคร' },
    { id: 2, name: 'ตรวจสอบเอกสาร' },
    { id: 3, name: 'นัดสัมภาษณ์' },
    { id: 4, name: 'ประกาศผล' }
  ];

  // Helper to render dynamic fields based on config
  const renderField = (field: FieldConfig) => {
      // --- Score Field Renderer ---
      if (field.type === 'score') {
          const scoreData = (formData.customData?.[field.id] as {exam: string, score: string, noScore?: boolean} | undefined) || { exam: '', score: '', noScore: false };
          const currentConfig = field.scoreConfig?.find(c => c.exam === scoreData.exam);
          const min = currentConfig?.min ?? field.minScore ?? 0;
          const max = currentConfig?.max ?? field.maxScore ?? 100;
          const isError = !scoreData.noScore && scoreData.score && (parseFloat(scoreData.score) < min || parseFloat(scoreData.score) > max);

          return (
              <div key={field.id} className="md:col-span-2">
                   <label className="block text-sm font-medium text-gray-900 mb-1">{field.label}</label>
                   {field.description && <p className="text-xs text-gray-500 mb-2">{field.description}</p>}
                   
                   {field.allowNoScore && (
                       <div className="flex items-center mb-3">
                            <input 
                                type="checkbox" 
                                id={`noScore-${field.id}`}
                                className="w-4 h-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded mr-2"
                                checked={scoreData.noScore || false}
                                onChange={(e) => handleCustomDataChange(field.id, { ...scoreData, noScore: e.target.checked, score: e.target.checked ? '' : scoreData.score, exam: e.target.checked ? '' : scoreData.exam })}
                                disabled={isEditRestricted}
                            />
                            <label htmlFor={`noScore-${field.id}`} className="text-sm text-gray-700 cursor-pointer">I don't have an English score yet</label>
                       </div>
                   )}

                   <div className="flex gap-4">
                       <select 
                           className="w-1/2 border border-gray-300 rounded-md p-2.5 focus:outline-none focus:ring-1 focus:ring-brand-600 focus:border-brand-600 bg-white shadow-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
                           disabled={isEditRestricted || scoreData.noScore}
                           value={scoreData.exam}
                           onChange={e => handleCustomDataChange(field.id, { ...scoreData, exam: e.target.value })}
                       >
                           <option value="">Select Exam</option>
                           {field.scoreConfig ? 
                                field.scoreConfig.map(c => <option key={c.exam} value={c.exam}>{c.exam}</option>) :
                                field.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)
                           }
                       </select>
                       <div className="w-1/2">
                            <input 
                                type="number"
                                step="0.01" 
                                placeholder={scoreData.noScore ? "Not required" : `Score (${min}-${max})`}
                                className={`w-full border rounded-md p-2.5 focus:outline-none focus:ring-1 shadow-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-500
                                    ${isError ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-brand-600 focus:border-brand-600'}
                                    ${!scoreData.noScore && !isEditRestricted ? 'bg-white' : ''}`}
                                disabled={isEditRestricted || scoreData.noScore}
                                value={scoreData.score}
                                onChange={e => handleCustomDataChange(field.id, { ...scoreData, score: e.target.value })}
                            />
                            {isError && <p className="text-xs text-red-600 mt-1">Score must be between {min} and {max}.</p>}
                       </div>
                   </div>
              </div>
          );
      }

      // --- Letter of Recommendation Renderer ---
      if (field.id === 'recommendations') {
          const recCount = field.itemCount || 3;
          const currentRecs = (formData.customData?.recommendations as string[]) || [];
          
          return (
              <div key={field.id} className="md:col-span-2 bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm">
                  <label className="block text-lg font-bold text-gray-900 mb-2">{field.label}</label>
                  {field.description && <p className="text-sm text-gray-500 mb-4">{field.description}</p>}
                  
                  <div className="space-y-3">
                      {Array.from({ length: recCount }).map((_, idx) => (
                          <div key={idx} className="flex flex-col">
                              <label className="text-sm font-medium text-gray-700 mb-1">Recommender {idx + 1}</label>
                              <input 
                                  type="text" 
                                  placeholder={`Full Name of Recommender ${idx + 1}`}
                                  className="w-full border border-gray-300 rounded-md p-2.5 focus:outline-none focus:ring-1 focus:ring-brand-600 focus:border-brand-600 bg-white shadow-sm text-gray-900"
                                  disabled={isEditRestricted && !formData.fieldRejections?.['recommendations']}
                                  value={currentRecs[idx] || ''}
                                  onChange={(e) => {
                                      const newRecs = [...currentRecs];
                                      newRecs[idx] = e.target.value;
                                      handleCustomDataChange('recommendations', newRecs);
                                  }}
                              />
                          </div>
                      ))}
                  </div>
                  {isEditRestricted && formData.fieldRejections?.['recommendations'] && (
                      <p className="text-sm text-red-600 mt-2 font-bold bg-red-50 p-2 rounded border border-red-100">
                          Correction Required: {formData.fieldRejections['recommendations']}
                      </p>
                  )}
              </div>
          );
      }

      if (field.id === 'fullName') {
          return (
              <div key={field.id}>
                  <label className="block text-sm font-medium text-gray-900 mb-1">{field.label}</label>
                  <input type="text" disabled={isEditRestricted} className="w-full border border-gray-300 rounded-md p-2.5 focus:outline-none focus:ring-1 focus:ring-brand-600 focus:border-brand-600 bg-white shadow-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
                    value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
              </div>
          );
      }
      if (field.id === 'age') {
          return (
              <div key={field.id}>
                  <label className="block text-sm font-medium text-gray-900 mb-1">{field.label}</label>
                  <input type="number" disabled={true} className="w-full border border-gray-300 rounded-md p-2.5 bg-gray-100 text-gray-500 cursor-not-allowed"
                    value={formData.age || ''} />
              </div>
          );
      }
      if (field.id === 'birthDate') {
          return (
              <div key={field.id}>
                  <label className="block text-sm font-medium text-gray-900 mb-1">{field.label}</label>
                  <input 
                    type="date" 
                    disabled={isEditRestricted} 
                    className="w-full border border-gray-300 rounded-md p-2.5 focus:outline-none focus:ring-1 focus:ring-brand-600 focus:border-brand-600 bg-white shadow-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
                    value={formData.birthDate || ''} 
                    onChange={e => {
                        const dob = new Date(e.target.value);
                        const age = new Date().getFullYear() - dob.getFullYear();
                        setFormData({...formData, birthDate: e.target.value, age: age});
                    }} 
                  />
              </div>
          );
      }
      if (field.id === 'phone') {
          return (
              <div key={field.id}>
                  <label className="block text-sm font-medium text-gray-900 mb-1">{field.label}</label>
                  <input type="text" disabled={isEditRestricted} className="w-full border border-gray-300 rounded-md p-2.5 focus:outline-none focus:ring-1 focus:ring-brand-600 focus:border-brand-600 bg-white shadow-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
                    value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
          );
      }
      if (field.id === 'email') {
          return (
              <div key={field.id}>
                  <label className="block text-sm font-medium text-gray-900 mb-1">{field.label}</label>
                  <input type="email" disabled={isEditRestricted} className="w-full border border-gray-300 rounded-md p-2.5 focus:outline-none focus:ring-1 focus:ring-brand-600 focus:border-brand-600 bg-white shadow-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
                    value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
          );
      }
      if (field.id === 'gender') {
          return (
              <div key={field.id}>
                <label className="block text-sm font-medium text-gray-900 mb-1">{field.label}</label>
                <select disabled={isEditRestricted} className="w-full border border-gray-300 rounded-md p-2.5 focus:outline-none focus:ring-1 focus:ring-brand-600 focus:border-brand-600 bg-white shadow-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
                  value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value as Gender})}
                >
                  <option value={Gender.OTHER}>Other</option>
                  <option value={Gender.MALE}>Male</option>
                  <option value={Gender.FEMALE}>Female</option>
                </select>
              </div>
          );
      }
      if (field.id === 'address') {
          return (
              <div key={field.id} className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-900 mb-1">{field.label}</label>
                <textarea disabled={isEditRestricted} className="w-full border border-gray-300 rounded-md p-2.5 focus:outline-none focus:ring-1 focus:ring-brand-600 focus:border-brand-600 bg-white shadow-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-500" rows={3}
                  value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              </div>
          );
      }
      if (field.id === 'educations') {
          return (
              <div key={field.id} className="md:col-span-2 bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <label className="block text-lg font-bold text-gray-900">{field.label}</label>
                </div>

                <div className="bg-white p-3 rounded-lg border border-gray-200 mb-6 flex flex-col md:flex-row gap-3 items-end shadow-sm">
                    <div className="flex-1 w-full">
                        <label className="block text-sm font-medium text-gray-900 mb-1">Select Degree Level</label>
                        <select 
                            className="w-full border border-gray-300 rounded-md p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-brand-600 focus:border-brand-600 bg-white shadow-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
                            disabled={isEditRestricted}
                            value={newEduLevel}
                            onChange={(e) => setNewEduLevel(e.target.value)}
                        >
                            {EDUCATION_LEVELS.filter(l => l.level >= 2).map(lvl => <option key={lvl.id} value={lvl.label}>{lvl.label}</option>)}
                        </select>
                    </div>
                    <Button onClick={handleAddEducation} disabled={isEditRestricted} className="w-full md:w-auto flex items-center justify-center">
                        <Plus className="w-4 h-4 mr-2"/> Add Degree
                    </Button>
                </div>

                <div className="space-y-4">
                    {(!formData.educations || formData.educations.length === 0) && (
                        <div className="text-center py-8 bg-white rounded-lg border-2 border-dashed border-gray-200 text-gray-400">
                            <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No degrees added yet.</p>
                            <p className="text-xs">Please select a degree level above to add your education history.</p>
                        </div>
                    )}
                    {formData.educations?.map((edu, index) => (
                        <div key={edu.id} className="relative bg-white p-5 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow group">
                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => handleRemoveEducation(edu.id)}
                                    disabled={isEditRestricted}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                                    title="Remove Degree"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="mb-4">
                                <span className="inline-block px-3 py-1 bg-brand-50 text-brand-700 text-xs font-bold uppercase tracking-wider rounded-full border border-brand-100">
                                    {edu.level}
                                </span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-900 mb-1">
                                      Degree Name <span className="text-red-500">*</span>
                                    </label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Bachelor of Engineering in Computer Engineering"
                                        className="w-full border border-gray-300 rounded-md p-2.5 focus:outline-none focus:ring-1 focus:ring-brand-600 focus:border-brand-600 bg-white shadow-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
                                        disabled={isEditRestricted}
                                        value={edu.degreeName || ''}
                                        onChange={(e) => handleEducationUpdate(edu.id, 'degreeName', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-1">
                                      Institution <span className="text-red-500">*</span>
                                    </label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. Chulalongkorn University"
                                        className="w-full border border-gray-300 rounded-md p-2.5 focus:outline-none focus:ring-1 focus:ring-brand-600 focus:border-brand-600 bg-white shadow-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
                                        disabled={isEditRestricted}
                                        value={edu.institution || ''}
                                        onChange={(e) => handleEducationUpdate(edu.id, 'institution', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-1">
                                      GPAX <span className="text-red-500">*</span>
                                    </label>
                                    <input 
                                        type="text" 
                                        placeholder="e.g. 3.50"
                                        className="w-full border border-gray-300 rounded-md p-2.5 focus:outline-none focus:ring-1 focus:ring-brand-600 focus:border-brand-600 bg-white shadow-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
                                        disabled={isEditRestricted}
                                        value={edu.gpax}
                                        onChange={(e) => handleEducationUpdate(edu.id, 'gpax', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-1">Start Year</label>
                                    <input 
                                        type="text" 
                                        placeholder="YYYY"
                                        className="w-full border border-gray-300 rounded-md p-2.5 focus:outline-none focus:ring-1 focus:ring-brand-600 focus:border-brand-600 bg-white shadow-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
                                        disabled={isEditRestricted}
                                        value={edu.startYear || ''}
                                        onChange={(e) => handleEducationUpdate(edu.id, 'startYear', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-900 mb-1">End Year</label>
                                    <input 
                                        type="text" 
                                        placeholder="YYYY"
                                        className="w-full border border-gray-300 rounded-md p-2.5 focus:outline-none focus:ring-1 focus:ring-brand-600 focus:border-brand-600 bg-white shadow-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
                                        disabled={isEditRestricted}
                                        value={edu.endYear || ''}
                                        onChange={(e) => handleEducationUpdate(edu.id, 'endYear', e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
              </div>
          );
      }

      // Render Custom Fields (merged into the same layout)
      return (
          <div key={field.id} className={field.type === 'checkbox' || field.type === 'radio' ? 'md:col-span-2' : ''}>
              <label className="block text-sm font-medium text-gray-900 mb-1">{field.label}</label>
              {field.description && <p className="text-xs text-gray-500 mb-2">{field.description}</p>}
              
              {field.type === 'text' && (
                  <input 
                      type="text" 
                      className="w-full border border-gray-300 rounded-md p-2.5 focus:outline-none focus:ring-1 focus:ring-brand-600 focus:border-brand-600 bg-white shadow-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
                      disabled={isEditRestricted}
                      value={formData.customData?.[field.id] || ''}
                      onChange={e => handleCustomDataChange(field.id, e.target.value)}
                  />
              )}

              {field.type === 'dropdown' && (
                  <select 
                      className="w-full border border-gray-300 rounded-md p-2.5 focus:outline-none focus:ring-1 focus:ring-brand-600 focus:border-brand-600 bg-white shadow-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-500"
                      disabled={isEditRestricted}
                      value={formData.customData?.[field.id] || ''}
                      onChange={e => handleCustomDataChange(field.id, e.target.value)}
                  >
                      <option value="">Select {field.label}</option>
                      {field.options?.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                      ))}
                  </select>
              )}

              {/* Boxed Radio & Checkbox */}
              {(field.type === 'radio' || field.type === 'checkbox') && (
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50/50">
                      {field.type === 'radio' && field.options && (
                          <div className="space-y-2">
                              {field.options.map(opt => (
                                  <label key={opt} className="flex items-center space-x-2 cursor-pointer bg-white p-2 rounded border border-gray-100 hover:border-brand-200 transition-colors">
                                      <input 
                                          type="radio" 
                                          name={`radio-${field.id}`}
                                          className="form-radio h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300"
                                          disabled={isEditRestricted}
                                          checked={formData.customData?.[field.id] === opt}
                                          onChange={() => handleCustomDataChange(field.id, opt)}
                                      />
                                      <span className="text-gray-700 text-sm font-medium">{opt}</span>
                                  </label>
                              ))}
                          </div>
                      )}

                      {field.type === 'checkbox' && (
                          <div className="space-y-2">
                             {field.options && field.options.length > 0 ? (
                                /* Multi-select Checkbox Group */
                                 <>
                                     {field.options.map(opt => {
                                         const currentVals = (formData.customData?.[field.id] as string[]) || [];
                                         const isChecked = currentVals.includes(opt);
                                         return (
                                             <label key={opt} className="flex items-center space-x-2 cursor-pointer bg-white p-2 rounded border border-gray-100 hover:border-brand-200 transition-colors">
                                                 <input 
                                                     type="checkbox" 
                                                     className="form-checkbox h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
                                                     disabled={isEditRestricted}
                                                     checked={isChecked}
                                                     onChange={(e) => {
                                                         let newVals = [...currentVals];
                                                         if (e.target.checked) newVals.push(opt);
                                                         else newVals = newVals.filter(v => v !== opt);
                                                         handleCustomDataChange(field.id, newVals);
                                                     }}
                                                 />
                                                 <span className="text-gray-700 text-sm font-medium">{opt}</span>
                                             </label>
                                         );
                                     })}
                                 </>
                             ) : (
                                /* Single Boolean Checkbox */
                                 <label className="flex items-center space-x-2 cursor-pointer bg-white p-2 rounded border border-gray-100 hover:border-brand-200 transition-colors">
                                      <input 
                                          type="checkbox" 
                                          className="form-checkbox h-4 w-4 text-brand-600 focus:ring-brand-500 border-gray-300 rounded"
                                          disabled={isEditRestricted}
                                          checked={!!formData.customData?.[field.id]}
                                          onChange={e => handleCustomDataChange(field.id, e.target.checked)}
                                      />
                                      <span className="text-gray-700 text-sm font-medium">Yes / Enabled</span>
                                  </label>
                             )}
                          </div>
                      )}
                  </div>
              )}
          </div>
      );
  };

  // Helper for read-only view
  const renderReadOnlyField = (field: FieldConfig) => {
      // Logic to display value nicely
      let val = null;
      if (field.id === 'recommendations') {
          const recs = (formData.customData?.recommendations as string[]) || [];
          if (recs.length === 0) return <span className="text-gray-400 italic">No recommendations provided</span>;
          return (
              <div key={field.id} className="md:col-span-2">
                  <span className="block text-xs font-bold text-gray-500 uppercase mb-1">{field.label}</span>
                  <div className="space-y-1">
                      {recs.map((rec, idx) => (
                          <div key={idx} className="text-sm font-medium text-gray-900 border-l-2 border-brand-200 pl-2">
                              {idx + 1}. {rec}
                          </div>
                      ))}
                  </div>
              </div>
          );
      }

      if (field.type === 'standard') {
          if (field.id === 'educations') {
              if (!formData.educations || formData.educations.length === 0) return <span className="text-gray-400 italic">No records</span>;
              return (
                  <div className="space-y-2">
                      {formData.educations.map((edu, i) => (
                          <div key={i} className="text-sm border-l-2 border-brand-200 pl-3">
                              <div className="font-bold text-gray-900">{edu.level}</div>
                              <div className="text-gray-600">{edu.degreeName} {edu.institution ? `@ ${edu.institution}` : ''}</div>
                              <div className="text-xs text-gray-500">GPAX: {edu.gpax} | {edu.startYear}-{edu.endYear}</div>
                          </div>
                      ))}
                  </div>
              );
          }
          val = formData[field.id as keyof Applicant];
      } else {
          val = formData.customData?.[field.id];
          if (field.type === 'score' && typeof val === 'object') {
              val = (val as any).noScore ? "Not yet available" : `${(val as any).exam}: ${(val as any).score}`;
          } else if (Array.isArray(val)) {
              val = val.join(', ');
          } else if (field.type === 'checkbox' && !field.options) {
              val = val ? 'Yes' : 'No';
          }
      }

      return (
          <div key={field.id} className={field.type === 'score' || field.id === 'educations' || field.id === 'address' ? 'md:col-span-2' : ''}>
              <span className="block text-xs font-bold text-gray-500 uppercase mb-1">{field.label}</span>
              <div className="text-sm font-medium text-gray-900 break-words">{String(val || '-')}</div>
          </div>
      );
  };

  const renderPaymentUI = (onPay: () => void, amount: number, buttonText: string, title: string) => (
      <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-3xl mx-auto shadow-sm w-full">
        <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">{title}</h3>
        {!isEditRestricted && <p className="text-gray-500 mb-6 text-center">Total Amount: <span className="font-bold text-gray-900 text-2xl">{amount.toLocaleString()} THB</span></p>}
        
        {isEditRestricted ? (
            <div className="text-center p-6 bg-blue-50 rounded-lg border border-blue-100 mb-6">
                <RefreshCw className="w-10 h-10 text-brand-600 mx-auto mb-2" />
                <p className="font-bold text-brand-800">Resubmission Mode</p>
                <p className="text-sm text-brand-600 mt-1">
                    You are resubmitting your application with corrected documents. <br/>
                    No additional fee is required at this step.
                </p>
            </div>
        ) : (
            <div className={`grid gap-4 mb-8 ${paymentConfig.kplus && paymentConfig.qrcode ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
            {paymentConfig.kplus && (
                <button 
                onClick={() => setPaymentMethod('kplus')}
                className={`p-4 border-2 rounded-xl flex items-center justify-center transition-all
                    ${paymentMethod === 'kplus' ? 'border-green-500 bg-green-50 ring-1 ring-green-500' : 'border-gray-200 bg-white hover:border-green-200'}`}
                >
                    <div className="bg-green-100 p-2 rounded-full mr-3">
                    <Smartphone className="w-6 h-6 text-green-700" />
                    </div>
                    <div className="text-left">
                    <div className="font-bold text-gray-900">K-Plus Application</div>
                    <div className="text-xs text-gray-500">Auto-redirect to app</div>
                    </div>
                </button>
            )}

            {paymentConfig.qrcode && (
                <button 
                    onClick={() => setPaymentMethod('qrcode')}
                    className={`p-4 border-2 rounded-xl flex items-center justify-center transition-all
                    ${paymentMethod === 'qrcode' ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' : 'border-gray-200 bg-white hover:border-brand-200'}`}
                >
                    <div className="bg-brand-100 p-2 rounded-full mr-3">
                    <QrCode className="w-6 h-6 text-brand-700" />
                    </div>
                    <div className="text-left">
                    <div className="font-bold text-gray-900">QR Code / Transfer</div>
                    <div className="text-xs text-gray-500">Scan and upload slip</div>
                    </div>
                </button>
            )}
            </div>
        )}
        
        {!isEditRestricted && !paymentConfig.kplus && !paymentConfig.qrcode && (
            <div className="text-center p-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-xl">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400"/>
                No payment methods available. Please contact support.
            </div>
        )}

        {!isEditRestricted && paymentMethod === 'kplus' && paymentConfig.kplus && (
            <div className="text-center animate-fade-in">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 mx-auto">
                <span className="text-4xl font-bold text-green-700">K</span>
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Pay with K-Plus</h3>
                <p className="text-sm text-gray-500 mb-6">Click below to open the K-Plus app and complete payment.</p>
                
                <Button 
                size="lg" 
                className="w-full max-w-xs bg-[#00A950] hover:bg-[#008c42] text-white"
                onClick={onPay}
                isLoading={isPayLoading}
                >
                {isPayLoading ? 'Processing...' : buttonText || 'Open K-Plus App'}
                </Button>
            </div>
        )}

        {!isEditRestricted && paymentMethod === 'qrcode' && paymentConfig.qrcode && (
            <div className="space-y-6 animate-fade-in">
                <div className="flex flex-col md:flex-row gap-8 justify-center items-start">
                    <div className="flex-1 w-full flex flex-col items-center p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="w-40 h-40 bg-white p-2 mb-3 shadow-sm border border-gray-200 flex items-center justify-center">
                        <QrCode className="w-32 h-32 text-gray-800" />
                    </div>
                    <p className="text-xs text-gray-500 mb-2">Scan to Pay</p>
                    <div className="text-center space-y-1 text-sm">
                        <p className="font-bold text-gray-900">UniAdmit University</p>
                        <p className="text-gray-600">Kasikorn Bank</p>
                        <p className="font-mono bg-white px-2 py-1 border rounded text-gray-800 select-all">123-4-56789-0</p>
                    </div>
                    </div>

                    <div className="flex-1 w-full space-y-4">
                    <h4 className="font-bold text-gray-900">Attach Payment Slip</h4>
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:bg-gray-50 transition-colors">
                        {slipPreview ? (
                            <div className="relative">
                            <img src={slipPreview} alt="Slip Preview" className="max-h-40 mx-auto rounded shadow-sm" />
                            <button 
                                onClick={() => {setSlipFile(null); setSlipPreview(null);}}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            </div>
                        ) : (
                            <label className="cursor-pointer flex flex-col items-center justify-center h-full">
                                <ImageIcon className="w-10 h-10 text-gray-400 mb-2" />
                                <span className="text-sm text-brand-600 font-medium">Upload Payment Slip</span>
                                <span className="text-xs text-gray-400 mt-1">JPG, PNG only</span>
                                <input type="file" accept="image/*" className="hidden" onChange={handleSlipUpload} />
                            </label>
                        )}
                    </div>

                    <Button 
                        size="lg" 
                        className="w-full"
                        onClick={onPay}
                        isLoading={isPayLoading}
                        disabled={!slipFile}
                    >
                        {isPayLoading ? 'Verifying...' : 'Confirm Payment'}
                    </Button>
                    </div>
                </div>
            </div>
        )}

        {isEditRestricted && (
             <div className="text-center">
                 <Button 
                    size="lg" 
                    className="w-full max-w-xs"
                    onClick={onPay}
                    isLoading={isPayLoading}
                >
                    {isPayLoading ? 'Submitting...' : 'Resubmit Application'}
                </Button>
             </div>
        )}
        
        <div className="mt-6 pt-4 border-t border-gray-100 text-center text-xs text-gray-400">
            Secured by K-Bank Payment Gateway
        </div>
      </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-32">
      {/* Top Navbar */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="bg-brand-600 text-white p-1.5 rounded mr-3">
                <FileText className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold text-gray-900">UniAdmit Portal</h1>
            </div>
            
            {/* Right Side Navigation */}
            <div className="flex items-center space-x-2 sm:space-x-4">
                {/* Language Switcher */}
                <div className="relative">
                    <button 
                        onClick={() => { setIsLangDropdownOpen(!isLangDropdownOpen); setIsNotiDropdownOpen(false); setIsProfileDropdownOpen(false); }}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors flex items-center" 
                        title="Change Language"
                    >
                        <Globe className="w-5 h-5" />
                        <span className="ml-1 text-xs font-bold">{currentLang}</span>
                    </button>
                    {isLangDropdownOpen && (
                        <div className="absolute right-0 top-12 w-32 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-[60] animate-fade-in origin-top-right">
                            <button onClick={() => { setCurrentLang('EN'); setIsLangDropdownOpen(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${currentLang === 'EN' ? 'font-bold text-brand-600' : 'text-gray-700'}`}>English</button>
                            <button onClick={() => { setCurrentLang('TH'); setIsLangDropdownOpen(false); }} className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${currentLang === 'TH' ? 'font-bold text-brand-600' : 'text-gray-700'}`}>ภาษาไทย</button>
                        </div>
                    )}
                </div>

                {/* Notification Bell */}
                <div className="relative">
                    <button 
                        onClick={() => { setIsNotiDropdownOpen(!isNotiDropdownOpen); setIsLangDropdownOpen(false); setIsProfileDropdownOpen(false); }}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors relative" 
                        title="Notifications"
                    >
                        <Bell className="w-5 h-5" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">{unreadCount}</span>
                        )}
                    </button>
                    {isNotiDropdownOpen && (
                        <div className="absolute right-0 top-12 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-[60] animate-fade-in origin-top-right overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                                <h3 className="font-bold text-sm text-gray-900">Notifications</h3>
                                <span className="text-xs text-gray-500">{unreadCount} new</span>
                            </div>
                            <div className="max-h-80 overflow-y-auto">
                                {notifications.length > 0 ? (
                                    notifications.map((note) => (
                                        <div key={note.id} className={`p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors ${!note.read ? 'bg-blue-50/30' : ''}`}>
                                            <div className="flex gap-3">
                                                <div className={`mt-1 p-1.5 rounded-full h-fit flex-shrink-0 
                                                    ${note.type === 'urgent' ? 'bg-red-100 text-red-600' : 
                                                      note.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                                    {note.type === 'urgent' ? <AlertCircle className="w-4 h-4" /> : 
                                                     note.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-gray-900">{note.title}</h4>
                                                    <p className="text-xs text-gray-600 mt-1 leading-relaxed">{note.message}</p>
                                                    <span className="text-[10px] text-gray-400 mt-2 block">{note.time}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-gray-400">
                                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-20"/>
                                        <p className="text-sm">No notifications</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Profile Dropdown */}
                <div className="relative">
                    <button 
                        onClick={() => { setIsProfileDropdownOpen(!isProfileDropdownOpen); setIsLangDropdownOpen(false); setIsNotiDropdownOpen(false); }}
                        className="flex items-center focus:outline-none"
                    >
                        <div className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-sm border-2 border-white shadow-sm hover:ring-2 hover:ring-brand-200 transition-all">
                            {applicant.documents['doc_profile_pic']?.status === 'uploaded' || applicant.documents['doc_profile_pic']?.status === 'approved' 
                                ? <img src={applicant.documents['doc_profile_pic']?.fileUrl || `https://ui-avatars.com/api/?name=${applicant.fullName.replace(" ", "+")}`} alt="Profile" className="w-full h-full rounded-full object-cover" />
                                : applicant.fullName ? applicant.fullName.charAt(0).toUpperCase() : <User className="w-5 h-5"/>
                            }
                        </div>
                    </button>

                    {isProfileDropdownOpen && (
                        <div className="absolute right-0 top-12 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-[60] animate-fade-in origin-top-right">
                            <div className="px-4 py-4 border-b border-gray-100 bg-gray-50/50">
                                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Signed in as</p>
                                <p className="text-sm font-bold text-gray-900 truncate">{applicant.fullName || 'Applicant'}</p>
                                <p className="text-xs text-gray-500 truncate">{applicant.email}</p>
                            </div>
                            
                            <div className="py-2">
                                <a href="#" onClick={(e) => { e.preventDefault(); setActiveSubSection('profile'); setIsProfileDropdownOpen(false); }} className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors group">
                                    <User className="w-4 h-4 mr-3 text-gray-400 group-hover:text-brand-600" /> Profile
                                </a>
                                <a href="#" onClick={(e) => { e.preventDefault(); setActiveSubSection('my_purchases'); setIsProfileDropdownOpen(false); }} className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors group">
                                    <CreditCard className="w-4 h-4 mr-3 text-gray-400 group-hover:text-brand-600" /> My Purchases
                                </a>
                                <a href="#" onClick={(e) => { e.preventDefault(); setIsProfileDropdownOpen(false); }} className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors group">
                                    <Settings className="w-4 h-4 mr-3 text-gray-400 group-hover:text-brand-600" /> Settings
                                </a>
                            </div>

                            <div className="border-t border-gray-100 py-2">
                                <a href="#" onClick={(e) => { e.preventDefault(); setIsProfileDropdownOpen(false); }} className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors group">
                                    <HelpCircle className="w-4 h-4 mr-3 text-gray-400 group-hover:text-brand-600" /> Help Center
                                </a>
                                <button 
                                    onClick={() => { onLogout(); setIsProfileDropdownOpen(false); }}
                                    className="flex w-full items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 font-medium transition-colors"
                                >
                                    <LogOut className="w-4 h-4 mr-3" /> Log Out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
          </div>
        </div>
        
        {/* Top Status Stepper */}
        <div className="bg-white border-t border-gray-100">
          <div className="max-w-5xl mx-auto py-4 px-4">
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 -z-10"></div>
              <div className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-brand-500 -z-10 transition-all duration-500"
                   style={{ width: `${((currentStep - 1) / 3) * 100}%` }}></div>
              
              {steps.map((step) => {
                const isActive = step.id === currentStep;
                const isCompleted = step.id < currentStep;
                return (
                  <div 
                    key={step.id} 
                    onClick={() => handleStepClick(step.id)}
                    className="flex flex-col items-center bg-white px-2 cursor-pointer group z-10"
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors
                      ${isActive ? 'border-brand-600 bg-brand-600 text-white' : 
                        isCompleted ? 'border-brand-600 bg-white text-brand-600' : 'border-gray-300 bg-white text-gray-400 group-hover:border-brand-400 group-hover:text-brand-400'}`}>
                      {isCompleted ? <Check className="w-5 h-5" /> : step.id}
                    </div>
                    <span className={`mt-2 text-xs font-semibold ${isActive || isCompleted ? 'text-brand-700' : 'text-gray-500 group-hover:text-brand-500'}`}>
                      {step.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {/* STEP 1: ยื่นใบสมัคร (Application Form) */}
        {currentStep === 1 && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 flex flex-col md:flex-row min-h-[600px]">
            {/* Left Sidebar */}
            <aside className="w-full md:w-64 bg-gray-50 border-r border-gray-200 flex-shrink-0">
              <div className="p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-1">Application</h2>
                <p className="text-xs text-gray-500">Complete all sections</p>
              </div>
              <nav className="space-y-1 px-2 pb-6">
                {/* Group 1: Input Data */}
                <button onClick={() => setActiveSubSection('profile')}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${activeSubSection === 'profile' ? 'bg-brand-50 text-brand-700 border-l-4 border-brand-600' : 'text-gray-600 hover:bg-gray-100'}`}>
                  <User className={`mr-3 h-5 w-5 ${isProfileComplete() ? 'text-green-500' : 'text-gray-400'}`} />
                  Personal Info
                </button>
                <button onClick={() => setActiveSubSection('docs')}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${activeSubSection === 'docs' ? 'bg-brand-50 text-brand-700 border-l-4 border-brand-600' : 'text-gray-600 hover:bg-gray-100'}`}>
                  <Upload className={`mr-3 h-5 w-5 ${isDocsComplete() ? 'text-green-500' : 'text-gray-400'}`} />
                  Documents
                </button>
                <button onClick={() => setActiveSubSection('test')}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${activeSubSection === 'test' ? 'bg-brand-50 text-brand-700 border-l-4 border-brand-600' : 'text-gray-600 hover:bg-gray-100'}`}>
                  <PenTool className={`mr-3 h-5 w-5 ${isExamComplete() ? 'text-green-500' : 'text-gray-400'}`} />
                  Entrance Test
                </button>

                {/* Divider */}
                <div className="my-4 border-t border-gray-200 mx-4"></div>
                <div className="px-4 mb-2 text-xs font-bold text-gray-400 uppercase tracking-wider">Finalize</div>

                {/* Group 2: Sign & Pay */}
                <button 
                  onClick={() => canProceedToReview() && setActiveSubSection('esign')}
                  disabled={!canProceedToReview()}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors 
                    ${activeSubSection === 'esign' ? 'bg-brand-50 text-brand-700 border-l-4 border-brand-600' : 
                      !canProceedToReview() ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}>
                  <FileCheck className={`mr-3 h-5 w-5 ${eSignChecked ? 'text-green-500' : 'text-gray-400'}`} />
                  Review & E-Sign
                </button>
                <button 
                  onClick={() => canProceedToReview() && eSignChecked && setActiveSubSection('payment')}
                  disabled={!canProceedToReview() || !eSignChecked}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors 
                    ${activeSubSection === 'payment' ? 'bg-brand-50 text-brand-700 border-l-4 border-brand-600' : 
                      (!canProceedToReview() || !eSignChecked) ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:bg-gray-100'}`}>
                  <CreditCard className="mr-3 h-5 w-5 text-gray-400" />
                  Payment
                </button>
              </nav>
            </aside>

            {/* Right Content */}
            <div className="flex-1 p-8 overflow-y-auto bg-gray-50 md:bg-white relative">
              {/* Image Crop Modal */}
              {isCropOpen && originalImage && (
                  <div className="absolute inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
                      <div className="bg-white rounded-lg p-4 w-full max-w-md shadow-2xl animate-fade-in flex flex-col items-center">
                          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center"><Upload className="w-5 h-5 mr-2"/> Adjust Photo</h3>
                          
                          {/* Crop Container */}
                          <div 
                              className="relative w-[300px] h-[300px] bg-gray-900 overflow-hidden cursor-move border-2 border-brand-500 rounded-md shadow-inner"
                              onMouseDown={handleCropMouseDown}
                              onMouseMove={handleCropMouseMove}
                              onMouseUp={handleCropMouseUp}
                              onMouseLeave={handleCropMouseUp}
                              onTouchStart={handleCropMouseDown}
                              onTouchMove={handleCropMouseMove}
                              onTouchEnd={handleCropMouseUp}
                          >
                              <img 
                                  ref={cropImgRef}
                                  src={originalImage} 
                                  alt="Crop Preview" 
                                  className="absolute max-w-none origin-center pointer-events-none select-none"
                                  style={{
                                      transform: `translate(${cropPos.x}px, ${cropPos.y}px) scale(${cropScale})`,
                                      left: '50%',
                                      top: '50%',
                                      // Centering correction for transform origin
                                      marginLeft: '-50%', 
                                      marginTop: '-50%'
                                  }}
                                  onLoad={(e) => {
                                      // Initial Center
                                      // Allow the image to load naturally
                                  }}
                              />
                              {/* Grid Overlay */}
                              <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-30">
                                  {[...Array(9)].map((_, i) => <div key={i} className="border border-white/50"></div>)}
                              </div>
                          </div>

                          {/* Controls */}
                          <div className="w-full mt-6 px-4">
                              <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                                  <span>Zoom</span>
                                  <span>{Math.round(cropScale * 100)}%</span>
                              </div>
                              <div className="flex items-center gap-3">
                                  <ZoomOut className="w-4 h-4 text-gray-400" />
                                  <input 
                                      type="range" 
                                      min="0.5" 
                                      max="3" 
                                      step="0.1" 
                                      value={cropScale}
                                      onChange={(e) => setCropScale(parseFloat(e.target.value))}
                                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                  />
                                  <ZoomIn className="w-4 h-4 text-gray-400" />
                              </div>
                              <div className="text-center mt-2 text-xs text-gray-400 flex items-center justify-center gap-1">
                                  <Move className="w-3 h-3"/> Drag to Reposition
                              </div>
                          </div>

                          <div className="flex gap-3 w-full mt-6">
                              <Button variant="secondary" className="flex-1" onClick={() => { setIsCropOpen(false); setOriginalImage(null); }}>Cancel</Button>
                              <Button className="flex-1" onClick={handleCropSave}>Save Photo</Button>
                          </div>
                      </div>
                  </div>
              )}

              {/* 1. Personal Info */}
              {activeSubSection === 'profile' && (
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">1. Personal Information</h2>
                  </div>
                  
                  {/* Dynamic Form Render */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {fieldConfigs.filter(f => !f.isHidden).map(field => renderField(field))}
                  </div>

                  <div className="mt-8 flex justify-end">
                    <Button onClick={handleProfileSave}>Save & Next</Button>
                  </div>
                </div>
              )}

              {/* 2. Documents */}
              {activeSubSection === 'docs' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">2. Document Upload</h2>

                  {isEditRestricted && (
                    <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg mb-6 flex items-start animate-fade-in">
                      <AlertTriangle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-bold">Application Returned</p>
                        <p className="text-sm">Please correct the rejected documents below. Other fields are locked.</p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Special Profile Pic Card if configured */}
                    {(Object.values(formData.documents) as DocumentItem[]).filter(d => d.configId === 'doc_conf_pic' && (!docConfigs.find(c=>c.id==='doc_conf_pic')?.isHidden)).map(doc => (
                        <div key={doc.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row items-center gap-6 mb-6">
                            <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center border-2 border-gray-200 overflow-hidden relative group">
                                {doc.fileName && doc.fileUrl ? (
                                    <img src={doc.fileUrl} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-10 h-10 text-gray-400" />
                                )}
                                {doc.status === DocumentStatus.APPROVED && <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center"><Check className="text-white font-bold"/></div>}
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <h3 className="text-lg font-bold text-gray-900">Profile Picture</h3>
                                <p className="text-sm text-gray-500 mb-2">Upload a recent photo of yourself.</p>
                                <div className="flex justify-center md:justify-start gap-2">
                                    <label className="cursor-pointer">
                                        <input type="file" accept="image/*" className="hidden" onChange={handleProfilePicSelect} disabled={!(!isEditRestricted || doc.status === DocumentStatus.REJECTED)} />
                                        <span className={`inline-flex items-center px-4 py-2 border shadow-sm text-sm font-medium rounded-md transition-colors
                                            ${!(!isEditRestricted || doc.status === DocumentStatus.REJECTED) ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : 'bg-brand-600 text-white hover:bg-brand-700 border-transparent'}`}>
                                            <Upload className="w-4 h-4 mr-2" /> {doc.fileName ? 'Change Photo' : 'Upload Photo'}
                                        </span>
                                    </label>
                                </div>
                                {doc.reviewNote && <p className="text-xs text-red-600 mt-2 font-medium">Note: {doc.reviewNote}</p>}
                            </div>
                        </div>
                    ))}

                    {/* Standard Document List (excluding Profile Pic) */}
                    {docConfigs
                        .filter(conf => conf.id !== 'doc_conf_pic' && !conf.isHidden) // Exclude Profile Pic (handled above) and hidden
                        .map(conf => {
                            // Find the corresponding document in formData based on Config ID
                            const docs = (Object.values(formData.documents) as DocumentItem[]).filter(d => d.configId === conf.id);
                            
                            if (docs.length === 0) return null; // Should be created by useEffect if applicable

                            return docs.map(doc => {
                                const isRejected = doc.status === DocumentStatus.REJECTED;
                                const canEdit = !isEditRestricted || isRejected;

                                return (
                                    <div key={doc.id} className={`border rounded-lg p-4 bg-white hover:bg-gray-50 transition-colors ${isRejected ? 'border-red-300 ring-1 ring-red-200' : 'border-gray-200'}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center">
                                                {doc.status === DocumentStatus.UPLOADED || doc.status === DocumentStatus.APPROVED ? 
                                                    <CheckCircle className="text-green-500 mr-3 h-6 w-6" /> : 
                                                    doc.status === DocumentStatus.REJECTED ? <X className="text-red-500 mr-3 h-6 w-6" /> :
                                                    <div className="w-6 h-6 border-2 border-gray-300 rounded-full mr-3"></div>
                                                }
                                                <div>
                                                    <h4 className="font-semibold text-gray-900">{doc.name}</h4>
                                                    {doc.reviewNote && <p className="text-xs text-red-600 font-bold mt-1">Note: {doc.reviewNote}</p>}
                                                    {!doc.fileName && <p className="text-xs text-gray-400 mt-0.5">No file uploaded</p>}
                                                </div>
                                            </div>
                                            {canEdit && (
                                                <label className="cursor-pointer">
                                                    <input type="file" className="hidden" onChange={() => handleFileUpload(doc.id)} />
                                                    <span className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-100">
                                                        <Upload className="w-4 h-4 mr-2" /> {doc.status === 'pending' || !doc.fileName ? 'Upload' : 'Re-upload'}
                                                    </span>
                                                </label>
                                            )}
                                        </div>
                                        
                                        {doc.fileName && (
                                            <div className="flex items-center justify-between bg-gray-100 rounded px-3 py-2 ml-9">
                                                <div className="flex items-center text-sm text-gray-600 truncate">
                                                    <FileText className="w-4 h-4 mr-2 flex-shrink-0" />
                                                    <span className="truncate">{doc.fileName}</span>
                                                </div>
                                                {canEdit && (doc.status === DocumentStatus.UPLOADED || doc.status === DocumentStatus.REJECTED) && (
                                                    <button onClick={() => handleFileDelete(doc.id)} className="text-gray-400 hover:text-red-500 ml-2" title="Remove file">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            });
                        })
                    }
                  </div>
                  <div className="mt-8 flex justify-between">
                    <Button variant="outline" onClick={() => setActiveSubSection('profile')}>Back</Button>
                    <Button onClick={handleDocsNext}>Save & Next</Button>
                  </div>
                </div>
              )}

              {/* 3. Test - Exam Dashboard & Runner */}
              {activeSubSection === 'test' && (
                <div>
                  {/* Scenario A: Suite Selection (Dashboard) */}
                  {!selectedSuiteId ? (
                    <div>
                         <h2 className="text-2xl font-bold text-gray-900 mb-2">3. Entrance Test Suites</h2>
                         <p className="text-gray-500 mb-6">Please complete all test suites below. You can leave and return at any time.</p>
                         
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {examSuites.map(suite => {
                                const progress = calculateSuiteProgress(suite.id);
                                const isDone = progress.total > 0 && progress.current === progress.total;
                                
                                return (
                                    <div key={suite.id} className={`border-2 rounded-xl p-6 flex flex-col justify-between transition-all
                                        ${isDone ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white hover:border-brand-300 hover:shadow-md'}`}>
                                        <div>
                                            <div className="flex justify-between items-start mb-3">
                                                <h3 className="text-lg font-bold text-gray-900">{suite.title}</h3>
                                                {isDone && <CheckCircle className="text-green-600 w-6 h-6" />}
                                            </div>
                                            <p className="text-sm text-gray-500 mb-4">{suite.description}</p>
                                        </div>
                                        
                                        <div>
                                            <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
                                                <span>Progress</span>
                                                <span>{progress.current} / {progress.total} items</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                                                <div className={`h-2.5 rounded-full ${isDone ? 'bg-green-500' : 'bg-brand-500'}`} style={{ width: `${progress.percentage}%` }}></div>
                                            </div>
                                            
                                            <Button 
                                                variant={isDone ? "outline" : "primary"} 
                                                className="w-full justify-center"
                                                onClick={() => setSelectedSuiteId(suite.id)}
                                            >
                                                {isDone ? 'Review Answers' : progress.current > 0 ? 'Continue Test' : 'Start Test'}
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })}
                         </div>

                         <div className="mt-8 flex justify-between">
                            <Button variant="outline" onClick={() => setActiveSubSection('docs')}>Back</Button>
                            <Button 
                                disabled={!isExamComplete()} 
                                onClick={() => setActiveSubSection('esign')}
                                className={isExamComplete() ? 'animate-pulse' : ''}
                            >
                                Save & Next
                            </Button>
                        </div>
                    </div>
                  ) : (
                  /* Scenario B: Taking the Exam */
                    <div>
                        <div className="flex items-center mb-6">
                            <button onClick={handleSuiteReturn} className="mr-4 text-gray-500 hover:text-gray-700 p-2 rounded-full hover:bg-gray-100">
                                <ChevronLeft className="w-6 h-6" />
                            </button>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">
                                    {examSuites.find(s => s.id === selectedSuiteId)?.title}
                                </h2>
                                <p className="text-sm text-gray-500">Your answers are saved automatically.</p>
                            </div>
                        </div>

                        <div className="space-y-8 mb-8">
                            {exams.filter(e => e.suiteId === selectedSuiteId).map((q, idx) => {
                                const currentAnswer = formData.examAnswers?.[q.id];
                                
                                return (
                                    <div key={q.id} className="bg-white p-6 border border-gray-200 rounded-lg shadow-sm">
                                        <h4 className="text-base font-semibold text-gray-900 mb-4 flex">
                                            <span className="mr-2 text-gray-900 font-bold">Q{idx + 1}.</span> 
                                            {q.text}
                                            {q.isGraded && <span className="ml-2 text-xs font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded-full">(Score: {q.score})</span>}
                                        </h4>
                                        
                                        {q.type === QuestionType.MCQ_SINGLE && (
                                            <div className="space-y-2 pl-4">
                                                {q.options?.map(opt => (
                                                    <div key={opt.id}>
                                                        <label className={`flex items-center p-3 border rounded-md cursor-pointer transition-all duration-200
                                                            ${isEditRestricted ? 'cursor-not-allowed opacity-70 bg-gray-50' : ''}
                                                            ${currentAnswer === opt.id ? 'border-brand-600 ring-1 ring-brand-600 bg-brand-50' : 'border-gray-300 bg-white hover:bg-gray-50'}`}>
                                                            <input 
                                                                type="radio" 
                                                                name={q.id} 
                                                                className="hidden" // Hide native input
                                                                checked={currentAnswer === opt.id}
                                                                onChange={() => !isEditRestricted && handleExamAnswerChange(q.id, opt.id)}
                                                                disabled={isEditRestricted}
                                                            />
                                                            {/* Custom Radio Indicator */}
                                                            <div className={`flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center mr-3 transition-colors
                                                                ${currentAnswer === opt.id ? 'border-brand-600' : 'border-gray-300 bg-white'}`}>
                                                                {currentAnswer === opt.id && <div className="w-2.5 h-2.5 rounded-full bg-brand-600" />}
                                                            </div>
                                                            <span className="text-sm font-medium text-gray-900">{opt.text}</span>
                                                        </label>
                                                        {/* Render Text Input if "Allow Input" is true and this option is selected */}
                                                        {opt.allowInput && currentAnswer === opt.id && (
                                                            <input 
                                                                type="text" 
                                                                placeholder="Please specify" 
                                                                className="mt-2 ml-8 w-64 border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-600"
                                                                disabled={isEditRestricted}
                                                                value={formData.customData?.[`q_${q.id}_other`] || ''}
                                                                onChange={(e) => handleCustomDataChange(`q_${q.id}_other`, e.target.value)}
                                                            />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {q.type === QuestionType.MCQ_MULTI && (
                                             <div className="space-y-2 pl-4">
                                                 {q.options?.map(opt => {
                                                     const selectedList = Array.isArray(currentAnswer) ? currentAnswer : [];
                                                     const isSelected = selectedList.includes(opt.id);
                                                     return (
                                                        <div key={opt.id}>
                                                            <label className={`flex items-center p-3 border rounded-md cursor-pointer transition-all duration-200
                                                                ${isEditRestricted ? 'cursor-not-allowed opacity-70 bg-gray-50' : ''}
                                                                ${isSelected ? 'border-brand-600 ring-1 ring-brand-600 bg-brand-50' : 'border-gray-300 bg-white hover:bg-gray-50'}`}>
                                                                <input 
                                                                    type="checkbox" 
                                                                    className="hidden" // Hide native input
                                                                    checked={isSelected}
                                                                    onChange={(e) => {
                                                                        if(isEditRestricted) return;
                                                                        let newList = [...selectedList];
                                                                        if(e.target.checked) newList.push(opt.id);
                                                                        else newList = newList.filter(id => id !== opt.id);
                                                                        handleExamAnswerChange(q.id, newList);
                                                                    }}
                                                                    disabled={isEditRestricted} 
                                                                />
                                                                {/* Custom Checkbox Indicator */}
                                                                <div className={`flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center mr-3 transition-colors
                                                                    ${isSelected ? 'bg-brand-600 border-brand-600' : 'bg-white border-gray-300'}`}>
                                                                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                                                </div>
                                                                <span className="text-sm font-medium text-gray-900">{opt.text}</span>
                                                            </label>
                                                            {/* Render Text Input if "Allow Input" is true and this option is selected */}
                                                            {opt.allowInput && isSelected && (
                                                                <input 
                                                                    type="text" 
                                                                    placeholder="Please specify" 
                                                                    className="mt-2 ml-8 w-64 border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-600"
                                                                    disabled={isEditRestricted}
                                                                    value={formData.customData?.[`q_${q.id}_other_${opt.id}`] || ''}
                                                                    onChange={(e) => handleCustomDataChange(`q_${q.id}_other_${opt.id}`, e.target.value)}
                                                                />
                                                            )}
                                                        </div>
                                                     );
                                                 })}
                                             </div>
                                        )}

                                        {q.type === QuestionType.ESSAY && (
                                            <div className="pl-4">
                                                <textarea 
                                                    rows={4}
                                                    className="w-full border border-gray-300 rounded-md p-2.5 focus:outline-none focus:ring-1 focus:ring-brand-600 focus:border-brand-600 bg-white shadow-sm text-gray-900 placeholder-gray-400 disabled:bg-gray-100 disabled:text-gray-500"
                                                    placeholder="Type your answer here..."
                                                    value={typeof currentAnswer === 'string' ? currentAnswer : ''}
                                                    onChange={(e) => handleExamAnswerChange(q.id, e.target.value)}
                                                    disabled={isEditRestricted}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex justify-end">
                            <Button onClick={handleSuiteReturn} className="flex items-center">
                                Save & Return <ArrowRight className="ml-2 w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                  )}
                </div>
              )}

              {/* 4. Review & E-Sign */}
              {activeSubSection === 'esign' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">4. Review & E-Sign</h2>
                  
                  {isEditRestricted && (
                    <div className="bg-brand-50 border border-brand-200 p-4 rounded-lg mb-6 text-brand-700 text-sm font-medium flex items-center">
                        <RefreshCw className="w-5 h-5 mr-2" />
                        Status: Resubmission (Correcting Rejected Documents)
                    </div>
                  )}

                  <div className="space-y-6 mb-8">
                    {/* Personal Info Review */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center border-b pb-2">
                            <User className="w-5 h-5 mr-2 text-brand-600" /> Personal Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                            {fieldConfigs.filter(f => !f.isHidden).map(field => renderReadOnlyField(field))}
                        </div>
                    </div>

                    {/* Documents Review */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center border-b pb-2">
                            <Upload className="w-5 h-5 mr-2 text-brand-600" /> Documents Submitted
                        </h3>
                        <div className="space-y-3">
                            {Object.values(formData.documents).map((doc: DocumentItem) => (
                                <div key={doc.id} className="flex items-center justify-between bg-gray-50 p-3 rounded border border-gray-100">
                                    <div className="flex items-center">
                                        <div className={`p-1.5 rounded-full mr-3 ${doc.status === DocumentStatus.UPLOADED || doc.status === DocumentStatus.APPROVED ? 'bg-green-100' : 'bg-gray-200'}`}>
                                            <FileText className={`w-4 h-4 ${doc.status === DocumentStatus.UPLOADED || doc.status === DocumentStatus.APPROVED ? 'text-green-600' : 'text-gray-500'}`} />
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">{doc.name}</div>
                                            {doc.fileName && <div className="text-xs text-gray-500">{doc.fileName}</div>}
                                        </div>
                                    </div>
                                    <div className="text-xs font-bold">
                                        {doc.status === DocumentStatus.UPLOADED || doc.status === DocumentStatus.APPROVED ? 
                                            <span className="text-green-600 flex items-center"><Check className="w-3 h-3 mr-1"/> Ready</span> : 
                                            <span className="text-gray-400">Missing</span>
                                        }
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Exam Review Summary */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center border-b pb-2">
                            <PenTool className="w-5 h-5 mr-2 text-brand-600" /> Entrance Test Status
                        </h3>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">Questions Answered</span>
                            <span className="text-sm font-bold text-gray-900">{getCompletedQuestionCount()} / {exams.length}</span>
                        </div>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-6">
                    <div className="mb-6">
                        <label className="block text-sm font-bold text-gray-900 mb-2">Signature <span className="text-red-500">*</span></label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50 flex flex-col items-center justify-center relative">
                            {signatureImage ? (
                                <div className="relative w-full max-w-sm h-40 bg-white border border-gray-200 rounded">
                                    <img src={signatureImage} alt="Signature" className="w-full h-full object-contain" />
                                    {!isEditRestricted && <button onClick={clearSignature} className="absolute top-2 right-2 bg-red-100 text-red-600 p-1 rounded-full hover:bg-red-200"><X className="w-4 h-4"/></button>}
                                </div>
                            ) : (
                                <canvas 
                                    ref={canvasRef} 
                                    width={300} 
                                    height={150} 
                                    className="bg-white border border-gray-300 rounded cursor-crosshair touch-none"
                                    onMouseDown={startDrawing}
                                    onMouseMove={draw}
                                    onMouseUp={endDrawing}
                                    onMouseLeave={endDrawing}
                                    onTouchStart={startDrawing}
                                    onTouchMove={draw}
                                    onTouchEnd={endDrawing}
                                />
                            )}
                            {!signatureImage && <p className="text-xs text-gray-400 mt-2">Draw your signature above</p>}
                            
                            {!signatureImage && !isEditRestricted && (
                                <div className="mt-4 flex items-center gap-2">
                                    <span className="text-xs text-gray-500">OR</span>
                                    <label className="cursor-pointer text-xs bg-white border border-gray-300 px-3 py-1 rounded hover:bg-gray-50">
                                        Upload Image
                                        <input type="file" accept="image/*" className="hidden" onChange={handleSignatureUpload} />
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>

                    <label className="flex items-start cursor-pointer p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200">
                      <div className="flex items-center h-5 mt-1">
                        <input 
                          type="checkbox" 
                          checked={eSignChecked} 
                          onChange={e => setESignChecked(e.target.checked)}
                          className="hidden" 
                        />
                        {/* Custom Checkbox */}
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${eSignChecked ? 'bg-brand-600 border-brand-600' : 'bg-white border-gray-300'}`}>
                          {eSignChecked && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                      </div>
                      <div className="ml-3">
                        <span className="font-bold text-gray-900 block">Electronic Signature Confirmation</span>
                        <p className="text-gray-500 text-sm mt-1">
                            I hereby certify that the information provided above is true and correct to the best of my knowledge. 
                            I understand that any false statement may result in the rejection of my application.
                        </p>
                      </div>
                    </label>
                  </div>

                   <div className="mt-8 flex justify-end">
                    <Button onClick={() => setActiveSubSection('payment')} disabled={!eSignChecked || !signatureImage}>
                        {isEditRestricted ? 'Continue to Resubmit' : 'Continue to Payment'}
                    </Button>
                  </div>
                </div>
              )}

              {/* 5. Payment */}
              {activeSubSection === 'payment' && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    5. Application Fee Payment
                  </h2>
                  {renderPaymentUI(
                      handleApplicationFeePayment, 
                      500, 
                      isEditRestricted ? 'Resubmit Application' : 'Open K-Plus App', 
                      'Application Fee'
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2: ตรวจสอบเอกสาร (Verification) */}
        {currentStep === 2 && (
          <div className="grid grid-cols-1 gap-8 min-h-[500px]">
            {/* Status Banner */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
               {displayStatus === ApplicationStatus.DOCS_REJECTED ? (
                 <div className="text-center p-8 bg-red-50 border-b border-red-100">
                    <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 mx-auto animate-bounce">
                        <X className="w-10 h-10" />
                    </div>
                    <h2 className="text-3xl font-bold text-red-700 mb-2">Documents Returned</h2>
                    <p className="text-lg text-red-600 mb-6">
                        One or more documents have been rejected. Please review the details below and click "Fix Application".
                    </p>
                    <Button size="lg" onClick={handleFixApplication} className="bg-red-600 hover:bg-red-700 text-white shadow-md">
                        Fix Application (Resubmit)
                    </Button>
                 </div>
               ) : (
                 <div className="text-center p-8 bg-yellow-50 border-b border-yellow-100">
                    <div className="w-20 h-20 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mb-4 mx-auto">
                        <Clock className="w-10 h-10" />
                    </div>
                    <h2 className="text-3xl font-bold text-yellow-800 mb-2">Verification In Progress</h2>
                    <p className="text-lg text-yellow-700">
                        Your application is under review by our staff. Please check back later for updates.
                    </p>
                 </div>
               )}

               {/* Read-Only Summary */}
               <div className="p-8">
                   <h3 className="text-xl font-bold text-gray-900 mb-6 border-b pb-2 flex items-center">
                       <User className="w-6 h-6 mr-2 text-brand-600" /> Application Summary
                   </h3>
                   
                   {/* 1. Personal Information */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                       {fieldConfigs.filter(f => !f.isHidden).map(field => renderReadOnlyField(field))}
                   </div>

                   {/* 2. Documents Status List */}
                   <h3 className="text-xl font-bold text-gray-900 mb-6 border-b pb-2 flex items-center">
                       <Upload className="w-6 h-6 mr-2 text-brand-600" /> Documents & Evidence
                   </h3>
                   <div className="space-y-3 mb-8">
                       {Object.values(formData.documents).map((doc: DocumentItem) => {
                           let statusColor = "bg-gray-100 text-gray-600";
                           let icon = <Clock className="w-4 h-4"/>;
                           if (doc.status === DocumentStatus.APPROVED) { statusColor = "bg-green-100 text-green-700"; icon = <Check className="w-4 h-4"/>; }
                           if (doc.status === DocumentStatus.REJECTED) { statusColor = "bg-red-100 text-red-700"; icon = <X className="w-4 h-4"/>; }
                           // Show yellow for newly uploaded files in pending review
                           if (doc.status === DocumentStatus.UPLOADED) { statusColor = "bg-yellow-100 text-yellow-800"; icon = <Clock className="w-4 h-4"/>; }
                           
                           return (
                               <div key={doc.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:shadow-sm transition-shadow">
                                   <div className="flex items-center">
                                       <FileText className={`w-5 h-5 mr-3 ${doc.status === DocumentStatus.APPROVED ? 'text-green-500' : 'text-gray-400'}`} />
                                       <div>
                                           <div className="font-bold text-gray-800 text-sm">{doc.name}</div>
                                           {doc.fileName && <div className="text-xs text-gray-500">{doc.fileName}</div>}
                                           {doc.reviewNote && <div className="text-xs font-bold text-red-600 mt-1 bg-red-50 p-1 rounded inline-block">Note: {doc.reviewNote}</div>}
                                       </div>
                                   </div>
                                   <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 uppercase ${statusColor}`}>
                                       {icon} {doc.status}
                                   </div>
                               </div>
                           );
                       })}
                   </div>

                   {/* 3. Payment Status */}
                   <h3 className="text-xl font-bold text-gray-900 mb-6 border-b pb-2 flex items-center">
                       <CreditCard className="w-6 h-6 mr-2 text-brand-600" /> Payment Status
                   </h3>
                   <div className="flex items-center p-4 bg-white rounded-lg border border-gray-200">
                        <div className={`p-3 rounded-full mr-4 ${formData.feeStatuses?.application === 'PAID' ? 'bg-green-100' : 'bg-yellow-100'}`}>
                            <DollarSign className={`w-6 h-6 ${formData.feeStatuses?.application === 'PAID' ? 'text-green-600' : 'text-yellow-600'}`} />
                        </div>
                        <div>
                            <div className="font-bold text-gray-900">Application Fee</div>
                            <div className={`text-sm font-bold ${formData.feeStatuses?.application === 'PAID' ? 'text-green-600' : 'text-yellow-600'}`}>
                                {formData.feeStatuses?.application === 'PAID' ? 'Paid - 500 THB' : 'Pending Verification'}
                            </div>
                        </div>
                   </div>
               </div>
            </div>
          </div>
        )}

        {/* STEP 3: นัดสัมภาษณ์ (Interview) */}
        {currentStep === 3 && (
          <div className="bg-white rounded-xl shadow-lg p-8 min-h-[500px] flex flex-col">
             {/* SUB-STATE 1: Screening Passed (Pay Fee) */}
             {displayStatus === ApplicationStatus.DOCS_APPROVED && (
               <div className="max-w-3xl mx-auto text-center flex-1 flex flex-col justify-center w-full">
                  <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 mx-auto">
                    <CheckCircle className="w-10 h-10" />
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-4">You Passed the Screening!</h2>
                  <p className="text-gray-600 mb-8">
                    Congratulations. Your documents have been approved, and you are eligible for an interview.
                    Please pay the interview fee to proceed with booking a slot.
                  </p>
                  
                  <div className="w-full text-left">
                     {renderPaymentUI(handleInterviewFeePayment, 200, 'Pay Interview Fee', 'Interview Fee')}
                  </div>
               </div>
             )}

             {/* SUB-STATE 2: Fee Paid (Select Slot) */}
             {(displayStatus === ApplicationStatus.INTERVIEW_READY || displayStatus === ApplicationStatus.INTERVIEW_BOOKED) && (
               <div>
                 <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Interview Appointment</h2>
                    <p className="text-gray-600">Select your preferred time slot for the interview.</p>
                 </div>

                 {displayStatus === ApplicationStatus.INTERVIEW_BOOKED ? (
                    <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="w-20 h-20 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center mb-6">
                        <Calendar className="w-10 h-10" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">Booking Confirmed</h3>
                      <p className="text-lg text-gray-600 mt-2 mb-2">
                        Date: <span className="font-bold text-brand-600">{new Date(formData.interviewSlot!).toLocaleDateString()}</span>
                      </p>
                      <p className="text-lg text-gray-600 mb-8">
                        Time: <span className="font-bold text-brand-600">{new Date(formData.interviewSlot!).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </p>
                      <Button variant="outline">Download Appointment Slip</Button>
                    </div>
                 ) : (
                    <div>
                      <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                        <Clock className="mr-2 text-brand-600" /> Available Slots
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {interviewSlots.filter(s => s.booked < s.capacity).map(slot => (
                            <button 
                              key={slot.id}
                              onClick={() => handleInterviewBook(slot.id)}
                              className="group p-6 border-2 border-gray-200 rounded-xl hover:border-brand-500 hover:bg-brand-50 transition-all bg-white text-left shadow-sm hover:shadow-md"
                            >
                              <div className="text-lg font-bold text-gray-900 group-hover:text-brand-700">
                                {new Date(slot.dateTime).toLocaleDateString()}
                              </div>
                              <div className="text-brand-600 font-medium">
                                {new Date(slot.dateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              </div>
                              <div className="mt-2 text-xs text-gray-400">{slot.type} ({slot.capacity - slot.booked} left)</div>
                            </button>
                        ))}
                      </div>
                    </div>
                 )}
               </div>
             )}
          </div>
        )}

        {/* STEP 4: ประกาศผล (Result) */}
        {currentStep === 4 && (
          <div className="bg-white rounded-xl shadow-lg p-8 min-h-[500px] flex flex-col items-center justify-center w-full">
            {displayStatus === ApplicationStatus.PASSED && (
              <div className="max-w-3xl mx-auto w-full flex flex-col items-center">
                 <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
                    <CheckCircle className="w-12 h-12" />
                 </div>
                 <h2 className="text-4xl font-bold text-green-700 mb-4">Interview Passed!</h2>
                 <p className="text-xl text-gray-700 max-w-2xl mx-auto mb-8 text-center">
                    We are pleased to inform you that you have passed the interview selection. 
                    To confirm your enrollment, please pay the tuition fee below.
                 </p>
                 
                 <div className="w-full text-left">
                    {renderPaymentUI(handleTuitionPayment, 15000, 'Pay Tuition Fee', 'Enrollment & Tuition Fee')}
                 </div>
                 
                 {/* View Application Details even if passed */}
                 <div className="mt-8 pt-8 border-t border-gray-100 w-full">
                     <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">Application Details</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-gray-50 p-4 rounded-lg">
                         {fieldConfigs.filter(f => !f.isHidden).map(field => renderReadOnlyField(field))}
                     </div>
                 </div>
              </div>
            )}

            {displayStatus === ApplicationStatus.ENROLLED && (
                <div className="text-center max-w-2xl mx-auto">
                     <div className="w-28 h-28 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center mb-6 mx-auto shadow-lg border-4 border-brand-200">
                        <GraduationCap className="w-16 h-16" />
                     </div>
                     <h2 className="text-4xl font-bold text-gray-900 mb-4">Welcome, Student!</h2>
                     <p className="text-lg text-gray-600 mb-8">
                        Your enrollment is confirmed. You are now officially a student at UniAdmit University.
                        Please check your email for the orientation schedule.
                     </p>
                     <div className="bg-gray-100 p-6 rounded-lg border border-gray-300 inline-block text-left">
                        <p className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1">Student ID</p>
                        <p className="text-2xl font-mono font-bold text-gray-900 tracking-widest">66010559</p>
                     </div>
                </div>
            )}

            {displayStatus === ApplicationStatus.FAILED && (
              <div className="text-center">
                 <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6 mx-auto">
                    <X className="w-12 h-12" />
                 </div>
                 <h2 className="text-3xl font-bold text-red-700 mb-4">Application Status</h2>
                 <p className="text-lg text-gray-600 max-w-lg mx-auto">
                    We regret to inform you that your application was not successful this time. 
                    Thank you for your interest in our university.
                 </p>
                 <div className="mt-6 text-gray-500 text-sm">
                    Reason: {applicant.evaluation?.comment || 'Does not meet the criteria.'}
                 </div>
              </div>
            )}
          </div>
        )}

        {/* My Purchases Page */}
        {activeSubSection === 'my_purchases' && (
            <div className="max-w-4xl mx-auto">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">My Purchases</h2>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 space-y-4">
                        {[
                            { id: 'app_fee', label: 'Application Fee', status: applicant.feeStatuses?.application, amount: 500, enabled: paymentConfig.requireApplicationFee },
                            { id: 'int_fee', label: 'Interview Fee', status: applicant.feeStatuses?.interview, amount: 200, enabled: paymentConfig.requireInterviewFee },
                            { id: 'tui_fee', label: 'Tuition Fee', status: applicant.feeStatuses?.tuition, amount: 15000, enabled: paymentConfig.requireTuitionFee }
                        ].filter(fee => fee.enabled).map(fee => (
                            <div key={fee.id} className="flex flex-col sm:flex-row justify-between items-center p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-4 mb-3 sm:mb-0">
                                    <div className={`p-3 rounded-full ${fee.status === 'PAID' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                                        <DollarSign className="w-6 h-6"/>
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-900">{fee.label}</div>
                                        <div className="text-sm text-gray-500">{fee.amount.toLocaleString()} THB</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                        fee.status === 'PAID' ? 'bg-green-100 text-green-700' : 
                                        fee.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                    }`}>
                                        {fee.status || 'PENDING'}
                                    </span>
                                    {fee.status === 'PAID' && (
                                        <Button size="sm" variant="outline" className="flex items-center" onClick={() => handleDownloadReceipt(fee.label)}>
                                            <FileText className="w-4 h-4 mr-2"/> Receipt
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

      </main>

      {/* FOOTER PROTOTYPE CONTROL PANEL */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white py-4 px-6 z-[100] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between">
          <div className="flex items-center space-x-3 mb-4 md:mb-0">
            <div className="bg-brand-600 p-1.5 rounded">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm uppercase tracking-wider">Prototype Control</h3>
              <p className="text-xs text-gray-400">Current Step: <span className="text-brand-400">{steps.find(s => s.id === currentStep)?.name}</span></p>
            </div>
          </div>

          <div className="flex flex-wrap justify-center items-center gap-3">
            
            <Button size="sm" variant="danger" onClick={demoResetApplication} type="button" className="flex items-center">
              <RefreshCw className="w-3 h-3 mr-2" /> Reset Application
            </Button>

            <div className="h-6 w-px bg-gray-700 mx-2 hidden md:block"></div>

            <div className="flex items-center gap-2 mr-2">
               <span className="text-xs text-gray-400 mr-1">Payment Config:</span>
               <button 
                 type="button"
                 onClick={() => togglePaymentMethod('kplus')}
                 className={`flex items-center px-2 py-1 rounded text-xs border transition-colors ${paymentConfig.kplus ? 'bg-green-900 border-green-600 text-green-400' : 'bg-gray-800 border-gray-600 text-gray-500'}`}
               >
                 {paymentConfig.kplus ? <ToggleRight className="w-3 h-3 mr-1" /> : <ToggleLeft className="w-3 h-3 mr-1" />}
                 K-Plus
               </button>
               <button 
                 type="button"
                 onClick={() => togglePaymentMethod('qrcode')}
                 className={`flex items-center px-2 py-1 rounded text-xs border transition-colors ${paymentConfig.qrcode ? 'bg-brand-900 border-brand-600 text-brand-400' : 'bg-gray-800 border-gray-600 text-gray-500'}`}
               >
                 {paymentConfig.qrcode ? <ToggleRight className="w-3 h-3 mr-1" /> : <ToggleLeft className="w-3 h-3 mr-1" />}
                 QR Code
               </button>
            </div>
            
            <div className="h-6 w-px bg-gray-700 mx-2 hidden md:block"></div>

            {currentStep === 1 && (
              <Button size="sm" className="bg-brand-600 hover:bg-brand-700 text-white flex items-center" onClick={demoAutoFill} type="button">
                <Wand2 className="w-3 h-3 mr-2" /> 
                {activeSubSection === 'docs' ? 'Auto-Upload All' : activeSubSection === 'test' ? 'Auto-Answer All' : 'Auto-Fill Profile'}
              </Button>
            )}

            {currentStep === 2 && (
              <>
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white flex items-center" onClick={demoSimulateStaffApproval} type="button">
                   <Check className="w-3 h-3 mr-2" /> Approve All
                </Button>
                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white flex items-center" onClick={demoSimulateStaffReject} type="button">
                   <X className="w-3 h-3 mr-2" /> Reject Docs
                </Button>
              </>
            )}

            {currentStep === 3 && (
              <>
                 {displayStatus === ApplicationStatus.DOCS_APPROVED && (
                    <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={demoFailScreening} type="button">
                       Fail Screening
                    </Button>
                 )}
                 {displayStatus === ApplicationStatus.INTERVIEW_BOOKED && (
                    <>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={demoPassInterview} type="button">
                         Pass Interview
                      </Button>
                      <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={demoFailInterview} type="button">
                         Fail Interview
                      </Button>
                    </>
                 )}
              </>
            )}

            {currentStep === 4 && displayStatus === ApplicationStatus.PASSED && (
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={demoEnroll} type="button">
                   Simulate Tuition Paid
                </Button>
            )}

          </div>
        </div>
      </div>

    </div>
  );
};