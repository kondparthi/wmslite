import React from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDolly, faPlay } from '@fortawesome/free-solid-svg-icons';

        const PutawayAppointmentSection = () => (
          <>
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4" id="putaway-appointment-section">
{/* Putaway by WebUI */}
<div className="bg-white rounded-xl border border-neutral-200" id="putaway-webui-panel">
<div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
<div className="flex items-center gap-3">
<h2 className="text-sm text-neutral-900 flex items-center gap-2">
<FontAwesomeIcon icon={faDolly} className="text-neutral-700 text-xs" />
                Putaway by WebUI
              </h2>
<span className="text-xs bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-full">8 pending</span>
</div>
<div className="flex items-center gap-2">
<select className="text-xs border border-neutral-200 rounded-lg px-2 py-1.5 text-neutral-600 bg-white focus:outline-none">
<option>All</option>
<option>Pending</option>
<option>In Progress</option>
<option>Completed</option>
</select>
<Link
  to="/wms-lite-inbound"
  className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 text-white rounded-lg text-xs hover:bg-neutral-800"
>
<FontAwesomeIcon icon={faPlay} className="text-xs" />
                Start Putaway
              </Link>
</div>
</div>
<div className="overflow-x-auto">
<table className="w-full text-xs">
<thead>
<tr className="bg-neutral-50 border-b border-neutral-100">
<th className="text-left py-2.5 px-3 text-neutral-500">Task #</th>
<th className="text-left py-2.5 px-3 text-neutral-500">LPN</th>
<th className="text-left py-2.5 px-3 text-neutral-500">SKU</th>
</tr></thead></table></div></div></section>
          </>
        );

        export default PutawayAppointmentSection;
