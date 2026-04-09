import { supabase } from './supabase';

export const aiService = {
  async executeQuery(sql: string) {
    // Basic validation
    const query = sql.trim();
    if (!query) {
      throw new Error('Empty query');
    }

    try {
      // Execute the query using our secure function
      const { data, error } = await supabase
        .rpc('execute_readonly_sql', { query: sql })
        .single();

      if (error) throw error;
      
      // If the function returned an error object, throw it
      if (data?.error) {
        throw new Error(data.message || 'Error executing query');
      }
      
      return data || [];

    } catch (error) {
      console.error('Error executing query:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to execute query');
    }
  },

  async getLeadById(id: string) {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching lead:', error);
      throw error;
    }
  }
};