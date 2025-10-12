import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, ServiceRequest } from '../../lib/supabase';
import { ServiceRequestForm } from './ServiceRequestForm';
import { ProviderMatches } from './ProviderMatches';
import { AdvancedSearch } from './AdvancedSearch';
import { NotificationBell } from '../Notifications/NotificationBell';
import { Plus, Calendar, MapPin, DollarSign, LogOut, Search } from 'lucide-react';

export function ConsumerDashboard() {
  const { profile, signOut } = useAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('service_requests')
        .select(`
          *,
          category:service_categories(name, icon)
        `)
        .eq('consumer_id', profile?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: 'bg-blue-100 text-blue-800',
      matched: 'bg-green-100 text-green-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (showSearch) {
    return <AdvancedSearch />;
  }

  if (selectedRequest) {
    return <ProviderMatches requestId={selectedRequest} onBack={() => setSelectedRequest(null)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Service Requests</h1>
              <p className="text-sm text-gray-600 mt-1">Welcome back, {profile?.full_name}</p>
            </div>
            <div className="flex items-center gap-3">
              <NotificationBell />
              <button
                onClick={signOut}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex gap-3">
          <button
            onClick={() => setShowRequestForm(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition shadow-md hover:shadow-lg"
          >
            <Plus className="w-5 h-5" />
            New Service Request
          </button>
          <button
            onClick={() => setShowSearch(true)}
            className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-700 transition shadow-md hover:shadow-lg"
          >
            <Search className="w-5 h-5" />
            Browse Providers
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Loading your requests...</p>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No service requests yet</h3>
            <p className="text-gray-600 mb-6">Create your first service request to get started</p>
            <button
              onClick={() => setShowRequestForm(true)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
            >
              Create Request
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {requests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 border border-gray-100 cursor-pointer"
                onClick={() => setSelectedRequest(request.id)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg mb-1">{request.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{request.category?.name}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                    {request.status}
                  </span>
                </div>

                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{request.description}</p>

                <div className="space-y-2 text-sm">
                  {request.address && (
                    <div className="flex items-center text-gray-500">
                      <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{request.address}</span>
                    </div>
                  )}

                  {(request.budget_min || request.budget_max) && (
                    <div className="flex items-center text-gray-500">
                      <DollarSign className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span>
                        {request.budget_min && request.budget_max
                          ? `$${request.budget_min} - $${request.budget_max}`
                          : request.budget_min
                          ? `From $${request.budget_min}`
                          : `Up to $${request.budget_max}`}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center text-gray-500">
                    <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span>{new Date(request.created_at).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <button className="text-blue-600 hover:text-blue-700 font-medium text-sm">
                    View Matches →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showRequestForm && (
        <ServiceRequestForm
          onClose={() => setShowRequestForm(false)}
          onSuccess={() => {
            setShowRequestForm(false);
            loadRequests();
          }}
        />
      )}
    </div>
  );
}
