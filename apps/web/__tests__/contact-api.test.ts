import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/(site)/api/contact/route';
import { NextResponse } from 'next/server';
import { z } from 'zod';

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// Mock next/headers
vi.mock('next/headers', () => ({
  headers: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';

describe('Contact API Route', () => {
  let mockSupabase: any;
  let mockHeaders: any;

  beforeEach(() => {
    mockSupabase = {
      from: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.mocked(createClient).mockResolvedValue(mockSupabase);

    mockHeaders = {
      get: vi.fn((key: string) => {
        const headers: Record<string, string> = {
          'x-forwarded-for': '192.168.1.1',
          'user-agent': 'Mozilla/5.0',
        };
        return headers[key] || null;
      }),
    };
    vi.mocked(headers).mockResolvedValue(mockHeaders as any);
  });

  describe('Zod Validation', () => {
    it('should reject request with missing name', async () => {
      const request = new Request('http://localhost/api/contact', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          message: 'Test message',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid input');
      expect(data.details).toBeDefined();
    });

    it('should reject request with invalid email', async () => {
      const request = new Request('http://localhost/api/contact', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'invalid-email',
          message: 'Test message',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid input');
    });

    it('should reject request with missing message', async () => {
      const request = new Request('http://localhost/api/contact', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid input');
    });

    it('should accept valid request with required fields', async () => {
      const request = new Request('http://localhost/api/contact', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          message: 'Test message',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockSupabase.insert).toHaveBeenCalled();
    });

    it('should accept optional fields', async () => {
      const request = new Request('http://localhost/api/contact', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          company: 'Test Company',
          phone: '123-456-7890',
          subject: 'Test Subject',
          message: 'Test message',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should accept UTM parameters', async () => {
      const request = new Request('http://localhost/api/contact', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          message: 'Test message',
          utm_source: 'google',
          utm_medium: 'cpc',
          utm_campaign: 'test-campaign',
          utm_term: 'test-term',
          utm_content: 'test-content',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'website:google:cpc',
        })
      );
    });
  });

  describe('Honeypot Protection', () => {
    it('should silently accept request with honeypot field filled', async () => {
      const request = new Request('http://localhost/api/contact', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Spam Bot',
          email: 'spam@example.com',
          message: 'Spam message',
          website: 'http://spam.com', // Honeypot
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockSupabase.insert).not.toHaveBeenCalled();
    });
  });

  describe('IP and User Agent Tracking', () => {
    it('should capture IP address from x-forwarded-for header', async () => {
      const request = new Request('http://localhost/api/contact', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          message: 'Test message',
        }),
      });

      await POST(request);

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ip_address: '192.168.1.1',
          user_agent: 'Mozilla/5.0',
        })
      );
    });

    it('should fallback to x-real-ip when x-forwarded-for is missing', async () => {
      mockHeaders.get = vi.fn((key: string) => {
        if (key === 'x-real-ip') return '10.0.0.1';
        if (key === 'user-agent') return 'Mozilla/5.0';
        return null;
      });

      const request = new Request('http://localhost/api/contact', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          message: 'Test message',
        }),
      });

      await POST(request);

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ip_address: '10.0.0.1',
        })
      );
    });

    it('should use "unknown" when no IP headers present', async () => {
      mockHeaders.get = vi.fn((key: string) => {
        if (key === 'user-agent') return 'Mozilla/5.0';
        return null;
      });

      const request = new Request('http://localhost/api/contact', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          message: 'Test message',
        }),
      });

      await POST(request);

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          ip_address: 'unknown',
        })
      );
    });
  });

  describe('Database Error Handling', () => {
    it('should return 500 on database error', async () => {
      mockSupabase.insert = vi.fn().mockResolvedValue({
        error: { message: 'Database connection failed' },
      });

      const request = new Request('http://localhost/api/contact', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          message: 'Test message',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to send message');
    });
  });

  describe('Source Field Construction', () => {
    it('should construct source field from UTM parameters', async () => {
      const request = new Request('http://localhost/api/contact', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          message: 'Test message',
          utm_source: 'newsletter',
          utm_medium: 'email',
        }),
      });

      await POST(request);

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'website:newsletter:email',
        })
      );
    });

    it('should use default source when no UTM parameters', async () => {
      const request = new Request('http://localhost/api/contact', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          message: 'Test message',
        }),
      });

      await POST(request);

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'website',
        })
      );
    });
  });
});

