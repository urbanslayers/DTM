class TelstraAPI {
  // ...existing code...

  async getVirtualNumbers(options?: { limit?: number; offset?: number }): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const params = new URLSearchParams();
      if (options?.limit) params.append("limit", options.limit.toString());
      if (options?.offset) params.append("offset", options.offset.toString());

      const url = `${this.baseURL}/messaging/v3/virtualNumbers${params.toString() ? `?${params}` : ""}`;
      const { response, data } = await this.makeAuthenticatedRequest(url, { method: "GET" });

      if (response.ok) {
        return { success: true, data };
      } else {
        return { success: false, error: data?.error_description || "Failed to get virtual numbers", data };
      }
    } catch (error) {
      return { success: false, error: "Network error" };
    }
  }
  private baseURL = "https://products.api.telstra.com"
  private accessToken: string | null = null
  private tokenExpiry: number | null = null

  private getBaseUrl(): string {
    // In server-side code, we need absolute URLs for internal API calls
    if (typeof window === 'undefined') {
      // Server-side: use environment variables or fallback to localhost
      const baseUrl = process.env.NEXTAUTH_URL ||
                     process.env.VERCEL_URL ||
                     process.env.BASE_URL ||
                     'http://localhost:3000'
      return baseUrl.startsWith('http') ? baseUrl : `http://${baseUrl}`
    }
    // Client-side: use relative URLs
    return ''
  }

  // Redact sensitive header values for logging (e.g. Authorization)
  private sanitizeHeaders(headers: Record<string, any>) {
    try {
      const out: Record<string, any> = {}
      for (const [k, v] of Object.entries(headers || {})) {
        const key = String(k)
        if (key.toLowerCase() === 'authorization') {
          if (typeof v === 'string') {
            // Keep the scheme (e.g. Bearer) but redact the token
            const m = v.match(/^(Bearer)\s+(.*)$/i)
            out[k] = m ? `${m[1]} <REDACTED>` : '<REDACTED>'
          } else {
            out[k] = '<REDACTED>'
          }
        } else {
          out[k] = v
        }
      }
      return out
    } catch (e) {
      return { error: 'failed to sanitize headers' }
    }
  }

  async authenticate(): Promise<boolean> {
    try {
      console.log("[TelstraAPI] 🔄 Checking authentication status")

      // If we already have a valid token, don't authenticate again
      if (this.accessToken && !this.isTokenExpired()) {
        console.log("[TelstraAPI] ✅ Already have valid token, no need to authenticate")
        return true
      }

      console.log("[TelstraAPI] Token expired or missing, clearing old token first")

      // Clear existing token to force fresh authentication
      this.accessToken = null
      this.tokenExpiry = null

      console.log("[TelstraAPI] Attempting authentication via internal API route")
        // If we're running server-side, prefer calling the token endpoint directly
        // using the configured client credentials to avoid relying on an internal
        // http fetch to our own /api route (which is not available during build).
        if (typeof window === 'undefined' && process.env.TELSTRA_CLIENT_ID && process.env.TELSTRA_CLIENT_SECRET) {
          try {
            const params = new URLSearchParams()
            params.append('grant_type', 'client_credentials')
            params.append('client_id', String(process.env.TELSTRA_CLIENT_ID))
            params.append('client_secret', String(process.env.TELSTRA_CLIENT_SECRET))
            params.append('scope', 'free-trial-numbers:read free-trial-numbers:write messages:read messages:write virtual-numbers:read virtual-numbers:write reports:read reports:write')
            console.log("[TelstraAPI] Authentication scope being sent:", params.get('scope'));

            const telstraRes = await fetch('https://products.api.telstra.com/v2/oauth/token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
              },
              // Avoid Next.js/server fetch caching so token responses are fresh
              cache: 'no-store',
              body: params,
            })

            const data = await telstraRes.json()
            console.log('[TelstraAPI] Direct token fetch status:', telstraRes.status)
            console.log('[TelstraAPI] Direct token fetch response data:', data);
            // If successful, set token and expiry
            if (telstraRes.ok && data.access_token) {
              this.accessToken = data.access_token
                        this.tokenExpiry = Date.now() + (data.expires_in * 1000) - (5 * 60 * 1000)
                        console.log('[TelstraAPI] ✅ Direct authentication successful, NEW token set, expires at:', new Date(this.tokenExpiry))
                            return true            }
            console.error('[TelstraAPI] Direct authentication failed:', data)
            return false
          } catch (err) {
            console.warn('[TelstraAPI] Direct token fetch failed, falling back to internal route fetch', err)
            // fall through to try internal fetch if direct call fails
          }
        }

        // Use absolute URL for server-side, relative for client-side
        const authUrl = typeof window === 'undefined'
          ? `${this.getBaseUrl()}/api/auth/token`
          : '/api/auth/token'

        // Only add unique identifier if we actually need to force a fresh token
        const needsFreshToken = !this.accessToken || this.isTokenExpired()
        const uniqueId = needsFreshToken ? `force_new_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` : ''

        const fetchUrl = uniqueId ? `${authUrl}?_fresh=${uniqueId}` : authUrl

        const response = await fetch(fetchUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          },
        })

        const data = await response.json()
        console.log('[TelstraAPI] Auth token fetch status:', response.status)
        console.log('[TelstraAPI] Auth token fetch body:', data)

        if (response.ok && data.access_token) {
          this.accessToken = data.access_token
          // Store expiry time (subtract 5 minutes buffer to refresh early)
          this.tokenExpiry = Date.now() + (data.expires_in * 1000) - (5 * 60 * 1000)
          console.log('[TelstraAPI] ✅ Authentication successful via internal API, NEW token expires at:', new Date(this.tokenExpiry))
          return true
        }
        console.error('[TelstraAPI] Authentication failed with status:', response.status)
        return false
    } catch (error) {
      console.error("Telstra API authentication failed:", error)
      return false
    }
  }

  private isTokenExpired(): boolean {
    const now = Date.now();
    const expired = this.tokenExpiry === null || now >= this.tokenExpiry;
    const timeUntilExpiry = this.tokenExpiry ? Math.round((this.tokenExpiry - now) / 1000) : null;

    console.log("[TelstraAPI] 🔍 TOKEN EXPIRY CHECK:", {
      now: new Date(now),
      expiresAt: this.tokenExpiry ? new Date(this.tokenExpiry) : null,
      timeUntilExpiry: timeUntilExpiry,
      expired: expired ? "❌ EXPIRED" : "✅ VALID",
      minutesUntilExpiry: timeUntilExpiry ? Math.round(timeUntilExpiry / 60) : null
    });

    return expired;
  }

  private async getAuthHeaders() {
    console.log("[TelstraAPI] getAuthHeaders called - checking token validity");

    let authenticated = false; // Initialize authenticated

    // Always attempt to authenticate if token is missing or expired
    if (!this.accessToken || this.isTokenExpired()) {
      console.log("[TelstraAPI] Token missing or expired, attempting to authenticate...");
      authenticated = await this.authenticate(); // Assign to authenticated
      if (!authenticated) {
        console.error("[TelstraAPI] Authentication failed in getAuthHeaders");
        throw new Error("Failed to authenticate with Telstra API");
      }
    } else {
      console.log("[TelstraAPI] ✅ Using existing valid token");
      authenticated = true; // Set to true if using existing token
    }


    const headers = {
      "Telstra-api-version": "3.1.0",
      "Content-Language": "en-au",
      "Authorization": `Bearer ${this.accessToken}`,
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Accept-Charset": "utf-8"
    }

    console.log("[TelstraAPI] ✅ Fresh auth headers generated successfully");
    return headers
  }

  private async makeAuthenticatedRequest(
    url: string,
    options: RequestInit = {},
    isRetry: boolean = false
  ): Promise<{ response: Response; data: any }> {
    let authHeaders = await this.getAuthHeaders();
    console.log("[TelstraAPI] Making authenticated request to:", url);
    // Sanitize headers before logging to avoid exposing sensitive tokens
    console.log("[TelstraAPI] Request headers:", JSON.stringify(this.sanitizeHeaders(authHeaders), null, 2));

    let response = await fetch(url, {
      ...options,
      headers: {
        ...authHeaders,
        ...options.headers,
      },
      // Ensure these authenticated requests are not cached by Next.js
      cache: 'no-store',
    });

    let data: any = {};
    try {
      data = await response.json();
    } catch (e) {
      // Response might not be JSON
    }

    if (response.status === 401 && !isRetry) {
      console.warn("[TelstraAPI] Received 401, attempting to re-authenticate and retry...");
      // Clear the expired token to force a fresh one
      this.accessToken = null;
      this.tokenExpiry = null;
      const authenticated = await this.authenticate();
      if (authenticated) {
        console.log("[TelstraAPI] Re-authentication successful, retrying original request...");
        return this.makeAuthenticatedRequest(url, options, true); // Retry the request
      } else {
        console.error("[TelstraAPI] Re-authentication failed after 401.");
      }
    }

    return { response, data };
  }

  async sendSMS(
    to: string,
    body: string,
    options: {
      from: string
      deliveryTime?: string
      notifyURL?: string
    },
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log("[TelstraAPI] sendSMS called with:", { to, bodyLength: body.length, options });

      // Validate required fields
      if (!options?.from) {
        return { success: false, error: "Missing required 'from' field. Please provide a virtual number (04xxxxxxxx) or senderName." }
      }

      // Use the correct Telstra messaging endpoint (v3)
      const response = await fetch(`${this.baseURL}/messaging/v3/messages`, {
        method: "POST",
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({
          to,
          messageContent: body, // Use 'messageContent' instead of 'body' for SMS
          ...options,
        }),
        // Do not cache message send requests
        cache: 'no-store',
      })

      let data;
      try {
        data = await response.json()
      } catch (parseError) {
        console.error("[TelstraAPI] Failed to parse response as JSON:", parseError);
        console.error("[TelstraAPI] Response text:", await response.text());
        return { success: false, error: "Invalid JSON response from Telstra API" }
      }

      console.log("[TelstraAPI] SMS API response status:", response.status);
      console.log("[TelstraAPI] SMS API response headers:", Object.fromEntries(response.headers.entries()));
      console.log("[TelstraAPI] SMS API response data:", data);
      console.log("[TelstraAPI] SMS API response data type:", typeof data);
      console.log("[TelstraAPI] SMS API response data keys:", data ? Object.keys(data) : 'No data');

      if (response.ok) {
        return { success: true, data }
      } else {
        console.error("[TelstraAPI] SMS API error:", data);
        // Return more detailed error information
        const errorMessage = data?.error_description || data?.error || data?.message || "Unknown API error";
        console.error("[TelstraAPI] Detailed error:", errorMessage);
        return { success: false, error: `SMS API Error: ${errorMessage}` }
      }
    } catch (error) {
      console.error("[TelstraAPI] SMS API network error:", error);
      return { success: false, error: "Network error" }
    }
  }

  async sendMMS(
    to: string,
    options: {
      subject?: string
      body?: string
      media?: Array<{ type: string; filename: string; payload: string }>
      from: string
    },
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Validate required fields
      if (!options?.from) {
        return { success: false, error: "Missing required 'from' field. Please provide a virtual number (04xxxxxxxx) or senderName." }
      }

      const response = await fetch(`${this.baseURL}/messaging/v3/messages`, {
        method: "POST",
        headers: await this.getAuthHeaders(),
        body: JSON.stringify({
          to,
          ...options,
        }),
        cache: 'no-store',
      })

      const data = await response.json()

      if (response.ok) {
        return { success: true, data }
      } else {
        return { success: false, error: data.error_description || "Failed to send MMS" }
      }
    } catch (error) {
      return { success: false, error: "Network error" }
    }
  }

  async getMessageStatus(messageId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/messaging/v3/messages/${messageId}`, {
        headers: await this.getAuthHeaders(),
        cache: 'no-store',
      })

      const data = await response.json()

      if (response.ok) {
        return { success: true, data }
      } else {
        return { success: false, error: data.error_description || "Failed to get message status" }
      }
    } catch (error) {
      return { success: false, error: "Network error" }
    }
  }

  async getInbox(options?: {
    limit?: number
    offset?: number
    filter?: "unread" | "read" | "all"
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const params = new URLSearchParams()
      if (options?.limit) params.append("limit", options.limit.toString())
      if (options?.offset) params.append("offset", options.offset.toString())
      if (options?.filter) params.append("filter", options.filter)

      const response = await fetch(`${this.baseURL}/messaging/v3/messages?${params}`, {
        headers: await this.getAuthHeaders(),
        cache: 'no-store',
      })

      const data = await response.json()

      if (response.ok) {
        return { success: true, data }
      } else {
        return { success: false, error: data.error_description || "Failed to get inbox" }
      }
    } catch (error) {
      return { success: false, error: "Network error" }
    }
  }

  async getAccountBalance(): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await fetch(`${this.baseURL}/messaging/v3/account/balance`, {
        headers: await this.getAuthHeaders(),
        cache: 'no-store',
      })

      const data = await response.json()

      if (response.ok) {
        return { success: true, data }
      } else {
        return { success: false, error: data.error_description || "Failed to get account balance" }
      }
    } catch (error) {
      return { success: false, error: "Network error" }
    }
  }

  async getDeliveryReports(options?: {
    startDate?: string
    endDate?: string
    messageType?: "SMS" | "MMS" | "all"
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const params = new URLSearchParams()
      if (options?.startDate) params.append("startDate", options.startDate)
      if (options?.endDate) params.append("endDate", options.endDate)
      if (options?.messageType) params.append("messageType", options.messageType)

      const response = await fetch(`${this.baseURL}/messaging/v3/reports?${params}`, {
        headers: await this.getAuthHeaders(),
        cache: 'no-store',
      })

      const data = await response.json()

      if (response.ok) {
        return { success: true, data }
      } else {
        return { success: false, error: data.error_description || "Failed to get delivery reports" }
      }
    } catch (error) {
      return { success: false, error: "Network error" }
    }
  }

  async getMessages(options?: {
    direction?: "incoming" | "outgoing"
    limit?: number
    offset?: number
  }): Promise<any> {
    try {
      // Build query parameters for messages API
      const queryParams = new URLSearchParams();
      if (options?.direction) queryParams.append("direction", options.direction);
      if (options?.limit) queryParams.append("limit", options.limit.toString());
      if (options?.offset) queryParams.append("offset", options.offset.toString());

      const queryString = queryParams.toString();
      const url = `${this.baseURL}/messaging/v3/messages${queryString ? `?${queryString}` : ""}`;

      const { response, data } = await this.makeAuthenticatedRequest(url, {
        method: "GET",
      });

      console.log("[TelstraAPI] getMessages response status:", response.status);
      console.log("[TelstraAPI] getMessages response data:", data);

      if (response.ok) {
        return data;
      } else {
        console.error("[TelstraAPI] getMessages API call failed:", response.status, data);
        // Check response status
        if (response.status === 401) {
          console.error("[TelstraAPI] Authentication failed:", data);
          // If it's TOKEN_INVALID, it's likely an account permissions issue
          if ((data as any)?.errors?.some((e: any) => e.code === 'TOKEN_INVALID')) {
            console.log("[TelstraAPI] TOKEN_INVALID likely indicates account permissions issue, returning empty messages");
            return { messages: [] };
          }
          throw new Error(`Authentication failed: ${data?.error_description || 'Unknown error'}`);
        } else if (response.status === 404) {
          console.error("[TelstraAPI] Messages API endpoint not found:", data);
          // Return empty messages instead of throwing error for API limitations
          return { messages: [] };
        } else if (response.status === 403) {
          console.error("[TelstraAPI] Messages API access forbidden:", data);
          // Return empty messages instead of throwing error for API limitations
          return { messages: [] };
        } else {
          console.error("[TelstraAPI] API call failed:", response.status, data);
          throw new Error(`API call failed: ${response.status} - ${data?.error_description || data?.message || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error("[TelstraAPI] Error in getMessages:", error);

      // Check if it's an API unavailability error
      if (error instanceof Error) {
        if (error.message.includes("not available") || error.message.includes("forbidden") || error.message.includes("scope restrictions")) {
          // Return empty messages for API limitations
          return { messages: [] };
        }
      }

      // For other errors, throw them
      throw error;
    }
  }
}

export const telstraAPI = new TelstraAPI()