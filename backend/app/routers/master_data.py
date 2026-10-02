"""
Master Data API — one CRUD router per sub-module, combined into a single
APIRouter mounted at /api/master-data in main.py.
"""
from fastapi import APIRouter

from app.models import master_data as m
from app.schemas import master_data as s
from app.routers.generic_crud import make_crud_router

router = APIRouter()

router.include_router(make_crud_router(
    model=m.Location, create_schema=s.LocationCreate, update_schema=s.LocationUpdate,
    read_schema=s.LocationRead, prefix="/locations", tag="Location Master",
))

router.include_router(make_crud_router(
    model=m.Material, create_schema=s.MaterialCreate, update_schema=s.MaterialUpdate,
    read_schema=s.MaterialRead, prefix="/materials", tag="Material Master",
))

router.include_router(make_crud_router(
    model=m.MaterialOwner, create_schema=s.MaterialOwnerCreate, update_schema=s.MaterialOwnerUpdate,
    read_schema=s.MaterialOwnerRead, prefix="/material-owners", tag="Material Owner",
))

router.include_router(make_crud_router(
    model=m.MaterialPackkey, create_schema=s.MaterialPackkeyCreate, update_schema=s.MaterialPackkeyUpdate,
    read_schema=s.MaterialPackkeyRead, prefix="/material-packkeys", tag="Material Packkey",
))

router.include_router(make_crud_router(
    model=m.Supplier, create_schema=s.SupplierCreate, update_schema=s.SupplierUpdate,
    read_schema=s.SupplierRead, prefix="/suppliers", tag="Supplier",
))

router.include_router(make_crud_router(
    model=m.ZoneArea, create_schema=s.ZoneAreaCreate, update_schema=s.ZoneAreaUpdate,
    read_schema=s.ZoneAreaRead, prefix="/zones", tag="Zone/Area",
))

router.include_router(make_crud_router(
    model=m.ShipToFrom, create_schema=s.ShipToFromCreate, update_schema=s.ShipToFromUpdate,
    read_schema=s.ShipToFromRead, prefix="/ship-to-from", tag="Ship To/From",
))

router.include_router(make_crud_router(
    model=m.Carrier, create_schema=s.CarrierCreate, update_schema=s.CarrierUpdate,
    read_schema=s.CarrierRead, prefix="/carriers", tag="Carrier/Bill To",
))

router.include_router(make_crud_router(
    model=m.AssignedLocation, create_schema=s.AssignedLocationCreate, update_schema=s.AssignedLocationUpdate,
    read_schema=s.AssignedLocationRead, prefix="/assigned-locations", tag="Assigned Locations",
))

router.include_router(make_crud_router(
    model=m.ReplenishmentRule, create_schema=s.ReplenishmentRuleCreate, update_schema=s.ReplenishmentRuleUpdate,
    read_schema=s.ReplenishmentRuleRead, prefix="/replenishment-rules", tag="Replenishment Rules",
))

router.include_router(make_crud_router(
    model=m.OutboundLot, create_schema=s.OutboundLotCreate, update_schema=s.OutboundLotUpdate,
    read_schema=s.OutboundLotRead, prefix="/outbound-lots", tag="Outbound LOT",
))
