"""Resend 이메일 발송 서비스"""
import base64

import resend

from app.core.config import settings


def is_email_configured() -> bool:
    return bool(settings.RESEND_API_KEY and settings.RESEND_FROM_EMAIL)


def send_payslip_email(
    to_email: str,
    employee_name: str,
    year: int,
    month: int,
    pdf_bytes: bytes,
) -> None:
    """
    Resend API로 급여명세서 PDF를 첨부하여 이메일 발송
    Raises: ValueError (설정 미구성), Exception (발송 실패)
    """
    if not is_email_configured():
        raise ValueError(
            "이메일 설정이 구성되지 않았습니다. RESEND_API_KEY, RESEND_FROM_EMAIL을 환경변수에 설정해주세요."
        )

    resend.api_key = settings.RESEND_API_KEY

    encoded = base64.b64encode(pdf_bytes).decode()

    params: resend.Emails.SendParams = {
        "from": settings.RESEND_FROM_EMAIL,
        "to": [to_email],
        "subject": f"[메가박스 {settings.STORE_NAME}] {year}년 {month}월 급여명세서",
        "text": (
            f"안녕하세요, {employee_name}님.\n\n"
            f"{year}년 {month}월 급여명세서를 전달드립니다.\n"
            "귀하의 소중한 노고에 진심으로 감사드립니다.\n\n"
            "본 메일은 발신 전용 메일로 회신이 불가하오니,\n"
            "문의사항은 담당 부서를 통해 연락해주시기 바랍니다.\n\n"
            f"감사합니다.\n메가박스 {settings.STORE_NAME} 드림"
        ),
        "attachments": [
            {
                "filename": f"급여명세서_{year}_{month:02d}_{employee_name}.pdf",
                "content": encoded,
            }
        ],
    }

    result = resend.Emails.send(params)

    if not result.get("id"):
        raise Exception(f"Resend 발송 실패: {result}")
