import React from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShieldHalved, faWarehouse } from '@fortawesome/free-solid-svg-icons';

        const ForgotPasswordLeftPanel = () => (
          <>
            <div className="hidden lg:flex flex-col justify-between w-1/2 bg-neutral-900 p-12 h-[100dvh] min-h-[700px]" id="forgot-left-panel">
{/* Logo */}
<div className="flex items-center gap-3">
<div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
<FontAwesomeIcon icon={faWarehouse} className="text-neutral-900 text-lg" />
</div>
<span className="text-white text-2xl tracking-tight">WMS Lite</span>
</div>
{/* Center Content */}
<div className="space-y-8">
<div className="space-y-4">
<div className="w-16 h-1 bg-white rounded-full"></div>
<h1 className="text-white text-4xl leading-tight">Account<br/>Recovery</h1>
<p className="text-neutral-400 text-lg leading-relaxed max-w-md">
          Regain access to your WMS Lite account securely. Follow the steps to verify your identity and reset your credentials.
        </p>
</div>
{/* Steps Overview */}
<div className="space-y-5">
<div className="flex items-start gap-4">
<div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 mt-0.5">
<span className="text-neutral-900 text-xs">1</span>
</div>
<div>
<p className="text-white text-sm">Enter your email or username</p>
<p className="text-neutral-500 text-xs">Provide the account identifier associated with your WMS Lite account</p>
</div>
</div>
<div className="w-px h-4 bg-neutral-700 ml-4"></div>
<div className="flex items-start gap-4">
<div className="w-8 h-8 rounded-full bg-neutral-700 border border-neutral-600 flex items-center justify-center flex-shrink-0 mt-0.5">
<span className="text-neutral-400 text-xs">2</span>
</div>
<div>
<p className="text-neutral-400 text-sm">Verify your identity</p>
<p className="text-neutral-600 text-xs">Check your email for a one-time verification code</p>
</div>
</div>
<div className="w-px h-4 bg-neutral-700 ml-4"></div>
<div className="flex items-start gap-4">
<div className="w-8 h-8 rounded-full bg-neutral-700 border border-neutral-600 flex items-center justify-center flex-shrink-0 mt-0.5">
<span className="text-neutral-400 text-xs">3</span>
</div>
<div>
<p className="text-neutral-400 text-sm">Reset your password</p>
<p className="text-neutral-600 text-xs">Create a new secure password to regain access</p>
</div>
</div>
</div>
</div>
{/* Footer */}
<div className="space-y-3">
<div className="flex items-center gap-2">
<div className="w-6 h-6 rounded-full bg-neutral-700 flex items-center justify-center">
<FontAwesomeIcon icon={faShieldHalved} className="text-neutral-400 text-xs" />
</div>
<span className="text-neutral-500 text-xs">Enterprise-grade security &amp; compliance</span>
</div>
<p className="text-neutral-700 text-xs">© 2026 WMS Lite by Delaplex. All rights reserved.</p>
</div>
</div>
          </>
        );

        export default ForgotPasswordLeftPanel;
