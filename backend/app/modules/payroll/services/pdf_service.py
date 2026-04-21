"""급여명세서 PDF 생성 서비스 (reportlab + NanumGothic)"""
import io
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from datetime import date as Date
from typing import Optional as Opt

from app.core.config import settings
from app.modules.payroll.schemas import PayrollResponse

# 한글 폰트 등록 (Docker: fonts-nanum 설치 필요)
_FONT_REGISTERED = False
FONT_NAME = "Helvetica"


def _ensure_font():
    global _FONT_REGISTERED, FONT_NAME
    if _FONT_REGISTERED:
        return
    try:
        pdfmetrics.registerFont(
            TTFont("NanumGothic", "/usr/share/fonts/truetype/nanum/NanumGothic.ttf")
        )
        pdfmetrics.registerFont(
            TTFont("NanumGothicBold", "/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf")
        )
        FONT_NAME = "NanumGothic"
        _FONT_REGISTERED = True
    except Exception:
        FONT_NAME = "Helvetica"
        _FONT_REGISTERED = True


def _fmt(n: Optional[int]) -> str:
    if n is None:
        return "-"
    return f"{n:,}"


def generate_payslip_pdf(payroll: PayrollResponse, year: int, month: int, pay_date: Opt[Date] = None) -> bytes:
    """급여명세서 PDF bytes 반환"""
    _ensure_font()
    font = FONT_NAME
    font_bold = "NanumGothicBold" if font == "NanumGothic" else "Helvetica-Bold"

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
    )

    MEGA_COLOR = colors.HexColor("#1A0F3C")
    LIGHT_BG = colors.HexColor("#F8F7FF")
    GREEN = colors.HexColor("#059669")
    RED = colors.HexColor("#DC2626")

    def style(size=9, bold=False, align="LEFT", color=colors.black):
        return ParagraphStyle(
            "s",
            fontName=font_bold if bold else font,
            fontSize=size,
            leading=size * 1.4,
            alignment={"LEFT": 0, "CENTER": 1, "RIGHT": 2}[align],
            textColor=color,
        )

    story = []

    # ── 헤더 ──
    header_data = [
        [
            Paragraph(f"<b>MEGABOX {settings.STORE_NAME}</b>", style(16, bold=True, color=colors.white)),
            Paragraph(f"{year}년 {month}월 급여명세서", style(11, color=colors.white, align="RIGHT")),
        ]
    ]
    header_table = Table(header_data, colWidths=["60%", "40%"])
    header_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), MEGA_COLOR),
            ("TOPPADDING", (0, 0), (-1, -1), 10),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ("LEFTPADDING", (0, 0), (0, -1), 12),
            ("RIGHTPADDING", (-1, 0), (-1, -1), 12),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ])
    )
    story.append(header_table)
    story.append(Spacer(1, 4 * mm))

    # ── 직원 정보 ──
    pay_date_str = str(pay_date) if pay_date else "-"
    info_data = [
        ["성명", payroll.name or "-", "직급", payroll.position or "-"],
        ["입사일", str(payroll.join_date) if payroll.join_date else "-", "은행/계좌", f"{payroll.bank_name or '-'} / {payroll.bank_account or '-'}"],
        ["시급", f"{_fmt(payroll.wage)}원", "급여지급일", pay_date_str],
    ]
    info_table = Table(info_data, colWidths=["18%", "32%", "18%", "32%"])
    info_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), LIGHT_BG),
            ("BACKGROUND", (2, 0), (2, -1), LIGHT_BG),
            ("FONTNAME", (0, 0), (-1, -1), font),
            ("FONTNAME", (0, 0), (0, -1), font_bold),
            ("FONTNAME", (2, 0), (2, -1), font_bold),
            ("FONTSIZE", (0, 0), (-1, -1), 8.5),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ])
    )
    story.append(info_table)
    story.append(Spacer(1, 4 * mm))

    # ── 근무 요약 ──
    story.append(Paragraph("근무 요약", style(10, bold=True, color=MEGA_COLOR)))
    story.append(Spacer(1, 2 * mm))
    work_data = [
        ["근무일수", "총근무시간", "일평균시간"],
        [
            f"{payroll.total_work_days or 0}일",
            f"{round(payroll.total_work_hours or 0, 2)}시간",
            f"{round(payroll.avg_daily_hours or 0, 2)}시간",
        ],
    ]
    work_table = Table(work_data, colWidths=["33%", "33%", "34%"])
    work_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), MEGA_COLOR),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), font_bold),
            ("FONTNAME", (0, 1), (-1, 1), font),
            ("FONTSIZE", (0, 0), (-1, -1), 8.5),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
        ])
    )
    story.append(work_table)
    story.append(Spacer(1, 4 * mm))

    # ── 급여 항목 + 공제 항목 (2열 나란히) ──
    story.append(Paragraph("급여 / 공제 명세", style(10, bold=True, color=MEGA_COLOR)))
    story.append(Spacer(1, 2 * mm))

    pay_rows = [
        ["항목", "시간", "금액", "항목", "금액"],
        ["주간급여", f"{round(payroll.day_hours or 0, 2)}h", _fmt(payroll.day_wage), "건강보험", _fmt(payroll.insurance_health)],
        ["야간급여", f"{round(payroll.night_hours or 0, 2)}h", _fmt(payroll.night_wage), "요양보험", _fmt(payroll.insurance_care)],
        ["주휴수당", f"{round(payroll.weekly_allowance_hours or 0, 2)}h", _fmt(payroll.weekly_allowance_pay), "고용보험", _fmt(payroll.insurance_employment)],
        ["연차수당", f"{round(payroll.annual_leave_hours or 0, 2)}h", _fmt(payroll.annual_leave_pay), "국민연금", _fmt(payroll.insurance_pension)],
        ["공휴일수당", f"{round(payroll.holiday_hours or 0, 2)}h", _fmt(payroll.holiday_pay), "", ""],
        ["근로자의날", f"{round(payroll.labor_day_hours or 0, 2)}h", _fmt(payroll.labor_day_pay), "", ""],
    ]
    pay_table = Table(pay_rows, colWidths=["22%", "14%", "18%", "22%", "24%"])
    pay_table.setStyle(
        TableStyle([
            # 헤더행
            ("BACKGROUND", (0, 0), (2, 0), MEGA_COLOR),
            ("BACKGROUND", (3, 0), (4, 0), RED),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), font_bold),
            # 전체
            ("FONTNAME", (0, 1), (-1, -1), font),
            ("FONTSIZE", (0, 0), (-1, -1), 8.5),
            ("ALIGN", (1, 0), (2, -1), "RIGHT"),
            ("ALIGN", (4, 0), (4, -1), "RIGHT"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT_BG]),
        ])
    )
    story.append(pay_table)
    story.append(Spacer(1, 4 * mm))

    # ── 합계 ──
    summary_data = [
        ["급여총액", "공제계", "실수령액"],
        [
            Paragraph(f"<b>{_fmt(payroll.gross_pay)}원</b>", style(11, bold=True, align="CENTER", color=MEGA_COLOR)),
            Paragraph(f"<b>- {_fmt(payroll.total_deduction)}원</b>", style(11, bold=True, align="CENTER", color=RED)),
            Paragraph(f"<b>{_fmt(payroll.net_pay)}원</b>", style(13, bold=True, align="CENTER", color=GREEN)),
        ],
    ]
    summary_table = Table(summary_data, colWidths=["33%", "33%", "34%"])
    summary_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F3F4F6")),
            ("BACKGROUND", (2, 1), (2, 1), colors.HexColor("#ECFDF5")),
            ("FONTNAME", (0, 0), (-1, 0), font_bold),
            ("FONTSIZE", (0, 0), (-1, 0), 9),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#E5E7EB")),
            ("BOX", (2, 0), (2, 1), 1.5, GREEN),
        ])
    )
    story.append(summary_table)

    doc.build(story)
    return buffer.getvalue()
