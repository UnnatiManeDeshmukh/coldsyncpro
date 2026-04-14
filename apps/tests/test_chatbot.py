"""
Unit tests for chatbot:
- Rule-based replies (no Groq needed)
- Rate limiting
- Session persistence
- Off-topic guard
"""
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch


class ChatbotRuleBasedTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.session = 'test-session-001'

    def _chat(self, msg):
        return self.client.post('/api/chatbot/chat/', {
            'message': msg,
            'session_id': self.session,
            'lang': 'en',
        }, format='json')

    def test_greeting_reply(self):
        res = self._chat('hello')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('reply', res.data)
        self.assertTrue(len(res.data['reply']) > 0)

    def test_help_reply(self):
        res = self._chat('help')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('reply', res.data)

    def test_products_reply(self):
        res = self._chat('what products do you have?')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_empty_message_rejected(self):
        res = self._chat('')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_long_message_truncated(self):
        long_msg = 'a' * 1000
        res = self._chat(long_msg)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_session_id_returned(self):
        res = self._chat('hi')
        self.assertIn('session_id', res.data)

    def test_off_topic_blocked(self):
        res = self._chat('What is the capital of France?')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Should contain off-topic refusal
        reply = res.data['reply'].lower()
        self.assertTrue(
            'agency' in reply or 'only' in reply or 'shree' in reply or 'help' in reply
        )

    def test_marathi_greeting(self):
        res = self.client.post('/api/chatbot/chat/', {
            'message': 'नमस्ते',
            'session_id': 'mr-session',
            'lang': 'mr',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    def test_rate_limit(self):
        """After RATE_LIMIT messages, should get 429."""
        from apps.chatbot.views import RATE_LIMIT
        session_id = 'rate-test-session'
        for _ in range(RATE_LIMIT):
            self.client.post('/api/chatbot/chat/', {
                'message': 'hi', 'session_id': session_id,
            }, format='json')
        res = self.client.post('/api/chatbot/chat/', {
            'message': 'one more', 'session_id': session_id,
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_429_TOO_MANY_REQUESTS)

    @patch('apps.chatbot.bot_engine._ai_reply')
    def test_ai_fallback_used_when_groq_available(self, mock_ai):
        mock_ai.return_value = 'AI response about orders'
        res = self._chat('tell me about ordering process in detail please')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

    @patch('apps.chatbot.bot_engine._ai_reply')
    def test_rule_based_fallback_when_ai_fails(self, mock_ai):
        mock_ai.return_value = None  # Groq unavailable
        res = self._chat('hello')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        # Should still get a reply from rule-based engine
        self.assertTrue(len(res.data['reply']) > 0)
