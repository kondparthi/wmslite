"""
Generic CRUD router factory.

Given a SQLAlchemy model + its Create/Update/Read Pydantic schemas, builds a
standard REST router: list, get-by-id, create, update (PATCH), delete.
Used for every Master Data entity so each one doesn't need hand-written
boilerplate CRUD code.
"""
from typing import Type, TypeVar

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db

ModelT = TypeVar("ModelT")


def make_crud_router(
    *,
    model,
    create_schema: Type[BaseModel],
    update_schema: Type[BaseModel],
    read_schema: Type[BaseModel],
    prefix: str,
    tag: str,
) -> APIRouter:
    router = APIRouter(prefix=prefix, tags=[tag])

    @router.get("/", response_model=list[read_schema])
    def list_items(
        skip: int = Query(0, ge=0),
        limit: int = Query(100, ge=1, le=500),
        db: Session = Depends(get_db),
    ):
        return db.query(model).order_by(model.id).offset(skip).limit(limit).all()

    @router.get("/{item_id}", response_model=read_schema)
    def get_item(item_id: int, db: Session = Depends(get_db)):
        item = db.get(model, item_id)
        if not item:
            raise HTTPException(status_code=404, detail=f"{tag} {item_id} not found")
        return item

    @router.post("/", response_model=read_schema, status_code=201)
    def create_item(payload: create_schema, db: Session = Depends(get_db)):
        item = model(**payload.model_dump())
        db.add(item)
        db.commit()
        db.refresh(item)
        return item

    @router.patch("/{item_id}", response_model=read_schema)
    def update_item(item_id: int, payload: update_schema, db: Session = Depends(get_db)):
        item = db.get(model, item_id)
        if not item:
            raise HTTPException(status_code=404, detail=f"{tag} {item_id} not found")
        for field, value in payload.model_dump(exclude_unset=True).items():
            setattr(item, field, value)
        db.commit()
        db.refresh(item)
        return item

    @router.delete("/{item_id}", status_code=204)
    def delete_item(item_id: int, db: Session = Depends(get_db)):
        item = db.get(model, item_id)
        if not item:
            raise HTTPException(status_code=404, detail=f"{tag} {item_id} not found")
        db.delete(item)
        db.commit()
        return None

    return router
