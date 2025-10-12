import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Star, MapPin, Briefcase, Clock, Award, Image as ImageIcon, X, Plus } from 'lucide-react';

type ProviderProfileProps = {
  providerId: string;
  onClose: () => void;
};

export function ProviderProfile({ providerId, onClose }: ProviderProfileProps) {
  const [provider, setProvider] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [certifications, setCertifications] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProviderData();
  }, [providerId]);

  const loadProviderData = async () => {
    setLoading(true);
    try {
      const { data: providerData } = await supabase
        .from('service_providers')
        .select(`
          *,
          profile:profiles(full_name, avatar_url),
          category:service_categories(name, icon)
        `)
        .eq('id', providerId)
        .single();

      setProvider(providerData);

      const { data: portfolioData } = await supabase
        .from('provider_portfolio')
        .select('*')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false });

      setPortfolio(portfolioData || []);

      const { data: certificationsData } = await supabase
        .from('provider_certifications')
        .select('*')
        .eq('provider_id', providerId)
        .order('issue_date', { ascending: false });

      setCertifications(certificationsData || []);

      const { data: packagesData } = await supabase
        .from('service_packages')
        .select('*')
        .eq('provider_id', providerId)
        .eq('is_active', true)
        .order('price', { ascending: true });

      setPackages(packagesData || []);

      const { data: reviewsData } = await supabase
        .from('reviews')
        .select(`
          *,
          consumer:profiles(full_name)
        `)
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false })
        .limit(10);

      setReviews(reviewsData || []);
    } catch (error) {
      console.error('Error loading provider data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!provider) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-t-2xl flex justify-between items-center z-10">
          <h2 className="text-2xl font-bold">Provider Profile</h2>
          <button
            onClick={onClose}
            className="text-white hover:text-blue-100 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div className="flex items-start gap-6 mb-6 pb-6 border-b">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold flex-shrink-0">
              {provider.profile?.full_name?.charAt(0) || 'P'}
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                {provider.profile?.full_name}
              </h3>
              <p className="text-lg text-gray-600 mb-3">{provider.category?.name}</p>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center text-yellow-600">
                  <Star className="w-5 h-5 mr-1 fill-current" />
                  <span className="font-medium text-lg">{provider.rating_average.toFixed(1)}</span>
                  <span className="text-gray-500 ml-1">({provider.rating_count} reviews)</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Briefcase className="w-5 h-5 mr-1" />
                  <span>{provider.experience_years} years experience</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <Award className="w-5 h-5 mr-1" />
                  <span>{provider.total_jobs_completed} jobs completed</span>
                </div>
              </div>
              {provider.badges && provider.badges.length > 0 && (
                <div className="flex gap-2 mt-3">
                  {provider.badges.map((badge: string, index: number) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {provider.bio && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-2">About</h4>
              <p className="text-gray-600">{provider.bio}</p>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {provider.hourly_rate && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Hourly Rate</p>
                <p className="text-2xl font-bold text-blue-600">${provider.hourly_rate}</p>
              </div>
            )}
            {provider.response_time_hours && (
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Response Time</p>
                <p className="text-2xl font-bold text-green-600">{provider.response_time_hours}h</p>
              </div>
            )}
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{provider.completion_rate}%</p>
            </div>
            {provider.address && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1 flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  Location
                </p>
                <p className="text-sm font-medium text-gray-900">{provider.address}</p>
              </div>
            )}
          </div>

          {packages.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Service Packages</h4>
              <div className="grid md:grid-cols-2 gap-4">
                {packages.map((pkg) => (
                  <div key={pkg.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition">
                    <h5 className="font-semibold text-gray-900 mb-1">{pkg.name}</h5>
                    {pkg.description && (
                      <p className="text-sm text-gray-600 mb-2">{pkg.description}</p>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-2xl font-bold text-blue-600">${pkg.price}</span>
                      {pkg.duration_hours && (
                        <span className="text-sm text-gray-500">
                          {pkg.duration_hours}h
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {certifications.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Certifications</h4>
              <div className="space-y-3">
                {certifications.map((cert) => (
                  <div key={cert.id} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Award className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                      <div className="flex-1">
                        <h5 className="font-semibold text-gray-900">{cert.certification_name}</h5>
                        {cert.issuing_organization && (
                          <p className="text-sm text-gray-600">{cert.issuing_organization}</p>
                        )}
                        <div className="flex gap-4 text-xs text-gray-500 mt-1">
                          {cert.issue_date && (
                            <span>Issued: {new Date(cert.issue_date).toLocaleDateString()}</span>
                          )}
                          {cert.expiry_date && (
                            <span>Expires: {new Date(cert.expiry_date).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {portfolio.length > 0 && (
            <div className="mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Portfolio</h4>
              <div className="grid md:grid-cols-2 gap-4">
                {portfolio.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg overflow-hidden hover:border-blue-300 transition">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-48 object-cover"
                      />
                    ) : (
                      <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-gray-400" />
                      </div>
                    )}
                    <div className="p-4">
                      <h5 className="font-semibold text-gray-900 mb-1">{item.title}</h5>
                      {item.description && (
                        <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                      )}
                      {item.project_date && (
                        <p className="text-xs text-gray-500">
                          {new Date(item.project_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reviews.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-3">Reviews</h4>
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-gray-900">{review.consumer?.full_name}</p>
                        <div className="flex items-center gap-1 mt-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < review.rating
                                  ? 'text-yellow-500 fill-current'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(review.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-gray-600">{review.comment}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
