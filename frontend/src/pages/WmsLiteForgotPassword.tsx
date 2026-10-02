import { useState } from "react";
import ForgotPasswordLeftPanel from "@/components/WmsLiteForgotPassword/ForgotPasswordLeftPanel";
import IdentifyUserStep from "@/components/WmsLiteForgotPassword/IdentifyUserStep";
import ResetPasswordStep from "@/components/WmsLiteForgotPassword/ResetPasswordStep";
import VerificationCodeStep from "@/components/WmsLiteForgotPassword/VerificationCodeStep";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleInfo, faWarehouse, faEnvelope, faShieldHalved, faLock } from '@fortawesome/free-solid-svg-icons';

const steps = [
  { key: 1, label: "Identify", icon: faEnvelope },
  { key: 2, label: "Verify", icon: faShieldHalved },
  { key: 3, label: "Reset", icon: faLock },
];

const WmsLiteForgotPassword = () => {
  const [currentStep, setCurrentStep] = useState(1);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex w-full max-w-full">
        <ForgotPasswordLeftPanel />
        <div className="flex flex-col justify-center items-center w-full lg:w-1/2 bg-white px-6 py-12 min-h-[700px] h-[100dvh]" id="forgot-right-panel">
          <div className="flex lg:hidden items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-neutral-900 rounded-lg flex items-center justify-center">
              <FontAwesomeIcon icon={faWarehouse} className="text-white text-lg" />
            </div>
            <span className="text-neutral-900 text-2xl tracking-tight">WMS Lite</span>
          </div>
          <div className="w-full max-w-md space-y-8">

            {/* Step Tab Nav */}
            <div className="flex items-center gap-0 border border-neutral-200 rounded-lg overflow-hidden" id="step-tabs">
              {steps.map((step, idx) => (
                <div key={step.key} className="flex items-center flex-1">
                  <div
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs transition-colors ${
                      currentStep === step.key
                        ? "bg-neutral-900 text-white"
                        : currentStep > step.key
                        ? "bg-emerald-600 text-white"
                        : "bg-white text-neutral-400"
                    }`}
                  >
                    <FontAwesomeIcon icon={step.icon} className="text-xs" />
                    <span>{step.label}</span>
                  </div>
                  {idx < steps.length - 1 && <div className="w-px h-8 bg-neutral-200 flex-shrink-0" />}
                </div>
              ))}
            </div>

            {/* Step Content */}
            {currentStep === 1 && <IdentifyUserStep onNext={() => setCurrentStep(2)} />}
            {currentStep === 2 && <VerificationCodeStep onNext={() => setCurrentStep(3)} onBack={() => setCurrentStep(1)} />}
            {currentStep === 3 && <ResetPasswordStep onBack={() => setCurrentStep(2)} />}

            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 flex gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <FontAwesomeIcon icon={faCircleInfo} className="text-neutral-500 text-sm" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-neutral-700">Need help?</p>
                <p className="text-xs text-neutral-500">Contact your warehouse administrator or Delaplex support if you're unable to recover your account.</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 pt-2">
              <div className="flex items-center gap-4 text-xs text-neutral-400">
                <button className="hover:text-neutral-700">Privacy Policy</button>
                <span>·</span>
                <button className="hover:text-neutral-700">Terms of Use</button>
                <span>·</span>
                <button className="hover:text-neutral-700">Support</button>
              </div>
              <p className="text-xs text-neutral-400">© 2026 WMS Lite by Delaplex</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WmsLiteForgotPassword;
