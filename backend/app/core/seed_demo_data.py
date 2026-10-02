"""
Demo/test data for Inventory, Purchase Orders and ASNs — so the Dashboard,
Inbound and Inventory screens aren't empty on first run while the client
tries them out.

Safety rules, checked in this order:
  1. If InventoryBalance/PurchaseOrder/ASN already have any rows, do
     nothing — never re-seed or duplicate on every restart.
  2. Master-data rows (locations, materials, suppliers, carriers) are only
     invented here if those tables are completely empty. If the client has
     already entered real Master Data, this reuses their real rows instead
     of adding fake ones next to them.
  3. Everything created here can be deleted later from the normal Master
     Data / Inventory / Inbound screens (or the DB) once real operational
     data replaces it — nothing is hardcoded to depend on it existing.
"""
from datetime import datetime, timedelta

from app.core.database import SessionLocal
from app.models import inbound_ops as ib
from app.models import master_data as md
from app.models import operations as ops
from app.models import outbound_ops as ob
from app.models import labor_ops as lb
from app.models import billing_ops as bl
from app.models import shipping_ops as sh
from app.models import yard_ops as yd
from app.models import slotting_ops as sl
from app.models import returns_ops as rt
from app.models import crossdock_ops as cd
from app.models import replenishment_ops as rp
from app.models import notification_ops as nt
from app.models import admin_config as ac
from app.models.auth import User
from app.routers.crossdock_ops import _next_number as _cd_next_number
from app.routers.replenishment_ops import _next_number as _rp_next_number
from app.routers.slotting_ops import _misplaced_materials


def seed_demo_data() -> None:
    db = SessionLocal()
    try:
        if (
            db.query(ops.InventoryBalance).count() > 0
            or db.query(ops.PurchaseOrder).count() > 0
            or db.query(ops.ASN).count() > 0
        ):
            return  # already seeded, or the client already has real operational data

        # --- Locations (+ zones) ---
        if db.query(md.Location).count() == 0:
            zone_a = md.ZoneArea(code="ZONE-A", name="Zone A - Bulk Storage", zone_type="Bulk", status="Active")
            zone_b = md.ZoneArea(code="ZONE-B", name="Zone B - Pick Face", zone_type="Pick", status="Active")
            db.add_all([zone_a, zone_b])
            db.flush()
            locations = [
                md.Location(code="A-01-01", description="Zone A Rack 1 Bin 1", zone_id=zone_a.id, aisle="A", rack="01", level="1", bin="01", location_type="Storage"),
                md.Location(code="A-01-02", description="Zone A Rack 1 Bin 2", zone_id=zone_a.id, aisle="A", rack="01", level="1", bin="02", location_type="Storage"),
                md.Location(code="B-02-01", description="Zone B Rack 2 Bin 1", zone_id=zone_b.id, aisle="B", rack="02", level="1", bin="01", location_type="Pick Face"),
                md.Location(code="B-02-02", description="Zone B Rack 2 Bin 2", zone_id=zone_b.id, aisle="B", rack="02", level="1", bin="02", location_type="Pick Face"),
            ]
            db.add_all(locations)
            db.flush()
        else:
            locations = db.query(md.Location).limit(4).all()

        # --- Material owner ---
        if db.query(md.MaterialOwner).count() == 0:
            owner = md.MaterialOwner(code="DELAPLEX", name="Delaplex Inc.", status="Active")
            db.add(owner)
            db.flush()
        else:
            owner = db.query(md.MaterialOwner).first()

        # --- Materials ---
        if db.query(md.Material).count() == 0:
            owner_id = owner.id if owner else None
            materials = [
                md.Material(sku="TS-001", description="Cotton T-Shirt Blue L", category="Apparel", uom="PCS", reorder_point=100, owner_id=owner_id),
                md.Material(sku="HD-042", description="Premium Hoodie Grey M", category="Apparel", uom="PCS", reorder_point=50, owner_id=owner_id),
                md.Material(sku="JK-089", description="Winter Jacket Black XL", category="Apparel", uom="PCS", reorder_point=30, owner_id=owner_id),
                md.Material(sku="CP-015", description="Baseball Cap Red", category="Accessories", uom="PCS", reorder_point=200, owner_id=owner_id),
                md.Material(sku="SK-102", description="Running Socks Pack of 3", category="Accessories", uom="PK", reorder_point=100, owner_id=owner_id),
            ]
            db.add_all(materials)
            db.flush()
        else:
            materials = db.query(md.Material).limit(5).all()

        # --- Suppliers ---
        if db.query(md.Supplier).count() == 0:
            suppliers = [
                md.Supplier(code="SUP-ALLIED", name="Allied Packaging", status="Active"),
                md.Supplier(code="SUP-FASTCOMP", name="FastComp GmbH", status="Active"),
                md.Supplier(code="SUP-PACIFIC", name="Pacific Supplies", status="Active"),
            ]
            db.add_all(suppliers)
            db.flush()
        else:
            suppliers = db.query(md.Supplier).limit(3).all()

        # --- Carriers ---
        if db.query(md.Carrier).count() == 0:
            carriers = [
                md.Carrier(code="CAR-FEDEX", name="FedEx", mode="Parcel", status="Active"),
                md.Carrier(code="CAR-DHL", name="DHL", mode="Parcel", status="Active"),
            ]
            db.add_all(carriers)
            db.flush()
        else:
            carriers = db.query(md.Carrier).limit(2).all()

        if not locations or not materials or not suppliers:
            return  # not enough reference data to build demo rows against

        # --- Inventory balances ---
        on_hand_vals = [450, 210, 85, 1200, 560]
        allocated_vals = [120, 50, 10, 300, 0]
        balances = []
        for i, mat in enumerate(materials):
            loc = locations[i % len(locations)]
            balances.append(ops.InventoryBalance(
                material_id=mat.id, location_id=loc.id,
                on_hand=on_hand_vals[i % len(on_hand_vals)],
                allocated=allocated_vals[i % len(allocated_vals)],
                uom=mat.uom or "EA",
            ))
        db.add_all(balances)

        # --- Purchase Orders ---
        now = datetime.utcnow()
        pos = [
            ops.PurchaseOrder(po_number="PO-4421", supplier_id=suppliers[0].id, order_date=now - timedelta(days=3), expected_date=now + timedelta(days=2), lines=8, qty_ordered=1240, qty_received=860, total_value=12400, status="Partial"),
            ops.PurchaseOrder(po_number="PO-4418", supplier_id=suppliers[1 % len(suppliers)].id, order_date=now - timedelta(days=3), expected_date=now + timedelta(days=4), lines=12, qty_ordered=3600, qty_received=0, total_value=54000, status="Open"),
            ops.PurchaseOrder(po_number="PO-4415", supplier_id=suppliers[2 % len(suppliers)].id, order_date=now - timedelta(days=4), expected_date=now - timedelta(days=1), lines=5, qty_ordered=820, qty_received=820, total_value=9840, status="Closed"),
        ]
        db.add_all(pos)

        # --- ASNs ---
        owner_id = owner.id if owner else None
        asns = [
            ops.ASN(asn_number="ASN-2026-0841", supplier_id=suppliers[0].id, po_reference="PO-4421", carrier_id=(carriers[0].id if carriers else None), material_owner_id=owner_id, expected_date=now + timedelta(days=1), tracking_number="FX-78432912", dock_door="DOCK-01", lines=8, qty_expected=1240, qty_received=860, status="In Progress"),
            ops.ASN(asn_number="ASN-2026-0840", supplier_id=suppliers[1 % len(suppliers)].id, po_reference="PO-4418", carrier_id=(carriers[1 % len(carriers)].id if carriers else None), material_owner_id=owner_id, expected_date=now + timedelta(days=2), tracking_number="DH-19284455", dock_door="DOCK-02", lines=12, qty_expected=3600, qty_received=0, status="Open"),
            ops.ASN(asn_number="ASN-2026-0839", supplier_id=suppliers[2 % len(suppliers)].id, po_reference="PO-4415", carrier_id=(carriers[0].id if carriers else None), material_owner_id=owner_id, expected_date=now - timedelta(days=1), tracking_number="UP-22341100", dock_door="DOCK-01", lines=5, qty_expected=820, qty_received=820, status="Received"),
        ]
        db.add_all(asns)
        db.flush()

        # --- Inventory transactions (Transactions / Movement / Adjustment / Update tabs) ---
        transactions = [
            ops.InventoryTransaction(txn_type="Receipt", material_id=materials[0].id, location_id=locations[0].id, qty=450, reference="ASN-2026-0839", status="Completed", created_at=now - timedelta(days=1)),
            ops.InventoryTransaction(txn_type="Adjustment", material_id=materials[1].id, location_id=locations[1 % len(locations)].id, qty=-2, reason="Damaged Packaging", status="Completed", created_at=now - timedelta(hours=20)),
            ops.InventoryTransaction(txn_type="Transfer", material_id=materials[2].id, location_id=locations[2 % len(locations)].id, to_location_id=locations[0].id, qty=10, reference="Replenishment", status="Completed", created_at=now - timedelta(hours=10)),
            ops.InventoryTransaction(txn_type="Transfer", material_id=materials[3].id, location_id=locations[3 % len(locations)].id, to_location_id=locations[1 % len(locations)].id, qty=25, reference="Bin consolidation", status="In Transit", created_at=now - timedelta(hours=2)),
        ]
        db.add_all(transactions)

        # --- Holds ---
        holds = [
            ops.InventoryHold(material_id=materials[0].id, location_id=locations[0].id, qty=20, reason="Quality Control", status="Active", created_at=now - timedelta(days=1)),
            ops.InventoryHold(material_id=materials[1].id, location_id=locations[1 % len(locations)].id, qty=10, reason="Wrong Label", status="Released", created_at=now - timedelta(days=2), released_at=now - timedelta(days=1)),
        ]
        db.add_all(holds)
        # Reflect the active hold in its balance row so Available adds up correctly.
        active_hold_bal = db.query(ops.InventoryBalance).filter_by(material_id=materials[0].id, location_id=locations[0].id).first()
        if active_hold_bal:
            active_hold_bal.on_hold = (active_hold_bal.on_hold or 0) + 20

        # --- Cycle count plans ---
        plans = [
            ops.CycleCountPlan(name="Weekly Zone A Count", scope_description="Zone A", method="Web UI", status="In Progress", total_items=len(materials), variance=1),
            ops.CycleCountPlan(name="High Value Items", scope_description="All zones — top SKUs", method="RF Gun", status="Pending", total_items=0, variance=0),
        ]
        db.add_all(plans)

        # --- Kitting order (uses the first material as a stand-in "kit SKU") ---
        import json as _json
        kitting = ops.KittingOrder(
            order_number="KIT-101",
            kit_material_id=materials[0].id,
            qty=50,
            components_json=_json.dumps([
                {"material_id": materials[1].id, "qty_per_kit": 1},
                {"material_id": materials[3].id, "qty_per_kit": 2},
            ]),
            status="Production",
            priority="High",
        )
        db.add(kitting)

        # --- Putaway strategies ---
        strategies = [
            ib.PutawayStrategy(name="Fixed Location", priority=1, zone="Zone A", rule_type="SKU-Based", condition_text="SKU has a fixed slot", status="Active", usage_count=184),
            ib.PutawayStrategy(name="Nearest Empty", priority=2, zone="All", rule_type="Proximity", condition_text="No fixed slot — fallback", status="Active", usage_count=92),
            ib.PutawayStrategy(name="Bulk Overflow", priority=3, zone="Zone B", rule_type="Capacity", condition_text="Qty exceeds pallet threshold", status="Inactive", usage_count=0),
        ]
        db.add_all(strategies)

        # --- Inbound receipts + their auto-generated putaway tasks ---
        receipts = [
            ib.InboundReceipt(asn_id=asns[0].id, material_id=materials[0].id, lpn="LPN-00441", qty=120, condition="Good", received_by="J. Hartwell", created_at=now - timedelta(hours=6)),
            ib.InboundReceipt(asn_id=asns[0].id, material_id=materials[1].id, lpn="LPN-00442", qty=85, condition="Good", received_by="J. Hartwell", created_at=now - timedelta(hours=5)),
            ib.InboundReceipt(asn_id=asns[2].id, material_id=materials[2].id, lpn="LPN-00443", qty=60, condition="QC Hold", received_by="R. Patel", created_at=now - timedelta(days=1)),
        ]
        db.add_all(receipts)
        db.flush()

        tasks = [
            ib.PutawayTask(receipt_id=receipts[0].id, material_id=receipts[0].material_id, qty=receipts[0].qty, suggested_location_id=locations[0].id, priority="Medium", assignee="J. Hartwell", status="Pending"),
            ib.PutawayTask(receipt_id=receipts[1].id, material_id=receipts[1].material_id, qty=receipts[1].qty, suggested_location_id=locations[1 % len(locations)].id, confirmed_location_id=locations[1 % len(locations)].id, priority="Medium", assignee="M. Singh", status="Completed", completed_at=now - timedelta(hours=4)),
            ib.PutawayTask(receipt_id=receipts[2].id, material_id=receipts[2].material_id, qty=receipts[2].qty, suggested_location_id=locations[2 % len(locations)].id, priority="High", assignee="Unassigned", status="Pending"),
        ]
        db.add_all(tasks)

        # --- Inbound appointments ---
        appts = [
            ib.InboundAppointment(supplier_id=suppliers[0].id, asn_id=asns[0].id, appt_date=now + timedelta(hours=3), dock_door="DOCK-01", driver_name="Mike R.", vehicle_plate="TX-4421", status="Confirmed"),
            ib.InboundAppointment(supplier_id=suppliers[1 % len(suppliers)].id, asn_id=asns[1].id, appt_date=now + timedelta(days=1), dock_door="DOCK-02", driver_name="Hans B.", vehicle_plate="EU-7721", status="Scheduled"),
            ib.InboundAppointment(supplier_id=suppliers[2 % len(suppliers)].id, asn_id=asns[2].id, appt_date=now - timedelta(days=1), dock_door="DOCK-01", driver_name="Chen L.", vehicle_plate="PA-0039", status="Completed"),
        ]
        db.add_all(appts)

        # --- Inbound tasks (general work queue) ---
        inbound_tasks = [
            ib.InboundTask(task_type="Receive", asn_id=asns[1].id, assignee="J. Hartwell", zone="Dock-01", priority="High", status="In Progress", due_at=now + timedelta(hours=2)),
            ib.InboundTask(task_type="QC Check", asn_id=asns[2].id, assignee="R. Patel", zone="QC Hold", priority="Medium", status="Pending", due_at=now + timedelta(hours=5)),
            ib.InboundTask(task_type="Count", assignee="T. Williams", zone="Zone C", priority="Low", status="Completed", due_at=now - timedelta(days=1)),
            ib.InboundTask(task_type="Receive", asn_id=asns[1].id, assignee="Unassigned", zone="Dock-02", priority="High", status="Pending", due_at=now - timedelta(hours=12)),
        ]
        db.add_all(inbound_tasks)

        db.commit()
    finally:
        db.close()


def seed_outbound_demo_data() -> None:
    """Independent guard from seed_demo_data() above — Outbound didn't exist
    yet when that function's guard (InventoryBalance/PurchaseOrder/ASN
    counts) was written, so re-using that guard would have silently skipped
    Outbound demo data forever on any DB that already had Inbound/Inventory
    data seeded. Reuses whatever Master Data (materials, locations,
    carriers, ship-to parties) already exists rather than inventing more."""
    db = SessionLocal()
    try:
        if db.query(ob.ShipmentOrder).count() > 0:
            return

        materials = db.query(md.Material).order_by(md.Material.id).limit(5).all()
        locations = db.query(md.Location).order_by(md.Location.id).all()
        carriers = db.query(md.Carrier).order_by(md.Carrier.id).all()
        ship_tos = db.query(md.ShipToFrom).filter(md.ShipToFrom.party_type == "Ship To").all()
        if not materials or not locations:
            return  # no Master Data at all yet — nothing sensible to seed against

        now = datetime.utcnow()

        # Make sure there's stock on hand to allocate against (reuses an
        # existing balance row if one already covers a material; only tops
        # up when a material has no stock anywhere yet).
        for i, mat in enumerate(materials):
            has_stock = db.query(ops.InventoryBalance).filter(ops.InventoryBalance.material_id == mat.id, ops.InventoryBalance.on_hand > 0).first()
            if not has_stock:
                loc = locations[i % len(locations)]
                bal = db.query(ops.InventoryBalance).filter_by(material_id=mat.id, location_id=loc.id).first()
                if not bal:
                    bal = ops.InventoryBalance(material_id=mat.id, location_id=loc.id, on_hand=0, allocated=0, on_hold=0)
                    db.add(bal)
                    db.flush()
                bal.on_hand = (bal.on_hand or 0) + 250

        carrier_id = carriers[0].id if carriers else None
        carrier_id_2 = carriers[1 % len(carriers)].id if carriers else None
        ship_to_id = ship_tos[0].id if ship_tos else None
        ship_to_id_2 = ship_tos[1 % len(ship_tos)].id if ship_tos else None

        # --- Shipment orders + lines (span the lifecycle: Pending -> Shipped) ---
        o1 = ob.ShipmentOrder(order_number="SO-2026-3001", ship_to_id=ship_to_id, carrier_id=carrier_id, priority="High", required_date=now + timedelta(days=2), status="Pending")
        o2 = ob.ShipmentOrder(order_number="SO-2026-3002", ship_to_id=ship_to_id_2, carrier_id=carrier_id_2, priority="Normal", required_date=now + timedelta(days=3), status="Pending")
        o3 = ob.ShipmentOrder(order_number="SO-2026-3000", ship_to_id=ship_to_id, carrier_id=carrier_id, priority="Urgent", required_date=now - timedelta(days=1), status="Shipped")
        db.add_all([o1, o2, o3])
        db.flush()

        l1 = ob.ShipmentOrderLine(order_id=o1.id, material_id=materials[0].id, qty_ordered=40)
        l2 = ob.ShipmentOrderLine(order_id=o2.id, material_id=materials[1 % len(materials)].id, qty_ordered=15)
        l3 = ob.ShipmentOrderLine(order_id=o3.id, material_id=materials[2 % len(materials)].id, qty_ordered=20, qty_allocated=20, qty_picked=20)
        db.add_all([l1, l2, l3])
        db.flush()

        # o3's line is already fully picked in this seed (representing a completed past order) —
        # give it a matching Allocation row marked Picked, a completed Pack, and a Dispatched Shipment.
        loc_for_l3 = locations[2 % len(locations)]
        alloc3 = ob.OutboundAllocation(order_line_id=l3.id, material_id=l3.material_id, location_id=loc_for_l3.id, qty=20, status="Picked")
        db.add(alloc3)
        db.flush()
        db.add(ob.PickTask(allocation_id=alloc3.id, status="Completed", assignee="S. Okonkwo", completed_at=now - timedelta(hours=20)))
        pack3 = ob.PackageCarton(pack_number="PK-9001", order_id=o3.id, station="Station 2", packer="E. Wilson", qty_items=20, qty_packed=20, status="Packed")
        db.add(pack3)
        db.add(ob.Shipment(ship_number="SH-7001", order_id=o3.id, carrier_id=carrier_id, manifest_number="MNF-2201", weight=48, status="Dispatched", dispatched_at=now - timedelta(hours=18)))

        # --- Allocation strategies ---
        db.add_all([
            ob.AllocationStrategy(name="FEFO", method="FEFO", scope_description="Perishable / lot-tracked materials", status="Active", usage_count=0),
            ob.AllocationStrategy(name="FIFO", method="FIFO", scope_description="General inventory", status="Active", usage_count=1),
            ob.AllocationStrategy(name="Zone-Priority", method="Zone-Priority", scope_description="Fast movers — pick face first", status="Active", usage_count=0),
        ])

        # --- Outbound tasks (general work queue) ---
        db.add_all([
            ob.OutboundTask(task_type="Pack", order_id=o1.id, assignee="Unassigned", zone="Pack-01", priority="Medium", status="Pending", due_at=now + timedelta(hours=6)),
            ob.OutboundTask(task_type="Count", assignee="T. Williams", zone="Zone B", priority="Low", status="Pending", due_at=now + timedelta(days=1)),
        ])

        # --- Outbound appointments (carrier pickups) ---
        db.add_all([
            ob.OutboundAppointment(carrier_id=carrier_id, order_id=o1.id, appt_date=now + timedelta(hours=5), dock_door="DOCK-03", driver_name="A. Reyes", vehicle_plate="TX-9910", status="Confirmed"),
            ob.OutboundAppointment(carrier_id=carrier_id_2, order_id=o2.id, appt_date=now + timedelta(days=1), dock_door="DOCK-02", driver_name="K. Novak", vehicle_plate="EU-3312", status="Scheduled"),
        ])

        db.commit()
    finally:
        db.close()


def seed_labor_demo_data() -> None:
    """Independent guard, same reasoning as seed_outbound_demo_data() above
    — Labor Management didn't exist when seed_demo_data()'s guard was
    written, so reusing it would silently skip Labor seed data forever on an
    already-seeded DB. Doesn't depend on any other module's data."""
    db = SessionLocal()
    try:
        if db.query(lb.Employee).count() > 0:
            return

        now = datetime.utcnow()
        today = now.replace(hour=0, minute=0, second=0, microsecond=0)

        employees = [
            lb.Employee(employee_code="EMP001", first_name="John", last_name="Doe", role="Specialist", department="Outbound", shift="Morning", status="Active", phone="+1-555-0101", email="john.doe@wms.com", skills="Picking, Packing"),
            lb.Employee(employee_code="EMP005", first_name="Sarah", last_name="Smith", role="Associate", department="Outbound", shift="Morning", status="Active", phone="+1-555-0105", email="sarah.smith@wms.com", skills="Packing"),
            lb.Employee(employee_code="EMP009", first_name="Robert", last_name="Brown", role="Lead", department="Inbound", shift="Afternoon", status="On Leave", phone="+1-555-0109", email="robert.brown@wms.com", skills="Receiving, Putaway"),
            lb.Employee(employee_code="EMP012", first_name="Mike", last_name="Johnson", role="Associate", department="Inbound", shift="Morning", status="Active", phone="+1-555-0112", email="mike.johnson@wms.com", skills="Receiving"),
            lb.Employee(employee_code="EMP022", first_name="Emma", last_name="Wilson", role="Specialist", department="Inventory", shift="Morning", status="Active", phone="+1-555-0122", email="emma.wilson@wms.com", skills="Cycle Count, Inventory"),
            lb.Employee(employee_code="EMP031", first_name="James", last_name="Brown", role="Associate", department="Outbound", shift="Night", status="Inactive", phone="+1-555-0131", email="james.brown@wms.com", skills="Putaway"),
        ]
        db.add_all(employees)
        db.flush()
        by_code = {e.employee_code: e for e in employees}

        # --- Today's shift logs (Labor Tracking tab) ---
        db.add_all([
            lb.LaborShiftLog(employee_id=by_code["EMP001"].id, activity="Picking", zone="Zone A", clock_in=today.replace(hour=8), units_completed=120, status="Active"),
            lb.LaborShiftLog(employee_id=by_code["EMP005"].id, activity="Packing", zone="Station 4", clock_in=today.replace(hour=8, minute=15), units_completed=98, status="Active"),
            lb.LaborShiftLog(employee_id=by_code["EMP012"].id, activity="Receiving", zone="Dock 2", clock_in=today.replace(hour=9), units_completed=64, status="Break"),
            lb.LaborShiftLog(employee_id=by_code["EMP022"].id, activity="Cycle Count", zone="Zone C", clock_in=today.replace(hour=8, minute=30), units_completed=45, status="Active"),
        ])

        # --- Attendance records for today (Attendance tab) ---
        db.add_all([
            lb.AttendanceRecord(employee_id=by_code["EMP001"].id, work_date=today, clock_in=today.replace(hour=8), clock_out=None, status="Present"),
            lb.AttendanceRecord(employee_id=by_code["EMP005"].id, work_date=today, clock_in=today.replace(hour=8, minute=15), clock_out=None, status="Present"),
            lb.AttendanceRecord(employee_id=by_code["EMP009"].id, work_date=today, clock_in=None, clock_out=None, status="Absent", notes="On approved leave"),
            lb.AttendanceRecord(employee_id=by_code["EMP012"].id, work_date=today, clock_in=today.replace(hour=9, minute=5), clock_out=None, status="Late"),
            lb.AttendanceRecord(employee_id=by_code["EMP022"].id, work_date=today, clock_in=today.replace(hour=8), clock_out=None, status="Present"),
            lb.AttendanceRecord(employee_id=by_code["EMP031"].id, work_date=today - timedelta(days=1), clock_in=today.replace(hour=20) - timedelta(days=1), clock_out=today.replace(hour=5), status="Present"),
        ])

        # --- Zone allocations (Allocation tab) ---
        db.add_all([
            lb.ZoneAllocation(zone_name="Receiving (Docks)", task_type="Inbound", shift="Morning", assigned=1, capacity=15),
            lb.ZoneAllocation(zone_name="Picking (Aisle 1-20)", task_type="Outbound", shift="Morning", assigned=1, capacity=20),
            lb.ZoneAllocation(zone_name="Packing (Station 1-10)", task_type="Outbound", shift="Morning", assigned=1, capacity=10),
            lb.ZoneAllocation(zone_name="Inventory Control", task_type="Inventory", shift="Morning", assigned=1, capacity=5),
            lb.ZoneAllocation(zone_name="Putaway (Zone B)", task_type="Inbound", shift="Afternoon", assigned=0, capacity=8),
            lb.ZoneAllocation(zone_name="Shipping (Dock 1-5)", task_type="Outbound", shift="Morning", assigned=0, capacity=5),
        ])

        # --- Performance goals (Performance tab — "actual" is computed from LaborShiftLog on the frontend) ---
        db.add_all([
            lb.PerformanceGoal(employee_id=by_code["EMP001"].id, task="Picking", target=110),
            lb.PerformanceGoal(employee_id=by_code["EMP005"].id, task="Packing", target=100),
            lb.PerformanceGoal(employee_id=by_code["EMP012"].id, task="Receiving", target=80),
            lb.PerformanceGoal(employee_id=by_code["EMP022"].id, task="Cycle Count", target=50),
        ])

        db.commit()
    finally:
        db.close()


def seed_billing_demo_data() -> None:
    """Independent guard, same reasoning as seed_outbound_demo_data() and
    seed_labor_demo_data() above — 3PL Billing didn't exist when
    seed_demo_data()'s guard was written, so reusing it would silently skip
    Billing seed data forever on an already-seeded DB. Doesn't depend on any
    other module's data."""
    db = SessionLocal()
    try:
        if db.query(bl.BillingCustomer).count() > 0:
            return

        now = datetime.utcnow()

        customers = [
            bl.BillingCustomer(customer_code="CUST001", name="Global Logistics Inc", contact_name="Anna Chen", email="anna.chen@globallogistics.com", phone="+1-555-0201", billing_cycle="Monthly", currency="USD", payment_terms_days=30, contract_type="Enterprise", status="Active"),
            bl.BillingCustomer(customer_code="CUST002", name="FastTrack Retail", contact_name="Marcus Lee", email="marcus.lee@fasttrackretail.com", phone="+1-555-0202", billing_cycle="Monthly", currency="USD", payment_terms_days=15, contract_type="Standard", status="Active"),
            bl.BillingCustomer(customer_code="CUST003", name="Echo Electronics", contact_name="Priya Nair", email="priya.nair@echoelectronics.com", phone="+1-555-0203", billing_cycle="Bi-Weekly", currency="USD", payment_terms_days=30, contract_type="Premium", status="Active"),
            bl.BillingCustomer(customer_code="CUST004", name="Prime Delivery Co", contact_name="Tom Walsh", email="tom.walsh@primedelivery.com", phone="+1-555-0204", billing_cycle="Monthly", currency="USD", payment_terms_days=30, contract_type="Standard", status="Review"),
            bl.BillingCustomer(customer_code="CUST005", name="Pinnacle Pharma", contact_name="Dr. Lisa Grant", email="lisa.grant@pinnaclepharma.com", phone="+1-555-0205", billing_cycle="Monthly", currency="USD", payment_terms_days=45, contract_type="Enterprise", status="Active"),
        ]
        db.add_all(customers)
        db.flush()
        by_code = {c.customer_code: c for c in customers}

        # --- Rate cards ---
        rate_cards = [
            bl.RateCard(rate_card_code="RC-001", name="Standard Pallet Storage", category="Storage", rate=12.50, unit_of_measure="Pallet/Month", min_qty=0, applicable_scope="All", status="Enabled"),
            bl.RateCard(rate_card_code="RC-002", name="Premium Pallet Storage", category="Storage", rate=18.00, unit_of_measure="Pallet/Month", min_qty=0, applicable_scope="Specific", status="Enabled"),
            bl.RateCard(rate_card_code="RC-003", name="Outbound Pick & Pack", category="Handling", rate=2.25, unit_of_measure="Order", min_qty=0, applicable_scope="All", status="Enabled"),
            bl.RateCard(rate_card_code="RC-004", name="Inbound Receiving", category="Handling", rate=1.75, unit_of_measure="Unit", min_qty=0, applicable_scope="All", status="Enabled"),
            bl.RateCard(rate_card_code="RC-005", name="Kitting / Assembly", category="VAS", rate=3.50, unit_of_measure="Unit", min_qty=0, applicable_scope="Specific", status="Enabled"),
            bl.RateCard(rate_card_code="RC-006", name="Labeling", category="VAS", rate=0.75, unit_of_measure="Unit", min_qty=0, applicable_scope="All", status="Enabled"),
            bl.RateCard(rate_card_code="RC-007", name="Returns Processing", category="Returns", rate=4.00, unit_of_measure="Order", min_qty=0, applicable_scope="All", status="Enabled"),
            bl.RateCard(rate_card_code="RC-008", name="Cold Storage Pallet", category="Storage", rate=22.00, unit_of_measure="Pallet/Month", min_qty=0, applicable_scope="Specific", status="Disabled"),
        ]
        db.add_all(rate_cards)
        db.flush()
        by_rc = {r.rate_card_code: r for r in rate_cards}

        # --- Charge rules ---
        db.add_all([
            bl.ChargeRule(rule_code="CR-001", name="Monthly Storage Charge", trigger_event="Month End", calc_basis="Per Pallet", rate_amount=by_rc["RC-001"].rate, rate_card_id=by_rc["RC-001"].id, priority=1, status="Enabled"),
            bl.ChargeRule(rule_code="CR-002", name="Outbound Order Fee", trigger_event="Outbound Order", calc_basis="Per Order", rate_amount=by_rc["RC-003"].rate, rate_card_id=by_rc["RC-003"].id, priority=2, status="Enabled"),
            bl.ChargeRule(rule_code="CR-003", name="Inbound Receipt Fee", trigger_event="Inbound Receipt", calc_basis="Per Unit", rate_amount=by_rc["RC-004"].rate, rate_card_id=by_rc["RC-004"].id, priority=2, status="Enabled"),
            bl.ChargeRule(rule_code="CR-004", name="Kitting Completion Fee", trigger_event="VAS Complete", calc_basis="Per Unit", rate_amount=by_rc["RC-005"].rate, rate_card_id=by_rc["RC-005"].id, customer_id=by_code["CUST003"].id, priority=3, status="Enabled"),
            bl.ChargeRule(rule_code="CR-005", name="Daily Labeling Charge", trigger_event="Daily EOD", calc_basis="Per Unit", rate_amount=by_rc["RC-006"].rate, rate_card_id=by_rc["RC-006"].id, priority=3, status="Enabled"),
            bl.ChargeRule(rule_code="CR-006", name="Returns Handling Fee", trigger_event="Daily EOD", calc_basis="Per Order", rate_amount=by_rc["RC-007"].rate, rate_card_id=by_rc["RC-007"].id, priority=2, status="Enabled"),
        ])

        # --- Storage billing records (its own ledger — total computed on the frontend) ---
        db.add_all([
            bl.StorageBillingRecord(customer_id=by_code["CUST001"].id, zone="Zone A", pallets=120, days=30, rate_card_id=by_rc["RC-001"].id, rate=by_rc["RC-001"].rate, period_label="Sep 2026"),
            bl.StorageBillingRecord(customer_id=by_code["CUST002"].id, zone="Zone B", pallets=45, days=30, rate_card_id=by_rc["RC-001"].id, rate=by_rc["RC-001"].rate, period_label="Sep 2026"),
            bl.StorageBillingRecord(customer_id=by_code["CUST003"].id, zone="Zone C", pallets=80, days=30, rate_card_id=by_rc["RC-002"].id, rate=by_rc["RC-002"].rate, period_label="Sep 2026"),
            bl.StorageBillingRecord(customer_id=by_code["CUST005"].id, zone="Cold Storage", pallets=30, days=30, rate_card_id=by_rc["RC-002"].id, rate=by_rc["RC-002"].rate, period_label="Sep 2026"),
        ])

        # --- Transactional charges: some already invoiced (history), some open ---
        txn_seq = 4820
        def _txn_code():
            nonlocal txn_seq
            txn_seq += 1
            return f"TXN-{txn_seq:06d}"

        open_charges = [
            bl.TransactionalCharge(txn_code=_txn_code(), customer_id=by_code["CUST001"].id, category="Handling", activity="Outbound Pick", qty=18, unit="Orders", rate=by_rc["RC-003"].rate, total=18 * by_rc["RC-003"].rate, linked_reference="ORD-2291", charge_rule_id=None, occurred_at=now - timedelta(days=1)),
            bl.TransactionalCharge(txn_code=_txn_code(), customer_id=by_code["CUST002"].id, category="Handling", activity="Inbound Receipt", qty=340, unit="Units", rate=by_rc["RC-004"].rate, total=340 * by_rc["RC-004"].rate, linked_reference="ASN-1042", occurred_at=now - timedelta(days=2)),
            bl.TransactionalCharge(txn_code=_txn_code(), customer_id=by_code["CUST003"].id, category="VAS", activity="Kitting", qty=60, unit="Units", rate=by_rc["RC-005"].rate, total=60 * by_rc["RC-005"].rate, linked_reference="VAS-0087", occurred_at=now - timedelta(days=1)),
            bl.TransactionalCharge(txn_code=_txn_code(), customer_id=by_code["CUST004"].id, category="Returns", activity="Returns Processing", qty=7, unit="Orders", rate=by_rc["RC-007"].rate, total=7 * by_rc["RC-007"].rate, linked_reference="RMA-0341", occurred_at=now - timedelta(hours=6)),
            bl.TransactionalCharge(txn_code=_txn_code(), customer_id=by_code["CUST001"].id, category="VAS", activity="Labeling", qty=500, unit="Units", rate=by_rc["RC-006"].rate, total=500 * by_rc["RC-006"].rate, occurred_at=now - timedelta(hours=10)),
        ]
        db.add_all(open_charges)
        db.flush()

        # --- One already-generated invoice (history for Revenue Analytics / Invoices tab) ---
        invoice = bl.Invoice(invoice_number="INV-2026-0001", customer_id=by_code["CUST005"].id, period_label="Aug 2026", issued_date=now - timedelta(days=20), due_date=now + timedelta(days=25), status="Unpaid")
        db.add(invoice)
        db.flush()
        db.add_all([
            bl.InvoiceLine(invoice_id=invoice.id, description="Cold Storage Pallet", qty=30, amount=30 * by_rc["RC-002"].rate),
            bl.InvoiceLine(invoice_id=invoice.id, description="Outbound Pick", qty=22, amount=22 * by_rc["RC-003"].rate),
        ])
        db.flush()
        billed_charge = bl.TransactionalCharge(
            txn_code=_txn_code(), customer_id=by_code["CUST005"].id, category="Handling", activity="Outbound Pick",
            qty=22, unit="Orders", rate=by_rc["RC-003"].rate, total=22 * by_rc["RC-003"].rate,
            linked_reference="ORD-2150", occurred_at=now - timedelta(days=22), invoice_id=invoice.id,
        )
        db.add(billed_charge)

        db.commit()
    finally:
        db.close()


def seed_shipping_demo_data() -> None:
    """Independent guard, same reasoning as the other seed_*_demo_data()
    functions above. Reuses the FedEx/DHL carriers seed_demo_data() already
    created (adding BlueDart/Ecom Express alongside) and the one Shipment
    row seed_outbound_demo_data() created — Shipping Execution's job is to
    add label/manifest/rate data on top of those, not fork new copies."""
    db = SessionLocal()
    try:
        if db.query(sh.Manifest).count() > 0:
            return

        now = datetime.utcnow()

        # --- Carrier integration profiles (extends the existing carriers row) ---
        existing_by_code = {c.code: c for c in db.query(md.Carrier).all()}
        integration_defaults = {
            "CAR-FEDEX": dict(api_status="Connected", account_no="FDX-7729-IN", label_format="ZPL / PDF",
                               tracking_url_template="https://track.fedex.com/track?tracknumbers={tracking}",
                               services="Standard,Priority,Economy", active=True),
            "CAR-DHL": dict(api_status="Connected", account_no="DHL-WH01-MUM", label_format="ZPL / PDF",
                             tracking_url_template="https://track.dhl.com/?trackingNumber={tracking}",
                             services="Express,Economy,Overnight", active=True),
        }
        for code, fields in integration_defaults.items():
            if code in existing_by_code:
                for k, v in fields.items():
                    setattr(existing_by_code[code], k, v)

        new_carriers = []
        if "CAR-BLUEDART" not in existing_by_code:
            new_carriers.append(md.Carrier(
                code="CAR-BLUEDART", name="BlueDart", mode="Parcel", status="Active",
                api_status="Error", account_no="BD-221189", label_format="PDF",
                tracking_url_template="https://www.bluedart.com/tracking?trackFor={tracking}",
                services="Next Day,Ground", active=True,
            ))
        if "CAR-ECOMEXPRESS" not in existing_by_code:
            new_carriers.append(md.Carrier(
                code="CAR-ECOMEXPRESS", name="Ecom Express", mode="Parcel", status="Active",
                api_status="Connected", account_no="ECX-99210", label_format="PDF",
                tracking_url_template="https://ecomexpress.in/tracking/?awb_field={tracking}",
                services="Economy,Express", active=True,
            ))
        db.add_all(new_carriers)
        db.flush()

        by_code = {**existing_by_code, **{c.code: c for c in new_carriers}}
        fedex, dhl = by_code.get("CAR-FEDEX"), by_code.get("CAR-DHL")
        bluedart, ecom = by_code.get("CAR-BLUEDART"), by_code.get("CAR-ECOMEXPRESS")

        # --- Carrier rates (Rate Shopping tab computes real quotes from these) ---
        rate_rows = []
        if dhl:
            rate_rows += [
                sh.CarrierRate(carrier_id=dhl.id, service="Express", base_rate=250, per_kg_rate=45, transit_days="1 Day"),
                sh.CarrierRate(carrier_id=dhl.id, service="Economy", base_rate=120, per_kg_rate=22, transit_days="3-5 Days"),
            ]
        if fedex:
            rate_rows += [
                sh.CarrierRate(carrier_id=fedex.id, service="Priority", base_rate=260, per_kg_rate=48, transit_days="1 Day"),
                sh.CarrierRate(carrier_id=fedex.id, service="Standard", base_rate=100, per_kg_rate=29, transit_days="2-3 Days"),
            ]
        if bluedart:
            rate_rows.append(sh.CarrierRate(carrier_id=bluedart.id, service="Next Day", base_rate=180, per_kg_rate=40, transit_days="1 Day"))
        if ecom:
            rate_rows.append(sh.CarrierRate(carrier_id=ecom.id, service="Economy", base_rate=60, per_kg_rate=19, transit_days="3-5 Days"))
        db.add_all(rate_rows)

        # --- Mark the one existing seed Shipment (SH-7001) as label-printed and put it on a closed manifest ---
        # Uses the shipment's OWN carrier_id (whichever carrier seed_demo_data
        # gave it) rather than hardcoding DHL, so the manifest's carrier and
        # the tracking number prefix always agree with the shipment's actual
        # carrier — never a DHL tracking number on a FedEx shipment.
        existing_shipment = db.query(ob.Shipment).filter(ob.Shipment.ship_number == "SH-7001").first()
        shipment_carrier = db.get(md.Carrier, existing_shipment.carrier_id) if existing_shipment and existing_shipment.carrier_id else None
        if existing_shipment and shipment_carrier:
            manifest = sh.Manifest(manifest_number="MFT-2026-001", carrier_id=shipment_carrier.id, status="Open", created_at=now - timedelta(hours=20))
            db.add(manifest)
            db.flush()
            existing_shipment.manifest_id = manifest.id
            existing_shipment.manifest_number = manifest.manifest_number
            existing_shipment.tracking_no = f"{shipment_carrier.code.replace('CAR-', '')}1000700001"
            existing_shipment.label_printed = True
            existing_shipment.service = "Express"
            existing_shipment.pkgs = 3
            manifest.status = "Closed"
            manifest.closed_at = now - timedelta(hours=18)

        db.commit()
    finally:
        db.close()


def seed_yard_demo_data() -> None:
    """Yard Management's 5 tabs: check-ins spread across every lifecycle
    status (so Gate Management's KPI tiles and the aging/carrier-performance
    reports have real, varied data to compute from), a handful of doors in
    every occupancy state, and two shunter moves (one dispatched, one still
    pending)."""
    db = SessionLocal()
    try:
        if db.query(yd.YardCheckIn).count() > 0:
            return
        now = datetime.utcnow()
        carriers = {c.code: c for c in db.query(md.Carrier).all()}
        fedex, dhl = carriers.get("CAR-FEDEX"), carriers.get("CAR-DHL")
        bluedart, ecom = carriers.get("CAR-BLUEDART"), carriers.get("CAR-ECOMEXPRESS")

        checkins = [
            yd.YardCheckIn(pass_id="T-8801", trailer_number="TR-552", carrier_id=fedex.id if fedex else None,
                            transaction_type="Inbound Load", seal_number="S-99201", status="Checked In",
                            zone="Parking Zone A", checked_in_at=now - timedelta(hours=2)),
            yd.YardCheckIn(pass_id="T-8802", trailer_number="TR-102", carrier_id=dhl.id if dhl else None,
                            transaction_type="Outbound Empty", status="At Gate", checked_in_at=now - timedelta(minutes=30)),
            yd.YardCheckIn(pass_id="T-8803", trailer_number="TR-994", carrier_id=bluedart.id if bluedart else None,
                            transaction_type="Inbound Load", seal_number="S-99210", status="Inspected",
                            zone="Loaded Storage", checked_in_at=now - timedelta(hours=26)),
            yd.YardCheckIn(pass_id="T-8804", trailer_number="TR-882", carrier_id=ecom.id if ecom else None,
                            transaction_type="Inbound Load", status="Checked In", zone="Parking Zone B",
                            checked_in_at=now - timedelta(hours=50)),
            yd.YardCheckIn(pass_id="T-8805", trailer_number="TR-771", carrier_id=fedex.id if fedex else None,
                            transaction_type="Inbound Load", status="Checked In", zone="Empty Pool",
                            checked_in_at=now - timedelta(hours=80)),
            yd.YardCheckIn(pass_id="T-8806", trailer_number="TR-330", carrier_id=dhl.id if dhl else None,
                            transaction_type="Drop Trailer", status="Departed",
                            checked_in_at=now - timedelta(hours=6), checked_out_at=now - timedelta(hours=3, minutes=40)),
            yd.YardCheckIn(pass_id="T-8807", trailer_number="TR-440", carrier_id=dhl.id if dhl else None,
                            transaction_type="Inbound Load", status="Departed",
                            checked_in_at=now - timedelta(hours=10), checked_out_at=now - timedelta(hours=7)),
            yd.YardCheckIn(pass_id="T-8808", trailer_number="TR-220", carrier_id=fedex.id if fedex else None,
                            transaction_type="Inbound Load", status="Departed",
                            checked_in_at=now - timedelta(hours=5), checked_out_at=now - timedelta(hours=2, minutes=40)),
        ]
        db.add_all(checkins)
        db.flush()
        by_pass = {c.pass_id: c for c in checkins}

        doors = [
            yd.YardDoor(door_code="D1", status="Occupied", checkin_id=by_pass["T-8801"].id, task_type="Unloading", progress=65),
            yd.YardDoor(door_code="D2", status="Empty"),
            yd.YardDoor(door_code="D3", status="Reserved", checkin_id=by_pass["T-8802"].id, task_type="Outbound Load", progress=0),
            yd.YardDoor(door_code="D4", status="Occupied", checkin_id=by_pass["T-8803"].id, task_type="Unloading", progress=20),
            yd.YardDoor(door_code="D5", status="Empty"),
            yd.YardDoor(door_code="D6", status="Empty"),
        ]
        db.add_all(doors)

        moves = [
            yd.YardMove(move_number="MV-0001", checkin_id=by_pass["T-8802"].id, from_location="Zone A-12",
                        to_location="Dock D-04", priority="Urgent", status="Pending", requested_at=now - timedelta(minutes=20)),
            yd.YardMove(move_number="MV-0002", checkin_id=by_pass["T-8804"].id, from_location="Dock D-01",
                        to_location="Zone B-05", priority="Normal", status="In Route", requested_at=now - timedelta(hours=1)),
        ]
        db.add_all(moves)
        db.commit()
    finally:
        db.close()


def seed_slotting_demo_data() -> None:
    """Dynamic Slotting's 5 tabs. Extends Master Data's existing Zone/
    Location/Material/AssignedLocation rows (same "add more rows, don't
    fork a second table" approach Shipping Execution used for Carriers)
    with enough variety — and enough real InventoryTransaction pick-history
    rows — for a genuine ABC classification and a handful of intentionally
    misplaced SKUs, rather than a flat, uninteresting demo state."""
    db = SessionLocal()
    try:
        if db.query(sl.SlottingStrategy).count() > 0:
            return
        now = datetime.utcnow()

        # --- Zones: give the two existing zones a real capacity, add a third ---
        zone_by_code = {z.code: z for z in db.query(md.ZoneArea).all()}
        if zone_by_code.get("ZONE-A") and not zone_by_code["ZONE-A"].capacity_units:
            zone_by_code["ZONE-A"].capacity_units = 2000
        if zone_by_code.get("ZONE-B") and not zone_by_code["ZONE-B"].capacity_units:
            zone_by_code["ZONE-B"].capacity_units = 1800
        if "ZONE-C" not in zone_by_code:
            zone_c = md.ZoneArea(code="ZONE-C", name="Zone C - Cold Storage", zone_type="Cold",
                                  temperature_controlled=True, temperature_min_c=2, temperature_max_c=8,
                                  capacity_units=200, occupancy_pct=0, status="Active")
            db.add(zone_c)
            db.flush()
            zone_by_code["ZONE-C"] = zone_c

        # --- Locations: existing 4 (A-01-01/02 Storage, B-02-01/02 Pick Face) + more ---
        loc_by_code = {l.code: l for l in db.query(md.Location).all()}
        new_locations = [
            ("A-01-03", "Storage", zone_by_code["ZONE-A"].id), ("A-01-04", "Storage", zone_by_code["ZONE-A"].id),
            ("A-01-05", "Storage", zone_by_code["ZONE-A"].id),
            ("B-02-03", "Pick Face", zone_by_code["ZONE-B"].id), ("B-02-04", "Pick Face", zone_by_code["ZONE-B"].id),
            ("B-02-05", "Pick Face", zone_by_code["ZONE-B"].id),
            ("C-03-01", "Storage", zone_by_code["ZONE-C"].id), ("C-03-02", "Storage", zone_by_code["ZONE-C"].id),
        ]
        for code, loc_type, zone_id in new_locations:
            if code not in loc_by_code:
                loc = md.Location(code=code, zone_id=zone_id, location_type=loc_type, status="Active")
                db.add(loc)
                loc_by_code[code] = loc
        db.flush()

        # --- Materials: existing 5 + 7 more for a meaningful ABC spread ---
        mat_by_sku = {m.sku: m for m in db.query(md.Material).all()}
        new_materials = [
            ("SKU-201", "Yoga Mat Purple"), ("SKU-202", "Water Bottle 1L"), ("SKU-203", "Resistance Bands Set"),
            ("SKU-204", "Winter Gloves Black"), ("SKU-205", "Beanie Grey"), ("SKU-206", "Rain Poncho Clear"),
            ("SKU-207", "Thermal Base Layer"),
        ]
        for sku, desc in new_materials:
            if sku not in mat_by_sku:
                mat = md.Material(sku=sku, description=desc, category="Apparel", uom="EA", status="Active")
                db.add(mat)
                mat_by_sku[sku] = mat
        db.flush()

        # --- Assign each material to a location, some intentionally misplaced
        # relative to the pick-count they're about to get, and give each a
        # real on-hand balance (some partial, for the honeycombing report) ---
        # (sku, location_code, pick_count, max_qty, on_hand)
        plan = [
            ("TS-001", "B-02-01", 60, 100, 90),   # A-class, correctly on a Pick Face
            ("HD-042", "A-01-01", 45, 100, 40),   # A-class, misplaced in Storage
            ("JK-089", "A-01-02", 30, 100, 85),   # A-class, misplaced in Storage
            ("CP-015", "B-02-02", 25, 100, 30),   # A-class, correctly on a Pick Face
            ("SK-102", "A-01-03", 20, 100, 95),   # B-class, misplaced in Storage
            ("SKU-201", "B-02-03", 15, 100, 20),  # B-class, correctly on a Pick Face
            ("SKU-202", "A-01-04", 8, 100, 70),   # C-class, correctly in Storage
            ("SKU-203", "B-02-04", 5, 100, 15),   # C-class, misplaced on a Pick Face
            ("SKU-204", "A-01-05", 3, 100, 60),   # C-class, correctly in Storage
            ("SKU-205", "C-03-01", 2, 100, 45),   # C-class, correctly in (cold) Storage
            ("SKU-206", "C-03-02", 0, 100, 80),   # Dead Stock, correctly in (cold) Storage
            ("SKU-207", "B-02-05", 0, 100, 10),   # Dead Stock, misplaced on a Pick Face
        ]
        for sku, loc_code, pick_count, max_qty, on_hand in plan:
            material = mat_by_sku[sku]
            location = loc_by_code[loc_code]
            db.add(md.AssignedLocation(material_id=material.id, location_id=location.id, min_qty=10, max_qty=max_qty, status="Active"))
            db.add(ops.InventoryBalance(material_id=material.id, location_id=location.id, on_hand=on_hand, allocated=0, uom="EA"))
            for i in range(pick_count):
                db.add(ops.InventoryTransaction(
                    txn_type="Shipment", material_id=material.id, location_id=location.id, qty=1,
                    reason="Pick", reference=f"PICKHIST-{material.sku}-{i+1}", status="Completed",
                    created_at=now - timedelta(days=(pick_count - i) % 60, hours=i % 24),
                ))
        db.flush()

        # --- Strategies ---
        db.add_all([
            sl.SlottingStrategy(name="Velocity-Based Fast/Slow Split", base_logic="Velocity-Based", lookback_days=90,
                                 target_zones="ZONE-A,ZONE-B", status="Active"),
            sl.SlottingStrategy(name="Product Affinity Co-Pick", base_logic="Product Affinity", lookback_days=90,
                                 target_zones=None, status="Inactive"),
            sl.SlottingStrategy(name="Hazard Class Segregation", base_logic="Hazard Class", lookback_days=180,
                                 target_zones="ZONE-C", status="Active"),
        ])
        db.flush()
        velocity_strategy = db.query(sl.SlottingStrategy).filter(sl.SlottingStrategy.name == "Velocity-Based Fast/Slow Split").first()

        # --- One simulation already run (real misplaced count from the data
        # just seeded) but not yet applied, so the live demo can apply it. ---
        misplaced = _misplaced_materials(db, ["ZONE-A", "ZONE-B"])
        total_assigned = len(plan)
        efficiency_gain = round(min(len(misplaced) / max(total_assigned, 1) * 100 * 0.6, 35.0), 1)
        labor_saving = round(len(misplaced) * 0.25, 1)
        db.add(sl.SlottingSimulation(
            sim_number="SIM-001", strategy_id=velocity_strategy.id, misplaced_count=len(misplaced),
            efficiency_gain_pct=efficiency_gain, labor_saving_hours=labor_saving, status="Completed",
            created_at=now - timedelta(hours=3),
        ))
        db.commit()
    finally:
        db.close()


def seed_returns_demo_data() -> None:
    """Returns / RMA's 6 tabs. Reuses real Materials already seeded by
    earlier modules (HD-042, TS-001, etc. — same cross-module SKUs Dynamic
    Slotting used) and real ShipmentOrder numbers for order_reference, so
    the Returns Rate report is a genuine RMA-count / order-count ratio
    rather than a fabricated percentage. Adds two new pseudo-locations
    (REFURB-01, DISPOSAL-01) as Disposition targets, matching the mock's
    Repair/Dispose actions, which nothing existing modeled."""
    db = SessionLocal()
    try:
        if db.query(rt.RMARequest).count() > 0:
            return
        now = datetime.utcnow()

        zone_a = db.query(md.ZoneArea).filter(md.ZoneArea.code == "ZONE-A").first()
        loc_by_code = {l.code: l for l in db.query(md.Location).all()}
        for code, loc_type in [("REFURB-01", "Refurb"), ("DISPOSAL-01", "Disposal")]:
            if code not in loc_by_code:
                loc = md.Location(code=code, zone_id=zone_a.id if zone_a else None, location_type=loc_type, status="Active")
                db.add(loc)
                loc_by_code[code] = loc
        db.flush()

        mat_by_sku = {m.sku: m for m in db.query(md.Material).all()}
        orders = {o.order_number: o for o in db.query(ob.ShipmentOrder).all()}
        order_numbers = list(orders.keys()) or [None, None, None]

        def _mk_rma(n, sku, customer, qty, reason, return_type, priority, status, order_ref, days_ago):
            rma = rt.RMARequest(
                rma_number=f"RMA-2026-{str(n).zfill(3)}",
                order_reference=order_ref,
                customer=customer,
                material_id=mat_by_sku[sku].id,
                qty=qty,
                reason=reason,
                return_type=return_type,
                priority=priority,
                status=status,
                created_at=now - timedelta(days=days_ago),
                updated_at=now - timedelta(days=days_ago),
            )
            db.add(rma)
            db.flush()
            return rma

        rma1 = _mk_rma(1, "HD-042", "Priya Nair", 2, "Defective", "Customer Return", "High", "Pending Approval", order_numbers[0], 1)
        rma2 = _mk_rma(2, "TS-001", "Alex Chen", 3, "Wrong Item", "Customer Return", "Medium", "Approved", order_numbers[1 % len(order_numbers)], 2)
        rma3 = _mk_rma(3, "JK-089", "Bright Parcel Co.", 5, "Damaged", "Carrier Damage", "High", "In Transit", order_numbers[2 % len(order_numbers)], 3)
        rma4 = _mk_rma(4, "CP-015", "Maria Gomez", 4, "Not Described", "Customer Return", "Low", "Received", None, 5)
        rma4.received_at = now - timedelta(days=1)

        rma5 = _mk_rma(5, "SK-102", "Northwind Distributors", 10, "Expired", "Expired Product", "Medium", "Inspection", None, 7)
        rma5.received_at = now - timedelta(days=4)
        insp5 = rt.InspectionRecord(inspection_number="INSP-001", rma_id=rma5.id, qty_received=10, inspector="D. Ruiz",
                                     status="Pending", created_at=now - timedelta(days=3))
        db.add(insp5)

        rma6 = _mk_rma(6, "SKU-201", "Priya Nair", 6, "Defective", "Customer Return", "Medium", "Inspection", order_numbers[0], 8)
        rma6.received_at = now - timedelta(days=5)
        insp6 = rt.InspectionRecord(inspection_number="INSP-002", rma_id=rma6.id, qty_received=6, qty_inspected=6,
                                     grade="B - Refurbishable", inspector="D. Ruiz", notes="Casing scuffed, mechanism intact",
                                     status="Graded", created_at=now - timedelta(days=5), inspected_at=now - timedelta(days=2))
        db.add(insp6)
        db.flush()

        # --- RMA-007: fully closed, Disposition completed but NOT yet posted
        # to the ledger (this is the row the live demo posts, showing the
        # Adjustment tab's real InventoryBalance effect). ---
        rma7 = _mk_rma(7, "SKU-203", "Alex Chen", 8, "Damaged", "Customer Return", "Medium", "Closed", order_numbers[1 % len(order_numbers)], 12)
        rma7.received_at = now - timedelta(days=10)
        rma7.closed_at = now - timedelta(hours=6)
        insp7 = rt.InspectionRecord(inspection_number="INSP-003", rma_id=rma7.id, qty_received=8, qty_inspected=8,
                                     grade="A - Resellable", inspector="M. Alvarez", notes="Unopened, resellable as-is",
                                     status="Approved", created_at=now - timedelta(days=10), inspected_at=now - timedelta(days=9))
        db.add(insp7)
        db.flush()
        disp7 = rt.Disposition(disposition_number="DISP-001", rma_id=rma7.id, inspection_id=insp7.id,
                                material_id=mat_by_sku["SKU-203"].id, qty=8, action="Return to Stock",
                                target_location_id=loc_by_code["A-01-01"].id, status="Completed",
                                completed_at=now - timedelta(hours=6))
        db.add(disp7)

        # --- RMA-008: fully closed, Disposition completed AND already
        # posted (a real InventoryTransaction + InventoryBalance write-off
        # already applied), so the ledger shows both a Pending and a
        # Posted row on first load. ---
        rma8 = _mk_rma(8, "SKU-204", "Northwind Distributors", 2, "Expired", "Expired Product", "Low", "Closed", None, 15)
        rma8.received_at = now - timedelta(days=13)
        rma8.closed_at = now - timedelta(days=1)
        insp8 = rt.InspectionRecord(inspection_number="INSP-004", rma_id=rma8.id, qty_received=2, qty_inspected=2,
                                     grade="C - Scrap", inspector="M. Alvarez", notes="Past expiry, unsellable",
                                     status="Approved", created_at=now - timedelta(days=13), inspected_at=now - timedelta(days=12))
        db.add(insp8)
        db.flush()
        disp8 = rt.Disposition(disposition_number="DISP-002", rma_id=rma8.id, inspection_id=insp8.id,
                                material_id=mat_by_sku["SKU-204"].id, qty=2, action="Dispose / Destroy",
                                target_location_id=loc_by_code["DISPOSAL-01"].id, status="Completed",
                                completed_at=now - timedelta(days=1))
        db.add(disp8)
        db.flush()
        txn8 = ops.InventoryTransaction(
            txn_type="Adjustment", material_id=mat_by_sku["SKU-204"].id, location_id=loc_by_code["DISPOSAL-01"].id,
            qty=2, reason=f"Returns disposition {disp8.disposition_number} (Dispose / Destroy)",
            reference=disp8.disposition_number, status="Completed", created_at=now - timedelta(days=1),
        )
        db.add(txn8)
        db.flush()
        disp8.posted_txn_id = txn8.id

        db.commit()
    finally:
        db.close()


def seed_crossdock_demo_data() -> None:
    """Cross Docking's 5 tabs. CrossDockPlan/CrossDockTask are the only new
    tables — everything else reuses Inbound's real unconsumed receipts,
    Outbound's real open order lines, and (read-only) Yard Management's
    real door codes. Staging locations are new rows on Master Data's
    ZoneArea/Location (zone_type "Staging"), same pattern every other
    module used for its own new locations.

    Two receipt/line pairs are left deliberately unmatched — base-seeded
    TS-001 and HD-042 — so the live demo can click "Run Match Engine" and
    actually see it work; two more (a fresh HD-042 receipt against an
    Urgent order, and a zero-inventory CD-301 receipt against its own
    order) are left for "Detect Opportunities" to find live."""
    db = SessionLocal()
    try:
        if db.query(cd.CrossDockPlan).count() > 0:
            return
        now = datetime.utcnow()

        # --- Staging zones + locations (new rows, zone_type "Staging") ---
        stage_specs = [
            ("STAGE-NORTH", "North Staging", "STG-N-01", "STG-N-02"),
            ("STAGE-EAST", "East Staging", "STG-E-01", "STG-E-02"),
            ("STAGE-VIP", "VIP Zone", "STG-V-01", "STG-V-02"),
            ("STAGE-BULK", "Bulk Sorting", "STG-B-01", "STG-B-02"),
        ]
        zone_by_code = {z.code: z for z in db.query(md.ZoneArea).all()}
        loc_by_code = {l.code: l for l in db.query(md.Location).all()}
        for zcode, zname, loc1, loc2 in stage_specs:
            if zcode not in zone_by_code:
                z = md.ZoneArea(code=zcode, name=zname, zone_type="Staging", capacity_units=20, occupancy_pct=0, status="Active")
                db.add(z)
                db.flush()
                zone_by_code[zcode] = z
            for lcode in (loc1, loc2):
                if lcode not in loc_by_code:
                    loc = md.Location(code=lcode, zone_id=zone_by_code[zcode].id, location_type="Staging", status="Active")
                    db.add(loc)
                    loc_by_code[lcode] = loc
        db.flush()

        # --- One new material with zero inventory anywhere, for the Zero
        # Stock Item opportunistic rule to have something real to find ---
        mat_by_sku = {m.sku: m for m in db.query(md.Material).all()}
        if "CD-301" not in mat_by_sku:
            cd301 = md.Material(sku="CD-301", description="Bluetooth Earbuds Pro", category="Electronics", uom="EA", status="Active")
            db.add(cd301)
            db.flush()
            mat_by_sku["CD-301"] = cd301

        suppliers = db.query(md.Supplier).all()
        carriers = db.query(md.Carrier).all()
        owner = db.query(md.MaterialOwner).first()
        ship_tos = db.query(md.ShipToFrom).all()

        # --- A new ASN + its receipts, sitting unconsumed at the dock ---
        asn = ops.ASN(
            asn_number="ASN-2026-0850", supplier_id=suppliers[0].id, po_reference="PO-4430",
            carrier_id=(carriers[0].id if carriers else None), material_owner_id=(owner.id if owner else None),
            expected_date=now, tracking_number="XD-55210873", dock_door="DOCK-03", lines=6,
            qty_expected=139, qty_received=139, status="Received", created_at=now - timedelta(hours=4),
        )
        db.add(asn)
        db.flush()

        receipts = {
            "r_cd301": ib.InboundReceipt(asn_id=asn.id, material_id=mat_by_sku["CD-301"].id, lpn="LPN-00501", qty=50, condition="Good", received_by="M. Alvarez", created_at=now - timedelta(hours=3)),
            "r_hd042": ib.InboundReceipt(asn_id=asn.id, material_id=mat_by_sku["HD-042"].id, lpn="LPN-00502", qty=30, condition="Good", received_by="M. Alvarez", created_at=now - timedelta(hours=3)),
            "r_jk089": ib.InboundReceipt(asn_id=asn.id, material_id=mat_by_sku["JK-089"].id, lpn="LPN-00504", qty=15, condition="Good", received_by="D. Ruiz", created_at=now - timedelta(hours=3)),
            "r_sk102": ib.InboundReceipt(asn_id=asn.id, material_id=mat_by_sku["SK-102"].id, lpn="LPN-00505", qty=10, condition="Good", received_by="D. Ruiz", created_at=now - timedelta(hours=3)),
            "r_cp015": ib.InboundReceipt(asn_id=asn.id, material_id=mat_by_sku["CP-015"].id, lpn="LPN-00506", qty=8, condition="Good", received_by="D. Ruiz", created_at=now - timedelta(hours=3)),
            "r_sku201": ib.InboundReceipt(asn_id=asn.id, material_id=mat_by_sku["SKU-201"].id, lpn="LPN-00507", qty=6, condition="Good", received_by="D. Ruiz", created_at=now - timedelta(hours=3)),
        }
        db.add_all(receipts.values())
        db.flush()

        ship_to_id = ship_tos[0].id if ship_tos else None
        carrier_id = carriers[0].id if carriers else None

        def _mk_order(order_number, priority, sku, qty_ordered):
            order = ob.ShipmentOrder(order_number=order_number, ship_to_id=ship_to_id, carrier_id=carrier_id, priority=priority, required_date=now + timedelta(days=1), status="Pending", created_at=now - timedelta(hours=3))
            db.add(order)
            db.flush()
            line = ob.ShipmentOrderLine(order_id=order.id, material_id=mat_by_sku[sku].id, qty_ordered=qty_ordered)
            db.add(line)
            db.flush()
            return order, line

        order1, line1 = _mk_order("CD-SO-9001", "Urgent", "HD-042", 20)     # High Priority Backorder candidate (r_hd042)
        order2, line2 = _mk_order("CD-SO-9002", "Normal", "CD-301", 40)     # Zero Stock candidate (r_cd301)
        order4, line4 = _mk_order("CD-SO-9004", "Normal", "JK-089", 15)     # historical completed chain (r_jk089)
        order5, line5 = _mk_order("CD-SO-9005", "Normal", "SK-102", 10)     # Staged demo (r_sk102)
        order6, line6 = _mk_order("CD-SO-9006", "Normal", "CP-015", 8)      # In Progress demo (r_cp015)
        order7, line7 = _mk_order("CD-SO-9007", "Normal", "SKU-201", 6)     # Proposed-only demo (r_sku201)

        # --- Opportunistic rules ---
        db.add_all([
            cd.OpportunisticRule(name="High Priority Backorder", rule_type="High Priority Backorder",
                                  description="Any inbound matching a backorder with Urgent or High priority", status="Active"),
            cd.OpportunisticRule(name="Zero Stock Item", rule_type="Zero Stock Item",
                                  description="Direct cross-dock if current on-hand inventory is 0", status="Active"),
        ])

        doors = {d.door_code: d for d in db.query(yd.YardDoor).all()}

        def _mk_plan(receipt_key, line, qty, transfer_type, priority, status="Confirmed", rule=None, confirmed_hours_ago=2):
            plan = cd.CrossDockPlan(
                plan_number=_cd_next_number(db, cd.CrossDockPlan, "CD"), receipt_id=receipts[receipt_key].id,
                order_line_id=line.id, material_id=receipts[receipt_key].material_id, qty=qty,
                match_level="Exact SKU Match", transfer_type=transfer_type, priority=priority, rule_applied=rule,
                status=status, created_at=now - timedelta(hours=3),
                confirmed_at=(now - timedelta(hours=confirmed_hours_ago)) if status == "Confirmed" else None,
            )
            db.add(plan)
            db.flush()
            return plan

        # --- Plan CD-004 (JK-089): full historical round trip, Completed ---
        plan_jk = _mk_plan("r_jk089", line4, 15, "Pure Cross Dock", "Medium", confirmed_hours_ago=3)
        task_jk = cd.CrossDockTask(
            task_number=_cd_next_number(db, cd.CrossDockTask, "CDT"), plan_id=plan_jk.id, material_id=plan_jk.material_id,
            qty=15, lpn="LPN-00504", from_door_id=(doors.get("D1").id if doors.get("D1") else None),
            to_door_id=(doors.get("D4").id if doors.get("D4") else None), current_location_id=loc_by_code["STG-N-01"].id,
            status="Completed", created_at=now - timedelta(hours=3), staged_at=now - timedelta(hours=2, minutes=30), completed_at=now - timedelta(hours=2),
        )
        db.add(task_jk)
        db.flush()
        db.add(ops.InventoryTransaction(
            txn_type="Shipment", material_id=plan_jk.material_id, location_id=loc_by_code["STG-N-01"].id, qty=15,
            reason="Cross-dock direct transfer", reference=task_jk.task_number, status="Completed", created_at=now - timedelta(hours=2),
        ))
        db.add(ob.OutboundAllocation(order_line_id=line4.id, material_id=plan_jk.material_id, location_id=loc_by_code["STG-N-01"].id, qty=15, status="Picked"))
        line4.qty_allocated = 15
        line4.qty_picked = 15
        order4.status = "Picking"

        # --- Plan CD-005 (SK-102): Staged, mid-execution ---
        plan_sk = _mk_plan("r_sk102", line5, 10, "Pure Cross Dock", "Medium", confirmed_hours_ago=1.5)
        db.add(cd.CrossDockTask(
            task_number=_cd_next_number(db, cd.CrossDockTask, "CDT"), plan_id=plan_sk.id, material_id=plan_sk.material_id,
            qty=10, lpn="LPN-00505", from_door_id=(doors.get("D2").id if doors.get("D2") else None),
            to_door_id=(doors.get("D5").id if doors.get("D5") else None), current_location_id=loc_by_code["STG-E-01"].id,
            status="Staged", created_at=now - timedelta(hours=1, minutes=30), staged_at=now - timedelta(hours=1),
        ))

        # --- Plan CD-006 (CP-015): In Progress ---
        plan_cp = _mk_plan("r_cp015", line6, 8, "Pure Cross Dock", "Medium", confirmed_hours_ago=1)
        db.add(cd.CrossDockTask(
            task_number=_cd_next_number(db, cd.CrossDockTask, "CDT"), plan_id=plan_cp.id, material_id=plan_cp.material_id,
            qty=8, lpn="LPN-00506", from_door_id=(doors.get("D3").id if doors.get("D3") else None),
            to_door_id=(doors.get("D6").id if doors.get("D6") else None), current_location_id=loc_by_code["STG-V-01"].id,
            assignee="R. Patel", status="In Progress", created_at=now - timedelta(hours=1), staged_at=now - timedelta(minutes=45),
        ))

        # --- Plan CD-007 (SKU-201): still Proposed, left for a live Confirm demo ---
        _mk_plan("r_sku201", line7, 6, "Pure Cross Dock", "Medium", status="Proposed")

        # r_hd042/line1 and r_cd301/line2 are left with no plan at all, and the
        # base-seeded TS-001/HD-042 receipt+line pairs stay open too — real
        # unmatched leftover quantity on both sides, for "Run Match Engine"
        # and "Detect Opportunities" to find live.

        db.commit()
    finally:
        db.close()


def seed_replenishment_demo_data() -> None:
    """Replenishment's 5 tabs. The only new table is ReplenishmentTask —
    "Replenishment Rules" reuses Master Data's existing ReplenishmentRule
    table (min/max/reorder-point, no forecasting, per client scope) and is
    seeded here since nothing had populated it yet.

    Rules are set against real live InventoryBalance rows already in this
    dataset (from the base seed, Returns, and Cross Docking demo data), so
    the Trigger Monitor tab finds genuine deficits without any fabricated
    numbers: TS-001 and JK-089 at their Pick Face locations are already
    seeded low, SKU-201/SKU-207 are seeded low here, CP-015 is seeded
    healthy (no trigger) for contrast, and SKU-203's rule is left Inactive
    so the trigger monitor correctly skips it. A couple of extra
    InventoryBalance rows are added at real Storage locations so those
    deficits actually have somewhere real to auto-replenish from."""
    db = SessionLocal()
    try:
        if db.query(md.ReplenishmentRule).count() > 0:
            return
        now = datetime.utcnow()
        mat_by_sku = {m.sku: m for m in db.query(md.Material).all()}
        loc_by_code = {l.code: l for l in db.query(md.Location).all()}

        required_skus = ["TS-001", "JK-089", "CP-015", "SKU-201", "SKU-203", "SKU-207"]
        required_locs = ["B-02-01", "B-02-02", "B-02-03", "B-02-04", "B-02-05", "A-01-04", "A-01-05"]
        if any(s not in mat_by_sku for s in required_skus) or any(l not in loc_by_code for l in required_locs):
            return  # earlier module seeds haven't run yet — nothing safe to build this against

        # --- Extra source stock at real Storage locations, so SKU-201 and
        # SKU-207's deficits (below) have a genuine location to pull from ---
        db.add_all([
            ops.InventoryBalance(material_id=mat_by_sku["SKU-201"].id, location_id=loc_by_code["A-01-04"].id, on_hand=80, allocated=0, on_hold=0, uom="EA"),
            ops.InventoryBalance(material_id=mat_by_sku["SKU-207"].id, location_id=loc_by_code["A-01-05"].id, on_hand=40, allocated=0, on_hold=0, uom="EA"),
        ])

        # --- Replenishment rules (Master Data's ReplenishmentRule, reused) ---
        rules = [
            md.ReplenishmentRule(material_id=mat_by_sku["TS-001"].id, location_id=loc_by_code["B-02-01"].id, min_qty=120, max_qty=220, reorder_point=100, status="Active"),
            md.ReplenishmentRule(material_id=mat_by_sku["JK-089"].id, location_id=loc_by_code["B-02-01"].id, min_qty=100, max_qty=180, reorder_point=90, status="Active"),
            md.ReplenishmentRule(material_id=mat_by_sku["CP-015"].id, location_id=loc_by_code["B-02-02"].id, min_qty=500, max_qty=1500, reorder_point=600, status="Active"),
            md.ReplenishmentRule(material_id=mat_by_sku["SKU-201"].id, location_id=loc_by_code["B-02-03"].id, min_qty=25, max_qty=60, reorder_point=25, status="Active"),
            md.ReplenishmentRule(material_id=mat_by_sku["SKU-203"].id, location_id=loc_by_code["B-02-04"].id, min_qty=20, max_qty=50, reorder_point=20, status="Inactive"),
            md.ReplenishmentRule(material_id=mat_by_sku["SKU-207"].id, location_id=loc_by_code["B-02-05"].id, min_qty=15, max_qty=40, reorder_point=15, status="Active"),
        ]
        db.add_all(rules)
        db.flush()

        # --- One historical completed task, so History/Reports aren't empty
        # on first run — mirrors what /replenishment-tasks/complete would
        # actually do (moved SK-102 from A-01-01 storage into B-02... wait,
        # keep it simple and use a completed JK-089 move that already
        # happened before the current rule's deficit reappeared) ---
        rule_jk = next(r for r in rules if r.material_id == mat_by_sku["JK-089"].id)
        hist_task = rp.ReplenishmentTask(
            task_number=_rp_next_number(db, rp.ReplenishmentTask, "RPL-2026"),
            rule_id=rule_jk.id, material_id=mat_by_sku["JK-089"].id,
            from_location_id=loc_by_code["A-01-02"].id, to_location_id=loc_by_code["B-02-01"].id,
            qty_required=15, qty_assigned=15, priority="High", assignee="Raj Kumar",
            status="Completed", created_at=now - timedelta(days=2, hours=3), started_at=now - timedelta(days=2, hours=2, minutes=30),
            completed_at=now - timedelta(days=2, hours=1),
        )
        db.add(hist_task)

        db.commit()
    finally:
        db.close()


def seed_notification_demo_data() -> None:
    """Notifications' 6 tabs. All 5 tables are new (see
    app/models/notification_ops.py) — three of the eight seeded rules use
    a condition_type this build actually checks live against real data
    (low_stock reuses Replenishment's own deficit check, asn_overdue and
    invoice_overdue read real ASN/Invoice rows); the rest are seeded as
    "manual" because nothing elsewhere models e.g. a login-security event
    or a carrier ETA breach, so they can only be fired by hand via "Send
    Test", matching the mock's own manual Test button. A handful of
    historical log rows (including one deliberately Failed, matching the
    mock's own "Failed – SMS" example) are seeded directly so the Log and
    Reports tabs aren't empty on first run."""
    db = SessionLocal()
    try:
        if db.query(nt.NotificationRule).count() > 0:
            return
        now = datetime.utcnow()

        channels = [
            nt.NotificationChannel(type="Email", provider="SMTP – smtp.delaplex.com", from_address="notifications@delaplex-wms.com", status="Active", last_test_at=now - timedelta(hours=1)),
            nt.NotificationChannel(type="SMS", provider="Twilio (+91-Gateway)", from_address="+91-800-XXX-XXXX", status="Active", last_test_at=now - timedelta(days=2)),
            nt.NotificationChannel(type="In-App", provider="Internal WebSocket", from_address="System", status="Active", last_test_at=now),
            nt.NotificationChannel(type="Webhook", provider="Custom HTTP POST", from_address="https://hook.delaplex.com/wms-alerts", status="Inactive"),
        ]
        db.add_all(channels)
        db.flush()

        rule_specs = [
            ("Low Stock Alert", "Inventory", "Inventory below reorder point", "low_stock", "Qty < Reorder Point", "email,inapp", "Warehouse Manager, Supervisor", "Immediate", "High", True),
            ("ASN Overdue Alert", "Inbound", "ASN not received past its expected date", "asn_overdue", "Now > Expected Date", "email,inapp", "Inbound Operator, Supervisor", "Immediate", "Medium", True),
            ("Invoice Overdue", "3PL Billing", "Invoice unpaid past its due date", "invoice_overdue", "Now > Due Date", "email,inapp", "Finance Manager, Admin", "Daily Digest", "Medium", True),
            ("Shipment Delay Alert", "Outbound", "Carrier ETA exceeded by 24h", "manual", "ETA +24 hrs", "email,sms", "Warehouse Manager", "Immediate", "High", True),
            ("Cycle Count Completion", "Inventory", "Cycle count task completed", "manual", "Task status = Completed", "inapp", "Inventory Analyst, Supervisor", "Immediate", "Low", True),
            ("Login Security Alert", "System", "Failed login > 3 attempts", "manual", "Failed attempts >= 3", "email,sms,inapp", "Admin", "Immediate", "Critical", True),
            ("Replenishment Trigger", "Replenishment", "Replenishment task auto-generated", "manual", "Task created", "inapp", "Warehouse Operator", "Immediate", "Medium", False),
            ("Scheduler Failure", "System", "Scheduled job fails", "manual", "Job exit code != 0", "email,sms", "Admin, IT Support", "Immediate", "Critical", True),
        ]
        rules = []
        for i, (name, mod, event, ctype, thresh, chans, recips, freq, prio, active) in enumerate(rule_specs, start=1):
            r = nt.NotificationRule(
                rule_code=f"NR-{str(i).zfill(3)}", name=name, module=mod, event=event, condition_type=ctype,
                threshold=thresh, channels=chans, recipients=recips, frequency=freq, priority=prio, active=active,
                last_triggered_at=now - timedelta(hours=i * 3) if active else None,
            )
            rules.append(r)
        db.add_all(rules)
        db.flush()
        rule_by_name = {r.name: r for r in rules}

        escalations = [
            nt.EscalationRule(esc_code="ESC-001", name="Critical Stock Escalation", rule_id=rule_by_name["Low Stock Alert"].id, escalate_to="Plant Manager", channel="email,sms", delay_minutes=120, active=True),
            nt.EscalationRule(esc_code="ESC-002", name="Security Alert Escalation", rule_id=rule_by_name["Login Security Alert"].id, escalate_to="IT Security Team", channel="sms", delay_minutes=0, active=True),
            nt.EscalationRule(esc_code="ESC-003", name="Scheduler Failure Escalation", rule_id=rule_by_name["Scheduler Failure"].id, escalate_to="CTO, DevOps", channel="email,sms", delay_minutes=30, active=True),
        ]
        db.add_all(escalations)

        digests = [
            nt.DigestSetting(name="Daily Operations Summary", schedule="Daily at 08:00", modules="All", recipients="Warehouse Manager, Supervisors", active=True, last_sent_at=now - timedelta(days=1)),
            nt.DigestSetting(name="Weekly Inventory Report", schedule="Monday at 09:00", modules="Inventory", recipients="Inventory Analyst, Finance", active=True, last_sent_at=now - timedelta(days=7)),
            nt.DigestSetting(name="Monthly Billing Summary", schedule="1st of month at 10:00", modules="3PL Billing", recipients="Finance Manager, Admin", active=True, last_sent_at=now - timedelta(days=20)),
        ]
        db.add_all(digests)
        db.flush()

        log_specs = [
            ("Rule", rule_by_name["Low Stock Alert"], None, "SKU-8821 qty = 4, min = 20", "email,inapp", 2, "Delivered", 6),
            ("Rule", rule_by_name["Login Security Alert"], None, "Unknown user failed 3 times from 203.45.87.12", "email,sms,inapp", 1, "Delivered", 5),
            ("Rule", rule_by_name["ASN Overdue Alert"], None, "ASN-2024-0781 arrived at Dock 3", "email,inapp", 3, "Delivered", 5),
            ("Rule", rule_by_name["Shipment Delay Alert"], None, "ORD-4421 delayed by 48h via Fastway", "email,sms", 1, "Failed", 4),
            ("Rule", rule_by_name["Invoice Overdue"], None, "INV-2026-0094 pending > 24 hrs", "email,inapp", 2, "Delivered", 3),
            ("Rule", rule_by_name["Scheduler Failure"], None, "Job inventory_sync_job failed at 03:15", "email,sms", 2, "Delivered", 1),
        ]
        for i, (kind, rule, esc, detail, chans, recips, status, days_ago) in enumerate(log_specs, start=1):
            db.add(nt.NotificationLogEntry(
                log_code=f"LOG-{str(i).zfill(4)}", kind=kind, rule_id=rule.id if rule else None,
                event_detail=detail, channels=chans, recipients_count=recips, status=status,
                created_at=now - timedelta(days=days_ago, hours=2),
            ))

        db.commit()
    finally:
        db.close()


def seed_admin_config_demo_data() -> None:
    """Admin Configuration's 8 tabs — the 15th and final module. See
    app/models/admin_config.py's docstring for what's reused (User, ZoneArea,
    YardDoor, MaterialOwner, Carrier) vs genuinely new here.

    Runs last in main.py's seed sequence so it can reference real seeded
    Carriers (for the Carrier-linked IntegrationConnector) and real
    Material.category strings (for MaterialCategory's skuCount matching)."""
    db = SessionLocal()
    try:
        if db.query(ac.Warehouse).count() > 0:
            return
        now = datetime.utcnow()

        # --- Warehouses ---
        warehouses = [
            ac.Warehouse(code="WH-001", name="Main Warehouse", city="Mumbai", country="India", sqft=120000, type="General Purpose", temp_class="Ambient", status="Active"),
            ac.Warehouse(code="WH-002", name="Secondary Warehouse", city="Pune", country="India", sqft=60000, type="General Purpose", temp_class="Ambient", status="Active"),
            ac.Warehouse(code="WH-003", name="Cold Storage Facility", city="Delhi", country="India", sqft=20000, type="Cold Storage", temp_class="Refrigerated", status="Active"),
        ]
        db.add_all(warehouses)
        db.flush()
        wh1, wh2, wh3 = warehouses

        # --- Roles (7 levels) ---
        roles = [
            ac.Role(code="SYS_ADMIN", name="System Admin", level="Super", description="Full system access including all configuration", modules="All", status="Active"),
            ac.Role(code="WH_MGR", name="Warehouse Manager", level="Manager", description="Manage all warehouse operations and staff", modules="Dashboard,Inbound,Outbound,Inventory,Labor Management,Reports", status="Active"),
            ac.Role(code="IB_OPR", name="Inbound Operator", level="Operator", description="Receive, putaway, ASN management", modules="Inbound,Inventory", status="Active"),
            ac.Role(code="OB_SUP", name="Outbound Supervisor", level="Supervisor", description="Manage picking, packing and dispatch", modules="Outbound,Inventory,Shipping Execution", status="Active"),
            ac.Role(code="INV_ANL", name="Inventory Analyst", level="Analyst", description="Cycle counts, adjustments, reports", modules="Inventory,Reports", status="Active"),
            ac.Role(code="PL3_ADM", name="3PL Admin", level="Admin", description="Client billing, rate cards, invoicing", modules="3PL Billing,Reports", status="Active"),
            ac.Role(code="READ", name="Read-Only", level="Viewer", description="View-only access across all modules", modules="All", status="Active"),
        ]
        db.add_all(roles)
        db.flush()

        # --- Shift Schedules ---
        shifts = [
            ac.ShiftSchedule(code="DS", name="Day Shift", start_time="07:00", end_time="15:00", break_minutes=30, days_active="Mon,Tue,Wed,Thu,Fri", status="Active"),
            ac.ShiftSchedule(code="ES", name="Evening Shift", start_time="15:00", end_time="23:00", break_minutes=30, days_active="Mon,Tue,Wed,Thu,Fri", status="Active"),
            ac.ShiftSchedule(code="NS", name="Night Shift", start_time="23:00", end_time="07:00", break_minutes=45, days_active="Mon,Tue,Wed,Thu,Fri", status="Active"),
            ac.ShiftSchedule(code="WD", name="Weekend Day", start_time="08:00", end_time="16:00", break_minutes=30, days_active="Sat,Sun", status="Active"),
        ]
        db.add_all(shifts)
        db.flush()
        day_shift = shifts[0]

        # --- Assign the seeded default admin user to WH-001 / Day Shift ---
        admin_user = db.query(User).filter(User.username == "admin").first()
        extra_users = []
        if admin_user:
            admin_user.warehouse_id = wh1.id
            admin_user.shift_id = day_shift.id
            admin_user.mfa_enabled = True
            admin_user.last_login_at = now - timedelta(hours=1)
        if admin_user and db.query(User).count() < 4:
            extra_users = [
                User(tenant_id=admin_user.tenant_id, username="priya.sharma", email="priya.s@delaplex.com", full_name="Priya Sharma", role="Inbound Operator", status="Active", password_hash=admin_user.password_hash, warehouse_id=wh1.id, shift_id=day_shift.id, mfa_enabled=False, last_login_at=now - timedelta(hours=3)),
                User(tenant_id=admin_user.tenant_id, username="ravi.kumar", email="ravi.k@delaplex.com", full_name="Ravi Kumar", role="Inventory Analyst", status="Active", password_hash=admin_user.password_hash, warehouse_id=wh1.id, shift_id=day_shift.id, mfa_enabled=True, last_login_at=now - timedelta(hours=16)),
                User(tenant_id=admin_user.tenant_id, username="sarah.johnson", email="sarah.j@delaplex.com", full_name="Sarah Johnson", role="Outbound Supervisor", status="Active", password_hash=admin_user.password_hash, warehouse_id=wh2.id, shift_id=shifts[1].id, mfa_enabled=False, locked=True, last_login_at=now - timedelta(days=2)),
            ]
            db.add_all(extra_users)
        db.flush()

        # --- Login history ---
        login_rows = [
            ac.LoginHistory(user_id=admin_user.id if admin_user else None, username_attempted="admin", role="Administrator", ip_address="192.168.1.10", device="Chrome / Windows", status="Success", mfa_verified=True, created_at=now - timedelta(hours=1)),
            ac.LoginHistory(username_attempted="unknown", ip_address="203.0.113.45", device="Chrome / Linux", status="Failed", mfa_verified=False, created_at=now - timedelta(hours=2)),
            ac.LoginHistory(user_id=extra_users[2].id if extra_users else None, username_attempted="sarah.johnson", role="Outbound Supervisor", ip_address="192.168.1.22", device="Chrome / Windows", status="Locked", mfa_verified=False, created_at=now - timedelta(days=1)),
            ac.LoginHistory(username_attempted="root", ip_address="198.51.100.12", device="Automated Script", status="Failed", mfa_verified=False, created_at=now - timedelta(hours=20)),
        ]
        db.add_all(login_rows)

        # --- System / Branding settings (singleton, get-or-create pattern) ---
        db.add(ac.SystemSetting(default_warehouse_id=wh1.id))
        db.add(ac.BrandingSetting())

        # --- Module toggles for all 15 real modules ---
        module_specs = [
            ("masterdata", "Master Data", "SKU, Supplier, Customer, Carrier", True, True),
            ("inbound", "Inbound Management", "ASN, Receiving, Putaway", True, True),
            ("inventory", "Inventory Management", "Balance, Adjustments, Cycle Count", True, True),
            ("outbound", "Outbound Management", "Orders, Picking, Dispatch", True, True),
            ("labor", "Labor Management", "Tasks, Productivity, Attendance", True, False),
            ("billing", "3PL Billing", "Rate Cards, Invoicing, Revenue", True, False),
            ("shipping", "Shipping Execution", "Manifests, Rate Shopping, Carrier Integration", True, False),
            ("yard", "Yard Management", "Gate, Dock, Appointment Scheduling", True, False),
            ("slotting", "Dynamic Slotting", "Slotting Rules, ABC Analysis", True, False),
            ("returns", "Returns / RMA", "Inspection, Disposition, Adjustments", True, False),
            ("crossdock", "Cross Docking", "Direct Transfer, Lane Management", True, False),
            ("replenishment", "Replenishment", "Rules, Tasks, Trigger Monitor", True, False),
            ("notifications", "Notifications", "Rules, Channels, Escalations", True, False),
            ("admin", "Admin Configuration", "Users, Settings, Integrations, Security", True, True),
            ("reporting", "Advanced Reporting", "Custom Reports, BI Export", False, False),
        ]
        db.add_all([ac.ModuleToggle(key=k, label=l, description=d, enabled=e, core=c) for k, l, d, e, c in module_specs])

        # --- Numbering sequences (matching prefixes already used live) ---
        seq_specs = [
            ("Inbound", "ASN", "ASN-", "", 426, 4), ("Inbound", "GRN", "GRN-", "", 1129, 4),
            ("Outbound", "Shipment Order", "SO-", "", 1201, 4), ("Outbound", "Shipment", "SH-", "", 7002, 4),
            ("Inventory", "Adjustment", "ADJ-", "", 2848, 4), ("Labor", "Labor Task", "LBR-", "", 212, 4),
            ("Billing", "Invoice", "INV-", "", 68, 4), ("Yard", "Appointment", "APT-", "", 342, 4),
            ("Replenishment", "Replenishment Task", "RPL-2026-", "", 1, 4),
            ("Notifications", "Log Entry", "LOG-", "", 7, 4),
        ]
        db.add_all([ac.NumberingSequence(module=mod, entity=ent, prefix=pre, suffix=suf, next_seq=n, pad_length=p, active=True) for mod, ent, pre, suf, n, p in seq_specs])

        # --- Integration connectors — at least one real Carrier-linked one ---
        fedex = db.query(md.Carrier).filter(md.Carrier.code == "CAR-FEDEX").first()
        dhl = db.query(md.Carrier).filter(md.Carrier.code == "CAR-DHL").first()
        connectors = [
            ac.IntegrationConnector(code="INT-001", name="SAP ERP", type="ERP", protocol="REST API", direction="Bidirectional", sync_freq="Real-time", status="Connected", last_sync_at=now - timedelta(minutes=20), records=1248, errors=0, env="Production"),
            ac.IntegrationConnector(code="INT-002", name="FedEx Ship Manager", type="Carrier", protocol="REST API", direction="Outbound", sync_freq="On-demand", status="Connected", last_sync_at=now - timedelta(hours=1), records=0, errors=0, env="Production", carrier_id=fedex.id if fedex else None),
            ac.IntegrationConnector(code="INT-003", name="DHL Express API", type="Carrier", protocol="REST API", direction="Outbound", sync_freq="On-demand", status="Warning", last_sync_at=now - timedelta(hours=3), records=0, errors=2, env="Production", carrier_id=dhl.id if dhl else None),
            ac.IntegrationConnector(code="INT-004", name="QuickBooks", type="Finance", protocol="REST API", direction="Outbound", sync_freq="Daily", status="Disconnected", last_sync_at=now - timedelta(days=4), records=0, errors=1, env="Staging"),
            ac.IntegrationConnector(code="INT-005", name="Power BI", type="Analytics", protocol="OData", direction="Outbound", sync_freq="Hourly", status="Connected", last_sync_at=now - timedelta(minutes=40), records=5420, errors=0, env="Production"),
        ]
        db.add_all(connectors)
        db.flush()
        db.add_all([
            ac.IntegrationSyncLog(log_code="LOG-0001", connector_id=connectors[0].id, direction="Inbound", type="Scheduled", records=12, status="Success", started_at=now - timedelta(minutes=20), duration_seconds=2.1),
            ac.IntegrationSyncLog(log_code="LOG-0002", connector_id=connectors[2].id, direction="Outbound", type="Scheduled", records=7, status="Failed", started_at=now - timedelta(hours=3), duration_seconds=30.0, error="Timeout — DHL API unavailable"),
            ac.IntegrationSyncLog(log_code="LOG-0003", connector_id=connectors[4].id, direction="Outbound", type="Scheduled", records=5420, status="Success", started_at=now - timedelta(minutes=40), duration_seconds=45.2),
        ])

        # --- Webhooks ---
        db.add_all([
            ac.Webhook(name="Order Received -> WMS", url="https://wms.delaplex.com/api/webhooks/orders", event="order.created", source="Shopify", status="Active", last_triggered_at=now - timedelta(minutes=30), deliveries=216),
            ac.Webhook(name="ASN Confirmed -> ERP", url="https://sap.delaplex.com/api/grn-receive", event="asn.confirmed", source="WMS", status="Active", last_triggered_at=now - timedelta(hours=2), deliveries=88),
            ac.Webhook(name="Stock Alert -> Slack", url="https://hooks.slack.com/services/TXXX/BYYY/ZZZZ", event="stock.below_min", source="WMS", status="Active", last_triggered_at=now - timedelta(days=1), deliveries=12),
        ])

        # --- API keys (masked previews only — no full key retained) ---
        db.add_all([
            ac.ApiKey(name="SAP Integration Key", scope="Read + Write", created_by="Admin", key_preview="wms_live_••••7F2A", expiry_at=now + timedelta(days=180), status="Active", last_used_at=now - timedelta(hours=2)),
            ac.ApiKey(name="Power BI Export", scope="Read Only", created_by="Admin", key_preview="wms_live_••••3C1D", expiry_at=now + timedelta(days=240), status="Active", last_used_at=now - timedelta(hours=5)),
            ac.ApiKey(name="Legacy ERP Key", scope="Read + Write", created_by="Admin", key_preview="wms_live_••••90AB", expiry_at=now - timedelta(days=30), status="Expired", last_used_at=now - timedelta(days=30)),
        ])

        # --- Languages / Date-Time profiles / Currencies / Address formats ---
        db.add_all([
            ac.Language(name="English", native_name="English", code="en", direction="LTR", is_default=True, enabled=True),
            ac.Language(name="Hindi", native_name="हिन्दी", code="hi", direction="LTR", is_default=False, enabled=True),
            ac.Language(name="Arabic", native_name="العربية", code="ar", direction="RTL", is_default=False, enabled=True),
        ])
        db.add_all([
            ac.DateTimeProfile(name="India Standard", timezone="Asia/Kolkata", date_format="DD/MM/YYYY", time_format="24h", week_start="Monday", is_default=True),
            ac.DateTimeProfile(name="US East", timezone="America/New_York", date_format="MM/DD/YYYY", time_format="12h", week_start="Sunday", is_default=False),
            ac.DateTimeProfile(name="UAE / Gulf", timezone="Asia/Dubai", date_format="DD/MM/YYYY", time_format="12h", week_start="Sunday", is_default=False),
        ])
        db.add_all([
            ac.Currency(name="Indian Rupee", code="INR", symbol="₹", decimal_places=2, thousand_sep=",", decimal_sep=".", is_default=True, enabled=True),
            ac.Currency(name="US Dollar", code="USD", symbol="$", decimal_places=2, thousand_sep=",", decimal_sep=".", is_default=False, enabled=True),
            ac.Currency(name="UAE Dirham", code="AED", symbol="د.إ", decimal_places=2, thousand_sep=",", decimal_sep=".", is_default=False, enabled=True),
        ])
        db.add_all([
            ac.AddressFormat(name="India", fields_display="Line1, Line2, City, State, PIN, Country", postal_label="PIN Code", state_label="State", phone_format="+91 XXXXX XXXXX", active=True),
            ac.AddressFormat(name="United States", fields_display="Line1, Line2, City, State, ZIP, Country", postal_label="ZIP Code", state_label="State", phone_format="+1 (XXX) XXX-XXXX", active=True),
            ac.AddressFormat(name="United Arab Emirates", fields_display="Line1, Area, City, Emirate, Country", postal_label="P.O. Box", state_label="Emirate", phone_format="+971 XX XXX XXXX", active=True),
        ])

        # --- Translation entries — some complete, some intentionally partial ---
        translation_specs = [
            ("module.inbound.title", "Navigation", "Inbound", "इनबाउंड", "الوارد"),
            ("module.outbound.title", "Navigation", "Outbound", "आउटबाउंड", "الصادر"),
            ("action.save", "Common", "Save", "सहेजें", "حفظ"),
            ("action.cancel", "Common", "Cancel", "रद्द करें", "إلغاء"),
            ("status.active", "Common", "Active", "सक्रिय", None),
            ("status.inactive", "Common", "Inactive", None, None),
            ("label.asn", "Inbound", "Advance Shipment Notice", "अग्रिम शिपमेंट सूचना", None),
            ("label.picking", "Outbound", "Picking", None, None),
        ]
        db.add_all([ac.TranslationEntry(key=k, module=mod, en=en, hi=hi, ar=ar) for k, mod, en, hi, ar in translation_specs])

        # --- Compliance reports (admin-recorded results, not an automated scanner) ---
        db.add_all([
            ac.ComplianceReport(name="GDPR Data Access Report", standard="GDPR", period="Q2 2026", status="Compliant", last_run_at=now - timedelta(days=13), findings=0, exportable=True),
            ac.ComplianceReport(name="SOC 2 Audit Trail", standard="SOC2", period="H1 2026", status="Compliant", last_run_at=now - timedelta(days=13), findings=0, exportable=True),
            ac.ComplianceReport(name="ISO 27001 Security Review", standard="ISO27001", period="Annual 2026", status="Review Required", last_run_at=now - timedelta(days=29), findings=3, exportable=True),
            ac.ComplianceReport(name="Access Rights Review", standard="Internal", period="Q2 2026", status="Action Needed", last_run_at=now - timedelta(days=14), findings=7, exportable=True),
        ])

        # --- Data classifications ---
        db.add_all([
            ac.DataClassification(name="Highly Confidential", code="HC", color="#EF4444", description="PII, payment data, credentials. Access restricted to admins only.", entities="User Passwords,API Keys,Payment Info", encryption=True, mask_display=True, audit_all=True),
            ac.DataClassification(name="Confidential", code="CONF", color="#F59E0B", description="Business-sensitive data. Access controlled by role.", entities="Billing Rates,Client Contracts,3PL Invoices", encryption=True, mask_display=False, audit_all=True),
            ac.DataClassification(name="Internal", code="INT", color="#009FE3", description="Internal operational data. Visible to all authenticated users.", entities="ASN,GRN,Inventory Balances,Orders", encryption=False, mask_display=False, audit_all=False),
            ac.DataClassification(name="Public", code="PUB", color="#10B981", description="Non-sensitive data. May be shared externally.", entities="Product Names,Carrier List,Zone Names", encryption=False, mask_display=False, audit_all=False),
        ])

        # --- Security policies ---
        db.add_all([
            ac.SecurityPolicy(key="pwd_complexity", name="Password Complexity", description="Minimum 8 chars, 1 uppercase, 1 number, 1 special char", enabled=True),
            ac.SecurityPolicy(key="mfa_admin", name="MFA for Admin Roles", description="Mandatory multi-factor authentication for System Admin and Manager roles", enabled=True),
            ac.SecurityPolicy(key="session_timeout", name="Session Timeout (30 min)", description="Auto-logout after 30 minutes of inactivity", enabled=True),
            ac.SecurityPolicy(key="lockout", name="Failed Login Lockout", description="Account locked after 5 consecutive failed login attempts", enabled=True),
            ac.SecurityPolicy(key="ip_allowlist", name="IP Allowlist Enforcement", description="Restrict admin access to trusted IP ranges only", enabled=False),
            ac.SecurityPolicy(key="audit_all", name="Audit All Data Changes", description="Log every CREATE, UPDATE, DELETE operation across all modules", enabled=True),
            ac.SecurityPolicy(key="export_approval", name="Export Approval Workflow", description="Require manager approval for bulk data exports > 1000 records", enabled=False),
            ac.SecurityPolicy(key="retention_365", name="Data Retention 365 Days", description="Automatically purge operational data older than 365 days", enabled=True),
        ])

        # --- Master Data Config: Material Types, UOM, Pack Keys ---
        db.add_all([
            ac.MaterialType(name="Finished Goods", code="FG", track_expiry=True, track_serial=False, track_batch=True, hazmat=False, cold_chain=False, status="Active"),
            ac.MaterialType(name="Raw Material", code="RM", track_expiry=False, track_serial=False, track_batch=True, hazmat=False, cold_chain=False, status="Active"),
            ac.MaterialType(name="Hazardous Material", code="HAZ", track_expiry=True, track_serial=True, track_batch=True, hazmat=True, cold_chain=False, status="Active"),
            ac.MaterialType(name="Perishable", code="PERISH", track_expiry=True, track_serial=False, track_batch=True, hazmat=False, cold_chain=True, status="Active"),
        ])
        db.add_all([
            ac.UnitOfMeasure(name="Each", abbreviation="EA", type="Count", is_base=True, conversion_factor=1, status="Active"),
            ac.UnitOfMeasure(name="Case", abbreviation="CS", type="Count", is_base=False, conversion_factor=24, status="Active"),
            ac.UnitOfMeasure(name="Pallet", abbreviation="PLT", type="Count", is_base=False, conversion_factor=960, status="Active"),
            ac.UnitOfMeasure(name="Kilogram", abbreviation="KG", type="Weight", is_base=True, conversion_factor=1, status="Active"),
        ])
        db.add_all([
            ac.PackKeyTemplate(name="Single Unit", code="UNIT", inner_pack=1, outer_pack=1, pallet_qty=100, weight=0.5, dimensions="10x10x5 cm", status="Active"),
            ac.PackKeyTemplate(name="Inner Pack 6", code="IP6", inner_pack=6, outer_pack=1, pallet_qty=600, weight=3.2, dimensions="20x15x10 cm", status="Active"),
            ac.PackKeyTemplate(name="Master Carton 24", code="MC24", inner_pack=6, outer_pack=24, pallet_qty=960, weight=12.8, dimensions="40x30x25 cm", status="Active"),
        ])

        # --- Material Categories — matched against real Material.category strings ---
        real_categories = {row[0] for row in db.query(md.Material.category).distinct().all() if row[0]}
        cat_specs = [("Apparel", "APPRL"), ("Accessories", "ACC"), ("Electronics", "ELEC")]
        for name, code in cat_specs:
            if name in real_categories:
                db.add(ac.MaterialCategory(name=name, code=code, status="Active"))
        if not real_categories:
            db.add(ac.MaterialCategory(name="General", code="GEN", status="Active"))

        # --- Material Owner admin fields (type/country) on the real seeded owners ---
        for owner in db.query(md.MaterialOwner).all():
            owner.type = "Internal" if owner.code == "OWN-INT" or "delaplex" in (owner.name or "").lower() else "3PL Client"
            owner.country = owner.country or "India"

        # --- Notification templates (Notifications sub-tab's only new table) ---
        db.add_all([
            ac.NotificationTemplate(tpl_code="TPL-001", name="Low Stock Alert Email", module="Inventory", channel="Email", subject="Low stock: {sku}", body="Inventory for {sku} has fallen below the reorder point.", status="Active"),
            ac.NotificationTemplate(tpl_code="TPL-002", name="ASN Overdue SMS", module="Inbound", channel="SMS", subject=None, body="ASN {asn_number} is overdue. Please follow up with the carrier.", status="Active"),
            ac.NotificationTemplate(tpl_code="TPL-003", name="Invoice Overdue In-App", module="3PL Billing", channel="In-App", subject=None, body="Invoice {invoice_number} is now overdue.", status="Active"),
        ])

        # --- A handful of historical audit-log rows so the tab isn't empty ---
        db.add_all([
            ac.AuditLog(log_code="AUD-0001", username="Admin", role="System Admin", action="Created", entity_type="Warehouse", entity_id=str(wh1.id), module="Admin Configuration", field_detail=f"Warehouse created: {wh1.name}", severity="Info", created_at=now - timedelta(days=3)),
            ac.AuditLog(log_code="AUD-0002", username="Admin", role="System Admin", action="Updated", entity_type="System Setting", entity_id="SYS", module="Admin Configuration", field_detail="Session Timeout: 60 -> 30 min", severity="High", created_at=now - timedelta(days=2)),
            ac.AuditLog(log_code="AUD-0003", username="Unknown", role=None, action="Login Failed", entity_type="User Session", entity_id=None, module="Auth", field_detail="Failed login attempt from unrecognised IP", severity="Critical", created_at=now - timedelta(hours=2)),
        ])

        db.commit()
    finally:
        db.close()


def seed_barcode_config_demo_data() -> None:
    """Admin Configuration's Bar Code Configs tab (9th tab) — seeds the
    label configs that Inbound's Label Generation tab (app/routers/
    label_ops.py) reads live by (module, label_type, active). Also seeds a
    Location Label config (for Master Data location labels, not printed by
    any tab yet) and an Outbound Shipping Label config tied loosely to
    Shipping Execution's existing label_printed flow on Shipment — no
    change to Shipping Execution's own code, this just documents that
    config in the same place."""
    db = SessionLocal()
    try:
        if db.query(ac.BarcodeConfig).count() > 0:
            return
        db.add_all([
            ac.BarcodeConfig(module="Inbound", label_type="Receiving Label", symbology="Code128", label_width_mm=100, label_height_mm=50, fields_included="LPN,Material,Qty,Condition", active=True),
            ac.BarcodeConfig(module="Inbound", label_type="Putaway Label", symbology="Code128", label_width_mm=100, label_height_mm=50, fields_included="LPN,Material,Qty,Destination", active=True),
            ac.BarcodeConfig(module="Outbound", label_type="Shipping Label", symbology="Code128", label_width_mm=100, label_height_mm=150, fields_included="Tracking No,Carrier,Service,Weight", active=True),
            ac.BarcodeConfig(module="Master Data", label_type="Location Label", symbology="QR", label_width_mm=50, label_height_mm=25, fields_included="Location Code,Zone,Aisle", active=True),
        ])
        db.commit()
    finally:
        db.close()


def seed_digital_twin_demo_data() -> None:
    """Dashboard's Digital Twin 2D heatmap floor plan — fills in real
    x/y coordinates for the existing seeded Master Data Location rows so
    the floor plan (app/routers/operations.py's digital-twin/floor-plan
    endpoint) has real spatial data to plot. Additive only: never touches
    a location that already has coordinates, and never invents a location
    that doesn't exist. Layout is a simple grid, one column of bays per
    zone, ordered by location id within each zone — a stand-in for a real
    CAD/rack-layout import, which is out of scope here."""
    db = SessionLocal()
    try:
        locations = (
            db.query(md.Location)
            .filter(md.Location.x_coordinate.is_(None))
            .order_by(md.Location.zone_id, md.Location.id)
            .all()
        )
        if not locations:
            return

        zone_ids = sorted({loc.zone_id for loc in locations if loc.zone_id is not None})
        # Lay zones out left-to-right in aisles ~12 units apart; each
        # zone's own locations stack top-to-bottom ~6 units apart.
        zone_x = {zid: i * 12.0 for i, zid in enumerate(zone_ids)}
        counters: dict[int | None, int] = {}
        for loc in locations:
            zid = loc.zone_id
            row = counters.get(zid, 0)
            counters[zid] = row + 1
            loc.x_coordinate = zone_x.get(zid, len(zone_x) * 12.0)
            loc.y_coordinate = row * 6.0
            loc.z_coordinate = loc.z_coordinate if loc.z_coordinate is not None else 0.0
        db.commit()
    finally:
        db.close()
