"""Generates a rich, multi-task whistleblowing benchmark dataset (320+ samples)
covering category, learned urgency/risk severity, and department routing."""
import csv
import os

SEED_SAMPLES = [
    # ==================== SECURITY ====================
    # CRITICAL SECURITY
    ("security", "CRITICAL", "Cyber & InfoSec", 0.95,
     "Active ransomware attack in progress. Encrypted files noticed across the core production storage cluster with .lockbit extension and ransom notes dropping on domain controllers."),
    ("security", "CRITICAL", "Cyber & InfoSec", 0.96,
     "The primary SSL private key and root database credentials were leaked onto a public GitHub repository. Unauthenticated API calls are actively extracting user records."),
    ("security", "CRITICAL", "Campus & Operations", 0.92,
     "A back-door exit near the main electrical substation was forcibly broken open. Two unidentified individuals in dark hoodies were spotted carrying duffel bags out of the data warehouse."),
    ("security", "CRITICAL", "Cyber & InfoSec", 0.94,
     "The customer database backup containing 500,000 plaintext credit card numbers and passwords was exfiltrated to an unknown IP address in Eastern Europe yesterday evening."),
    ("security", "CRITICAL", "Cyber & InfoSec", 0.93,
     "Master administrative access to our AWS account has been compromised. The attacker has created rogue EC2 instances and deleted the last 30 days of CloudTrail audit logs."),
    ("security", "CRITICAL", "Campus & Operations", 0.91,
     "All fire sprinkler main control valves on the server floor have been deliberately chained shut. If a fire starts in the battery room, total devastation is guaranteed."),

    # HIGH SECURITY
    ("security", "HIGH", "Cyber & InfoSec", 0.78,
     "Our production API endpoints lack rate limiting and authentication checks. Anyone with curl can enumerate and dump all employee health and payroll profiles."),
    ("security", "HIGH", "Cyber & InfoSec", 0.82,
     "Ex-employees who were terminated three months ago still possess active corporate VPN logins, Slack access, and administrative privileges on production clusters."),
    ("security", "HIGH", "Campus & Operations", 0.75,
     "The biometric turnstiles on the executive floor have been broken for a week. Guards are waving people through without checking visitor passes or logging identification."),
    ("security", "HIGH", "Cyber & InfoSec", 0.80,
     "A phishing campaign successfully compromised the CFO's email account. Wire transfer requests for $250,000 to an offshore shell bank were transmitted this morning."),
    ("security", "HIGH", "Cyber & InfoSec", 0.77,
     "Contractor laptops connected to our internal corporate network have disabled anti-malware and unpatched remote code execution vulnerabilities."),
    ("security", "HIGH", "Campus & Operations", 0.76,
     "The physical server room door is held open with a wooden block so employees can enter without swiping their security keycards."),

    # MEDIUM SECURITY
    ("security", "MEDIUM", "Cyber & InfoSec", 0.55,
     "Development engineers are committing hardcoded staging API keys and test database passwords directly into shared internal git repositories."),
    ("security", "MEDIUM", "Cyber & InfoSec", 0.52,
     "Customer support agents are sharing a single shared admin account on Zendesk instead of using individual multi-factor credentials."),
    ("security", "MEDIUM", "Campus & Operations", 0.50,
     "The CCTV camera monitoring the secondary loading dock has been displaying a black feed since Tuesday and facilities has not repaired it."),
    ("security", "MEDIUM", "Campus & Operations", 0.48,
     "Physical visitor badges are routinely discarded in open lobby trash bins instead of being collected and shredded by reception."),
    ("security", "MEDIUM", "Cyber & InfoSec", 0.54,
     "Several staff members are using unapproved third-party cloud storage to transfer confidential client presentation slides."),
    ("security", "MEDIUM", "Cyber & InfoSec", 0.53,
     "Laptops left unattended in open conference rooms remain unlocked throughout lunch hour with active email sessions."),

    # LOW SECURITY
    ("security", "LOW", "Campus & Operations", 0.28,
     "The security guard at the north gate was observed asleep at his desk during the 2:00 PM shift change."),
    ("security", "LOW", "Campus & Operations", 0.25,
     "The visitor logbook on the 2nd floor reception desk has a torn cover and is running out of clean signature pages."),
    ("security", "LOW", "Cyber & InfoSec", 0.30,
     "The guest Wi-Fi password printed on the conference room whiteboard has not been rotated in six months."),
    ("security", "LOW", "Campus & Operations", 0.22,
     "A tailgating notice sign on the west stairwell has fallen off the wall and needs to be taped back up."),
    ("security", "LOW", "Cyber & InfoSec", 0.27,
     "Spam calendar invites with suspicious meeting links are appearing on some departmental Google Calendar inboxes."),

    # ==================== HARASSMENT ====================
    # CRITICAL HARASSMENT
    ("harassment", "CRITICAL", "People & HR", 0.95,
     "A senior director cornered an intern in a private conference room after hours, made violent sexual advances, and threatened to destroy their career if they spoke to HR."),
    ("harassment", "CRITICAL", "People & HR", 0.94,
     "A team manager explicitly stated that female team members must provide physical favors to receive satisfactory performance ratings and annual bonus distribution."),
    ("harassment", "CRITICAL", "People & HR", 0.92,
     "An employee is sending stalker photos of a colleague arriving at their home, threatening bodily harm if they do not agree to date them."),
    ("harassment", "CRITICAL", "People & HR", 0.93,
     "Severe physical intimidation occurred in the breakroom when a supervisor slammed a coworker against the wall and screamed death threats."),
    ("harassment", "CRITICAL", "Legal & Compliance", 0.91,
     "Multiple junior associates have been subjected to systemic quid pro quo sexual harassment by the department head who has suppressed previous formal complaints."),

    # HIGH HARASSMENT
    ("harassment", "HIGH", "People & HR", 0.79,
     "My department head constantly screams obscenities, hurls office supplies at engineers during standup, and creates an unbearable climate of terror."),
    ("harassment", "HIGH", "People & HR", 0.76,
     "A group of male colleagues created a secret private Slack channel where they post non-consensual altered photos of female coworkers and rate their bodies."),
    ("harassment", "HIGH", "People & HR", 0.78,
     "Management is systematically retaliating against a whistleblower by docking pay, assigning impossible shifts, and isolating them from all project meetings."),
    ("harassment", "HIGH", "People & HR", 0.77,
     "A team lead repeatedly makes derogatory racial slurs and mocks the religious background of minority team members during company lunches."),
    ("harassment", "HIGH", "People & HR", 0.75,
     "Coworker continues to send graphic unwanted romantic letters and inappropriate gifts to my workstation despite multiple explicit written refusals."),

    # MEDIUM HARASSMENT
    ("harassment", "MEDIUM", "People & HR", 0.55,
     "Our manager repeatedly makes demeaning comments about junior staff intelligence during cross-team sync meetings."),
    ("harassment", "MEDIUM", "People & HR", 0.52,
     "Certain colleagues deliberately exclude female engineers from key architectural decisions and social networking lunches."),
    ("harassment", "MEDIUM", "People & HR", 0.53,
     "A senior peer constantly speaks over me, takes credit for my pull requests, and belittles my contributions in front of clients."),
    ("harassment", "MEDIUM", "People & HR", 0.49,
     "Inappropriate gender-based jokes and crude memes are routinely shared in our departmental team chat without reprimand."),
    ("harassment", "MEDIUM", "People & HR", 0.51,
     "My team lead makes uncomfortable jokes regarding my age and retirement plans during one-on-one performance reviews."),

    # LOW HARASSMENT
    ("harassment", "LOW", "People & HR", 0.28,
     "A colleague regularly plays loud music with offensive lyrics without headphones despite several polite requests to stop."),
    ("harassment", "LOW", "People & HR", 0.24,
     "Someone left a passive-aggressive anonymous sticky note on a coworker's desk criticizing their lunch choices."),
    ("harassment", "LOW", "People & HR", 0.27,
     "A team member frequently rolls their eyes and sighs audibly whenever others speak during the weekly retrospective."),
    ("harassment", "LOW", "People & HR", 0.22,
     "Coworker repeatedly interrupts people during virtual meetings without waiting for them to finish their sentence."),

    # ==================== CORRUPTION ====================
    # CRITICAL CORRUPTION
    ("corruption", "CRITICAL", "Audit & Finance", 0.96,
     "The VP of Procurement is actively taking millions in cash kickbacks from an unvetted vendor and wiring corporate funds directly to offshore shell companies in the Caymans."),
    ("corruption", "CRITICAL", "Audit & Finance", 0.95,
     "Our accounting department is running two sets of books. The executive board is falsifying GAAP revenue numbers by $15M to fraudulently inflate the upcoming IPO valuation."),
    ("corruption", "CRITICAL", "Legal & Compliance", 0.93,
     "The head of internal audit was offered a $100,000 cash bribe to destroy documents proving embezzlement in the government healthcare contract."),
    ("corruption", "CRITICAL", "Audit & Finance", 0.94,
     "Senior leadership is knowingly embezzling grant money intended for university student research laboratories and transferring it to personal real estate ventures."),
    ("corruption", "CRITICAL", "Legal & Compliance", 0.92,
     "Government regulators are being bribed with luxury vacations by our compliance director to conceal environmental safety inspection failures."),

    # HIGH CORRUPTION
    ("corruption", "HIGH", "Audit & Finance", 0.81,
     "Hardware equipment contracts worth $500,000 were awarded without competitive bidding to a shell company registered under the purchasing manager's spouse."),
    ("corruption", "HIGH", "Audit & Finance", 0.79,
     "Several directors are submitting fraudulent expense reports with forged receipts for personal family holidays and luxury sports cars."),
    ("corruption", "HIGH", "Legal & Compliance", 0.78,
     "The hiring panel was ordered by leadership to secretly reject all qualified candidates and award the high-paying management role to the CEO's son."),
    ("corruption", "HIGH", "Audit & Finance", 0.76,
     "Our sales division is secretly funneling illegal rebates and off-the-books gifts to foreign government officials to win public school tenders."),
    ("corruption", "HIGH", "Audit & Finance", 0.77,
     "Invoice approvals are being forged by a finance supervisor to pay a phantom consulting firm for services that were never rendered."),

    # MEDIUM CORRUPTION
    ("corruption", "MEDIUM", "Audit & Finance", 0.54,
     "Managers are taking clients to expensive strip clubs and charging the entire tab as legitimate business meal expenses."),
    ("corruption", "MEDIUM", "Campus & Operations", 0.52,
     "Surplus company monitors and laptops are being quietly sold on eBay by the IT asset custodian instead of being recycled or inventoried."),
    ("corruption", "MEDIUM", "Audit & Finance", 0.50,
     "A vendor sent expensive luxury watches to three engineers responsible for evaluating the upcoming enterprise cloud contract."),
    ("corruption", "MEDIUM", "People & HR", 0.49,
     "Travel per-diem allowances are being claimed by employees for remote conferences they attended strictly over Zoom."),
    ("corruption", "MEDIUM", "Legal & Compliance", 0.53,
     "A supervisor is using company staff and equipment during work hours to complete renovations on his personal residential property."),

    # LOW CORRUPTION
    ("corruption", "LOW", "Campus & Operations", 0.26,
     "Employees are taking home whole boxes of office printer paper, pens, and high-end coffee beans for personal household use."),
    ("corruption", "LOW", "Campus & Operations", 0.22,
     "Someone used the corporate courier account to ship personal packages to their relatives abroad."),
    ("corruption", "LOW", "Audit & Finance", 0.28,
     "Staff members are occasionally submitting grocery receipts that include personal snack items under team dinner reimbursements."),
    ("corruption", "LOW", "Campus & Operations", 0.23,
     "An employee regularly prints hundreds of pages of personal tax and legal documents using the high-volume marketing printer."),

    # ==================== TECHNICAL ====================
    # CRITICAL TECHNICAL
    ("technical", "CRITICAL", "Cyber & InfoSec", 0.94,
     "A critical zero-day SQL injection vulnerability in our public payment gateway is being actively exploited in production, exposing all customer credit balances."),
    ("technical", "CRITICAL", "Cyber & InfoSec", 0.95,
     "Management knowingly forced deployment of medical diagnostic software with broken unit tests, causing miscalculated radiation dosage values for patients."),
    ("technical", "CRITICAL", "Campus & Operations", 0.92,
     "The automated factory safety shutdown system has had its failsafe interlocks overridden in PLC software to bypass mandatory cooldown periods."),
    ("technical", "CRITICAL", "Cyber & InfoSec", 0.93,
     "Automated database migrations accidentally erased the primary customer ledger. Recovery backups have not functioned since January due to corrupt archive scripts."),
    ("technical", "CRITICAL", "Cyber & InfoSec", 0.91,
     "Critical flight control telemetry data is dropping 40% of packets due to a known buffer overflow that engineering directors refused to patch."),

    # HIGH TECHNICAL
    ("technical", "HIGH", "Cyber & InfoSec", 0.81,
     "Engineers have disabled SSL/TLS certificate verification in the mobile banking app to bypass testing errors, leaving all user sessions vulnerable to Man-in-the-Middle attacks."),
    ("technical", "HIGH", "Cyber & InfoSec", 0.79,
     "The production Kubernetes cluster is running end-of-life kernel versions with unpatched privilege escalation bugs that allow container escape."),
    ("technical", "HIGH", "Cyber & InfoSec", 0.77,
     "Our automated test pipeline has been rigged to return exit code 0 even when integration tests fail, disguising broken authentication builds."),
    ("technical", "HIGH", "Campus & Operations", 0.76,
     "The main campus backup generator failed its automated load test and will not supply power to the critical server room during an outage."),
    ("technical", "HIGH", "Cyber & InfoSec", 0.78,
     "Customer password reset links contain guessable sequential tokens, allowing unauthorized account takeovers with simple automated scripts."),

    # MEDIUM TECHNICAL
    ("technical", "MEDIUM", "Campus & Operations", 0.54,
     "The internal bug tracker has over 400 unaddressed critical defect tickets that have been ignored for eighteen months."),
    ("technical", "MEDIUM", "Campus & Operations", 0.51,
     "Database queries on the analytics dashboard are performing unindexed table scans, causing frequent database timeouts and high CPU throttling."),
    ("technical", "MEDIUM", "Campus & Operations", 0.49,
     "Staging environments are continuously using outdated un-sanitized customer data dumps without proper GDPR anonymization masking."),
    ("technical", "MEDIUM", "Campus & Operations", 0.52,
     "Our monitoring alerts have been silenced on PagerDuty because engineers were annoyed by recurring false-positive warnings."),
    ("technical", "MEDIUM", "Campus & Operations", 0.48,
     "Legacy documentation for the core billing engine has been lost and no current employee understands how the tax calculation service functions."),

    # LOW TECHNICAL
    ("technical", "LOW", "Campus & Operations", 0.25,
     "The staging website has a broken logo image on the footer of the documentation page."),
    ("technical", "LOW", "Campus & Operations", 0.22,
     "The internal developer wiki has several dead links pointing to deprecated Confluence pages."),
    ("technical", "LOW", "Campus & Operations", 0.27,
     "Dark mode toggle on the internal HR portal causes minor text misalignment on the profile page."),
    ("technical", "LOW", "Campus & Operations", 0.21,
     "The RSS feed link in the internal staff blog returns a 404 page not found error."),

    # ==================== OTHER ====================
    # CRITICAL OTHER
    ("other", "CRITICAL", "Campus & Operations", 0.94,
     "Toxic chemical waste from the chemistry testing laboratory is being dumped directly into the municipal storm drain behind the campus cafeteria."),
    ("other", "CRITICAL", "Campus & Operations", 0.93,
     "Asbestos insulation was uncovered during the building remodel and contractors were told to sweep it into regular trash bags without protective respirators."),
    ("other", "CRITICAL", "Campus & Operations", 0.91,
     "Severe structural cracks have appeared in the foundation pillars supporting the multi-story parking garage and cars are still parking there."),
    ("other", "CRITICAL", "Legal & Compliance", 0.90,
     "The university laboratory is operating radioactive equipment without mandatory radiation safety licenses or radiation dosimeter badges for student workers."),

    # HIGH OTHER
    ("other", "HIGH", "Campus & Operations", 0.78,
     "The primary fire exit doors on the 4th floor are locked with padlocks during work hours to prevent employees taking unauthorized smoke breaks."),
    ("other", "HIGH", "Campus & Operations", 0.76,
     "Industrial refrigeration units in the main food storage pantry have failed, and spoiled dairy and meat products are being served to students."),
    ("other", "HIGH", "Campus & Operations", 0.75,
     "Hazardous medical waste bins containing used needles and contaminated vials are left overflowing in unlocked public corridors."),
    ("other", "HIGH", "Campus & Operations", 0.77,
     "The emergency eye-wash stations in the battery testing facility are completely dry and plumbed to disconnected water pipes."),

    # MEDIUM OTHER
    ("other", "MEDIUM", "Campus & Operations", 0.51,
     "The wheelchair accessibility lift at the library entrance has been out of order for four weeks without any repair timeline."),
    ("other", "MEDIUM", "Campus & Operations", 0.49,
     "HVAC air filters have not been changed in over two years, resulting in persistent mold smell and respiratory complaints across the 3rd floor."),
    ("other", "MEDIUM", "Campus & Operations", 0.48,
     "Pest infestation including rodents seen multiple times near the basement cafeteria dishwashing station."),
    ("other", "MEDIUM", "Campus & Operations", 0.50,
     "The emergency exit lighting in the south stairwell flickers constantly and several exit signs have burnt out bulbs."),

    # LOW OTHER
    ("other", "LOW", "Campus & Operations", 0.25,
     "The cafeteria coffee vending machine regularly swallows coins without dispensing beverages."),
    ("other", "LOW", "Campus & Operations", 0.21,
     "The water cooler on the fifth floor is dispensing lukewarm water instead of chilled water."),
    ("other", "LOW", "Campus & Operations", 0.24,
     "The bicycle parking rack outside the building is rusted and needs fresh paint."),
    ("other", "LOW", "Campus & Operations", 0.20,
     "The automatic paper towel dispenser in the second-floor restroom is frequently jammed."),
]

def generate():
    # Expand by adding systematic variations to reach 350+ realistic multi-task training records
    expanded = []
    modifiers = [
        "",
        "This is an urgent ongoing issue. ",
        "Observed repeatedly over the last two weeks: ",
        "Discovered during an internal review: ",
        "Multiple team members have noticed that ",
        "Confidential report: ",
        "Please investigate immediately: ",
    ]

    for cat, urg, dept, base_score, text in SEED_SAMPLES:
        expanded.append({
            "category": cat,
            "urgency": urg,
            "department": dept,
            "risk_score": base_score,
            "text": text,
        })
        # Add 4 tailored contextual variations with slight jitter on score
        for i, mod in enumerate(modifiers[1:5]):
            var_text = f"{mod}{text[:1].lower() + text[1:]}"
            score_jitter = round(max(0.1, min(1.0, base_score + (i - 2) * 0.015)), 2)
            expanded.append({
                "category": cat,
                "urgency": urg,
                "department": dept,
                "risk_score": score_jitter,
                "text": var_text,
            })

    target_path = os.path.join(os.path.dirname(__file__), "..", "data", "seed_reports.csv")
    os.makedirs(os.path.dirname(target_path), exist_ok=True)
    with open(target_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["category", "urgency", "department", "risk_score", "text"])
        writer.writeheader()
        for row in expanded:
            writer.writerow(row)

    print(f"Generated {len(expanded)} multi-task training samples at {target_path}")

if __name__ == "__main__":
    generate()
