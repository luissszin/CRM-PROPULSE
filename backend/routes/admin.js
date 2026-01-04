import express from 'express';
import bcrypt from 'bcrypt';
import { supabase } from '../services/supabaseService.js';
import { loginLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// GET /admin/messages - list recent messages (last 50)
router.get('/messages', async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ error: 'supabase not configured' });

    const { data, error } = await supabase
      .from('messages')
      .select('id, conversation_id, sender, content, created_at, conversations ( contact_id, contacts ( phone ) )')
      .order('created_at', { ascending: false })
      .limit(50);

    // fallback simpler query if above complex select not supported
    if (error) {
      const { data: d2 } = await supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(50);
      return res.json({ messages: d2 });
    }

    return res.json({ messages: data });
  } catch (err) {
    console.error('Error in GET /admin/messages:', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

// POST /admin/messages/:id/resend - resend a failed message
router.post('/messages/:id/resend', async (req, res) => {
  try {
    if (!supabase) return res.status(503).json({ error: 'supabase not configured' });

    const { id } = req.params;

    // Get the message details
    const { data: message, error: msgError } = await supabase
      .from('messages')
      .select('*, conversations(contact_id, contacts(phone))')
      .eq('id', id)
      .single();

    if (msgError || !message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.status !== 'failed') {
      return res.status(400).json({ error: 'Only failed messages can be resent' });
    }

    const phone = message.conversations?.contacts?.phone;
    if (!phone) {
      return res.status(400).json({ error: 'Phone number not found' });
    }

    // Try to resend via the messages endpoint
    const { sendZapiMessage } = await import('../services/zapiService.js');
    const success = await sendZapiMessage(phone, message.content);

    // Update message status
    await supabase
      .from('messages')
      .update({ status: success ? 'sent' : 'failed' })
      .eq('id', id);

    return res.json({ success, message: success ? 'Message resent successfully' : 'Failed to resend message' });
  } catch (err) {
    console.error('Error in POST /admin/messages/:id/resend:', err);
    return res.status(500).json({ error: 'internal error' });
  }
});

// Get all units
router.get('/units', async (req, res) => {
  try {
    const { data, error } = await supabase.from('units').select('*').order('created_at', { ascending: false });
    if (error) throw error;

    // Map metadata.customFields to top-level customFields for frontend
    const mappedUnits = data.map(u => ({
      ...u,
      customFields: u.metadata?.customFields || [],
    }));

    return res.json(mappedUnits);
  } catch (e) {
    console.error('DB Error /admin/units (returning empty):', e.message);
    return res.json([]);
  }
});

// Update unit (including custom fields)
router.put('/units/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, active, logo, customFields } = req.body;

    if (!supabase) return res.status(503).json({ error: 'supabase not configured' });

    // Get existing metadata to merge
    const { data: existingUnit } = await supabase.from('units').select('metadata').eq('id', id).single();

    const finalMetadata = {
      ...(existingUnit?.metadata || {}),
      customFields: customFields || [],
      logo: logo,
    };

    if (active !== undefined) {
      finalMetadata.active = active;
    }

    const { data, error } = await supabase.from('units')
      .update({
        name,
        slug,
        metadata: finalMetadata
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return res.json({
      ...data,
      customFields: data.metadata?.customFields || [],
      active: data.metadata?.active,
      logo: data.metadata?.logo
    });

  } catch (e) {
    console.error('Error updating unit:', e);
    return res.status(500).json({ error: e.message });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    const { data, error } = await supabase.from('users').select('*');
    if (error) throw error;
    // Map unit_id to unitId for frontend consistency
    const mappedData = data.map(user => ({
      ...user,
      unitId: user.unit_id,
      unit_id: undefined
    }));
    return res.json(mappedData);
  } catch (e) {
    // console.error('DB Error /admin/users:', e.message);
    return res.json([]);
  }
});

// Create user
router.post('/users', async (req, res) => {
  try {
    const { name, email, password, role, unitId } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

    // Hash password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    // Prepare insert data - only include unit_id if it has a value
    const insertData = {
      name,
      email,
      password: hashedPassword,
      role: role || 'agent',
    };

    // Only add unit_id if unitId is not empty/undefined
    if (unitId && unitId !== '') {
      insertData.unit_id = unitId;
    }

    const { data, error } = await supabase.from('users').insert(insertData).select().single();

    if (error) throw error;

    // Map unit_id to unitId for frontend consistency
    const mappedUser = {
      ...data,
      unitId: data.unit_id,
      unit_id: undefined
    };

    return res.json(mappedUser);
  } catch (e) {
    console.error('DB Create User Error:', e.message);
    return res.status(500).json({ error: e.message });
  }
});

// Login endpoint with password verification and JWT
// ✅ RATE LIMITING: Máximo 5 tentativas a cada 15 minutos
router.post('/login', loginLimiter, async (req, res) => {
  try {
    console.log('[Auth] Login attempt:', { 
      email: req.body?.email, 
      hasPassword: !!req.body?.password,
      contentType: req.headers['content-type']
    });
    const { email, password, unitSlug } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });

    // 1. Resolve Unit if provided
    let targetUnit = null;
    if (unitSlug) {
      const { data: unit, error: unitError } = await supabase
        .from('units')
        .select('*')
        .eq('slug', unitSlug)
        .single();

      if (unitError || !unit) {
        return res.status(404).json({ error: 'Unit not found' });
      }
      targetUnit = unit;
    }

    // 2. Get user by email
    const { data: users, error } = await supabase.from('users').select('*').eq('email', email);
    if (error) throw error;

    if (!users || users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Verify password for all users
    const passwordValid = await bcrypt.compare(password, user.password);

    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 4. Enforce Unit Isolation
    // If logging into a specific unit context
    if (targetUnit) {
      // Super Admin can access any unit
      if (user.role !== 'super_admin') {
        // Regular users MUST belong to this unit or be assigned to it
        // Assuming 1:1 user-unit relationship for now based on schema (unit_id)
        if (user.unit_id !== targetUnit.id) {
          return res.status(403).json({ error: 'Access denied: User does not belong to this unit' });
        }
      }
    } else {
      // Global Login (no unit context)
      // Only Super Admin should be allowed global login ideally, or we redirect them.
      // For now, allow but frontend handles redirect.
    }

    // Map unit_id to unitId
    const mappedUser = {
      ...user,
      unitId: user.unit_id,
      unit_id: undefined,
      password: undefined
    };

    // Generate JWT tokens
    const { generateTokens } = await import('../services/jwtService.js');
    const { accessToken, refreshToken } = generateTokens(mappedUser);

    return res.json({
      user: mappedUser,
      accessToken,
      refreshToken,
      targetUnit // Return resolved unit info helper
    });
  } catch (e) {
    console.error('Login Error:', e.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token required' });

    // Verify refresh token
    const { verifyRefreshToken, generateAccessToken } = await import('../services/jwtService.js');
    const userData = verifyRefreshToken(refreshToken);

    // Get fresh user data from database
    const { data: users, error } = await supabase.from('users').select('*').eq('id', userData.id);
    if (error || !users || users.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = users[0];
    const mappedUser = {
      ...user,
      unitId: user.unit_id,
      unit_id: undefined,
      password: undefined
    };

    // Generate new access token
    const accessToken = generateAccessToken(mappedUser);

    return res.json({ accessToken });
  } catch (e) {
    console.error('Refresh Token Error:', e.message);
    return res.status(403).json({ error: 'Invalid or expired refresh token' });
  }
});

export default router;
