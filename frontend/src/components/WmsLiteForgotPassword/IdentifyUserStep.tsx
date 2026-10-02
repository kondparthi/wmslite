import React from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faBuilding, faPaperPlane, faUser } from '@fortawesome/free-solid-svg-icons';
import { Link, useNavigate } from "react-router-dom";

const IdentifyUserStep = ({ onNext }: { onNext?: () => void }) => {
  const navigate = useNavigate();

  const handleSubmit = (event) => {
    event.preventDefault();
    if (onNext) onNext();
  };

  const handleBackClick = () => {
    navigate('/');
  };

  return (
    <>
      <div className="space-y-6" id="step-1">
        <div className="space-y-2">
          <h2 className="text-neutral-900 text-3xl">Forgot Password?</h2>
          <p className="text-neutral-500 text-sm">
            Enter your email or username and we'll send you a verification code to reset your password.
          </p>
        </div>
        <form className="space-y-5" id="identify-form" onSubmit={handleSubmit}>
          {/* Warehouse / Tenant ID */}
          <div className="space-y-1.5">
            <label className="block text-sm text-neutral-700">Warehouse / Tenant ID</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon icon={faBuilding} className="text-neutral-400 text-sm" />
              </div>
              <input
                className="w-full pl-10 pr-4 py-2.5 border border-neutral-300 rounded-lg text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                placeholder="e.g. DELAPLEX-WH01"
                type="text"
              />
            </div>
            <p className="text-xs text-neutral-400">Your organization\'s unique warehouse identifier</p>
          </div>
          {/* Email / Username */}
          <div className="space-y-1.5">
            <label className="block text-sm text-neutral-700">Email or Username</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FontAwesomeIcon icon={faUser} className="text-neutral-400 text-sm" />
              </div>
              <input
                className="w-full pl-10 pr-4 py-2.5 border border-neutral-300 rounded-lg text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900 focus:border-transparent"
                placeholder="Enter your registered email or username"
                type="text"
              />
            </div>
          </div>
          {/* Recovery Method */}
          <div className="space-y-2">
            <label className="block text-sm text-neutral-700">Recovery Method</label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center gap-3 border-2 border-neutral-900 rounded-lg p-3 cursor-pointer bg-neutral-50">
                <div className="w-4 h-4 rounded-full border-2 border-neutral-900 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 h-2 rounded-full bg-neutral-900"></div>
                </div>
                <div>
                  <p className="text-xs text-neutral-900">Email OTP</p>
                  <p className="text-xs text-neutral-500">Send code to email</p>
                </div>
              </label>
              <label className="flex items-center gap-3 border border-neutral-200 rounded-lg p-3 cursor-pointer bg-white">
                <div className="w-4 h-4 rounded-full border-2 border-neutral-300 flex items-center justify-center flex-shrink-0"></div>
                <div>
                  <p className="text-xs text-neutral-700">Admin Reset</p>
                  <p className="text-xs text-neutral-400">Contact administrator</p>
                </div>
              </label>
            </div>
          </div>
          {/* Submit Button */}
          <button
            className="w-full bg-neutral-900 text-white py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-neutral-700 transition-colors"
            type="submit"
          >
            <FontAwesomeIcon icon={faPaperPlane} className="text-sm" />
            Send Verification Code
          </button>
        </form>
        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-neutral-200"></div>
          <span className="text-xs text-neutral-400">or</span>
          <div className="flex-1 h-px bg-neutral-200"></div>
        </div>
        {/* Back to Login */}
        <button
          className="w-full border border-neutral-300 text-neutral-700 py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-neutral-50 transition-colors"
          type="button"
          onClick={handleBackClick}
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-sm" />
          Back to Sign In
        </button>
      </div>
    </>
  );
};

export default IdentifyUserStep;
