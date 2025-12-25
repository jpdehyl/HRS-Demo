import pRetry from 'p-retry';

interface SerpApiOrganicResult {
  position: number;
  title: string;
  link: string;
  snippet?: string;
  displayed_link?: string;
}

interface SerpApiResponse {
  organic_results?: SerpApiOrganicResult[];
  error?: string;
}

interface LinkedInSearchResult {
  profileUrl: string | null;
  title: string | null;
  snippet: string | null;
  confidence: 'high' | 'medium' | 'low';
}

export async function searchLinkedInProfile(
  personName: string,
  companyName: string,
  email?: string
): Promise<LinkedInSearchResult> {
  const apiKey = process.env.SERP_API;
  
  if (!apiKey) {
    console.log('[SerpAPI] No SERP_API key configured, skipping search');
    return { profileUrl: null, title: null, snippet: null, confidence: 'low' };
  }

  // Simplify company name for better search results
  // Remove common suffixes and simplify
  let simplifiedCompany = companyName
    .replace(/,?\s*(Inc\.?|LLC\.?|Corp\.?|Corporation|Ltd\.?|Company|Co\.?)$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Handle special cases where common name differs from official name
  // e.g., "Super Micro Computer" -> "Supermicro"
  if (simplifiedCompany.toLowerCase() === 'super micro computer') {
    simplifiedCompany = 'Supermicro';
  }
  
  // Use simplified company name without quotes for broader search
  const searchQuery = `"${personName}" ${simplifiedCompany} site:linkedin.com/in`;
  console.log(`[SerpAPI] Searching: ${searchQuery}`);

  try {
    const result = await pRetry(
      async () => {
        const params = new URLSearchParams({
          api_key: apiKey,
          engine: 'google',
          q: searchQuery,
          num: '5',
        });

        const response = await fetch(`https://serpapi.com/search?${params.toString()}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`SerpAPI error: ${response.status} - ${errorText}`);
        }

        return response.json() as Promise<SerpApiResponse>;
      },
      {
        retries: 2,
        minTimeout: 1000,
        onFailedAttempt: (error) => {
          console.log(`[SerpAPI] Attempt ${error.attemptNumber} failed`);
        },
      }
    );

    if (result.error) {
      console.log(`[SerpAPI] API error: ${result.error}`);
      return { profileUrl: null, title: null, snippet: null, confidence: 'low' };
    }

    const organicResults = result.organic_results || [];
    console.log(`[SerpAPI] Found ${organicResults.length} results`);

    for (const item of organicResults) {
      const link = item.link?.toLowerCase() || '';
      
      if (link.includes('linkedin.com/in/')) {
        const nameWords = personName.toLowerCase().split(/\s+/);
        const title = item.title?.toLowerCase() || '';
        const snippet = item.snippet?.toLowerCase() || '';
        const combinedText = `${title} ${snippet}`;
        
        // Check if name words appear in the title/snippet
        const nameMatchCount = nameWords.filter(word => 
          word.length > 2 && combinedText.includes(word)
        ).length;
        
        // Also check if name words appear in the LinkedIn URL slug
        const urlSlug = link.replace('https://www.linkedin.com/in/', '').replace(/\//g, '');
        const nameInUrl = nameWords.filter(word => 
          word.length > 2 && urlSlug.includes(word)
        ).length;
        
        // Check company match (use both original simplified name AND search-query simplified name)
        const simplifiedCompanyLower = simplifiedCompany.toLowerCase().replace(/[^a-z0-9]/g, '');
        const combinedTextNormalized = combinedText.replace(/[^a-z0-9\s]/g, '');
        const companyMatch = combinedText.includes(simplifiedCompany.toLowerCase()) ||
          combinedTextNormalized.includes(simplifiedCompanyLower);
        
        let confidence: 'high' | 'medium' | 'low' = 'low';
        if ((nameMatchCount >= 2 || nameInUrl >= 2) && companyMatch) {
          confidence = 'high';
        } else if ((nameMatchCount >= 1 || nameInUrl >= 1) && companyMatch) {
          confidence = 'high';
        } else if (nameMatchCount >= 2 || nameInUrl >= 2) {
          confidence = 'medium';
        } else if ((nameMatchCount >= 1 || nameInUrl >= 1) && !companyMatch) {
          confidence = 'medium';
        }
        // If no name match at all, skip this result entirely
        else if (nameMatchCount === 0 && nameInUrl === 0) {
          console.log(`[SerpAPI] Skipping ${item.link} - no name match (title: ${item.title})`);
          continue;
        }

        console.log(`[SerpAPI] Found LinkedIn profile: ${item.link} (confidence: ${confidence})`);
        console.log(`[SerpAPI] Title: ${item.title}`);
        console.log(`[SerpAPI] Name matches: ${nameMatchCount} in text, ${nameInUrl} in URL, company: ${companyMatch}`);
        
        return {
          profileUrl: item.link,
          title: item.title || null,
          snippet: item.snippet || null,
          confidence,
        };
      }
    }

    console.log('[SerpAPI] No LinkedIn profile found in search results');
    return { profileUrl: null, title: null, snippet: null, confidence: 'low' };
    
  } catch (error) {
    console.error('[SerpAPI] Search failed:', error);
    return { profileUrl: null, title: null, snippet: null, confidence: 'low' };
  }
}

export async function searchCompanyLinkedIn(companyName: string): Promise<string | null> {
  const apiKey = process.env.SERP_API;
  
  if (!apiKey) {
    console.log('[SerpAPI] No SERP_API key configured, skipping company search');
    return null;
  }

  const searchQuery = `"${companyName}" site:linkedin.com/company`;
  console.log(`[SerpAPI] Company search: ${searchQuery}`);

  try {
    const params = new URLSearchParams({
      api_key: apiKey,
      engine: 'google',
      q: searchQuery,
      num: '3',
    });

    const response = await fetch(`https://serpapi.com/search?${params.toString()}`);
    
    if (!response.ok) {
      console.log(`[SerpAPI] Company search failed: ${response.status}`);
      return null;
    }

    const result = await response.json() as SerpApiResponse;
    const organicResults = result.organic_results || [];

    for (const item of organicResults) {
      const link = item.link?.toLowerCase() || '';
      if (link.includes('linkedin.com/company/')) {
        console.log(`[SerpAPI] Found company LinkedIn: ${item.link}`);
        return item.link;
      }
    }

    console.log('[SerpAPI] No company LinkedIn page found');
    return null;
    
  } catch (error) {
    console.error('[SerpAPI] Company search failed:', error);
    return null;
  }
}
