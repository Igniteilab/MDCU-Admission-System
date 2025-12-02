
import React, { useState } from 'react';
import { ApplicantPortal } from './components/applicant/ApplicantPortal';
import { StaffDashboard } from './components/staff/StaffDashboard';
import { createNewApplicant, getApplicants, getStaffUsers } from './services/storage';
import { Applicant, StaffUser, StaffRole } from './types';
import { User, ShieldCheck, GraduationCap, ChevronDown } from 'lucide-react';

function App() {
  const [currentRole, setCurrentRole] = useState<'guest' | 'applicant' | 'staff'>('guest');
  const [currentApplicant, setCurrentApplicant] = useState<Applicant | null>(null);
  const [currentStaffUser, setCurrentStaffUser] = useState<StaffUser | null>(null);
  const [isStaffDropdownOpen, setIsStaffDropdownOpen] = useState(false);

  const handleApplicantLogin = () => {
    // Simulating a login. In a real app, this would check credentials.
    // Here we just grab the first mock user or create one.
    const applicants = getApplicants();
    const user = applicants.find(a => a.id.startsWith('user_')) || createNewApplicant();
    setCurrentApplicant(user);
    setCurrentRole('applicant');
  };

  const handleStaffLogin = (user: StaffUser) => {
    setCurrentStaffUser(user);
    setCurrentRole('staff');
    setIsStaffDropdownOpen(false);
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

  if (currentRole === 'staff' && currentStaffUser) {
    return (
      <StaffDashboard currentUser={currentStaffUser} onLogout={() => setCurrentRole('guest')} />
    );
  }

  const staffUsers = getStaffUsers();

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

            <div className="relative">
                <button 
                  onClick={() => setIsStaffDropdownOpen(!isStaffDropdownOpen)}
                  className="w-full flex items-center p-4 border-2 border-gray-100 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all group justify-between"
                >
                  <div className="flex items-center">
                      <div className="bg-purple-100 p-3 rounded-full group-hover:bg-purple-200 transition-colors">
                        <ShieldCheck className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="ml-4 text-left">
                        <h3 className="font-bold text-gray-900">Staff Login</h3>
                        <p className="text-xs text-gray-500 font-medium">Access as Admin, Reviewer, or Proctor</p>
                      </div>
                  </div>
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                </button>
                
                {isStaffDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 z-10 overflow-hidden">
                        {staffUsers.map(user => (
                            <button
                                key={user.id}
                                onClick={() => handleStaffLogin(user)}
                                className="w-full text-left px-4 py-3 hover:bg-purple-50 flex items-center justify-between border-b border-gray-50 last:border-0"
                            >
                                <div>
                                    <div className="font-bold text-gray-900 text-sm">{user.fullName}</div>
                                    <div className="text-xs text-gray-500 capitalize">{user.role.replace('_', ' ').toLowerCase()}</div>
                                </div>
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">{user.username}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
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
