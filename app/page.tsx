import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Calendar, BarChart3, FileText } from 'lucide-react';
import { config } from '@/lib/config';

export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Multi-User Attendance</h1>
        <p className="text-muted-foreground mb-8">
          Employee attendance management system
        </p>

        <div className="mb-8">
          <Link href="/attendance">
            <Button size="lg" className="gap-2">
              <Calendar className="h-5 w-5" />
              Open Attendance
            </Button>
          </Link>
        </div>

        <h2 className="text-2xl font-semibold mb-4">Available Features</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <div className="border rounded-lg p-6 bg-primary/5 border-primary">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-6 w-6 text-primary" />
              <h3 className="text-xl font-semibold">Attendance</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Spreadsheet-style attendance entry with enhanced UI components
            </p>
            <Link href="/attendance">
              <Button variant="outline" size="sm">
                Open Attendance
              </Button>
            </Link>
          </div>

          {config.features.enableDashboard && (
            <div className="border rounded-lg p-6 bg-primary/5 border-primary">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-6 w-6 text-primary" />
                <h3 className="text-xl font-semibold">Dashboard</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                View statistics, summaries, and recent activity
              </p>
              <Link href="/dashboard">
                <Button variant="outline" size="sm">
                  View Dashboard
                </Button>
              </Link>
            </div>
          )}

          {config.features.enableReports && (
            <div className="border rounded-lg p-6 bg-primary/5 border-primary">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-6 w-6 text-primary" />
                <h3 className="text-xl font-semibold">Reports</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Generate and export attendance reports
              </p>
              <Link href="/reports">
                <Button variant="outline" size="sm">
                  View Reports
                </Button>
              </Link>
            </div>
          )}
        </div>

        <h2 className="text-2xl font-semibold mb-4">Development Roadmap</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="border rounded-lg p-6 bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
            <h3 className="text-xl font-semibold mb-2">Phase 1 ✓</h3>
            <p className="text-sm text-muted-foreground">
              Core attendance functionality with dialog-based entry editing and balance tracking
            </p>
          </div>

          <div className="border rounded-lg p-6 opacity-50">
            <h3 className="text-xl font-semibold mb-2">Phase 2</h3>
            <p className="text-sm text-muted-foreground">
              Employee-filtered views and personalized attendance tracking
            </p>
          </div>

          <div className="border rounded-lg p-6 opacity-50">
            <h3 className="text-xl font-semibold mb-2">Phase 3</h3>
            <p className="text-sm text-muted-foreground">
              Advanced reports, analytics, and approval workflows
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
