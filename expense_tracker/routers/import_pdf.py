"""
PDF Import Router - /api/import
Handles Indian bank statements (Canara, SBI, HDFC, ICICI etc.)
"""

from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
import io, re
from datetime import datetime
import auth as auth_utils
import models

router = APIRouter()

RULES = [
    ("Utilities",     ["pmpml","mahabus","electricity","water","gas","internet","airtel","jio","bsnl","vodafone","recharge","bill","ebill","msedcl","bescom","insurance","lic"]),
    ("Food",          ["swiggy","zomato","restaurant","cafe","coffee","dining","food","pizza","burger","dominos","kfc","mcdonalds","biryani","kitchen","zepto","blinkit","bigbasket"]),
    ("Transport",     ["uber","ola","rapido","petrol","fuel","metro","bus","auto","cab","toll","irctc","railway","redbus","indigo","spicejet","flight"]),
    ("Shopping",      ["amazon","flipkart","myntra","ajio","meesho","nykaa","mall","store","mart","market","shop"]),
    ("Health",        ["pharmacy","chemist","hospital","doctor","medical","clinic","lab","apollo","medplus","netmeds","health","gym"]),
    ("Entertainment", ["netflix","hotstar","spotify","youtube","bookmyshow","movie","cinema","pvr","inox","gaming","disney"]),
    ("Education",     ["school","college","university","tuition","course","udemy","byju","books","fees","coaching"]),
    ("Salary",        ["salary","stipend","payroll","wages"]),
    ("Investment",    ["mutual fund","sip","groww","zerodha","dividend","interest credit","fd","ppf"]),
]

PAYEE_MAP = {
    "pmpml": "PMPML Bus Pass", "www.pmpml": "PMPML Bus Pass",
    "indianra": "Indian Railways", "irctc": "IRCTC Railways",
    "payu": "Online Payment", "razorpay": "Online Payment",
}

def categorize(desc: str) -> str:
    d = desc.lower()
    for cat, kws in RULES:
        if any(k in d for k in kws):
            return cat
    return "Other"

def parse_date(s: str):
    for fmt in ("%d-%m-%Y", "%d/%m/%Y", "%d-%m-%y", "%d/%m/%y", "%d.%m.%Y"):
        try:
            return datetime.strptime(s.strip(), fmt).strftime("%Y-%m-%d")
        except:
            continue
    return None

def clean_float(s: str):
    try:
        return abs(float(re.sub(r"[₹,\s]", "", str(s))))
    except:
        return None

def get_payee(line: str) -> str:
    """Extract payee from UPI/NEFT/IMPS line."""
    # UPI/DR/12345/PAYEE_NAME/BANK/...
    m = re.search(r"UPI/(?:DR|CR)/\d+/([A-Z0-9][A-Z0-9 .&'-]{1,30}?)(?:/|\*|@)", line, re.IGNORECASE)
    if m:
        payee = m.group(1).strip()
        payee_low = payee.lower().replace(" ", "")
        for key, label in PAYEE_MAP.items():
            if key in payee_low:
                return label
        return payee.title()
    # NEFT/IMPS
    m2 = re.search(r"(?:NEFT|IMPS)/(?:DR|CR)/\S+/([^/]{3,30})", line, re.IGNORECASE)
    if m2:
        return m2.group(1).strip().title()
    return "UPI Transaction"

def parse_statement(text: str):
    """Parse bank statement - handles both per-line and multi-line formats."""
    results = []
    date_re  = re.compile(r"\b(\d{2}[-/]\d{2}[-/]\d{4})\b")
    amt_re   = re.compile(r"\b(\d{1,3}(?:,\d{3})*\.\d{2})\b")

    # Strategy: find all lines containing a date + UPI/NEFT/IMPS marker + amounts
    # pdfplumber sometimes keeps lines together, sometimes splits them
    # Join the whole text then split by transaction start

    # Split text into transaction blocks by date
    # Each block starts with DD-MM-YYYY
    blocks = re.split(r'(?=\b\d{2}-\d{2}-\d{4}\b)', text)

    skip_words = ["opening balance", "closing balance", "disclaimer", "end of statement",
                  "page ", "branch", "customer", "ifsc", "product", "address", "phone"]

    for block in blocks:
        block = block.strip()
        if not block:
            continue
        if any(w in block.lower() for w in skip_words):
            continue

        # Get date
        dm = date_re.search(block)
        if not dm:
            continue
        date_str = parse_date(dm.group(1))
        if not date_str:
            continue

        # Must have UPI/NEFT/IMPS
        has_upi  = bool(re.search(r"UPI/(DR|CR)", block, re.IGNORECASE))
        has_neft = bool(re.search(r"(NEFT|IMPS)/(DR|CR)", block, re.IGNORECASE))
        if not has_upi and not has_neft:
            continue

        # Determine income/expense
        is_credit = bool(re.search(r"UPI/CR|NEFT/CR|IMPS/CR", block, re.IGNORECASE))
        txn_type = "income" if is_credit else "expense"

        # Get all amounts
        raw_amounts = [clean_float(a) for a in amt_re.findall(block)]
        amounts = [a for a in raw_amounts if a and a >= 1.0]
        if not amounts:
            continue

        # Transaction amount = second-to-last if 2+ amounts (last is running balance)
        # If only 1 amount, use it
        if len(amounts) >= 2:
            txn_amount = amounts[-2]
        else:
            txn_amount = amounts[0]

        # Skip if amount looks like a balance (very large) and only 1 amount
        if len(amounts) == 1 and txn_amount > 100000:
            continue

        # Get payee description
        # Flatten block to single line for regex
        flat = " ".join(block.split())
        description = get_payee(flat)

        category = categorize(description)

        results.append({
            "date": date_str,
            "description": description[:80],
            "amount": round(txn_amount, 2),
            "type": txn_type,
            "category": category,
        })

    return results


@router.post("/parse")
async def parse_bank_statement(
    file: UploadFile = File(...),
    current_user: models.User = Depends(auth_utils.get_current_user)
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 10MB.")

    try:
        import pdfplumber
    except ImportError:
        raise HTTPException(status_code=500, detail="Run: pip install pdfplumber")

    try:
        full_text = ""
        with pdfplumber.open(io.BytesIO(contents)) as pdf:
            for page in pdf.pages:
                t = page.extract_text(layout=False)
                if t:
                    full_text += t + "\n"

        if not full_text.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from this PDF.")

        transactions = parse_statement(full_text)

        # Deduplicate
        seen = set()
        unique = []
        for t in transactions:
            key = (t["date"], t["amount"], t["description"][:20])
            if key not in seen:
                seen.add(key)
                unique.append(t)

        if not unique:
            raise HTTPException(status_code=400, detail="No transactions found. Make sure this is a digital (not scanned) bank statement.")

        return {"transactions": unique, "count": len(unique)}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parse error: {str(e)}")
