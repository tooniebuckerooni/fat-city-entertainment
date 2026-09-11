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


# --------------------------------------------------------------- codes
# Redemption codes are LIVE LemonSqueezy discount codes. This repo is public
# and .nojekyll is on, so anything committed here is world-readable: they are
# read from an untracked file instead, and this script refuses to run without
# it rather than emitting PDFs with a placeholder in the code box. Same idiom
# as publish-post.js refusing an unresolved [bracket link] and seed.js refusing
# an [OWNER: ...] placeholder.
#
#   cp redemption-codes.example.json redemption-codes.json   # then fill it in
import json, os, sys
_here = os.path.dirname(os.path.abspath(__file__))
_codes_path = os.path.join(_here, "redemption-codes.json")
if not os.path.exists(_codes_path):
    sys.exit(
        "make_pdfs.py: redemption-codes.json not found.\n"
        "  Copy redemption-codes.example.json to redemption-codes.json and put the\n"
        "  current LemonSqueezy codes in it. Never commit that file."
    )
with open(_codes_path, encoding="utf-8") as _f:
    CODES = json.load(_f)
for _k in ("gold-club", "silver-club", "starter-pack", "halloween"):
    if not CODES.get(_k):
        sys.exit(f"make_pdfs.py: redemption-codes.json is missing a code for '{_k}'.")

styles = getSampleStyleSheet()
brand = ParagraphStyle("brand", parent=styles["Normal"], fontName="Helvetica-Bold",
                        fontSize=10, textColor=GOLD, spaceAfter=2, tracking=1)
h1 = ParagraphStyle("h1", parent=styles["Title"], fontName="Helvetica-Bold",
                     fontSize=22, textColor=DARK, spaceAfter=6, alignment=TA_LEFT)
h2 = ParagraphStyle("h2", parent=styles["Normal"], fontName="Helvetica",
                     fontSize=13, textColor=GREY, spaceAfter=12, alignment=TA_LEFT)
sectionhead = ParagraphStyle("sectionhead", parent=styles["Normal"], fontName="Helvetica-Bold",
                              fontSize=12, textColor=DARK, spaceBefore=12, spaceAfter=7)
body = ParagraphStyle("body", parent=styles["Normal"], fontName="Helvetica",
                       fontSize=10.5, textColor=DARK, leading=15, spaceAfter=6)
step = ParagraphStyle("step", parent=body, leftIndent=14, spaceAfter=8)
fine = ParagraphStyle("fine", parent=styles["Normal"], fontName="Helvetica",
                       fontSize=8.5, textColor=GREY, leading=12)
codelabel = ParagraphStyle("codelabel", parent=styles["Normal"], fontName="Helvetica-Bold",
                            fontSize=9, textColor=GREY, alignment=TA_CENTER, spaceAfter=4)
codeval = ParagraphStyle("codeval", parent=styles["Normal"], fontName="Courier-Bold",
                          fontSize=22, textColor=DARK, alignment=TA_CENTER)
buttontext = ParagraphStyle("buttontext", parent=styles["Normal"], fontName="Helvetica-Bold",
                             fontSize=12, textColor=colors.white, alignment=TA_CENTER, leading=15)
buttoncap = ParagraphStyle("buttoncap", parent=styles["Normal"], fontName="Helvetica",
                            fontSize=8, textColor=GREY, alignment=TA_CENTER, leading=11)


def code_box(code):
    t = Table(
        [[Paragraph("YOUR REDEMPTION CODE", codelabel)],
         [Paragraph(code, codeval)]],
        colWidths=[4.5 * inch],
    )
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHTBG),
        ("BOX", (0, 0), (-1, -1), 1, GOLD),
        ("TOPPADDING", (0, 0), (-1, 0), 11),
        ("BOTTOMPADDING", (0, 1), (-1, 1), 13),
        ("TOPPADDING", (0, 1), (-1, 1), 2),
    ]))
    return t


# --------------------------------------------------------------- links
# One click, not an instruction. "Go to bingocardgenerator.online/#pricing and
# choose the Monthly plan" is four decisions (find the site, find the pricing
# section, pick the right one of three plans, then find the discount field) and
# every one of them is somewhere a redemption can be abandoned. These are the
# real LemonSqueezy checkout URLs for each plan with the code already applied
# via LemonSqueezy's documented checkout[discount_code] prefill parameter, the
# same one assets/js/ls-buy.js uses for a live promo.
#
# The code still prints in the box above the buttons. It has to: a customer
# reading this on paper, or with a PDF reader that strips links, needs a path
# that does not depend on a hyperlink working.
# Read from _content/generator-plans.json, the one place the plans live, rather
# than a fourth copy of three URLs. A link printed inside a paid download cannot
# be recalled, so a URL that drifts out of sync here is the worst of the four.
_plans_path = os.path.join(_here, "..", "generator-plans.json")
with open(_plans_path, encoding="utf-8") as _pf:
    _PLANS = json.load(_pf)["plans"]
PLAN_URLS = {p["name"]: p["checkout"] for p in _PLANS.values()}

# Plain-text fallback, for the fine print and for anyone typing it in.
PLAN_PAGE = "bingocardgenerator.online/#pricing"


def checkout_url(plan_name, code):
    return f"{PLAN_URLS[plan_name]}?checkout[discount_code]={code}"


def link_button(label, url, caption=None):
    """A filled bar whose whole label is the hyperlink, plus an optional
    printable URL underneath for paper copies."""
    rows = [[Paragraph(f"<a href='{url}' color='#ffffff'><b>{label}</b></a>", buttontext)]]
    t = Table(rows, colWidths=[5.4 * inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), GOLD),
        ("TOPPADDING", (0, 0), (-1, -1), 11),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 11),
        ("LEFTPADDING", (0, 0), (-1, -1), 14),
        ("RIGHTPADDING", (0, 0), (-1, -1), 14),
    ]))
    if not caption:
        return [t, Spacer(1, 10)]
    return [t, Spacer(1, 3), Paragraph(caption, buttoncap), Spacer(1, 12)]


def build(filename, product_name, tagline, code, plan_name, primary_label, steps,
          after_paragraphs, fine_print, extra_links=()):
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
    story.append(Spacer(1, 14))

    story.extend(link_button(
        primary_label,
        checkout_url(plan_name, code),
        "Opens the checkout with your code already applied.",
    ))
    for label, url, caption in extra_links:
        story.extend(link_button(label, url, caption))

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
    pages = doc.page  # SimpleDocTemplate leaves the final page number here
    print(f"wrote {filename} ({pages} page{'s' if pages != 1 else ''})")
    if pages > 1:
        sys.exit(
            f"make_pdfs.py: {filename} ran to {pages} pages. These are one-page leaflets;\n"
            "  trim the copy or the spacing rather than letting the fine print fall off\n"
            "  the page a customer actually reads."
        )


PLAN_PAGE_TXT = "bingocardgenerator.online/#pricing"


def STEPS(plan):
    """The same three steps for every tier: the button, what arrives, and the
    manual path for anyone whose PDF reader will not follow a link."""
    return [
        f"Click the button above. It opens the <b>{plan}</b> checkout with your code already "
        "applied, so the total reads <b>$0.00</b>.",
        "Complete checkout. Bingo Card Generator 2.0 unlocks immediately and your licence key "
        "is emailed to you.",
        f"Prefer to do it by hand? Go to <b>{PLAN_PAGE_TXT}</b>, choose the <b>{plan}</b> plan, "
        "and type the code above into the discount field at checkout.",
    ]


CANCEL = (
    "You will get an email reminder from Bingo Card Generator 2.0 / LemonSqueezy before it "
    "renews. Cancel any time before then from your LemonSqueezy customer portal link, which is "
    "in your purchase confirmation email. No phone calls, no questions asked."
)

FINE_SUB = (
    "One redemption per customer. This code may be rotated periodically for security. If it "
    "does not work, contact us for a current one. Valid for new Bingo Card Generator 2.0 "
    "subscriptions only."
)

# ---------------------------------------------------------------- Gold
build(
    "gold-club-bcg2-redemption.pdf",
    "1 Year Free: Bingo Card Generator 2.0",
    "Your bonus with the Music Bingo Gold Club",
    CODES["gold-club"],
    "Annual",
    "Activate my free year of Generator 2.0",
    STEPS("Annual"),
    [
        "Your first year of Bingo Card Generator 2.0 is completely free. After 12 months it "
        "<b>automatically renews at the regular Annual price</b> unless you cancel first.",
        CANCEL,
    ],
    FINE_SUB,
)

# ---------------------------------------------------------------- Silver
build(
    "silver-club-bcg2-redemption.pdf",
    "1 Month Free: Bingo Card Generator 2.0",
    "Your bonus with the Music Bingo Silver Club",
    CODES["silver-club"],
    "Monthly",
    "Activate my free month of Generator 2.0",
    STEPS("Monthly"),
    [
        "Your first month of Bingo Card Generator 2.0 is completely free. After 30 days it "
        "<b>automatically renews at the regular Monthly price</b> unless you cancel first.",
        CANCEL,
    ],
    FINE_SUB,
)

# ---------------------------------------------------------------- Bronze
build(
    "starter-pack-bcg2-redemption.pdf",
    "Free Day Pass: Bingo Card Generator 2.0",
    "Your bonus with the Music Bingo Starter Pack (Bronze)",
    CODES["starter-pack"],
    "Day Pass",
    "Activate my free day pass of Generator 2.0",
    STEPS("Day Pass"),
    [
        "This is a one-time, one-day pass, <b>not</b> a subscription. It simply expires after "
        "24 hours. Nothing renews, nothing to cancel, and no payment method is required to "
        "redeem it.",
    ],
    "One redemption per customer. This code may be rotated periodically for security. If it "
    "does not work, contact us for a current one.",
)

# ------------------------------------------------------- Halloween bundle
# Two links, not one. The free month is only half the perk: the other half is
# that the buyer does not have to retype thirty song titles to use it. The
# second button hands the whole Halloween game to the generator with the
# squares, the title and an orange-on-black palette already set, so their first
# custom card is one click from here rather than an evening's typing.
#
# It points at OUR short URL, /cards/halloween/, not at the generator directly.
# That link is printed inside a paid download and cannot be recalled, so the
# long encoded payload lives in a file we can re-generate instead. Built by
# _tools/build-generator-links.js from _content/generator-links.json.
build(
    "halloween-bcg2-redemption.pdf",
    "1 Month Free: Bingo Card Generator 2.0",
    "Your bonus with the Halloween Complete Pack",
    CODES["halloween"],
    "Monthly",
    "Activate my free month of Generator 2.0",
    STEPS("Monthly"),
    [
        "Make your own Halloween cards in any colours you like, on any word or song list you "
        "paste in. Your bundle already includes 250 ready-to-print cards, so this is for the "
        "night you want something different.",
        "Your first month is completely free. After 30 days it <b>automatically renews at the "
        "regular Monthly price</b> unless you cancel first.",
        CANCEL,
    ],
    FINE_SUB,
    extra_links=[(
        "Open the Halloween game in the generator",
        "https://www.fatcityentertainment.com/cards/halloween/",
        "All 30 songs, the title and a Halloween palette, already filled in. "
        "Or type fatcityentertainment.com/cards/halloween",
    )],
)
