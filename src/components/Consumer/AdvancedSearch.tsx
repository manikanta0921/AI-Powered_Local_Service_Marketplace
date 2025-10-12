import { useState, useEffect } from 'react';
import { supabase, ServiceCategory } from '../../lib/supabase';
import { Search, SlidersHorizontal, Star, MapPin, DollarSign, X } from 'lucide-react';
import { ProviderProfile } from '../Provider/ProviderProfile';

export function AdvancedSearch() {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    searchQuery: '',
    categoryId: '',
    minRating: 0,
    maxPrice: '',
    sortBy: 'rating',
    experienceYears: 0,
  });

  useEffect(() => {
    loadCategories();
    loadProviders();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, providers]);

  const loadCategories = async () => {
    const { data } = await supabase
      .from('service_categories')
      .select('*')
      .order('name');

    if (data) setCategories(data);
  };

  const loadProviders = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('service_providers')
        .select(`
          *,
          profile:profiles(full_name, avatar_url),
          category:service_categories(name, icon)
        `)
        .eq('verification_status', 'verified')
        .eq('is_available', true);

      setProviders(data || []);
    } catch (error) {
      console.error('Error loading providers:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...providers];

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.profile?.full_name?.toLowerCase().includes(query) ||
          p.bio?.toLowerCase().includes(query) ||
          p.category?.name?.toLowerCase().includes(query)
      );
    }

    if (filters.categoryId) {
      filtered = filtered.filter((p) => p.category_id === filters.categoryId);
    }

    if (filters.minRating > 0) {
      filtered = filtered.filter((p) => p.rating_average >= filters.minRating);
    }

    if (filters.maxPrice) {
      const maxPrice = parseFloat(filters.maxPrice);
      filtered = filtered.filter(
        (p) => !p.hourly_rate || p.hourly_rate <= maxPrice
      );
    }

    if (filters.experienceYears > 0) {
      filtered = filtered.filter(
        (p) => p.experience_years >= filters.experienceYears
      );
    }

    switch (filters.sortBy) {
      case 'rating':
        filtered.sort((a, b) => b.rating_average - a.rating_average);
        break;
      case 'experience':
        filtered.sort((a, b) => b.experience_years - a.experience_years);
        break;
      case 'price_low':
        filtered.sort((a, b) => (a.hourly_rate || 999999) - (b.hourly_rate || 999999));
        break;
      case 'price_high':
        filtered.sort((a, b) => (b.hourly_rate || 0) - (a.hourly_rate || 0));
        break;
      case 'jobs':
        filtered.sort((a, b) => b.total_jobs_completed - a.total_jobs_completed);
        break;
    }

    setFilteredProviders(filtered);
  };

  const resetFilters = () => {
    setFilters({
      searchQuery: '',
      categoryId: '',
      minRating: 0,
      maxPrice: '',
      sortBy: 'rating',
      experienceYears: 0,
    });
  };

  if (selectedProvider) {
    return (
      <ProviderProfile
        providerId={selectedProvider}
        onClose={() => setSelectedProvider(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Find Service Providers</h1>
          <p className="text-gray-600">Browse and connect with verified professionals</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex gap-4 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={filters.searchQuery}
                onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                placeholder="Search by name, service, or keyword..."
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
            >
              <SlidersHorizontal className="w-5 h-5" />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="border-t pt-4 grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={filters.categoryId}
                  onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Rating
                </label>
                <select
                  value={filters.minRating}
                  onChange={(e) => setFilters({ ...filters, minRating: parseFloat(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="0">Any Rating</option>
                  <option value="3">3+ Stars</option>
                  <option value="4">4+ Stars</option>
                  <option value="4.5">4.5+ Stars</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Hourly Rate
                </label>
                <input
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                  placeholder="No limit"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Min Experience (years)
                </label>
                <input
                  type="number"
                  value={filters.experienceYears}
                  onChange={(e) => setFilters({ ...filters, experienceYears: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sort By
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="rating">Highest Rated</option>
                  <option value="experience">Most Experience</option>
                  <option value="jobs">Most Jobs</option>
                  <option value="price_low">Price: Low to High</option>
                  <option value="price_high">Price: High to Low</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={resetFilters}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="mb-4 text-sm text-gray-600">
          Showing {filteredProviders.length} of {providers.length} providers
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Loading providers...</p>
          </div>
        ) : filteredProviders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No providers found</h3>
            <p className="text-gray-600">Try adjusting your filters or search query</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredProviders.map((provider) => (
              <div
                key={provider.id}
                onClick={() => setSelectedProvider(provider.id)}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 border border-gray-100 cursor-pointer"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                    {provider.profile?.full_name?.charAt(0) || 'P'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-lg mb-1 truncate">
                      {provider.profile?.full_name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">{provider.category?.name}</p>
                    <div className="flex items-center text-yellow-600 text-sm">
                      <Star className="w-4 h-4 mr-1 fill-current" />
                      <span className="font-medium">{provider.rating_average.toFixed(1)}</span>
                      <span className="text-gray-500 ml-1">({provider.rating_count})</span>
                    </div>
                  </div>
                </div>

                {provider.bio && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">{provider.bio}</p>
                )}

                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-gray-600">
                    <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="truncate">{provider.address || 'Location not specified'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">{provider.experience_years} years exp.</span>
                    {provider.hourly_rate && (
                      <div className="flex items-center text-blue-600 font-semibold">
                        <DollarSign className="w-4 h-4" />
                        <span>{provider.hourly_rate}/hr</span>
                      </div>
                    )}
                  </div>
                  <div className="pt-2 border-t">
                    <span className="text-xs text-gray-500">
                      {provider.total_jobs_completed} jobs completed
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
