"""Seed data for the demonstrator.

Six realistic payment-integrity policies spanning five distinct edit types —
frequency limit, NCCI unbundling, member eligibility, a required-modifier edit,
and an add-on-code dependency. The claims batch is engineered to exercise every
adjudication path:

* a frequency flag and an unbundling flag,
* an eligibility denial and an eligibility exception that pays,
* a missing-modifier flag and an orphaned add-on-code denial,
* an age-45 *boundary* case that routes to review, and
* a low-confidence rule (PF-7745) whose findings route to review even though the
  claim clearly trips the edit — the confidence gate made tangible.

In production these would be read from the policy-management system and the claims
warehouse; here they are static so the repo is clone-and-run.
"""
from .schemas import Policy, Claim, Rule, Condition, RuleException

POLICIES = [
    Policy(
        id="P-1042", code="PPM-36415-FREQ", title="Routine Venipuncture — Frequency Limit",
        category="Coding Validation", updated="2026-06-12", status="compiled",
        text=(
            "Routine venipuncture for the collection of one or more specimens (CPT 36415) is "
            "reimbursable at a maximum of one (1) unit per member, per date of service, regardless "
            "of the number of draws performed during the encounter.\n\n"
            "Claims submitted with more than one unit of CPT 36415 for the same member on the same "
            "date of service should be flagged as a frequency edit, and the excess units denied. "
            "Modifier 91 (repeat clinical diagnostic laboratory test) does not override this limit "
            "for the collection code."
        ),
    ),
    Policy(
        id="P-1043", code="PPM-80053-NCCI", title="Metabolic Panel — Component Billing (NCCI)",
        category="Payment Policy", updated="2026-06-10", status="compiled",
        text=(
            "The Comprehensive Metabolic Panel (CPT 80053) includes all component analytes of the "
            "Basic Metabolic Panel (CPT 80048). Per National Correct Coding Initiative (NCCI) "
            "procedure-to-procedure guidance, CPT 80048 is a component of CPT 80053 and the two are "
            "mutually exclusive when billed for the same member on the same date of service.\n\n"
            "When CPT 80053 and CPT 80048 appear together on the same claim, 80048 should be flagged "
            "as an unbundling edit and disallowed."
        ),
    ),
    Policy(
        id="P-1044", code="PPM-45378-ELIG", title="Screening Colonoscopy — Member Eligibility",
        category="Clinical Policy", updated="2026-06-09", status="compiled",
        text=(
            "Screening colonoscopy (CPT 45378) for members at average risk is covered once every ten "
            "(10) years for members aged forty-five (45) years and older.\n\n"
            "Claims for members under age 45 without a documented high-risk diagnosis — for example, "
            "personal or family history of colorectal cancer (ICD-10 Z80.0 or Z85.038) — are not "
            "eligible for coverage under the screening benefit and should be denied.\n\n"
            "Members aged exactly 45 at an indeterminate service-date boundary require analyst "
            "confirmation of date of birth before adjudication."
        ),
    ),
    Policy(
        id="P-1045", code="PPM-71046-MOD26", title="Chest Radiograph — Professional Component Modifier",
        category="Coding Validation", updated="2026-06-11", status="compiled",
        text=(
            "When a two-view chest radiograph (CPT 71046) is interpreted by a physician in a facility "
            "place of service, only the professional component is payable to the interpreting provider. "
            "Such claims must append modifier 26 (professional component) to CPT 71046.\n\n"
            "A global (un-modified) submission of CPT 71046 in a facility setting incorrectly bills for "
            "the technical component owned by the facility and should be flagged for modifier correction."
        ),
    ),
    Policy(
        id="P-1046", code="PPM-11045-ADDON", title="Wound Debridement — Add-On Code Dependency",
        category="Payment Policy", updated="2026-06-08", status="compiled",
        text=(
            "CPT 11045 (debridement, subcutaneous tissue; each additional 20 sq cm) is an add-on code. "
            "It is reported in addition to the primary debridement procedure CPT 11042 and is never "
            "separately reimbursable on its own.\n\n"
            "When CPT 11045 is billed without its primary procedure CPT 11042 for the same member on the "
            "same date of service, the add-on line is not payable and should be denied."
        ),
    ),
    Policy(
        id="P-1047", code="PPM-97605-NPWT", title="Negative Pressure Wound Therapy — Utilization",
        category="Clinical Policy", updated="2026-06-13", status="compiled",
        text=(
            "Negative pressure wound therapy using a durable medical equipment pump (CPT 97605) is "
            "generally expected no more than once per encounter. Additional sessions may be appropriate "
            "for larger or more complex wounds depending on the documented plan of care.\n\n"
            "Because the policy does not state a firm numeric limit and leaves repeat therapy to clinical "
            "judgment, multi-unit claims should be examined rather than auto-denied."
        ),
    ),
]

SEED_RULES = {
    "P-1042": Rule(
        rule_id="PF-7741", title="Venipuncture frequency edit", logic_type="frequency_limit",
        policy_summary="CPT 36415 is limited to one unit per member per date of service; excess units are flagged and denied.",
        target_codes=["36415"],
        conditions=[Condition(field="units", operator="greater_than", value=1,
                              source_quote="reimbursable at a maximum of one (1) unit per member, per date of service",
                              confidence=0.98)],
        exceptions=[RuleException(type="modifier", value="91", note="Modifier 91 explicitly does not override the limit.")],
        outcome="flag", overall_confidence=0.97, source_policy="P-1042",
    ),
    "P-1043": Rule(
        rule_id="PF-7742", title="Metabolic panel unbundling edit", logic_type="mutually_exclusive",
        policy_summary="CPT 80048 is a component of 80053; both on the same claim triggers an unbundling edit on 80048.",
        target_codes=["80053", "80048"],
        conditions=[Condition(field="cpt_code", operator="contains_all", value=["80053", "80048"],
                              source_quote="mutually exclusive when billed for the same member on the same date of service",
                              confidence=0.96)],
        exceptions=[], outcome="flag", overall_confidence=0.95, source_policy="P-1043",
    ),
    "P-1044": Rule(
        rule_id="PF-7743", title="Screening colonoscopy eligibility edit", logic_type="eligibility",
        policy_summary="CPT 45378 requires member age >= 45; members under 45 without a high-risk diagnosis are denied. Age 45 boundary routes to review.",
        target_codes=["45378"],
        conditions=[Condition(field="member_age", operator="less_than", value=45,
                              source_quote="covered once every ten (10) years for members aged forty-five (45) years and older",
                              confidence=0.9)],
        exceptions=[
            RuleException(type="diagnosis", value="Z80.0", note="Family history of colorectal cancer."),
            RuleException(type="diagnosis", value="Z85.038", note="Personal history of colorectal cancer."),
        ],
        outcome="deny", overall_confidence=0.91, source_policy="P-1044",
    ),
    "P-1045": Rule(
        rule_id="PF-7744", title="Chest radiograph modifier edit", logic_type="modifier_required",
        policy_summary="CPT 71046 read in a facility setting must carry modifier 26; a global submission is flagged for modifier correction.",
        target_codes=["71046"],
        conditions=[Condition(field="modifier", operator="equals", value="26",
                              source_quote="must append modifier 26 (professional component) to CPT 71046",
                              confidence=0.92)],
        exceptions=[], outcome="flag", overall_confidence=0.93, source_policy="P-1045",
    ),
    "P-1046": Rule(
        rule_id="PF-7746", title="Debridement add-on dependency edit", logic_type="add_on_code",
        policy_summary="Add-on CPT 11045 is only payable with its primary procedure CPT 11042; billed alone it is denied.",
        target_codes=["11045"],
        conditions=[Condition(field="primary_code", operator="requires", value="11042",
                              source_quote="reported in addition to the primary debridement procedure CPT 11042 and is never separately reimbursable on its own",
                              confidence=0.95)],
        exceptions=[], outcome="deny", overall_confidence=0.95, source_policy="P-1046",
    ),
    "P-1047": Rule(
        rule_id="PF-7745", title="NPWT utilization edit (ambiguous)", logic_type="frequency_limit",
        policy_summary="CPT 97605 is expected once per encounter, but the policy states no firm limit — low confidence, so multi-unit claims route to review rather than auto-deny.",
        target_codes=["97605"],
        conditions=[Condition(field="units", operator="greater_than", value=1,
                              source_quote="generally expected no more than once per encounter",
                              confidence=0.72)],
        exceptions=[], outcome="flag", overall_confidence=0.74, source_policy="P-1047",
    ),
}

CLAIMS = [
    Claim(id="C-48201", member="M-8841", age=34, sex="F", codes=["36415"], units=3, mods=[], dx=["R53.83"], pos="11", dos="2026-06-14", billed=42),
    Claim(id="C-48202", member="M-2207", age=61, sex="M", codes=["80053", "80048"], units=1, mods=[], dx=["E11.9"], pos="22", dos="2026-06-14", billed=128),
    Claim(id="C-48203", member="M-9930", age=38, sex="F", codes=["45378"], units=1, mods=[], dx=["Z12.11"], pos="24", dos="2026-06-13", billed=1240),
    Claim(id="C-48204", member="M-1145", age=52, sex="M", codes=["45378"], units=1, mods=[], dx=["Z12.11"], pos="24", dos="2026-06-13", billed=1190),
    Claim(id="C-48205", member="M-7781", age=29, sex="F", codes=["36415"], units=1, mods=[], dx=["Z00.00"], pos="11", dos="2026-06-15", billed=14),
    Claim(id="C-48206", member="M-3398", age=47, sex="M", codes=["80053"], units=1, mods=[], dx=["E78.5"], pos="11", dos="2026-06-15", billed=96),
    Claim(id="C-48207", member="M-5562", age=41, sex="F", codes=["45378"], units=1, mods=[], dx=["Z80.0"], pos="24", dos="2026-06-12", billed=1205),
    Claim(id="C-48208", member="M-6614", age=45, sex="M", codes=["45378"], units=1, mods=[], dx=["Z12.11"], pos="24", dos="2026-06-12", billed=1210),
    Claim(id="C-48209", member="M-2093", age=58, sex="F", codes=["36415"], units=2, mods=["91"], dx=["D64.9"], pos="11", dos="2026-06-14", billed=28),
    Claim(id="C-48210", member="M-8847", age=33, sex="M", codes=["99213"], units=1, mods=[], dx=["J06.9"], pos="11", dos="2026-06-11", billed=110),
    Claim(id="C-48211", member="M-4471", age=66, sex="F", codes=["80048"], units=1, mods=[], dx=["I10"], pos="11", dos="2026-06-10", billed=48),
    Claim(id="C-48212", member="M-1162", age=50, sex="M", codes=["45378", "36415"], units=2, mods=[], dx=["Z12.11"], pos="24", dos="2026-06-14", billed=1262),
    Claim(id="C-48213", member="M-3320", age=57, sex="M", codes=["71046"], units=1, mods=[], dx=["R07.9"], pos="22", dos="2026-06-15", billed=86),
    Claim(id="C-48214", member="M-7704", age=49, sex="F", codes=["71046"], units=1, mods=["26"], dx=["R05.9"], pos="22", dos="2026-06-15", billed=34),
    Claim(id="C-48215", member="M-9182", age=63, sex="M", codes=["11045"], units=1, mods=[], dx=["L97.419"], pos="11", dos="2026-06-13", billed=210),
    Claim(id="C-48216", member="M-2845", age=55, sex="F", codes=["11042", "11045"], units=1, mods=[], dx=["L97.529"], pos="11", dos="2026-06-13", billed=540),
    Claim(id="C-48217", member="M-6601", age=70, sex="M", codes=["97605"], units=2, mods=[], dx=["L89.153"], pos="12", dos="2026-06-14", billed=160),
    Claim(id="C-48218", member="M-5538", age=68, sex="F", codes=["97605"], units=1, mods=[], dx=["L89.143"], pos="12", dos="2026-06-14", billed=82),
    Claim(id="C-48219", member="M-1099", age=42, sex="M", codes=["36415"], units=4, mods=[], dx=["E11.65"], pos="11", dos="2026-06-12", billed=56),
    Claim(id="C-48220", member="M-7250", age=44, sex="F", codes=["45378"], units=1, mods=[], dx=["Z12.11"], pos="24", dos="2026-06-11", billed=1225),
]
