#!/usr/bin/env python3
"""Generate state HTML pages from template + config.

Usage:
    python generate_state_page.py                    # Generate all configured states
    python generate_state_page.py --state OH         # Generate single state
    python generate_state_page.py --state OH TX CA   # Generate specific states
"""

import json
import argparse
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
SITE_DIR = SCRIPT_DIR.parent / "site"
TEMPLATE_PATH = SCRIPT_DIR / "state_template.html"
CONFIG_PATH = SCRIPT_DIR / "state_config.json"

STATES = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas",
    "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware",
    "DC": "District of Columbia", "FL": "Florida", "GA": "Georgia", "HI": "Hawaii",
    "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa",
    "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine",
    "MD": "Maryland", "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota",
    "MS": "Mississippi", "MO": "Missouri", "MT": "Montana", "NE": "Nebraska",
    "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico",
    "NY": "New York", "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio",
    "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island",
    "SC": "South Carolina", "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas",
    "UT": "Utah", "VT": "Vermont", "VA": "Virginia", "WA": "Washington",
    "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming"
}

REGIONS = {
    "Midwest": ["IA", "IL", "IN", "KS", "MI", "MN", "MO", "ND", "NE", "OH", "SD", "WI"],
    "South": ["AL", "AR", "DC", "DE", "FL", "GA", "KY", "LA", "MD", "MS", "NC", "OK", "SC", "TN", "TX", "VA", "WV"],
    "Northeast": ["CT", "MA", "ME", "NH", "NJ", "NY", "PA", "RI", "VT"],
    "West": ["AK", "AZ", "CA", "CO", "HI", "ID", "MT", "NM", "NV", "OR", "UT", "WA", "WY"],
}


def slug(state_code):
    """Convert state code to URL slug: 'WI' -> 'wisconsin', 'DC' -> 'dc'."""
    name = STATES.get(state_code, state_code)
    return name.lower().replace(" ", "-").replace(".", "")


def load_config():
    """Load state-specific content config (hero text, findings)."""
    if CONFIG_PATH.exists():
        return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    return {}


def generate_page(state_code, config):
    """Generate a single state page HTML."""
    template = TEMPLATE_PATH.read_text(encoding="utf-8")
    state_name = STATES[state_code]
    state_slug = slug(state_code)
    state_cfg = config.get(state_code, {})

    hero_title = state_cfg.get("hero_title", f"{state_name}: Hospital Price Transparency")
    hero_subtitle = state_cfg.get("hero_subtitle", f"Chargemaster analysis of hospitals in {state_name}.")
    hospital_count = state_cfg.get("hospital_count", "—")
    dateline = f"{hospital_count} hospitals analyzed · March 2026"
    intro_text = state_cfg.get("intro_text", f"Analysis of hospital price transparency compliance across {state_name}.")

    # Build findings HTML
    findings = state_cfg.get("findings", [])
    if findings:
        findings_html = "\n".join(
            f'      <li>{f}</li>' for f in findings
        )
    else:
        findings_html = '      <li>Analysis pending — chargemaster data being harvested and profiled.</li>'

    html = template
    html = html.replace("{{STATE_CODE}}", state_code)
    html = html.replace("{{STATE_NAME}}", state_name)
    html = html.replace("{{STATE_SLUG}}", state_slug)
    html = html.replace("{{HERO_TITLE}}", hero_title)
    html = html.replace("{{HERO_SUBTITLE}}", hero_subtitle)
    html = html.replace("{{DATELINE}}", dateline)
    html = html.replace("{{INTRO_TEXT}}", intro_text)
    html = html.replace("{{FINDINGS_HTML}}", findings_html)

    return html


def main():
    parser = argparse.ArgumentParser(description="Generate state HTML pages")
    parser.add_argument("--state", nargs="*", help="State code(s) to generate (default: all configured)")
    args = parser.parse_args()

    config = load_config()
    targets = args.state if args.state else list(config.keys())

    if not targets:
        print("No states configured in state_config.json. Use --state XX to generate a placeholder.")
        return

    for code in targets:
        code = code.upper()
        if code not in STATES:
            print(f"Unknown state code: {code}")
            continue
        html = generate_page(code, config)
        out_path = SITE_DIR / f"{slug(code)}.html"
        out_path.write_text(html, encoding="utf-8")
        print(f"Generated {out_path.name}")

    print(f"\nDone. {len(targets)} page(s) generated.")


if __name__ == "__main__":
    main()
