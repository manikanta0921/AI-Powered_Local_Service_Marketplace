import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AuthForm } from './components/Auth/AuthForm';
import { ProviderSetup } from './components/Provider/ProviderSetup';
import { ProviderDashboard } from './components/Provider/ProviderDashboard';
import { ConsumerDashboard } from './components/Consumer/ConsumerDashboard';
import { supabase } from './lib/supabase';

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [hasProviderProfile, setHasProviderProfile] = useState<boolean | null>(null);

  useEffect(() => {
    if (profile?.user_type === 'provider') {
      checkProviderProfile();
    }
  }, [profile]);

  const checkProviderProfile = async () => {
    try {
      const { data } = await supabase
        .from('service_providers')
        .select('id')
        .eq('user_id', profile?.id)
        .maybeSingle();

      setHasProviderProfile(!!data);
    } catch (error) {
      console.error('Error checking provider profile:', error);
      setHasProviderProfile(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-100 flex items-center justify-center p-4">
        <div className="w-full max-w-6xl grid md:grid-cols-2 gap-12 items-center">
          <div className="text-center md:text-left">
            <h1 className="text-5xl font-bold text-gray-900 mb-4">
              Connect with Local Service Providers
            </h1>
            <p className="text-xl text-gray-600 mb-6">
              Find trusted professionals near you or offer your services to customers in your area
            </p>
            <div className="flex flex-wrap gap-4 justify-center md:justify-start">
              <div className="flex items-center gap-2 text-gray-700">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span>Distance-based matching</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span>AI-powered recommendations</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                <span>Verified providers</span>
              </div>
            </div>
          </div>
          <div className="flex justify-center">
            <AuthForm />
          </div>
        </div>
      </div>
    );
  }

  if (profile?.user_type === 'provider') {
    if (hasProviderProfile === null) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
          </div>
        </div>
      );
    }

    if (!hasProviderProfile) {
      return <ProviderSetup />;
    }

    return <ProviderDashboard />;
  }

  return <ConsumerDashboard />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
