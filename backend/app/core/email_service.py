"""Naver SMTP 이메일 발송 서비스"""
import smtplib
import ssl
from email import encoders
from email.mime.base import MIMEBase
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings


def is_email_configured() -> bool:
    return bool(settings.NAVER_USER and settings.NAVER_PASSWORD)


def send_payslip_email(
    to_email: str,
    employee_name: str,
    year: int,
    month: int,
    pdf_bytes: bytes,
) -> None:
    """
    Gmail SMTP로 급여명세서 PDF를 첨부하여 이메일 발송
    Raises: ValueError (설정 미구성), smtplib.SMTPException (발송 실패)
    """
    if not is_email_configured():
        raise ValueError("이메일 설정이 구성되지 않았습니다. NAVER_USER, NAVER_PASSWORD를 환경변수에 설정해주세요.")

    msg = MIMEMultipart()
    msg["From"] = settings.NAVER_USER
    msg["To"] = to_email
    msg["Subject"] = f"[Megabox 안산] {year}년 {month}월 급여명세서"

    body = (
        f"안녕하세요, {employee_name}님.\n\n"
        f"{year}년 {month}월 급여명세서를 첨부 파일로 보내드립니다.\n\n"
        "문의사항이 있으시면 관리자에게 연락해 주세요.\n\n"
        "감사합니다.\nMegabox 안산 관리팀"
    )
    msg.attach(MIMEText(body, "plain", "utf-8"))

    attachment = MIMEBase("application", "octet-stream")
    attachment.set_payload(pdf_bytes)
    encoders.encode_base64(attachment)
    attachment.add_header(
        "Content-Disposition",
        f'attachment; filename="payslip_{year}_{month:02d}_{employee_name}.pdf"',
    )
    msg.attach(attachment)

    context = ssl.create_default_context()
    with smtplib.SMTP("smtp.naver.com", 587) as server:
        server.ehlo()
        server.starttls(context=context)
        server.login(settings.NAVER_USER, settings.NAVER_PASSWORD)
        server.sendmail(settings.NAVER_USER, to_email, msg.as_string())
