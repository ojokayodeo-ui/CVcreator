"""Google Drive integration — creates per-job folders and uploads documents."""
import io
from typing import Optional
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload


SCOPES = [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/userinfo.email",
    "openid",
]


def build_drive_service(token_dict: dict):
    creds = Credentials(
        token=token_dict.get("access_token"),
        refresh_token=token_dict.get("refresh_token"),
        token_uri="https://oauth2.googleapis.com/token",
    )
    return build("drive", "v3", credentials=creds)


def create_folder(service, name: str, parent_id: Optional[str] = None) -> str:
    metadata = {
        "name": name,
        "mimeType": "application/vnd.google-apps.folder",
    }
    if parent_id:
        metadata["parents"] = [parent_id]
    folder = service.files().create(body=metadata, fields="id").execute()
    return folder["id"]


def upload_docx(service, folder_id: str, filename: str, content: bytes) -> str:
    media = MediaIoBaseUpload(
        io.BytesIO(content),
        mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )
    metadata = {"name": filename, "parents": [folder_id]}
    file = service.files().create(body=metadata, media_body=media, fields="id,webViewLink").execute()
    return file.get("webViewLink", "")


def upload_text(service, folder_id: str, filename: str, content: str) -> str:
    media = MediaIoBaseUpload(io.BytesIO(content.encode()), mimetype="text/plain")
    metadata = {"name": filename, "parents": [folder_id]}
    file = service.files().create(body=metadata, media_body=media, fields="id,webViewLink").execute()
    return file.get("webViewLink", "")


def save_job_documents(
    token_dict: dict,
    job_title: str,
    company: str,
    cv_content: bytes,
    cover_letter: str,
    strategy: Optional[str] = None,
) -> str:
    service = build_drive_service(token_dict)

    # Create root app folder if needed
    root_query = "name='AI Job Applications' and mimeType='application/vnd.google-apps.folder' and trashed=false"
    results = service.files().list(q=root_query, fields="files(id)").execute()
    files = results.get("files", [])
    root_id = files[0]["id"] if files else create_folder(service, "AI Job Applications")

    # Create job-specific folder
    folder_name = f"{job_title} @ {company}"
    job_folder_id = create_folder(service, folder_name, parent_id=root_id)

    # Upload documents
    upload_docx(service, job_folder_id, "Optimised_CV.docx", cv_content)
    upload_text(service, job_folder_id, "Cover_Letter.txt", cover_letter)
    if strategy:
        upload_text(service, job_folder_id, "Strategy_Plan.txt", strategy)

    # Return shareable folder link
    service.permissions().create(
        fileId=job_folder_id,
        body={"type": "anyone", "role": "reader"},
    ).execute()
    folder_meta = service.files().get(fileId=job_folder_id, fields="webViewLink").execute()
    return folder_meta.get("webViewLink", "")
