'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function EmailTestPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [testType, setTestType] = useState<'test' | 'full'>('test');

  const testEmail = async () => {
    if (!email) {
      alert('Please enter an email address');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const endpoint = testType === 'test' ? '/api/test-email' : '/api/submit';
      const body = testType === 'test' 
        ? { email }
        : { email, faceHash: 'test-hash-12345' };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();
      setResult({ success: response.ok, data, status: response.status });
    } catch (error) {
      setResult({ 
        success: false, 
        data: { error: 'Network error', details: error instanceof Error ? error.message : 'Unknown error' },
        status: 0
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#e8e6d9] p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="font-legend text-4xl text-center mb-8">
          Email System Test
        </h1>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Test Email Delivery</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="font-mono"
            />
            
            <div className="flex gap-4">
              <Button
                onClick={() => { setTestType('test'); testEmail(); }}
                disabled={loading}
                variant={testType === 'test' ? 'default' : 'outline'}
              >
                {loading && testType === 'test' ? 'Sending...' : 'Test Email Only'}
              </Button>
              
              <Button
                onClick={() => { setTestType('full'); testEmail(); }}
                disabled={loading}
                variant={testType === 'full' ? 'default' : 'outline'}
              >
                {loading && testType === 'full' ? 'Processing...' : 'Full Flow (Track + Email)'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {result && (
          <Card>
            <CardHeader>
              <CardTitle className={result.success ? 'text-green-600' : 'text-red-600'}>
                {result.success ? '✅ Success' : '❌ Failed'}
                <span className="text-sm font-mono ml-2">({result.status})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto font-mono">
                {JSON.stringify(result.data, null, 2)}
              </pre>
              
              {result.success && (
                <div className="mt-4 p-4 bg-green-50 rounded">
                  <p className="text-green-800">
                    <strong>Success!</strong> Check your email inbox (and spam folder).
                  </p>
                  {result.data.trackId && (
                    <p className="text-sm text-green-700 mt-2">
                      Track ID: {result.data.trackId}
                    </p>
                  )}
                </div>
              )}
              
              {!result.success && (
                <div className="mt-4 p-4 bg-red-50 rounded">
                  <p className="text-red-800">
                    <strong>Error:</strong> {result.data.error}
                  </p>
                  {result.data.details && (
                    <p className="text-sm text-red-700 mt-2">
                      Details: {result.data.details}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Environment Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm font-mono">
              <div>Environment: {process.env.NODE_ENV}</div>
              <div>SMTP Host: {process.env.EMAIL_HOST || 'Not set'}</div>
              <div>SMTP Port: {process.env.EMAIL_PORT || 'Not set'}</div>
              <div>Email User: {process.env.EMAIL_USER ? 'Set' : 'Not set'}</div>
              <div>Email Pass: {process.env.EMAIL_PASS ? 'Set' : 'Not set'}</div>
              <div>Email From: {process.env.EMAIL_FROM || 'Not set'}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
