/**
 * SerpAPI client for LinkedIn profile discovery
 * Uses Google search results to find LinkedIn profiles reliably
 */

export interface SerpApiResult {
  profileUrl: string | null;
  title: string | null;
  snippet: string | null;
  confidence: "high" | "medium" | "low";
}

/**
 * Search for a LinkedIn profile using SerpAPI
 * Much more reliable than relying on Gemini's web grounding for LinkedIn
 */
export async function searchLinkedInProfile(
  personName: string,
  companyName: string,
  email?: string
): Promise<SerpApiResult> {
  const apiKey = process.env.SERP_API;
  
  if (!apiKey) {
    console.log("[SerpAPI] No SERP_API key configured, skipping LinkedIn search");
    return {
      profileUrl: null,
      title: null,
      snippet: null,
      confidence: "low"
    };
  }

  // Simplify company name for better search results
  let simplifiedCompany = companyName
    .replace(/,?\s*(Inc\.?|LLC\.?|Corp\.?|Corporation|Ltd\.?|Company|Co\.?)$/i, "")
    .replace(/\s+/g, " ")
    .trim();

  // Handle common company name variations
  const companyMappings: Record<string, string> = {
    "super micro computer": "Supermicro",
    "international business machines": "IBM",
  };
  
  const lowerCompany = simplifiedCompany.toLowerCase();
  if (companyMappings[lowerCompany]) {
    simplifiedCompany = companyMappings[lowerCompany];
  }

  // Build search query
  const searchQuery = `"${personName}" ${simplifiedCompany} site:linkedin.com/in`;
  
  console.log(`[SerpAPI] Searching: ${searchQuery}`);

  try {
    const url = new URL("https://serpapi.com/search.json");
    url.searchParams.set("q", searchQuery);
    url.searchParams.set("api_key", apiKey);
    url.searchParams.set("engine", "google");
    url.searchParams.set("num", "5");

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      console.error(`[SerpAPI] Request failed: ${response.status}`);
      return {
        profileUrl: null,
        title: null,
        snippet: null,
        confidence: "low"
      };
    }

    const data = await response.json();
    const organicResults = data.organic_results || [];

    if (organicResults.length === 0) {
      console.log(`[SerpAPI] No results found for ${personName}`);
      return {
        profileUrl: null,
        title: null,
        snippet: null,
        confidence: "low"
      };
    }

    // Find the best matching LinkedIn profile
    for (const result of organicResults) {
      const link = result.link || "";
      const title = result.title || "";
      const snippet = result.snippet || "";

      // Must be a LinkedIn profile URL (not company page)
      if (!link.includes("linkedin.com/in/")) {
        continue;
      }

      // Calculate confidence based on name and company matches
      const nameParts = personName.toLowerCase().split(" ");
      const titleLower = title.toLowerCase();
      const snippetLower = snippet.toLowerCase();
      const linkLower = link.toLowerCase();

      // Count name matches in title and URL
      let nameMatchCount = 0;
      let nameInUrl = 0;
      for (const part of nameParts) {
        if (part.length > 1) {
          if (titleLower.includes(part)) nameMatchCount++;
          if (linkLower.includes(part)) nameInUrl++;
        }
      }

      // Check for company match
      const companyMatch = 
        titleLower.includes(simplifiedCompany.toLowerCase()) ||
        snippetLower.includes(simplifiedCompany.toLowerCase());

      // Determine confidence
      let confidence: "high" | "medium" | "low" = "low";
      if ((nameMatchCount >= 2 || nameInUrl >= 2) && companyMatch) {
        confidence = "high";
      } else if ((nameMatchCount >= 1 || nameInUrl >= 1) && companyMatch) {
        confidence = "high";
      } else if (nameMatchCount >= 2 || nameInUrl >= 2) {
        confidence = "medium";
      } else if (nameMatchCount >= 1 || nameInUrl >= 1) {
        confidence = "medium";
      }

      if (confidence !== "low") {
        console.log(`[SerpAPI] Found profile: ${link} (confidence: ${confidence})`);
        return {
          profileUrl: link,
          title,
          snippet,
          confidence
        };
      }
    }

    // If no confident match, return the first LinkedIn profile result
    const firstLinkedIn = organicResults.find((r: { link?: string }) => 
      r.link?.includes("linkedin.com/in/")
    );

    if (firstLinkedIn) {
      console.log(`[SerpAPI] Using first LinkedIn result: ${firstLinkedIn.link}`);
      return {
        profileUrl: firstLinkedIn.link,
        title: firstLinkedIn.title,
        snippet: firstLinkedIn.snippet,
        confidence: "low"
      };
    }

    return {
      profileUrl: null,
      title: null,
      snippet: null,
      confidence: "low"
    };

  } catch (error) {
    console.error("[SerpAPI] Error searching LinkedIn:", error);
    return {
      profileUrl: null,
      title: null,
      snippet: null,
      confidence: "low"
    };
  }
}
