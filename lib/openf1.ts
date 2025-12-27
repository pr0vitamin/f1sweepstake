/**
 * OpenF1 API Client
 * 
 * Provides typed access to the OpenF1 API for fetching race session data and results.
 * API Documentation: https://openf1.org
 */

const OPENF1_BASE_URL = "https://api.openf1.org/v1";

// =============================================================================
// Types
// =============================================================================

export interface OpenF1Session {
    session_key: number;
    session_name: string;
    session_type: string;
    meeting_key: number;
    location: string;
    country_name: string;
    country_code: string;
    circuit_key: number;
    circuit_short_name: string;
    date_start: string;
    date_end: string;
    gmt_offset: string;
    year: number;
}

export interface OpenF1SessionResult {
    session_key: number;
    meeting_key: number;
    driver_number: number;
    position: number;
    dnf: boolean;
    dns: boolean;
    dsq: boolean;
    duration?: number;
    gap_to_leader?: number;
    number_of_laps?: number;
}

export interface SessionSearchParams {
    year?: number;
    country_name?: string;
    location?: string;
    session_name?: string;
    session_type?: string;
}

// =============================================================================
// API Functions
// =============================================================================

/**
 * Search for sessions by various parameters
 */
export async function searchSessions(params: SessionSearchParams): Promise<OpenF1Session[]> {
    const searchParams = new URLSearchParams();

    if (params.year) searchParams.set("year", params.year.toString());
    if (params.country_name) searchParams.set("country_name", params.country_name);
    if (params.location) searchParams.set("location", params.location);
    if (params.session_name) searchParams.set("session_name", params.session_name);
    if (params.session_type) searchParams.set("session_type", params.session_type);

    const url = `${OPENF1_BASE_URL}/sessions?${searchParams.toString()}`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`OpenF1 API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get race sessions for a given year (main races only, not practice/quali)
 */
export async function getRaceSessions(year: number): Promise<OpenF1Session[]> {
    const sessions = await searchSessions({
        year,
        session_name: "Race"
    });
    return sessions.sort((a, b) =>
        new Date(a.date_start).getTime() - new Date(b.date_start).getTime()
    );
}

/**
 * Get session results for a specific session key
 */
export async function getSessionResult(sessionKey: number): Promise<OpenF1SessionResult[]> {
    const url = `${OPENF1_BASE_URL}/session_result?session_key=${sessionKey}`;

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`OpenF1 API error: ${response.status} ${response.statusText}`);
    }

    const results: OpenF1SessionResult[] = await response.json();
    return results.sort((a, b) => a.position - b.position);
}

/**
 * Find best matching session for a race by location and year
 */
export async function findRaceSession(
    location: string,
    year: number
): Promise<OpenF1Session | null> {
    // First try exact location match
    const sessions = await searchSessions({
        year,
        session_name: "Race"
    });

    // Find best match by location (case-insensitive partial match)
    const locationLower = location.toLowerCase();
    const match = sessions.find(s =>
        s.location.toLowerCase().includes(locationLower) ||
        s.country_name.toLowerCase().includes(locationLower) ||
        s.circuit_short_name.toLowerCase().includes(locationLower)
    );

    return match || null;
}
