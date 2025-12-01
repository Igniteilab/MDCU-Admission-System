import React, { useState } from 'react';
import { ApplicantPortal } from './components/applicant/ApplicantPortal';
import { StaffDashboard } from './components/staff/StaffDashboard';
import { createNewApplicant, getApplicants } from './services/storage';
import { Applicant } from './types';
import { User, ShieldCheck, GraduationCap } from 'lucide-react';

function App() {
  const [currentRole, setCurrentRole] = useState<'guest' | 'applicant' | 'staff'>('guest');
  const [currentApplicant, setCurrentApplicant] = useState<Applicant | null>(null);

  const handleApplicantLogin = () => {
    // Simulating a login. In a real app, this would check credentials.
    // Here we just grab the first mock user or create one.
    const applicants = getApplicants();
    const user = applicants.find(a => a.id.startsWith('user_')) || createNewApplicant();
    setCurrentApplicant(user);
    setCurrentRole('applicant');
  };

  const handleStaffLogin = () => {
    setCurrentRole('staff');
  };

  if (currentRole === 'applicant' && currentApplicant) {
    return (
      <ApplicantPortal 
        applicant={currentApplicant} 
        onUpdate={(updated) => setCurrentApplicant(updated)}
        onLogout={() => setCurrentRole('guest')}
      />
    );
  }

  if (currentRole === 'staff') {
    return (
      <StaffDashboard onLogout={() => setCurrentRole('guest')} />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-brand-100 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-brand-600 p-8 text-center">
          <div className="mx-auto bg-white w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-md">
             <GraduationCap className="text-brand-600 w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-white">UniAdmit</h1>
          <p className="text-brand-100 mt-2 font-medium">Student Admission System</p>
        </div>
        
        <div className="p-8 space-y-6">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">Select your portal</h2>
            <p className="text-gray-500 text-sm">Choose how you want to access the system</p>
          </div>

          <div className="space-y-4">
            <button 
              onClick={handleApplicantLogin}
              className="w-full flex items-center p-4 border-2 border-gray-100 rounded-xl hover:border-brand-500 hover:bg-brand-50 transition-all group"
            >
              <div className="bg-blue-100 p-3 rounded-full group-hover:bg-blue-200 transition-colors">
                <User className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4 text-left">
                <h3 className="font-bold text-gray-900">Applicant Login</h3>
                <p className="text-xs text-gray-500 font-medium">Apply, track status, or take exam</p>
              </div>
            </button>

            <button 
              onClick={handleStaffLogin}
              className="w-full flex items-center p-4 border-2 border-gray-100 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all group"
            >
              <div className="bg-purple-100 p-3 rounded-full group-hover:bg-purple-200 transition-colors">
                <ShieldCheck className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4 text-left">
                <h3 className="font-bold text-gray-900">Staff Login</h3>
                <p className="text-xs text-gray-500 font-medium">Review docs, manage exams, dashboard</p>
              </div>
            </button>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-100 text-center text-xs text-gray-400">
            &copy; 2023 UniAdmit System. Demo Version.
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;