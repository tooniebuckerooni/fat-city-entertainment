from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT

GOLD = colors.HexColor("#99790a")
DARK = colors.HexColor("#24242a")
GREY = colors.HexColor("#666666")
LIGHTBG = colors.HexColor("#f7f7f5")

styles = getSampleStyleSheet()
brand = ParagraphStyle("brand", parent=styles["Normal"], fontName="Helvetica-Bold",
                        fontSize=10, textColor=GOLD, spaceAfter=2, tracking=1)
h1 = ParagraphStyle("h1", parent=styles["Title"], fontName="Helvetica-Bold",
                     fontSize=22, textColor=DARK, spaceAfter=6, alignment=TA_LEFT)
h2 = ParagraphStyle("h2", parent=styles["Normal"], fontName="Helvetica",
                     fontSize=13, textColor=GREY, spaceAfter=18, alignment=TA_LEFT)
sectionhead = ParagraphStyle("sectionhead", parent=styles["Normal"], fontName="Helvetica-Bold",
                              fontSize=12, textColor=DARK, spaceBefore=16, spaceAfter=8)
body = ParagraphStyle("body", parent=styles["Normal"], fontName="Helvetica",
                       fontSize=10.5, textColor=DARK, leading=15, spaceAfter=6)
step = ParagraphStyle("step", parent=body, leftIndent=14, spaceAfter=8)
fine = ParagraphStyle("fine", parent=styles["Normal"], fontName="Helvetica",
                       fontSize=8.5, textColor=GREY, leading=12)
codelabel = ParagraphStyle("codelabel", parent=styles["Normal"], fontName="Helvetica-Bold",
                            fontSize=9, textColor=GREY, alignment=TA_CENTER, spaceAfter=4)
codeval = ParagraphStyle("codeval", parent=styles["Normal"], fontName="Courier-Bold",
                          fontSize=22, textColor=DARK, alignment=TA_CENTER)


def code_box(code):
    t = Table(
        [[Paragraph("YOUR REDEMPTION CODE", codelabel)],
         [Paragraph(code, codeval)]],
        colWidths=[4.5 * inch],
    )
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHTBG),
        ("BOX", (0, 0), (-1, -1), 1, GOLD),
        ("TOPPADDING", (0, 0), (-1, 0), 14),
        ("BOTTOMPADDING", (0, 1), (-1, 1), 16),
        ("TOPPADDING", (0, 1), (-1, 1), 2),
    ]))
    return t


def build(filename, product_name, tagline, code, plan_name, steps, after_paragraphs, fine_print):
    doc = SimpleDocTemplate(
        filename, pagesize=letter,
        leftMargin=0.9 * inch, rightMargin=0.9 * inch,
        topMargin=0.8 * inch, bottomMargin=0.8 * inch,
    )
    story = []
    story.append(Paragraph("FAT CITY ENTERTAINMENT", brand))
    story.append(HRFlowable(width="100%", thickness=2, color=GOLD, spaceAfter=14))
    story.append(Paragraph(product_name, h1))
    story.append(Paragraph(tagline, h2))

    story.append(code_box(code))
    story.append(Spacer(1, 18))

    story.append(Paragraph("How to redeem it", sectionhead))
    for i, s in enumerate(steps, 1):
        story.append(Paragraph(f"<b>{i}.</b> {s}", step))

    story.append(Paragraph("What happens after", sectionhead))
    for p in after_paragraphs:
        story.append(Paragraph(p, body))

    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=0.75, color=colors.HexColor("#dddddd"), spaceAfter=10))
    story.append(Paragraph(
        "Questions or trouble redeeming? Email "
        "<a href='mailto:info@fatcityentertainment.com' color='#99790a'>info@fatcityentertainment.com</a> "
        "or call 984-500-3835 (US &amp; Canada) and we'll sort it out.",
        body
    ))
    story.append(Spacer(1, 8))
    story.append(Paragraph(fine_print, fine))

    doc.build(story)
    print("wrote", filename)


PLAN_URL = "bingocardgenerator.online/#pricing"

# ---------------------------------------------------------------- Gold
build(
    "gold-club-bcg2-redemption.pdf",
    "1 Year Free — Bingo Card Generator 2.0",
    "Your bonus with the Music Bingo Gold Club",
    "FCEGOLDYR1",
    "Annual",
    [
        f"Go to <b>{PLAN_URL}</b> and choose the <b>Annual</b> plan.",
        "At checkout, enter your redemption code above in the discount code field.",
        "Complete checkout — your card is charged <b>$0</b> for the first year. "
        "Bingo Card Generator 2.0 unlocks immediately.",
    ],
    [
        "Your first year of Bingo Card Generator 2.0 is completely free. After 12 months, "
        "it <b>automatically renews at the regular Annual price</b> unless you cancel first.",
        "You'll get an email reminder from Bingo Card Generator 2.0 / LemonSqueezy before it renews. "
        "Cancel any time before then from your LemonSqueezy customer portal link (in your "
        "purchase confirmation email) — no phone calls, no questions asked.",
    ],
    "One redemption per customer. This code may be rotated periodically for security — if it "
    "doesn't work, contact us for a current one. Valid for new Bingo Card Generator 2.0 "
    "subscriptions only.",
)

# ---------------------------------------------------------------- Silver
build(
    "silver-club-bcg2-redemption.pdf",
    "1 Month Free — Bingo Card Generator 2.0",
    "Your bonus with the Music Bingo Silver Club",
    "FCESILVMO1",
    "Monthly",
    [
        f"Go to <b>{PLAN_URL}</b> and choose the <b>Monthly</b> plan.",
        "At checkout, enter your redemption code above in the discount code field.",
        "Complete checkout — your card is charged <b>$0</b> for the first month. "
        "Bingo Card Generator 2.0 unlocks immediately.",
    ],
    [
        "Your first month of Bingo Card Generator 2.0 is completely free. After 30 days, it "
        "<b>automatically renews at the regular Monthly price</b> unless you cancel first.",
        "You'll get an email reminder from Bingo Card Generator 2.0 / LemonSqueezy before it renews. "
        "Cancel any time before then from your LemonSqueezy customer portal link (in your "
        "purchase confirmation email) — no phone calls, no questions asked.",
    ],
    "One redemption per customer. This code may be rotated periodically for security — if it "
    "doesn't work, contact us for a current one. Valid for new Bingo Card Generator 2.0 "
    "subscriptions only.",
)

# ---------------------------------------------------------------- Bronze
build(
    "starter-pack-bcg2-redemption.pdf",
    "Free Day Pass — Bingo Card Generator 2.0",
    "Your bonus with the Music Bingo Starter Pack (Bronze)",
    "FCEBRZDAY1",
    "Day Pass",
    [
        f"Go to <b>{PLAN_URL}</b> and choose the <b>Day Pass</b> plan.",
        "At checkout, enter your redemption code above in the discount code field.",
        "Complete checkout at <b>$0</b> — Bingo Card Generator 2.0 unlocks immediately for one "
        "full day.",
    ],
    [
        "This is a one-time, one-day pass — <b>not</b> a subscription. It simply expires after "
        "24 hours. Nothing renews, nothing to cancel, and no payment method is required to redeem it.",
    ],
    "One redemption per customer. This code may be rotated periodically for security — if it "
    "doesn't work, contact us for a current one.",
)
