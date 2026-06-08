from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import Response
from ...core.database import get_db
from ...services.document_generator import markdown_to_docx
from ..deps import get_current_user_id

router = APIRouter(prefix="/download", tags=["download"])


@router.get("/{job_id}/cv")
async def download_cv(job_id: str, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    result = db.table("generation_history").select("outputs,job_data").eq("id", job_id).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Not found")

    cv_markdown = result.data[0]["outputs"].get("optimised_cv", "")
    job_title = result.data[0]["job_data"].get("title", "CV")
    docx_bytes = markdown_to_docx(cv_markdown)

    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{job_title}_CV.docx"'},
    )


@router.get("/{job_id}/cover-letter")
async def download_cover_letter(job_id: str, user_id: str = Depends(get_current_user_id)):
    db = get_db()
    result = db.table("generation_history").select("outputs,job_data").eq("id", job_id).eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Not found")

    content = result.data[0]["outputs"].get("cover_letter", "")
    job_title = result.data[0]["job_data"].get("title", "Role")

    return Response(
        content=content.encode(),
        media_type="text/plain",
        headers={"Content-Disposition": f'attachment; filename="{job_title}_Cover_Letter.txt"'},
    )
