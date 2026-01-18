type CpPoint = {
  cp_id: string;
  type: 'nickname' | 'place' | 'preference' | 'relationship';
  value: string;
  created_at: string;
};

export async function getCpPoints(supabase: any, cpId: string): Promise<CpPoint[]> {
  try {
    const { data, error } = await supabase
      .from('cp_points')
      .select('*')
      .eq('cp_id', cpId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    // Fetch user_id from cps table
    const { data: cp } = await supabase
      .from('cps')
      .select('user_id')
      .eq('id', cpId)
      .single();

    await supabase
      .from('agent_errors')
      .insert({
        user_id: cp?.user_id || null,
        agent_type: 'cp_point',
        message_user: 'Failed to fetch CP points',
        message_internal: `CpId: ${cpId}\nError: ${errorMsg}`
      });

    return [];
  }
}

export async function addCpPoint(
  supabase: any,
  cpId: string,
  type: 'nickname' | 'place' | 'preference' | 'relationship',
  value: string
): Promise<CpPoint | null> {
  try {
    const { data, error } = await supabase
      .from('cp_points')
      .insert({
        cp_id: cpId,
        type: type,
        value: value
      })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    // Fetch user_id from cps table
    const { data: cp } = await supabase
      .from('cps')
      .select('user_id')
      .eq('id', cpId)
      .single();

    await supabase
      .from('agent_errors')
      .insert({
        user_id: cp?.user_id || null,
        agent_type: 'cp_point',
        message_user: 'Failed to add CP point',
        message_internal: `CpId: ${cpId}\nType: ${type}\nValue: ${value}\nError: ${errorMsg}`
      });

    return null;
  }
}

export async function deleteCpPoint(supabase: any, id: string): Promise<boolean> {
  try {
    // Fetch cp_id before deletion to get user_id for error logging
    const { data: point } = await supabase
      .from('cp_points')
      .select('cp_id')
      .eq('id', id)
      .single();

    if (!point) {
      throw new Error('CP point not found');
    }

    const { error } = await supabase
      .from('cp_points')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    // Try to fetch user_id from point and cp
    const { data: point } = await supabase
      .from('cp_points')
      .select('cp_id')
      .eq('id', id)
      .single();

    let userId = null;
    if (point?.cp_id) {
      const { data: cp } = await supabase
        .from('cps')
        .select('user_id')
        .eq('id', point.cp_id)
        .single();
      userId = cp?.user_id || null;
    }

    await supabase
      .from('agent_errors')
      .insert({
        user_id: userId,
        agent_type: 'cp_point',
        message_user: 'Failed to delete CP point',
        message_internal: `PointId: ${id}\nError: ${errorMsg}`
      });

    return false;
  }
}
