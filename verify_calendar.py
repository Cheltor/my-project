
import json
import re
from playwright.sync_api import sync_playwright, expect
from datetime import datetime, timedelta

def test_schedule_calendar_views():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Mock API responses
        page.route("**/user", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps({
                "id": 1,
                "name": "Test User",
                "role": 3,
                "email": "test@example.com"
            })
        ))

        # Mock Inspections and Complaints
        now = datetime.now()
        time_str = (now + timedelta(hours=1)).strftime("%Y-%m-%dT%H:00:00")

        inspections = [
            {
                "id": 101,
                "source": "Routine Inspection",
                "status": "Pending",
                "scheduled_datetime": time_str,
                "address": {"id": 1, "combadd": "123 Main St"},
                "inspector": {"name": "Inspector Gadget"}
            },
            {
                "id": 102,
                "source": "Complaint Inspection",
                "status": "Violation Found",
                "scheduled_datetime": time_str,
                "address": {"id": 2, "combadd": "456 Elm St"},
                "inspector": {"name": "Sherlock Holmes"}
            }
        ]

        complaints = []

        page.route("**/inspections/", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps(inspections)
        ))

        page.route("**/complaints/", lambda route: route.fulfill(
            status=200,
            content_type="application/json",
            body=json.dumps(complaints)
        ))

        page.route("**/settings", lambda route: route.fulfill(status=200, body="{}"))


        # Inject token before navigation
        page.goto("http://localhost:3000")
        page.evaluate("""
            localStorage.setItem('token', 'fake-token');
        """)

        # Now navigate to the calendar
        page.goto("http://localhost:3000/calendar")

        # Wait for data to load
        try:
            # Wait for "Schedule" heading
            expect(page.get_by_text("Schedule", exact=True).first).to_be_visible(timeout=10000)
        except Exception as e:
            page.screenshot(path="/home/jules/verification/debug_failed_load_2.png")
            print(f"Failed to load page content. Page title: {page.title()}")
            raise e

        # 1. Verify Legend is Visible
        # Use exact=True to avoid matching "Routine Inspection" or "Complaint Inspection"
        expect(page.get_by_text("Color Key")).to_be_visible()
        expect(page.get_by_text("Inspection", exact=True)).to_be_visible()
        expect(page.get_by_text("Complaint", exact=True)).to_be_visible()
        expect(page.get_by_text("Completed / Passed")).to_be_visible()
        expect(page.get_by_text("Violation / Failed")).to_be_visible()

        # 2. Verify Month View (default)
        expect(page.get_by_role("button", name="Month")).to_have_class(re.compile(r"bg-indigo-600"))
        expect(page.get_by_text("Routine Inspection").first).to_be_visible()

        # 3. Switch to Week View
        page.get_by_role("button", name="Week").click()
        expect(page.get_by_role("button", name="Week")).to_have_class(re.compile(r"bg-indigo-600"))
        expect(page.get_by_text("Routine Inspection").first).to_be_visible()

        # 4. Switch to List View
        page.get_by_role("button", name="List").click()
        expect(page.get_by_role("button", name="List")).to_have_class(re.compile(r"bg-indigo-600"))
        expect(page.get_by_text("123 Main St").first).to_be_visible()

        # 5. Open Reschedule Modal
        page.get_by_role("button", name="Month").click()
        page.get_by_text("Routine Inspection").first.click()
        expect(page.get_by_role("dialog")).to_be_visible()
        page.get_by_role("button", name="Cancel").click()
        expect(page.get_by_role("dialog")).not_to_be_visible()

        # Take Screenshot
        page.screenshot(path="/home/jules/verification/calendar_verified_final.png")

if __name__ == "__main__":
    test_schedule_calendar_views()
