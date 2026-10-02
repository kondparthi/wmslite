import React from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faLock, faShieldHalved } from '@fortawesome/free-solid-svg-icons';

        const StepTabsNav = () => (
          <>
            <div className="flex items-center gap-0 border border-neutral-200 rounded-lg overflow-hidden" id="step-tabs">
<div className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-neutral-900 text-white text-xs">
<FontAwesomeIcon icon={faEnvelope} className="text-xs" />
<span>Identify</span>
</div>
<div className="w-px h-8 bg-neutral-200"></div>
<div className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white text-neutral-400 text-xs">
<FontAwesomeIcon icon={faShieldHalved} className="text-xs" />
<span>Verify</span>
</div>
<div className="w-px h-8 bg-neutral-200"></div>
<div className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white text-neutral-400 text-xs">
<FontAwesomeIcon icon={faLock} className="text-xs" />
<span>Reset</span>
</div>
</div>
          </>
        );

        export default StepTabsNav;
