import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, MapPin, Star, Briefcase, Clock, Search, MessageCircle, Calendar, Heart } from 'lucide-react';
import { ChatWindow } from '../Chat/ChatWindow';
import { BookingForm } from '../Booking/BookingForm';
import { ReviewForm } from './ReviewForm';
import { ProviderProfile } from '../Provider/ProviderProfile';

type ProviderMatchesProps = {
  requestId: string;
  onBack: () => void;
};

export function ProviderMatches({ requestId, onBack }: ProviderMatchesProps) {
  const [request, setRequest] = useState<any>(null);
  const [providers, setProviders] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [requestId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: requestData } = await supabase
        .from('service_requests')
        .select(`
          *,
          category:service_categories(name)
        `)
        .eq('id', requestId)
        .single();

      setRequest(requestData);

      const { data: matchesData } = await supabase
        .from('service_matches')
        .select(`
          *,
          provider:service_providers(
            *,
            profile:profiles(full_name, avatar_url),
            category:service_categories(name)
          )
        `)
        .eq('request_id', requestId)
        .order('ai_score', { ascending: false });

      setMatches(matchesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const findProviders = async () => {
    if (!request) return;

    setSearching(true);
    try {
      const { data: allProviders } = await supabase
        .from('service_providers')
        .select(`
          *,
          profile:profiles(full_name, avatar_url),
          category:service_categories(name)
        `)
        .eq('category_id', request.category_id)
        .eq('verification_status', 'verified')
        .eq('is_available', true);

      if (!allProviders) return;

      const providersWithDistance = allProviders.map((provider) => {
        const { data: distance } = supabase.rpc('calculate_distance', {
          lat1: request.latitude,
          lon1: request.longitude,
          lat2: provider.latitude,
          lon2: provider.longitude,
        });

        const distanceKm = distance || 0;
        const aiScore = calculateAIScore(provider, distanceKm, request);

        return {
          ...provider,
          distance_km: distanceKm,
          ai_score: aiScore,
        };
      });

      providersWithDistance.sort((a, b) => b.ai_score - a.ai_score);

      const topProviders = providersWithDistance.slice(0, 10);

      for (const provider of topProviders) {
        const { data: existingMatch } = await supabase
          .from('service_matches')
          .select('id')
          .eq('request_id', requestId)
          .eq('provider_id', provider.id)
          .maybeSingle();

        if (!existingMatch) {
          await supabase.from('service_matches').insert({
            request_id: requestId,
            provider_id: provider.id,
            distance_km: provider.distance_km,
            ai_score: provider.ai_score,
          });
        }
      }

      await loadData();
    } catch (error) {
      console.error('Error finding providers:', error);
      alert('Error finding providers. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  const calculateAIScore = (provider: any, distance: number, request: any): number => {
    let score = 100;

    if (distance > 50) score -= 40;
    else if (distance > 20) score -= 20;
    else if (distance > 10) score -= 10;

    score += Math.min(provider.rating_average * 10, 50);

    score += Math.min(provider.experience_years * 2, 20);

    if (provider.rating_count > 10) score += 10;
    else if (provider.rating_count > 5) score += 5;

    if (request.budget_max && provider.hourly_rate) {
      if (provider.hourly_rate <= request.budget_max) {
        score += 10;
      } else if (provider.hourly_rate > request.budget_max * 1.5) {
        score -= 15;
      }
    }

    return Math.max(0, Math.min(100, score));
  };

  const acceptMatch = async (matchId: string) => {
    try {
      await supabase
        .from('service_matches')
        .update({ status: 'accepted' })
        .eq('id', matchId);

      await supabase
        .from('service_requests')
        .update({ status: 'matched' })
        .eq('id', requestId);

      await loadData();
    } catch (error) {
      console.error('Error accepting match:', error);
      alert('Error accepting match. Please try again.');
    }
  };

  if (selectedProfile) {
    return <ProviderProfile providerId={selectedProfile} onClose={() => setSelectedProfile(null)} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-600">Loading matches...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Requests
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{request?.title}</h1>
            <p className="text-sm text-gray-600 mt-1">{request?.category?.name}</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {matches.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No matches found yet</h3>
            <p className="text-gray-600 mb-6">Find the best service providers near you</p>
            <button
              onClick={findProviders}
              disabled={searching}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50"
            >
              {searching ? 'Searching...' : 'Find Providers'}
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                {matches.length} Matched Providers
              </h2>
              <button
                onClick={findProviders}
                disabled={searching}
                className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition disabled:opacity-50"
              >
                <Search className="w-4 h-4" />
                {searching ? 'Searching...' : 'Refresh Matches'}
              </button>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {matches.map((match) => (
                <div key={match.id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 border border-gray-100">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                      {match.provider?.profile?.full_name?.charAt(0) || 'P'}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {match.provider?.profile?.full_name}
                      </h3>
                      <p className="text-sm text-gray-600">{match.provider?.category?.name}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <div className="flex items-center text-yellow-600">
                          <Star className="w-4 h-4 mr-1 fill-current" />
                          <span className="font-medium">{match.provider?.rating_average.toFixed(1)}</span>
                          <span className="text-gray-500 ml-1">({match.provider?.rating_count})</span>
                        </div>
                        {match.distance_km && (
                          <div className="flex items-center text-gray-500">
                            <MapPin className="w-4 h-4 mr-1" />
                            <span>{match.distance_km.toFixed(1)} km away</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {match.ai_score && (
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${
                          match.ai_score >= 80 ? 'text-green-600' :
                          match.ai_score >= 60 ? 'text-yellow-600' : 'text-gray-600'
                        }`}>
                          {Math.round(match.ai_score)}
                        </div>
                        <div className="text-xs text-gray-500">Match</div>
                      </div>
                    )}
                  </div>

                  {match.provider?.bio && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{match.provider.bio}</p>
                  )}

                  <div className="flex gap-4 text-sm text-gray-500 mb-4">
                    <div className="flex items-center">
                      <Briefcase className="w-4 h-4 mr-1" />
                      <span>{match.provider?.experience_years} years exp.</span>
                    </div>
                    {match.provider?.hourly_rate && (
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        <span>${match.provider.hourly_rate}/hr</span>
                      </div>
                    )}
                  </div>

                  {match.status === 'suggested' && (
                    <div className="space-y-2">
                      <button
                        onClick={() => setSelectedProfile(match.provider?.id)}
                        className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200 transition"
                      >
                        View Full Profile
                      </button>
                      <button
                        onClick={() => acceptMatch(match.id)}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition"
                      >
                        Accept Provider
                      </button>
                    </div>
                  )}

                  {match.status === 'accepted' && (
                    <div className="space-y-2">
                      <div className="w-full bg-green-100 text-green-800 py-2 rounded-lg font-medium text-center">
                        Accepted
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setSelectedChat(match)}
                          className="flex items-center justify-center gap-2 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition"
                        >
                          <MessageCircle className="w-4 h-4" />
                          Chat
                        </button>
                        <button
                          onClick={() => setSelectedBooking(match)}
                          className="flex items-center justify-center gap-2 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 transition"
                        >
                          <Calendar className="w-4 h-4" />
                          Book
                        </button>
                      </div>
                    </div>
                  )}

                  {match.status === 'completed' && (
                    <div className="space-y-2">
                      <div className="w-full bg-gray-100 text-gray-800 py-2 rounded-lg font-medium text-center">
                        Completed
                      </div>
                      <button
                        onClick={() => setSelectedReview(match)}
                        className="w-full bg-yellow-600 text-white py-2 rounded-lg font-medium hover:bg-yellow-700 transition flex items-center justify-center gap-2">
                        <Star className="w-4 h-4" />
                        Leave Review
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {selectedChat && (
        <ChatWindow
          match={selectedChat}
          onClose={() => setSelectedChat(null)}
        />
      )}

      {selectedBooking && (
        <BookingForm
          match={selectedBooking}
          providerId={selectedBooking.provider_id}
          onClose={() => setSelectedBooking(null)}
          onSuccess={() => {
            setSelectedBooking(null);
            loadData();
          }}
        />
      )}

      {selectedReview && (
        <ReviewForm
          match={selectedReview}
          onClose={() => setSelectedReview(null)}
          onSuccess={() => {
            setSelectedReview(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
