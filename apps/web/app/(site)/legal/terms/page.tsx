import type { Metadata } from 'next';
import { generateMetadata as genMeta } from '@/lib/seo';

export const metadata: Metadata = genMeta({
  title: 'Terms of Service - Docuflow',
  description: 'Terms of Service for Docuflow',
});

export default function TermsPage() {
  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Terms of Service
        </h1>
        <div className="mt-12 prose prose-lg max-w-none">
          <p className="text-sm text-gray-500">Last updated: {new Date().toLocaleDateString()}</p>
          <div className="mt-8">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing and using Docuflow, you accept and agree to be bound by the terms and
              provision of this agreement.
            </p>
            <h2>2. Use License</h2>
            <p>
              Permission is granted to temporarily use Docuflow for personal, non-commercial
              transitory viewing only. This is the grant of a license, not a transfer of title, and
              under this license you may not:
            </p>
            <ul>
              <li>modify or copy the materials;</li>
              <li>use the materials for any commercial purpose or for any public display;</li>
              <li>attempt to reverse engineer any software contained on Docuflow;</li>
              <li>remove any copyright or other proprietary notations from the materials.</li>
            </ul>
            <h2>3. Disclaimer</h2>
            <p>
              The materials on Docuflow are provided on an 'as is' basis. Docuflow makes no
              warranties, expressed or implied, and hereby disclaims and negates all other
              warranties including without limitation, implied warranties or conditions of
              merchantability, fitness for a particular purpose, or non-infringement of intellectual
              property or other violation of rights.
            </p>
            <h2>4. Limitations</h2>
            <p>
              In no event shall Docuflow or its suppliers be liable for any damages (including,
              without limitation, damages for loss of data or profit, or due to business
              interruption) arising out of the use or inability to use the materials on Docuflow.
            </p>
            <h2>5. Revisions</h2>
            <p>
              Docuflow may revise these terms of service at any time without notice. By using this
              website you are agreeing to be bound by the then current version of these terms of
              service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

