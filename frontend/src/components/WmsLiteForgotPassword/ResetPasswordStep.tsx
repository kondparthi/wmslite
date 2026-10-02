import React from "react";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye as faEyeRegular } from '@fortawesome/free-regular-svg-icons';
import { faArrowLeft, faCircleCheck, faCircleXmark, faLock, faRotateRight } from '@fortawesome/free-solid-svg-icons';

const ResetPasswordStep = ({ onBack }: { onBack?: () => void }) => {
  const navigate = useNavigate();

  const handleReset = () => {
    // After successful reset, return to login
    navigate('/');
  };

  return (
    <>
      <div className="space-y-6" id="step-3">
        <div className="space-y-2">
          <h3 className="text-neutral-900 text-xl">Set New Password</h3>
          <p className="text-neutral-500 text-sm">Create a strong new password for your WMS Lite account. Password must meet the requirements below.</p>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm text-neutral-700">New Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon icon={faLock} className="text-neutral-400 text-sm" />
              </div>
              <input
                className="w-full pl-10 pr-10 py-2.5 border border-neutral-300 rounded-lg text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                placeholder="Enter new password"
                type="password"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer">
                <FontAwesomeIcon icon={faEyeRegular} className="text-neutral-400 text-sm" />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm text-neutral-700">Confirm New Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon icon={faLock} className="text-neutral-400 text-sm" />
              </div>
              <input
                className="w-full pl-10 pr-10 py-2.5 border border-neutral-300 rounded-lg text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                placeholder="Confirm new password"
                type="password"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer">
                <FontAwesomeIcon icon={faEyeRegular} className="text-neutral-400 text-sm" />
              </div>
            </div>
          </div>
          {/* Password Requirements */}
          <div className="space-y-2">
            <p className="text-xs text-neutral-500">Password requirements:</p>
            <div className="space-y-1.5">
              {[
                { met: true, label: "At least 8 characters" },
                { met: true, label: "One uppercase letter" },
                { met: true, label: "One number" },
                { met: false, label: "One special character (!@#$...)" },
              ].map((req) => (
                <div key={req.label} className="flex items-center gap-2">
                  <FontAwesomeIcon
                    icon={req.met ? faCircleCheck : faCircleXmark}
                    className={`text-xs ${req.met ? "text-emerald-500" : "text-neutral-300"}`}
                  />
                  <span className={`text-xs ${req.met ? "text-neutral-700" : "text-neutral-400"}`}>{req.label}</span>
                </div>
              ))}
            </div>
          </div>
          <button
            className="w-full bg-neutral-900 text-white py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-neutral-700 transition-colors"
            type="button"
            onClick={handleReset}
          >
            <FontAwesomeIcon icon={faRotateRight} className="text-sm" />
            Reset Password & Sign In
          </button>
          {onBack && (
            <button
              className="w-full border border-neutral-300 text-neutral-700 py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-neutral-50 transition-colors"
              type="button"
              onClick={onBack}
            >
              <FontAwesomeIcon icon={faArrowLeft} className="text-sm" />
              Back
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default ResetPasswordStep;