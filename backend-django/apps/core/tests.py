from django.test import Client, TestCase


class PrivacyPolicyViewTest(TestCase):
    def setUp(self):
        self.client = Client()

    def test_privacy_policy_without_slash_returns_200_html(self):
        """GET /privacy-policy must return HTTP 200 with HTML content."""
        response = self.client.get("/privacy-policy")
        self.assertEqual(response.status_code, 200)
        self.assertIn("text/html", response["Content-Type"])
        content = response.content.decode("utf-8")
        self.assertIn("<title>Privacy Policy — Zakovat App</title>", content)
        self.assertIn("Introduction and Scope", content)
        self.assertIn("Information We Collect", content)
        self.assertIn("Account Deletion Instructions", content)
        self.assertIn("support@zakovat-app.uz", content)

    def test_privacy_policy_with_slash_returns_200_html(self):
        """GET /privacy-policy/ must also return HTTP 200 without redirect or error."""
        response = self.client.get("/privacy-policy/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("text/html", response["Content-Type"])
        content = response.content.decode("utf-8")
        self.assertIn("Privacy Policy — Zakovat App", content)

    def test_anonymous_access_allowed(self):
        """Must be accessible without any auth headers, cookies, or tokens."""
        response = self.client.get("/privacy-policy")
        self.assertEqual(response.status_code, 200)
        self.assertNotIn("login", response.content.decode("utf-8").lower()[:200])

    def test_health_check_still_works(self):
        """Verify unrelated routes like /health remain unaffected."""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"ok": True})
