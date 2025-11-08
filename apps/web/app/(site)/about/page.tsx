import type { Metadata } from 'next';
import { generateMetadata as genMeta } from '@/lib/seo';

export const metadata: Metadata = genMeta({
  title: 'About Us - Docuflow',
  description: 'Learn about Docuflow and our mission to simplify document collection and management.',
});

export default function AboutPage() {
  return (
    <div className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            About Docuflow
          </h1>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            We're on a mission to simplify document collection and management for organizations of all sizes.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
          <div className="prose prose-lg max-w-none">
            <h2>Our Mission</h2>
            <p>
              Docuflow was founded with a simple goal: to eliminate the manual, time-consuming process
              of collecting and organizing documents. We believe that organizations should focus on their
              core business, not on chasing down paperwork.
            </p>
            <h2>What We Do</h2>
            <p>
              We provide an automated platform that streamlines document collection, validation, and
              storage. Our intelligent routing system ensures documents end up in the right place,
              every time. With integrations for popular email and storage services, Docuflow works
              seamlessly with your existing tools.
            </p>
            <h2>Our Values</h2>
            <ul>
              <li>
                <strong>Simplicity:</strong> We believe in making complex processes simple and intuitive.
              </li>
              <li>
                <strong>Security:</strong> Your data's security is our top priority. We use enterprise-grade
                encryption and follow industry best practices.
              </li>
              <li>
                <strong>Reliability:</strong> We build our platform to be reliable and available when you need it.
              </li>
              <li>
                <strong>Innovation:</strong> We continuously improve our platform based on customer feedback
                and industry trends.
              </li>
            </ul>
            <h2>Join Us</h2>
            <p>
              Interested in joining our team? Check out our{' '}
              <a href="/careers" className="text-blue-600 hover:text-blue-500">
                careers page
              </a>{' '}
              for open positions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

