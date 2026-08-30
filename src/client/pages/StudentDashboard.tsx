import React, { useEffect, useState, useCallback } from 'react';
import { fetchNextBestAction, NextBestAction } from '../api/studyService.ts';
import { fetchStudentProfile, StudentProfile } from '../api/profileService.ts';
import { NextBestActionCard } from '../components/dashboard/NextBestActionCard.tsx';
import { ErrorBoundary } from '../components/common/ErrorBoundary.tsx';
import { RefreshCw } from 'lucide-react';

interface DashboardContentProps {
  onNavigate?: (routeOrTab: string) => void;
}

const DashboardContent: React.FC<DashboardContentProps> = ({ onNavigate }) => {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [nba, setNba] = useState<NextBestAction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const userProfile = await fetchStudentProfile();
      setProfile(userProfile);

      // Select primary subject (Defaulting to first active for MVP)
      const targetSubject = userProfile.activeSubjects[0];
      if (targetSubject) {
        const action = await fetchNextBestAction(userProfile.grade, targetSubject);
        setNba(action);
      }
    } catch (err) {
      console.error('[Dashboard Error]', err);
      setError('هەڵەیەک ڕوویدا لە هێنانەدی زانیارییەکان. تکایە دووبارە هەوڵبدەرەوە.'); // Error fetching data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      await Promise.resolve();
      if (active) {
        await loadDashboardData();
      }
    })();
    return () => {
      active = false;
    };
  }, [loadDashboardData]);

  const handleStartLearning = (topicId: string) => {
    if (profile && profile.activeSubjects[0]) {
      if (onNavigate) {
        onNavigate(`chat:${topicId}`);
      } else if (typeof window !== 'undefined') {
        window.location.hash = `#/tutor/${profile.activeSubjects[0]}/${topicId}`;
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8" dir="rtl">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">سڵاو، بەخێربێیتەوە</h1>
        <p className="text-slate-500 mt-2">ئامادەی بۆ بەردەوامبوون لە فێربوون؟</p>
      </header>

      <main>
        <section className="mb-10">
          <h2 className="text-lg font-bold text-slate-800 mb-4">هەنگاوی داهاتوو</h2>

          {loading ? (
            <div className="animate-pulse bg-slate-100 h-32 rounded-2xl w-full border border-slate-200" />
          ) : error ? (
            <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-red-600">{error}</span>
              <button
                onClick={() => void loadDashboardData()}
                className="inline-flex items-center gap-2 text-red-700 bg-red-100 hover:bg-red-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                دووبارە هەوڵبدەرەوە
              </button>
            </div>
          ) : nba ? (
            <NextBestActionCard action={nba} onActionClick={handleStartLearning} />
          ) : (
            <div className="bg-slate-50 text-slate-600 p-6 rounded-xl border border-slate-100 text-center">
              هیچ بابەتێک نەدۆزرایەوە بۆ فێربوون.
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export const StudentDashboard: React.FC<DashboardContentProps> = (props) => (
  <ErrorBoundary>
    <DashboardContent {...props} />
  </ErrorBoundary>
);
