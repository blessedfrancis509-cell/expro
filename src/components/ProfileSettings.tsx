import React, { useState, useRef } from 'react';
import { UserProfile } from '../types';
import { Shield, Key, CheckCircle, RefreshCcw, FileText, Upload, AlertTriangle, AlertCircle } from 'lucide-react';

interface ProfileSettingsProps {
  user: UserProfile;
  onUpdateUser: (updatedFields: Partial<UserProfile>) => void;
  onRefreshDemoBalance: () => void;
}

export default function ProfileSettings({ user, onUpdateUser, onRefreshDemoBalance }: ProfileSettingsProps) {
  // 2FA details
  const [use2FA, setUse2FA] = useState(user.twoFactorEnabled);
  const [kycDocStatus, setKycDocStatus] = useState<'unloaded' | 'dropped' | 'processing' | 'approved'>('unloaded');
  const [dragActive, setDragActive] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handle2FAToggle = () => {
    const nextVal = !use2FA;
    setUse2FA(nextVal);
    onUpdateUser({ twoFactorEnabled: nextVal });
  };

  // Drag and Drop File Handlers (Mandatory Standard)
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleUploadedFile(e.target.files[0]);
    }
  };

  const triggeredFileInputClick = () => {
    fileInputRef.current?.click();
  };

  const handleUploadedFile = (file: File) => {
    setSelectedFileName(file.name);
    setKycDocStatus('dropped');
    setUploadProgress(0);

    // Simulate structured cloud verification file upload
    setKycDocStatus('processing');
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setKycDocStatus('approved');
          onUpdateUser({ kycStatus: 'pending' });
          return 100;
        }
        return prev + 25;
      });
    }, 400);
  };

  return (
    <div id="profile-settings-board" className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      
      {/* Profile & Security Credentials Card */}
      <div className="lg:col-span-2 bg-[#181a20] border border-zinc-850 rounded-xl p-4.5 shadow-lg flex flex-col justify-between">
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5">
            <h4 className="font-bold text-zinc-100 text-xs uppercase tracking-wider flex items-center gap-1.5 font-sans">
              <Key className="h-4 w-4 text-[#f0b90b]" /> Trader Security Settings
            </h4>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-20 py-0.5 rounded-full font-mono font-bold">
              Secure Shield
            </span>
          </div>

          {/* User Details display */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1 bg-[#2b2f36]/40 p-3 rounded-xl border border-zinc-800">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wide">Legal Name</span>
              <span className="text-zinc-100 font-bold block text-sm">{user.fullName}</span>
            </div>
            <div className="space-y-1 bg-[#2b2f36]/40 p-3 rounded-xl border border-zinc-800">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wide">Registered Email</span>
              <span className="text-zinc-100 font-bold block text-sm">{user.email}</span>
            </div>
            <div className="space-y-1 bg-[#2b2f36]/40 p-3 rounded-xl border border-zinc-800">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wide">Regulatory Tier</span>
              <span className="text-zinc-100 font-bold block text-sm flex items-center gap-1.5">
                {user.kycStatus === 'verified' && (
                  <>
                    <CheckCircle className="h-4 w-4 text-emerald-400" /> Standard Account (Fully Cleared)
                  </>
                )}
                {user.kycStatus === 'pending' && (
                  <>
                    <AlertCircle className="h-4 w-4 text-[#f0b90b] animate-pulse" /> Pending Doc Scan Approval
                  </>
                )}
                {user.kycStatus === 'unverified' && (
                  <>
                    <AlertTriangle className="h-4 w-4 text-red-400" /> Action Required: Upload KYC
                  </>
                )}
              </span>
            </div>
            <div className="space-y-1 bg-[#2b2f36]/40 p-3 rounded-xl border border-zinc-800">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wide">Account Established since</span>
              <span className="text-zinc-100 font-mono font-bold block text-sm">{user.joinedAt}</span>
            </div>
          </div>

          {/* Two-Factor Authentication Toggle */}
          <div className="p-4 bg-[#2b2f36]/40 rounded-xl border border-zinc-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <h5 className="font-bold text-zinc-100 text-xs uppercase tracking-wide">Enable Multi-Factor 2FA Code Check</h5>
              <p className="text-[11px] text-[#8E9AAB] max-w-sm">
                Compels the system to prompt a 6-digit dynamic passcode authenticator confirmation before performing high-volume leverage margin exits or profit payouts.
              </p>
            </div>
            <button
              id="toggle-2fa-btn"
              type="button"
              onClick={handle2FAToggle}
              className={`p-1 px-4 rounded-full text-xs font-bold transition-all cursor-pointer ${
                use2FA
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 shadow-md'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400'
              }`}
            >
              {use2FA ? 'ACTIVE' : 'DISABLED'}
            </button>
          </div>

          {/* Paper Money valves refresh */}
          <div className="p-4 bg-yellow-500/5 rounded-xl border border-yellow-500/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <h5 className="font-bold text-[#f0b90b] text-xs uppercase tracking-wide">Refuel Paper Wallet Balance</h5>
              <p className="text-[11px] text-[#8E9AAB] max-w-sm">
                Exhausted your demo portfolio margins? Tap the replenish recharge pump valve to refill your sandbox treasury back to $10,000.00 immediately.
              </p>
            </div>
            <button
              id="refuel-balance-btn"
              type="button"
              onClick={onRefreshDemoBalance}
              className="bg-[#f0b90b] hover:bg-[#e0ad06] text-[#0b0e11] px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow cursor-pointer transition-all"
            >
              <RefreshCcw className="h-3.5 w-3.5" /> REFUEL TREASURY
            </button>
          </div>
        </div>
      </div>

      {/* KYC Document scan Dropzone panel */}
      <div className="bg-[#181a20] border border-zinc-850 rounded-xl p-4.5 shadow-lg flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2.5 mb-4.5">
            <h4 className="font-bold text-zinc-100 text-xs uppercase tracking-wider flex items-center gap-1.5 font-sans">
              <Shield className="h-4 w-4 text-[#f0b90b]" /> Regulatory Doc KYC Upload
            </h4>
          </div>

          <p className="text-[11px] text-[#8E9AAB] mb-4">
            Securities compliance mandates standard proof of identity (passport, driver's card) to clear profit payout transfers out of the live exchange registry.
          </p>

          {/* DRAG AND DROP KYC ZONE */}
          <div
            id="kyc-dropzone-box"
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={triggeredFileInputClick}
            className={`cursor-pointer min-h-[160px] border-2 border-dashed rounded-xl p-4 text-center flex flex-col items-center justify-center transition-all ${
              dragActive
                ? 'bg-[#f0b90b]/5 border-[#f0b90b]'
                : kycDocStatus === 'approved'
                ? 'bg-emerald-500/5 border-emerald-500/50'
                : 'bg-zinc-950/40 border-zinc-800 hover:border-zinc-500'
            }`}
          >
            <input
              ref={fileInputRef}
              id="kyc-file-input"
              type="file"
              onChange={handleFileSelect}
              accept="image/*,.pdf"
              className="hidden"
            />

            {kycDocStatus === 'unloaded' && (
              <div className="space-y-2">
                <Upload className="h-8 w-8 text-zinc-500 mx-auto" />
                <span className="text-xs font-bold text-zinc-300 block">Drag & Drop KYC Document</span>
                <p className="text-[10px] text-zinc-500 font-sans">
                  or secondary click here to browse files (JPEG, PDF max 5MB)
                </p>
              </div>
            )}

            {kycDocStatus === 'processing' && (
              <div className="space-y-3 w-full px-4">
                <RefreshCcw className="h-8 w-8 text-[#f0b90b] animate-spin mx-auto" />
                <span className="text-xs font-extrabold text-white block">Parsing document geometry...</span>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-[#f0b90b] transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              </div>
            )}

            {kycDocStatus === 'approved' && (
              <div className="space-y-2">
                <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto" />
                <span className="text-xs font-bold text-white block">Document Successfully Staged!</span>
                <p className="text-[10px] text-emerald-400/90 font-mono italic">
                  {selectedFileName || 'identification_card.jpg'}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#2b2f36]/40 p-3 rounded-xl border border-zinc-800 mt-4 flex items-start gap-2">
          <FileText className="h-5 w-5 text-[#f0b90b] flex-shrink-0 mt-0.5" />
          <div className="text-[10px] text-zinc-500 leading-relaxed font-sans">
            <span className="text-zinc-100 font-bold block mb-0.5 uppercase">Audit compliance details:</span>
            Documents undergo automated biometric checking. Approved files clear account parameters for up to $1,000,000 live leverages.
          </div>
        </div>
      </div>
    </div>
  );
}
