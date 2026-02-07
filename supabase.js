// Supabase client wrapper with localStorage fallback

class SupabaseClient {
    constructor() {
        this.mode = 'initializing';
        this.client = null;
        this.pollInterval = null;
        this.listeners = [];
    }

    async initialize() {
        const url = window.__ENV?.SUPABASE_URL;
        const key = window.__ENV?.SUPABASE_ANON_KEY;

        if (!url || !key || url.includes('your-project') || key.includes('your-anon-key')) {
            console.log('Supabase not configured, using localStorage fallback');
            this.mode = 'localStorage';
            return false;
        }

        try {
            // Import Supabase from CDN
            const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.0/+esm');

            this.client = createClient(url, key);

            // Test connection
            const { error } = await this.client.from('star_events').select('count', { count: 'exact', head: true });

            if (error && error.code !== 'PGRST116') { // PGRST116 = table doesn't exist yet (acceptable)
                throw error;
            }

            this.mode = 'supabase';
            console.log('Connected to Supabase ✓');

            // Start polling for changes (simple approach)
            this.startPolling();

            return true;
        } catch (err) {
            console.error('Supabase connection failed:', err);
            console.log('Falling back to localStorage');
            this.mode = 'localStorage';
            return false;
        }
    }

    getMode() {
        return this.mode;
    }

    // Event listener for data changes
    onChange(callback) {
        this.listeners.push(callback);
    }

    notifyListeners() {
        this.listeners.forEach(cb => cb());
    }

    startPolling() {
        if (this.mode !== 'supabase') return;

        // Poll every 15 seconds for changes
        this.pollInterval = setInterval(async () => {
            this.notifyListeners();
        }, 15000);
    }

    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    // CRUD operations with fallback
    async getEvents() {
        if (this.mode === 'supabase') {
            const { data, error } = await this.client
                .from('star_events')
                .select('*')
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Supabase fetch error:', error);
                return this.getEventsLocal();
            }

            return data || [];
        } else {
            return this.getEventsLocal();
        }
    }

    async addEvent(child, localDate) {
        if (this.mode === 'supabase') {
            const { data, error } = await this.client
                .from('star_events')
                .insert([{ child, local_date: localDate }])
                .select()
                .single();

            if (error) {
                console.error('Supabase insert error:', error);
                return this.addEventLocal(child, localDate);
            }

            this.notifyListeners();
            return data;
        } else {
            return this.addEventLocal(child, localDate);
        }
    }

    async removeEvent(id) {
        if (this.mode === 'supabase') {
            const { error } = await this.client
                .from('star_events')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Supabase delete error:', error);
                return this.removeEventLocal(id);
            }

            this.notifyListeners();
            return true;
        } else {
            return this.removeEventLocal(id);
        }
    }

    async resetAllEvents() {
        if (this.mode === 'supabase') {
            const { error } = await this.client
                .from('star_events')
                .delete()
                .neq('id', 0); // Delete all rows

            if (error) {
                console.error('Supabase reset error:', error);
                return this.resetAllEventsLocal();
            }

            this.notifyListeners();
            return true;
        } else {
            return this.resetAllEventsLocal();
        }
    }

    // localStorage fallback methods
    getEventsLocal() {
        const stored = localStorage.getItem('star_events');
        return stored ? JSON.parse(stored) : [];
    }

    addEventLocal(child, localDate) {
        const events = this.getEventsLocal();
        const newEvent = {
            id: Date.now(), // Simple ID for localStorage
            child,
            local_date: localDate,
            created_at: new Date().toISOString()
        };
        events.push(newEvent);
        localStorage.setItem('star_events', JSON.stringify(events));
        this.notifyListeners();
        return newEvent;
    }

    removeEventLocal(id) {
        const events = this.getEventsLocal();
        const filtered = events.filter(e => e.id !== id);
        localStorage.setItem('star_events', JSON.stringify(filtered));
        this.notifyListeners();
        return true;
    }

    resetAllEventsLocal() {
        localStorage.setItem('star_events', JSON.stringify([]));
        this.notifyListeners();
        return true;
    }
}

// Export singleton instance
export const db = new SupabaseClient();
