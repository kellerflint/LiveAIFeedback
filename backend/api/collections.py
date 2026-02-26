from fastapi import APIRouter, Depends, HTTPException, Query
from typing import List
from api.admin_auth import get_current_admin
from db.collection_repo import CollectionRepository
from models.schemas import Collection, CollectionCreate, CollectionRename

from datetime import datetime, timezone

router = APIRouter()

@router.get("/collections")
async def get_collections(current_user: dict = Depends(get_current_admin)):
    return await CollectionRepository.get_all()

@router.post("/collections")
async def create_collection(body: CollectionCreate, current_user: dict = Depends(get_current_admin)):
    c_id = await CollectionRepository.create(body.name)
    return {"id": c_id, "name": body.name, "created_at": datetime.now(timezone.utc), "question_count": 0}

@router.put("/collections/{collection_id}")
async def rename_collection(collection_id: int, body: CollectionRename, current_user: dict = Depends(get_current_admin)):
    if collection_id == 1:
        raise HTTPException(status_code=400, detail="Cannot rename the Default collection")
    success = await CollectionRepository.rename(collection_id, body.name)
    if not success:
        raise HTTPException(status_code=404, detail="Collection not found")
    return {"message": "Collection renamed"}

@router.delete("/collections/{collection_id}")
async def delete_collection(
    collection_id: int,
    action: str = Query(..., description="'move' or 'delete'"),
    target_id: int = Query(None, description="Target collection ID when action=move"),
    current_user: dict = Depends(get_current_admin)
):
    if collection_id == 1:
        raise HTTPException(status_code=400, detail="Cannot delete the Default collection")

    if action == "move":
        if target_id is None:
            raise HTTPException(status_code=400, detail="target_id is required when action=move")
        if target_id == collection_id:
            raise HTTPException(status_code=400, detail="Cannot move questions to the same collection")
        await CollectionRepository.delete_move(collection_id, target_id)
    elif action == "delete":
        await CollectionRepository.delete_purge(collection_id)
    else:
        raise HTTPException(status_code=400, detail="action must be 'move' or 'delete'")

    return {"message": "Collection deleted"}
