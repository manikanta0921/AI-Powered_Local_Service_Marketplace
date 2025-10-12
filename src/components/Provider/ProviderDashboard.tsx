import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Star, MapPin, Calendar, LogOut, CheckCircle, XCircle, Clock, MessageCircle } from 'lucide-react';
import { NotificationBell } from '../Notifications/NotificationBell';
import { ChatWindow } from '../Chat/ChatWindow';

export function ProviderDashboard() {
  const { profile, signOut } = useAuth();
  const [providerProfile, setProviderProfile] = useState<any>(null);
  const [matches, setMatches] = useState<any[]>([]);
  const [openRequests, setOpenRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'matches' | 'requests'>('matches');
  const [selectedChat, setSelectedChat] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: providerData } = await supabase
        .from('service_providers')
        .select(`
          *,
          category:service_categories(name)
        `)
        .eq('user_id', profile?.id)
        .single();

      setProviderProfile(providerData);

      if (providerData) {
        const { data: matchesData } = await supabase
          .from('service_matches')
          .select(`
            *,
            request:service_requests(
              *,
              consumer:profiles(full_name),
              category:service_categories(name)
            )
          `)
          .eq('provider_id', providerData.id)
          .order('created_at', { ascending: false });

        setMatches(matchesData || []);

        const { data: requestsData } = await supabase
          .from('service_requests')
          .select(`
            *,
            consumer:profiles(full_name),
            category:service_categories(name)
          `)
          .eq('category_id', providerData.category_id)
          .eq('status', 'open')
          .order('created_at', { ascending: false });

        setOpenRequests(requestsData || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const respondToMatch = async (matchId: string, action: 'accepted' | 'rejected') => {
    try {
      await supabase
        .from('service_matches')
        .update({ status: action })
        .eq('id', matchId);

      await loadData();
    } catch (error) {
      console.error('Error responding to match:', error);
      alert('Error updating match. Please try again.');
    }
  };

  const completeMatch = async (matchId: string) => {
    try {
      await supabase
        .from('service_matches')
        .update({ status: 'completed' })
        .eq('id', matchId);

      await loadData();
    } catch (error) {
      console.error('Error completing match:', error);
      alert('Error completing match. Please try again.');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      suggested: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      completed: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Provider Dashboard</h1>
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

      {providerProfile && (
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">{providerProfile.category?.name}</h2>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center text-yellow-600">
                    <Star className="w-4 h-4 mr-1 fill-current" />
                    <span className="font-medium">{providerProfile.rating_average.toFixed(1)}</span>
                    <span className="text-gray-500 ml-1">({providerProfile.rating_count} reviews)</span>
                  </div>
                  <div className="text-gray-600">
                    {providerProfile.experience_years} years experience
                  </div>
                  {providerProfile.hourly_rate && (
                    <div className="text-gray-600">
                      ${providerProfile.hourly_rate}/hr
                    </div>
                  )}
                </div>
              </div>
              <div className={`px-4 py-2 rounded-full text-sm font-medium ${
                providerProfile.verification_status === 'verified'
                  ? 'bg-green-100 text-green-800'
                  : providerProfile.verification_status === 'pending'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {providerProfile.verification_status}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm mb-6">
            <div className="border-b">
              <div className="flex">
                <button
                  onClick={() => setActiveTab('matches')}
                  className={`flex-1 px-6 py-4 text-center font-medium transition ${
                    activeTab === 'matches'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  My Matches ({matches.length})
                </button>
                <button
                  onClick={() => setActiveTab('requests')}
                  className={`flex-1 px-6 py-4 text-center font-medium transition ${
                    activeTab === 'requests'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Open Requests ({openRequests.length})
                </button>
              </div>
            </div>

            <div className="p-6">
              {activeTab === 'matches' ? (
                matches.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No matches yet</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {matches.map((match) => (
                      <div key={match.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 text-lg mb-1">
                              {match.request?.title}
                            </h3>
                            <p className="text-sm text-gray-600 mb-2">
                              Requested by {match.request?.consumer?.full_name}
                            </p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(match.status)}`}>
                            {match.status}
                          </span>
                        </div>

                        <p className="text-gray-600 text-sm mb-3">{match.request?.description}</p>

                        <div className="flex gap-4 text-sm text-gray-500 mb-3">
                          {match.request?.address && (
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 mr-1" />
                              <span>{match.request.address}</span>
                            </div>
                          )}
                          {match.distance_km && (
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 mr-1" />
                              <span>{match.distance_km.toFixed(1)} km away</span>
                            </div>
                          )}
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            <span>{new Date(match.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {match.status === 'suggested' && (
                          <div className="flex gap-3">
                            <button
                              onClick={() => respondToMatch(match.id, 'accepted')}
                              className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Accept
                            </button>
                            <button
                              onClick={() => respondToMatch(match.id, 'rejected')}
                              className="flex-1 flex items-center justify-center gap-2 bg-red-600 text-white py-2 rounded-lg font-medium hover:bg-red-700 transition"
                            >
                              <XCircle className="w-4 h-4" />
                              Decline
                            </button>
                          </div>
                        )}

                        {match.status === 'accepted' && (
                          <div className="flex gap-3">
                            <button
                              onClick={() => setSelectedChat(match)}
                              className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition"
                            >
                              <MessageCircle className="w-4 h-4" />
                              Chat
                            </button>
                            <button
                              onClick={() => completeMatch(match.id)}
                              className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition"
                            >
                              Complete
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )
              ) : (
                openRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-600">No open requests available</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {openRequests.map((request) => (
                      <div key={request.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 text-lg mb-1">
                              {request.title}
                            </h3>
                            <p className="text-sm text-gray-600">
                              Requested by {request.consumer?.full_name}
                            </p>
                          </div>
                        </div>

                        <p className="text-gray-600 text-sm mb-3">{request.description}</p>

                        <div className="flex gap-4 text-sm text-gray-500">
                          {request.address && (
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 mr-1" />
                              <span>{request.address}</span>
                            </div>
                          )}
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            <span>{new Date(request.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {selectedChat && (
        <ChatWindow
          match={selectedChat}
          onClose={() => setSelectedChat(null)}
        />
      )}
    </div>
  );
}
