import React from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClock as faClockRegular } from '@fortawesome/free-regular-svg-icons';
import { faArrowLeft, faCircleCheck, faEnvelopeOpenText } from '@fortawesome/free-solid-svg-icons';

const VerificationCodeStep = ({
  onNext,
  onBack,
}: {
  onNext?: () => void;
  onBack?: () => void;
}) => {
  return (
    <>
      <div className="space-y-6" id="step-2">
        <div className="flex items-center gap-3 p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
          <div className="w-10 h-10 bg-neutral-900 rounded-lg flex items-center justify-center flex-shrink-0">
            <FontAwesomeIcon icon={faEnvelopeOpenText} className="text-white text-sm" />
          </div>
          <div>
            <p className="text-sm text-neutral-900">Verification code sent</p>
            <p className="text-xs text-neutral-500">Check your inbox at <span className="text-neutral-900">j*****@delaplex.com</span></p>
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-neutral-900 text-xl">Enter Verification Code</h3>
          <p className="text-neutral-500 text-sm">A 6-digit code was sent to your registered email. It expires in 10 minutes.</p>
        </div>
        <div className="space-y-1.5">
          <label className="block text-sm text-neutral-700">6-Digit OTP Code</label>
          <div className="flex gap-2">
            <input className="w-full py-3 border-2 border-neutral-900 rounded-lg text-center text-lg text-neutral-900 focus:outline-none" maxLength={1} type="text" defaultValue="4" />
            <input className="w-full py-3 border border-neutral-300 rounded-lg text-center text-lg text-neutral-900 focus:outline-none" maxLength={1} type="text" defaultValue="8" />
            <input className="w-full py-3 border border-neutral-300 rounded-lg text-center text-lg text-neutral-900 focus:outline-none" maxLength={1} type="text" defaultValue="2" />
            <input className="w-full py-3 border border-neutral-300 rounded-lg text-center text-lg text-neutral-900 focus:outline-none" maxLength={1} type="text" defaultValue="" />
            <input className="w-full py-3 border border-neutral-300 rounded-lg text-center text-lg text-neutral-900 focus:outline-none" maxLength={1} type="text" defaultValue="" />
            <input className="w-full py-3 border border-neutral-300 rounded-lg text-center text-lg text-neutral-900 focus:outline-none" maxLength={1} type="text" defaultValue="" />
          </div>
          <p className="text-xs text-neutral-400">Enter the code exactly as received — it is case-sensitive</p>
        </div>
        <div className="flex items-center justify-between text-xs text-neutral-500">
          <div className="flex items-center gap-1.5">
            <FontAwesomeIcon icon={faClockRegular} className="text-xs" />
            <span>Code expires in <span className="text-neutral-900">09:42</span></span>
          </div>
          <button className="text-neutral-900 underline underline-offset-2 text-xs" type="button">Resend Code</button>
        </div>
        <button
          type="button"
          onClick={() => onNext && onNext()}
          className="w-full bg-neutral-900 text-white py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-neutral-700 transition-colors"
        >
          <FontAwesomeIcon icon={faCircleCheck} className="text-sm" />
          Verify Code
        </button>
        <button
          className="w-full border border-neutral-300 text-neutral-700 py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-neutral-50 transition-colors"
          type="button"
          onClick={() => onBack && onBack()}
        >
          <FontAwesomeIcon icon={faArrowLeft} className="text-sm" />
          Back
        </button>
      </div>
    </>
  );
};

export default VerificationCodeStep;