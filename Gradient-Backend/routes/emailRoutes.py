from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import List
import base64
import mimetypes

from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email import encoders

from service.gmailService import get_gmail_service

router = APIRouter(prefix="/email", tags=["Email"])

@router.post("/send")
async def send_email_with_attachments(
    to: str = Form(...),
    subject: str = Form(...),
    body: str = Form(...),
    attachments: List[UploadFile] = File(default=[])
):
    """
    Send email with attachments via Gmail API
    """
    try:
        # Build a proper multipart MIME message so Gmail can deliver attachments.
        message = MIMEMultipart()
        message["to"] = to
        message["subject"] = subject
        message.attach(MIMEText(body or "", "plain", "utf-8"))

        saved_files: List[str] = []
        for upload in attachments or []:
            if not upload:
                continue
            filename = upload.filename or "attachment"
            saved_files.append(filename)

            data = await upload.read()
            mime_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
            maintype, subtype = mime_type.split("/", 1)

            part = MIMEBase(maintype, subtype)
            part.set_payload(data)
            encoders.encode_base64(part)
            part.add_header("Content-Disposition", "attachment", filename=filename)
            message.attach(part)

        raw = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")

        service = get_gmail_service()
        result = (
            service.users()
            .messages()
            .send(userId="me", body={"raw": raw})
            .execute()
        )

        return JSONResponse(
            {
                "success": True,
                "message": f"Email sent to {to}",
                "attachments_count": len(saved_files),
                "attachments": saved_files,
                "gmail_result": result,
            }
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
